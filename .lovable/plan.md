## Meus Fornecedores + Aba Orçamento — Reestruturação

### Parte 1 — Página "Meus Fornecedores" (`src/pages/MySuppliers.tsx`)

**1. Correção do bug "Guardados (0)"**
Hoje a lista `couple_favorites` é buscada, mas o cálculo de `savedCategoriesCount` depende de `category_id` — coluna que não existe em `couple_favorites` e é preenchida via `supMap` apenas se o `supplier` também está em `couple_suppliers`. Quando o casal só favoritou (sem inserir em `couple_suppliers`), o supplier não é carregado e `category_id` fica `null`.
Correção: incluir os IDs de fornecedores dos favoritos na query `suppliers.in("id", ids)` (já é feito), mas garantir que o filtro `filter(favoritedCategoryIds.has(cat.id))` conte também favoritos cujo supplier não está em couple_suppliers. Adicionar log de fallback e assegurar que `supMap` cobre `favList`.

**2. Tags de status reais**
Substituir a badge única "Guardado/Contratado" por chips derivados de `couple_suppliers.kanban_status` + `quotes` + `couple_favorites`:
- `Contratado` (emerald) — `kanban_status = 'contratado'`
- `Negociando` (blue) — `kanban_status = 'negociando'`
- `Em orçamento` (amber) — `kanban_status = 'em_orcamento'` ou tem `quote` aberta
- `No plano` (slate) — `kanban_status = 'nao_iniciado'`
- `Favorito` (rose outline) — só em `couple_favorites`, sem couple_supplier

Um fornecedor pode ter Contratado + Favorito, então o card mostra mais de uma tag quando aplicável.

**3. Múltiplos fornecedores por categoria**
Card de categoria vira lista compacta empilhada (sem carrossel):
```
[icon] Fotografia                    [Ver mais 2]
 ─ Studio Luz     [Contratado]  ›
 ─ Foto Bruna     [Negociando]  ›
 ─ Alex Photos    [Favorito]    ›
 [+ Pesquisar mais]
```
Mostra até 3 linhas; se houver mais, botão "Ver mais N" expande inline. Cada linha é clicável e vai para `/fornecedor/:id`. Botão "Pesquisar" permanece no rodapé do card.

**4. Perfil do fornecedor com contexto do casal**
Em `src/pages/SupplierProfile.tsx`, quando existir `couple_suppliers` ou `quote` para este par (couple, supplier):
- Chip de status no topo (mesma paleta das tags acima)
- CTA principal muda:
  - Sem interação: "Pedir orçamento" (abre `QuoteRequestForm`)
  - Com quote/negociando: "Ver conversa" (abre o Dialog de `QuoteConversation` — reaproveitar padrão do WeddingPlan)
  - Contratado: "Registrar pagamento" + "Ver conversa" secundário

---

### Parte 2 — Aba Orçamento (`src/pages/WeddingPlan.tsx` + `src/components/plan/*`)

**1. Painel do PLANO sempre visível (extrato)**
Novo componente `PlanBudgetSidebar.tsx` renderizado à esquerda do Kanban em desktop, e como acordeão acima do Kanban em mobile:
```
Plano                            R$ 228.000
├─ Recepção       R$ 60.000 [▸]
│    └─ (ao expandir) lista fornecedores dessa categoria com valor cotado/contratado e status
├─ Fotografia     R$ 18.000 [▸]
...
Cotado            R$  92.400
Contratado        R$  35.000
Saldo             R$ 100.600
```
Fonte de dados: `budget_items` (verba planejada por categoria) + agregações de `items` (couple_suppliers). Recolhível com botão "Ocultar plano" no desktop.

**2. Painel lateral ao clicar num card (estilo Trello)**
Novo `CardDetailDrawer.tsx` (Sheet lateral):
- Cabeçalho: nome, categoria, chip de status, valor plano/cotado/contratado
- Abas ou seções:
  - **Dados**: telefone/WhatsApp/site do fornecedor
  - **Conversa**: `QuoteConversation` inline (do quote associado, se houver)
  - **Histórico**: linha do tempo (`created_at`, mudanças de status, mensagens automáticas de "movido de X → Y")
- Rodapé com botões: `Pedir orçamento` · `Abrir conversa` · `Marcar contratado` · `Registrar pagamento` · `Descartar`

