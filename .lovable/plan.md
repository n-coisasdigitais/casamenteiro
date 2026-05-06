# Ajustes — rodada de correções

## 1. Orçamentos enviados não aparecem no Kanban do plano

**Causa:** quando o cliente pede orçamento (`quotes`), apenas a tabela `quotes` é populada. O Kanban (`PlanKanban`) lê `couple_suppliers` — então o card nunca aparece. Hoje só vemos a lista textual na aba "Orçamento" e em "Meu casamento".

**Correção:**
- Em `QuoteRequestForm.tsx` (e qualquer outro ponto de criação de quote): após inserir em `quotes`, fazer `upsert` em `couple_suppliers` com `kanban_status = 'em_orcamento'`, `category_id` do fornecedor e `estimated_value` baseado na faixa do plano (se houver) — reaproveitando o padrão idempotente já implementado em `simulador.ts`.
- Trigger alternativa (mais robusta): criar trigger `AFTER INSERT ON quotes` que insere/atualiza `couple_suppliers` com `kanban_status='em_orcamento'`. Vamos pelo caminho do trigger para garantir consistência mesmo se o quote for criado por outra via.
- Em `WeddingPlan.tsx`, recarregar `items` após esse fluxo (já recarrega no `load`).

## 2. Edge function `send-invite-emails` falhando

**Causa:** chama `enqueue_email` com `queue_name: "transactional_email"` (singular). A fila correta é `"transactional_emails"` (plural) — o `process-email-queue` só processa `auth_emails` e `transactional_emails`.

**Correção:** ajustar `queue_name` para `"transactional_emails"` em `supabase/functions/send-invite-emails/index.ts` e redeployar.

## 3. Cadastro de convidados parou de salvar

**Causa:** `AddGuestDialog` envia `max_companions`, mas a coluna **não existe** em `wedding_guests` (verifiquei o schema). O `insert(...).select().single()` lança erro silencioso e o convidado não é salvo. Isso quebrou após a rodada anterior.

**Correção:**
- Migration: `ALTER TABLE wedding_guests ADD COLUMN IF NOT EXISTS max_companions integer NOT NULL DEFAULT 0;`
- Trocar `.single()` por `.maybeSingle()` no `addGuest` para evitar crash futuro (regra do projeto).
- Mostrar `toast` de erro caso o insert falhe (hoje falha em silêncio).

## 4. Fonte branca / texto ilegível (item 11)

**Causa:** o card "Nenhum fornecedor encontrado nesta faixa…" em `SimuladorResultado.tsx` (linha ~367) usa `background: hsl(var(--color-secondary))` (sage verde) com `color: hsl(var(--color-text-muted))` (cinza escuro). O utilitário `.on-green` que criamos antes só atua via classe — esse bloco usa `style` inline e não recebeu a classe.

**Correção:** trocar para classe `on-green` (e remover o `style.color`) — ou aplicar diretamente `color: white` no bloco e `color: hsl(var(--color-primary))` claro no link. Preferência: aplicar `className="on-green"` e remover cores inline conflitantes; ajustar `.on-green a` no `index.css` para manter o link visível em laranja claro.

## 5. Mover card para "Negociando" não permite editar valores

**Causa:** `PlanKanban.updateStatus` só faz `update({ kanban_status })`. Não há UI para registrar a contraproposta. "Contratado" abre `ContractSupplierDialog`, mas "Negociando" não tem dialog equivalente.

**Correção:**
- Criar `NegotiateSupplierDialog` (similar ao Contract): pede `valor_cotado` (proposed_value) e opcionalmente uma nota. Salva em `couple_suppliers` (`proposed_value`, `kanban_status='negociando'`).
- Em `PlanKanban.requestStatusChange`: quando `newStatus === 'negociando'`, abrir o novo dialog em vez de só atualizar status.
- Permitir reabrir o dialog clicando no card já em "negociando" (botão "Editar valor" no `KanbanCard`), para o caso de a negociação não ter vindo da plataforma.
- Após salvar, `onChange()` recarrega e o card mostra "Cotado: R$ X" (já existe esse render).

## Arquivos afetados

- `supabase/migrations/<nova>.sql` — coluna `max_companions` + trigger `quotes → couple_suppliers`.
- `supabase/functions/send-invite-emails/index.ts` — fix `queue_name`.
- `src/pages/WeddingGuests.tsx` — `.maybeSingle()` + toast de erro.
- `src/pages/SimuladorResultado.tsx` — classe `on-green` no card vazio.
- `src/index.css` — regra `.on-green a` (link visível).
- `src/components/plan/PlanKanban.tsx` — abrir dialog em "negociando"; botão editar valor.
- `src/components/plan/NegotiateSupplierDialog.tsx` — novo arquivo.

Deploy automático da edge function `send-invite-emails` após a edição.
