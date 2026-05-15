## Objetivo

Substituir a página atual `/admin/campos` por uma gestão completa de **Categorias + Campos dinâmicos**, com campos base pré-carregados e campos personalizados reordenáveis.

## Mudanças no banco (migração)

### Tabela `categories` — adicionar colunas
- `description text`
- `active boolean not null default true`
- `updated_at timestamptz not null default now()` + trigger `update_updated_at_column`
- RLS: adicionar policy de admin (INSERT/UPDATE/DELETE) usando `has_role(auth.uid(),'admin')`. Manter SELECT público.

### Tabela `campos_categoria` — adicionar colunas
- `is_base boolean not null default false` — campos base não podem ser deletados
- `placeholder text`
- (manter `chave/label/tipo/opcoes/obrigatorio/ordem/ativo` já existentes; mapear no frontend para `key/label/type/options/required/order/enabled`)
- Adicionar tipo `'checkbox'` ao CHECK constraint (manter `texto/numero/booleano/select/lista/faixa/textarea`). Frontend usa: `text→texto`, `number→numero`, `select→select`, `checkbox→lista`.

### Função `seed_base_category_fields(_category_id uuid)`
SECURITY DEFINER. Insere os 10 campos base com `is_base=true`, `ativo=true`, `ordem` 0..9 e `obrigatorio` conforme tabela do briefing. ON CONFLICT (category_id, chave) DO NOTHING.

### Trigger `after insert on categories`
Chama `seed_base_category_fields(NEW.id)` automaticamente.

### Backfill
Rodar `seed_base_category_fields` para as 12 categorias existentes (idempotente via ON CONFLICT).

## Frontend

Mapeamento chave entre briefing ↔ banco:
`key=chave`, `type=tipo` (com tradução), `options=opcoes`, `required=obrigatorio`, `enabled=ativo`, `order=ordem`, `is_base=is_base`.

### Rotas (em `src/App.tsx`, dentro do AdminLayout)
- `/admin/categorias` — lista
- `/admin/categorias/nova` — criar (modal sobre a lista)
- `/admin/categorias/:id` — editar metadados (modal)
- `/admin/categorias/:id/campos` — gestão de campos

Manter `/admin/campos` como redirect para `/admin/categorias` por compatibilidade. Atualizar o item do menu em `AdminLayout.tsx` para "Categorias".

### Página 1 — `src/pages/AdminCategorias.tsx`
Tabela com colunas Ícone, Nome, Slug, Campos ativos (count), Status (toggle inline), Ações (Editar / Campos / Desativar). Botão "+ Nova categoria" abre dialog. Linha clicável → navega para `/admin/categorias/:id/campos`. Ordenado por `name`.

Dialog Nova/Editar (componente `CategoryFormDialog`):
- Nome (text) → gera slug em tempo real (slugify: lowercase, sem acento, espaços→hífen)
- Ícone (text input simples + grid de emojis sugeridos)
- Descrição (textarea)
- Ativo (Switch)

Ao salvar criação, o trigger no banco já popula os campos base. Toast e refetch.

### Página 2 — `src/pages/AdminCategoriaCampos.tsx`
Header com nome da categoria, ícone, botão "← Voltar".

**Bloco A — Campos base** (filtra `is_base=true`, ordenado por `ordem`):
- Cards não reordenáveis, sem botão deletar
- Mostra label, key (mono cinza), badge tipo, badge "obrigatório" se aplicável
- Switch para `ativo`. Quando off: opacidade 50% + badge "desativado"
- Permite editar `obrigatorio` e `placeholder` via drawer (não permite trocar tipo nem deletar)

**Bloco B — Campos personalizados** (filtra `is_base=false`):
- Botão "+ Adicionar campo" → drawer
- Lista com drag & drop usando `@dnd-kit/core` + `@dnd-kit/sortable` (já comum em projetos shadcn — adicionar como dep)
- Cada card: handle ⠿, label + key, badge tipo, "Opções: N" se select/lista, switch enable, botão editar, botão deletar (com confirmação inline AlertDialog)
- Reordenar: ao soltar, atualiza `ordem` de todos os afetados em batch (loop de updates ou RPC)

**Drawer "Adicionar/Editar campo"** (`FieldEditorDrawer` usando `Sheet`):
- Label (input)
- Key (auto snake_case do label, editável; valida unicidade na categoria via query)
- Tipo: RadioGroup visual com 4 opções (Texto/Número/Seleção única/Múltipla escolha)
- Opções: aparece só para Seleção/Múltipla. Input + botão "Adicionar opção" + lista de chips com ×. Ao trocar tipo para Texto/Número com opções já preenchidas → AlertDialog de confirmação que vai limpar
- Placeholder (input)
- Obrigatório (Switch)
- Ativo (Switch, default on)
- Validações: label obrigatório, key única, tipos select/lista exigem ≥2 opções
- Botões: Cancelar | Salvar campo

### Comportamento de save
Auto-save otimista por ação (toggle, reorder, criar/editar/deletar campo) com toast "Salvo". Sem botão de salvar global — alinhado com o padrão do `AdminCampos` atual.

### Empty state
Bloco B sem campos: card pontilhado "Nenhum campo personalizado ainda. Adicione o primeiro." com botão.

### Permissões
Já protegidas pelo `AdminLayout` existente + RLS no banco.

## Fora de escopo (confirmado pelo briefing)
Upload/galeria, campos condicionais, i18n, versionamento.

## Arquivos

**Criados:**
- `supabase/migrations/<timestamp>_admin_categorias.sql`
- `src/pages/AdminCategorias.tsx`
- `src/pages/AdminCategoriaCampos.tsx`
- `src/components/admin/categorias/CategoryFormDialog.tsx`
- `src/components/admin/categorias/FieldCard.tsx`
- `src/components/admin/categorias/FieldEditorDrawer.tsx`
- `src/components/admin/categorias/SortableFieldCard.tsx`
- `src/lib/slugify.ts`

**Editados:**
- `src/App.tsx` — novas rotas + redirect de `/admin/campos`
- `src/components/admin/AdminLayout.tsx` — item de menu "Categorias" → `/admin/categorias`

**Dependência adicionada:** `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`