O clique no card do `PlanKanban` deixa de fazer drag imediato (drag por handle do avatar/ícone) e abre o drawer. Alternativa mais segura: drag continua igual, mas botão "Abrir" no card abre o drawer.

**3. Status transparente com toast + histórico**
Nova tabela `couple_supplier_events` (migration):
- `id`, `couple_supplier_id`, `type` ('status_change' | 'quote_sent' | 'message' | 'contract' | 'payment'), `from_status`, `to_status`, `payload jsonb`, `created_at`, `created_by`
- RLS: casal vê os próprios
- Triggers já existentes (`sync_quote_to_couple_supplier`, `sync_couple_supplier_on_proposal`, `handle_kanban_contracted`) passam a inserir eventos
- No frontend, sempre que a UI detectar transição automática (ex.: retorno do `load()` mostra novo status), disparar toast pt-BR explicando:
  > "Fotógrafo Studio Luz movido para 'Em orçamento' — pedido enviado agora."
- Drawer renderiza os eventos como timeline.

**4. Comunicação em massa — sub-aba "Contatar fornecedores"**
Remover o bloco "Enviar orçamento para fornecedores" de `BudgetTab.tsx` e criar sub-aba dedicada dentro da aba Orçamento (Tabs internas):
- **Resumo** (o que hoje é BudgetTab: comparativo e projeção)
- **Contatar fornecedores** (novo)

Novo `BulkContactTab.tsx` reaproveitando o padrão de `BulkContactDialog.tsx`:
- Tabela com checkbox: fornecedor, categoria, status, canal disponível (email ✓ / pedido interno ✓ / whatsapp — só individual)
- Filtros: por categoria, por status
- Escolha de canal: `Pedido interno da plataforma` (rastreável, cria `quotes`) ou `E-mail` (via edge function `send-invite-emails` estendida)
- **WhatsApp em massa fica desabilitado** com aviso: "Envio em massa via WhatsApp não é permitido pela política do WhatsApp. Use 'Pedido interno' (rastreado) ou envie individualmente pelo card do fornecedor."
- Preview da mensagem (com `{{nome}}` / `{{categoria}}`) antes de disparar
- Ao enviar por pedido interno: cria linhas em `quotes` (igual `BulkContactDialog.sendPlatform`) e mostra progresso
- Ao enviar por e-mail: chama função edge `send-bulk-supplier-emails` (novo endpoint) que envia via mesmo template transacional e registra em `couple_supplier_events`

Individual (single card) continua com opção WhatsApp habilitada no drawer.

---

### Detalhes técnicos

**Migração**
```sql
CREATE TABLE public.couple_supplier_events (
  id uuid primary key default gen_random_uuid(),
  couple_supplier_id uuid not null references public.couple_suppliers(id) on delete cascade,
  type text not null,
  from_status text,
  to_status text,
  payload jsonb,
  created_by uuid,
  created_at timestamptz not null default now()
);
GRANT SELECT, INSERT ON public.couple_supplier_events TO authenticated;
GRANT ALL ON public.couple_supplier_events TO service_role;
ALTER TABLE public.couple_supplier_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Casal vê próprios eventos" ON public.couple_supplier_events
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.couple_suppliers cs
      JOIN public.couples c ON c.id = cs.couple_id
      WHERE cs.id = couple_supplier_id AND c.user_id = auth.uid()
    )
  );
-- policy de INSERT similar; triggers rodam como SECURITY DEFINER
```
Ajustar triggers existentes para inserir `type='status_change'` com `from_status`/`to_status`.

**Nova edge function**: `send-bulk-supplier-emails` (usa `RESEND_API_KEY` já cadastrado).

**Arquivos afetados**
- `src/pages/MySuppliers.tsx` — correção do bug, lista compacta com tags
- `src/pages/SupplierProfile.tsx` — chip de status do casal + CTA condicional
- `src/pages/WeddingPlan.tsx` — grid com sidebar + sub-tabs em Orçamento
- `src/components/plan/PlanBudgetSidebar.tsx` (novo)
- `src/components/plan/CardDetailDrawer.tsx` (novo)
- `src/components/plan/BulkContactTab.tsx` (novo)
- `src/components/plan/BudgetTab.tsx` — remove seção de envio em massa
- `src/components/plan/PlanKanban.tsx` — botão "Abrir" no card + toast em transições
- `supabase/functions/send-bulk-supplier-emails/index.ts` (novo)

Tudo em pt-BR; visual mantido (tokens semânticos, mesmos componentes shadcn).