## O que falta do mapeado (e faz sentido fechar)

Verifiquei o estado atual contra as memórias e o `.lovable/plan.md`. Estas 4 frentes estão no roadmap e têm pontas soltas claras.

---

### 1. Campos dinâmicos no fluxo do fornecedor (fechar o ciclo)

**Hoje:** Admin já cria categorias e campos base + personalizados em `/admin/categorias`. `SupplierOnboarding` carrega `campos_categoria` mas **não renderiza** os personalizados; `SupplierProfile` (público) também não exibe. Não há onde gravar respostas.

**Implementar:**
- Tabela nova `supplier_field_values` (`supplier_id`, `campo_id`, `valor jsonb`) com RLS: leitura pública; escrita só pelo dono (`user_id` do supplier). Unique em `(supplier_id, campo_id)`.
- Renderer genérico `DynamicFieldInput` por `tipo` (texto, textarea, número, select, lista, faixa, booleano, checkbox) usando shadcn.
- `SupplierOnboardingWizard` ganha um passo "Detalhes da categoria" que monta o form a partir de `campos_categoria` ativos da categoria do fornecedor e salva em `supplier_field_values`.
- Aba **Meu Perfil** do `SupplierDashboard`: bloco "Detalhes da categoria" com mesmo form (editável a qualquer momento).
- `SupplierProfile` (público): seção "Sobre" exibe os valores onde `mostrar_no_perfil = true`. Booleano vira chip "Atende fora ✓", número vira "10 anos de experiência" etc.
- `SupplierSearch`: o painel lateral de filtros lê os campos do tipo `select`/`booleano`/`faixa` da categoria escolhida e gera filtros dinâmicos. Aplicação client-side (já estamos paginando local).

**Fora de escopo:** upload em campos, validação condicional.

---

### 2. Anexos no chat de orçamento (UX completa)

**Hoje:** `QuoteRequestForm` e `QuoteThread` já fazem upload em `quote-attachments` (1 arquivo, sem preview, sem validação).

**Implementar:**
- Múltiplos arquivos por mensagem (input `multiple`, lista de chips removíveis antes de enviar).
- Validação: tipos permitidos (`image/*, application/pdf`), tamanho máx 10MB, mensagem clara em pt-BR.
- Preview inline: imagens viram thumbnail clicável (lightbox simples com `Dialog`), PDFs viram link com ícone.
- `QuoteProposalPanel`: permitir anexar contrato/orçamento PDF na proposta. Novo campo `attachment_url text[]` em `quote_proposals` (array).
- Política RLS do bucket `quote-attachments` revisada: ler permitido para casal e fornecedor donos do quote (já está, mas confirmar).

---

### 3. E-mails de quotes + Kanban drag & drop

#### E-mails (usar infra `process-email-queue` já existente)
- Gatilhos no banco (trigger `AFTER INSERT/UPDATE` em `quotes` e `quote_proposals`) chamam `enqueue_email('transactional_emails', payload)` para:
  - Novo orçamento → fornecedor
  - Nova proposta/contraproposta/pedido de desconto → contraparte
  - Contrato fechado (`quotes.status = 'accepted'`) → ambos
- Templates transacionais em `supabase/functions/_shared/email-templates/`: `novo-orcamento.tsx`, `nova-proposta.tsx`, `contrato-fechado.tsx` com identidade visual (terracota/sage, Inter).
- Edge function `send-transactional-email` (criar) chamada pelo dispatcher já existente. Cada e-mail tem link direto: `/orcamento?quote=...` (casal) ou `/fornecedor/painel?tab=quotes&quote=...` (fornecedor).
- Preferência opcional no perfil: campo `email_notifications boolean default true` em `profiles` para o casal/fornecedor optar por desligar.

#### Kanban drag & drop
- `QuotesKanban` (casal) e `SupplierQuotesKanban` (fornecedor) ganham `@dnd-kit/core` + `@dnd-kit/sortable` (já instalados).
- `DndContext` ao redor das 5 colunas; cada coluna é `useDroppable`, cada card é `useDraggable`. Ao soltar, faz o mesmo `update kanban_status` que o Select faz hoje.
- Mantém o Select como fallback acessível (teclado).

---

### 4. SEO técnico + perfil público com campos dinâmicos

**Hoje:** `SEO.tsx` cobre title/description/canonical/OG. Falta JSON-LD, sitemap e og:image dinâmico.

**Implementar:**
- Estender `SEO.tsx` com prop `jsonLd?: object` que injeta `<script type="application/ld+json">`.
- `SupplierProfile`: gerar JSON-LD `LocalBusiness` (nome, endereço, telefone, rating, reviewCount, image) + `AggregateRating` quando houver reviews. og:image = `profile_photo_url`.
- `Home` (`/`): JSON-LD `Organization` + `WebSite` com `SearchAction` apontando para `/buscar?q=...`.
- `SupplierSearch`: title dinâmico ("Fotógrafos em São Paulo — Casamenteiro"), description usando categoria + cidade da URL.
- Edge function `sitemap-xml` (verify_jwt=false) que gera `/sitemap.xml` com Home, /buscar (top categorias×top cidades), /fornecedor/:id (todos aprovados). Adicionar `Sitemap:` no `robots.txt`.
- Canonical em todas as páginas públicas com URL absoluta usando `casamenteiro.com.br`.

---

## Plano de testes

### A. Roteiro manual por persona (pt-BR, clicar e validar)

#### Persona 1 — Admin
1. `/admin/categorias` → criar categoria "Cerimonialista" → confirmar que os 10 campos base aparecem automaticamente em `/admin/categorias/:id/campos`.
2. Adicionar campo personalizado "Tipo de cerimônia" (select com opções Civil/Religiosa/Ambas, obrigatório, `mostrar_no_perfil=true`).
3. Reordenar campos arrastando → verificar persistência ao recarregar.
4. `/admin/fornecedor-landing` → trocar título do hero, fazer upload de novo vídeo → abrir `/fornecedor` em aba anônima e confirmar.
5. `/admin/aprovacao` → aprovar um fornecedor pendente → confirmar que o e-mail dispara (consultar `email_send_log`).

#### Persona 2 — Fornecedor
1. Cadastrar nova conta em `/fornecedor/cadastro`, escolher categoria "Cerimonialista".
2. Completar wizard → no passo "Detalhes da categoria" preencher o campo "Tipo de cerimônia".
3. Após aprovado pelo admin, abrir `/fornecedor/painel` → conferir que o menu (UserMenu) aparece e a aba **Orçamentos** mostra kanban vazio.
4. Receber pedido de orçamento (logar como casal em outro browser) → checar notificação no sino + e-mail.
5. Arrastar card de "Novos" para "Negociando" → enviar proposta com PDF anexo → o casal recebe e-mail.
6. Em "Meu Perfil", editar "Tipo de cerimônia" → ver mudança refletida em `/fornecedor/:id`.

#### Persona 3 — Casal
1. Onboarding (`/onboarding`) → completar com data → checar que as 79 tarefas em `/tarefas` foram seedadas.
2. Buscar em `/buscar?categoria=cerimonialista` → confirmar que o filtro lateral mostra "Tipo de cerimônia" como opção dinâmica.
3. Abrir o perfil → ver bloco "Sobre" com os campos preenchidos pelo fornecedor.
4. Pedir orçamento com 2 imagens + 1 PDF → ver previews antes de enviar.
5. Em `/orcamento`, aba Kanban: arrastar card para "Negociando", pedir desconto, aceitar contraproposta, marcar como contratado → confirmar que `couple_suppliers` e `budget_items` foram criados (visíveis em `/orcamento` e `/meus-fornecedores`).
6. Ir até `/meu-casamento/plano` e conferir que a tarefa correspondente foi auto-completada.

#### Persona 4 — Visitante anônimo (SEO)
1. `view-source:` em `/`, `/fornecedor/:id` e `/buscar?categoria=fotografia&cidade=Rio+de+Janeiro` → ver `<title>`, `meta description` e `application/ld+json`.
2. Abrir `/sitemap.xml` → ver URLs de fornecedores aprovados.
3. Validar JSON-LD em [search.google.com/test/rich-results](https://search.google.com/test/rich-results).

### B. Suíte Vitest (funções puras críticas)

Já existe `vitest.config.ts` e `src/test/setup.ts`. Adicionar:

| Arquivo de teste | Cobre |
|---|---|
| `src/lib/slugify.test.ts` | `slugify` (acentos, espaços, caixa), `toSnakeCase` (chave única, sem espaços) |
| `src/lib/phone.test.ts` | `formatPhoneBR` (8/9 dígitos), `isValidPhoneBR` (rejeita DDD inválido) |
| `src/lib/taskDueDate.test.ts` | Conversão `due_period → due_date` com várias datas de casamento |
| `src/lib/simulador/match.test.ts` | Função de score/ranking de fornecedores no simulador |
| `src/lib/supplierLandingConfig.test.ts` | Merge de config parcial do banco com `DEFAULT_LANDING` (sem perder campos) |
| `src/lib/budgetPdf.test.ts` | Soma de categorias e totais (mockar jsPDF) |

Rodar com `lovable-exec test` ou `bunx vitest run`. Meta: ~30 testes, <5s.

---

## Ordem sugerida de execução

1. **Campos dinâmicos** (libera valor para fornecedor e busca — é o que está mais "no meio")
2. **Anexos completos** (UX rápida, sem migração pesada — só array column)
3. **E-mails + Kanban DnD** (e-mails dependem de templates novos; DnD é incremento isolado)
4. **SEO** (último porque depende dos perfis já estarem ricos com campos dinâmicos)
5. **Testes Vitest** em paralelo ao item 1 (funções puras não dependem do resto)

---

## Arquivos esperados

**Migrações novas:** 1 para `supplier_field_values`, 1 para `attachment_url[]` em `quote_proposals`, 1 para triggers de e-mail, 1 para `email_notifications` em `profiles`.

**Componentes novos:** `DynamicFieldInput`, `DynamicFieldsForm`, `AttachmentList`, `AttachmentUploader`, `KanbanDndProvider`.

**Edge functions novas:** `send-transactional-email`, `sitemap-xml`.

**Templates de e-mail:** `novo-orcamento.tsx`, `nova-proposta.tsx`, `contrato-fechado.tsx`.

**Testes:** 6 arquivos `*.test.ts` em `src/lib/`.

**Editados:** `SupplierOnboardingWizard`, `SupplierDashboard`, `SupplierProfile`, `SupplierSearch`, `QuoteRequestForm`, `QuoteThread`, `QuoteProposalPanel`, `QuotesKanban`, `SupplierQuotesKanban`, `SEO.tsx`, `robots.txt`, `Home`, `package.json` (devDeps de teste).