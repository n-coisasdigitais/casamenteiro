
# Reconstrução do Plano de Casamento — 3 abas integradas

## Decisão central: reusar a estrutura atual do banco

Você pediu para considerar a estrutura atual e apenas ajustar. As tabelas que você descreveu no SQL **já existem com nomes diferentes** e em uso em todo o app. Criar `planos`, `plano_fornecedores`, `pagamentos` e `tarefas` novas duplicaria dados e quebraria o que já funciona (kanban, simulador, tarefas com seed de 79 itens, RLS por casal, etc.). Mapeamento:

| Spec (SQL novo) | Tabela existente que cobre o caso | Ajuste necessário |
|---|---|---|
| `planos` | `couples` (+ `home_simulacoes` para a versão simulada) | Já tem `target_budget`, `wedding_date`, `estimated_guests`. Adicionar `cidade`, `estilo` se faltar. |
| `plano_fornecedores` | `couple_suppliers` | Adicionar coluna `kanban_status` com 5 valores. Já tem `valor_plano` (estimated_value), `valor_cotado` (proposed_value), `valor_contratado` (contract_value/final_value), `notas`, `category_id`. |
| `pagamentos` | `budget_payments` | Já tem `amount`, `due_date`, `payment_date`, `status`, `description`, `budget_item_id`. Adicionar índice e link via `budget_items.supplier_id` para chegar ao fornecedor. |
| `tarefas` | `wedding_tasks` (já com 79 tarefas seed por categoria) | Já tem `category`, `completed`, `couple_id`. Adicionar `auto_completed_at` e `auto_completed_source` para marcar quando o sistema concluiu. |

A única tabela auxiliar que faz sentido criar é o vínculo entre `couple_suppliers` e a linha do kanban — mas isso já está coberto pelo próprio `couple_suppliers` mais um campo `kanban_status`.

## Migração SQL (mínima)

```sql
-- 1. Status de kanban no fornecedor do casal
alter table couple_suppliers
  add column if not exists kanban_status text not null default 'nao_iniciado';
-- valores: nao_iniciado | em_orcamento | negociando | contratado | descartado

-- 2. Ordem dentro da coluna (drag & drop)
alter table couple_suppliers
  add column if not exists kanban_order int not null default 0;

-- 3. Marcar tarefas concluídas pelo sistema
alter table wedding_tasks
  add column if not exists auto_completed_at timestamptz,
  add column if not exists auto_completed_source text;

-- 4. Cidade/estilo do plano (opcional — hoje vem da simulação)
alter table couples
  add column if not exists wedding_city text,
  add column if not exists wedding_style text;

-- 5. Trigger: ao mudar kanban_status para 'contratado',
--    marcar tarefas da mesma categoria como concluídas e
--    sincronizar com couple_suppliers.status = 'contracted'
--    (a função sync_budget_on_contract já existe e cuida do budget_items)
create or replace function public.handle_kanban_contracted()
returns trigger language plpgsql security definer set search_path=public as $$
declare _cat_slug text; _task_count int;
begin
  if new.kanban_status = 'contratado'
     and (old.kanban_status is distinct from 'contratado') then
    -- garante o status legado usado pelos outros triggers
    new.status := 'contracted';
    new.contracted_at := coalesce(new.contracted_at, now());

    select coalesce(slug, name) into _cat_slug
      from categories where id = new.category_id;

    if _cat_slug is not null then
      update wedding_tasks
        set completed = true,
            completed_at = now(),
            auto_completed_at = now(),
            auto_completed_source = 'kanban_contracted'
        where couple_id = new.couple_id
          and completed = false
          and (category = _cat_slug or category ilike _cat_slug || '%');
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_kanban_contracted on couple_suppliers;
create trigger trg_kanban_contracted
  before update on couple_suppliers
  for each row execute function public.handle_kanban_contracted();
```

Nada quebra: `sync_budget_on_contract` continua disparando quando `status='contracted'`.

## Estrutura da página `/orcamento`

```text
┌─────────────────────────────────────────────────────────────┐
│ Header do plano (sempre visível)                            │
│ "Casamento Silva & Fernandes"          [+ Solicitar orçam.] │
│ 12/10/2026 · São Paulo · 120 conv. · Médio                  │
├─────────────────────────────────────────────────────────────┤
│ [Orçamento R$80k] [Cotado R$54k] [Contratado R$32k] [A pagar│
│                                                  R$18k]      │
│                                          próx: 15/05 (Buffet)│
├─────────────────────────────────────────────────────────────┤
│ Tabs: [ Kanban ]  [ Orçamento ]  [ Pagamentos ]             │
└─────────────────────────────────────────────────────────────┘
```

### Aba 1 — Kanban (substitui o `QuotesKanban` atual)

- 5 colunas: Não iniciado / Em orçamento / Negociando / Contratado / Descartado.
- Fonte: `couple_suppliers` filtrado por `couple_id`, agrupado por `kanban_status`.
- Drag & drop com `@dnd-kit/core` (instalar). Mobile: scroll horizontal.
- Card mostra: categoria (slug → nome via `categories`), `company_name`, valor do plano, valor cotado (amber se >0), valor contratado (verde se status=contratado), badge de status.
- Mover para "Contratado" → abre **modal de contratação** (valor + parcelas) antes de confirmar.
- Mover para "Descartado" → confirm "Quer ver substitutos?" → leva para `/buscar?categoria=…`.
- Ao contratar: o trigger marca tarefa correspondente como concluída → toast "✓ Tarefa '…' concluída automaticamente".

### Modal: Contratar fornecedor

- Campo "Valor contratado" (obrigatório).
- Campo "Notas" (opcional).
- Repeater de parcelas (mín 1): descrição, valor, vencimento. Botão "Adicionar parcela".
- Atalhos: "Sinal 50% / Restante", "30/30/40", "À vista".
- Ao confirmar:
  1. `update couple_suppliers set kanban_status='contratado', contract_value=X, final_value=X, notes=…`
  2. Trigger sincroniza `status='contracted'` + `budget_items` + tarefa concluída.
  3. `insert budget_payments` (uma linha por parcela, ligadas ao `budget_item` recém-criado/atualizado via `supplier_id`).

### Aba 2 — Orçamento

Card esquerdo "Plano vs realidade por categoria":
- Linha por categoria com status dot, nome, valor real (cotado/contratado) vs valor do plano.
- Diferença em vermelho (acima) ou verde (abaixo); "—" se ainda não cotado.

Card direito "Projeção total":
- Plano original = `couples.target_budget`.
- Contratado = soma `contract_value` onde `kanban_status='contratado'`.
- Cotado/negociando = soma `proposed_value || estimated_value` onde status em (em_orcamento, negociando).
- Não iniciado = soma `estimated_value` onde `kanban_status='nao_iniciado'`.
- Projeção total = soma das 3. Vermelho se > plano; verde se ≤ plano.

Painel inferior "Enviar orçamento para fornecedores":
- Mensagem auto-gerada com nome do casal, data, cidade, convidados, categoria, valor do plano.
- Lista checkboxes de fornecedores com status `nao_iniciado` ou `em_orcamento`.
- Botão "WhatsApp" por linha gera `wa.me/55<whatsapp>?text=<encoded>`.
- Botão "Enviar para selecionados": abre cada link em sequência (`window.open` com pequeno delay) e atualiza `kanban_status='em_orcamento'`.

### Aba 3 — Pagamentos

3 metric cards:
1. Total contratado + barra de progresso (pago/contratado).
2. Próximo vencimento (amber, com data e fornecedor).
3. Em aberto (soma pendentes).

Tabela ordenada por `due_date` asc:
| Fornecedor | Categoria | Parcela (description) | Valor | Vencimento | Status badge | Ação |

Status badges:
- `paid` → verde "Pago".
- `pending` + venc < hoje → vermelho "Atrasado".
- `pending` + venc ≤ hoje+7d → amber "Vence em Nd".
- `pending` outros → neutro "A pagar".

Ação "Marcar como pago" → mini-dialog confirmando valor e data → `update budget_payments set status='paid', payment_date=…`.

Banners no topo da aba:
- Amber se há pendente vencendo em ≤7d.
- Vermelho se há atrasado.

## Arquivos a criar/editar

**Novos:**
- `src/pages/WeddingPlan.tsx` — página principal com header + tabs (rota `/meu-casamento/plano` + alias `/orcamento`).
- `src/components/plan/PlanHeader.tsx` — header + 4 metric cards.
- `src/components/plan/PlanKanban.tsx` — kanban com dnd-kit (substitui visual de `QuotesKanban`).
- `src/components/plan/ContractSupplierDialog.tsx` — modal contratação + parcelas.
- `src/components/plan/BudgetTab.tsx` — comparativo + projeção + envio em massa.
- `src/components/plan/PaymentsTab.tsx` — tabela de pagamentos + banners.
- `src/components/plan/MarkAsPaidDialog.tsx`.
- `supabase/migrations/<timestamp>_plan_kanban_v2.sql` — migração descrita acima.

**Editados:**
- `src/App.tsx` — adicionar rota `/meu-casamento/plano`; manter `/orcamento` apontando para a nova página.
- `src/pages/WeddingBudget.tsx` — substituir conteúdo pelo novo `<WeddingPlan/>` (ou redirect).
- `src/pages/SimuladorResultado.tsx` — em `finalizarPlano`, gravar `kanban_status='nao_iniciado'` e popular `wedding_city`/`wedding_style`.
- `src/components/DashboardNav.tsx` — atualizar label/destino se necessário.
- `package.json` — `bun add @dnd-kit/core @dnd-kit/sortable`.

## Detalhes técnicos importantes

- Sempre `.maybeSingle()` (regra do projeto).
- RLS já cobre tudo via `get_couple_id_for_user(auth.uid())`.
- "Plano de casamento" = registro único em `couples` (não criamos tabela `planos` separada). A "simulação assumida como real" continua sendo `home_simulacoes` mais recente cujos picks foram salvos em `couple_suppliers` pelo `finalizarPlano`.
- O kanban antigo (`QuotesKanban`) é removido da página `/orcamento`; conversas de quotes continuam acessíveis em `/meus-fornecedores`.
- Toast usa `@/hooks/use-toast` (padrão do projeto).
- Sem cores novas: usar tokens do design system (terracotta/sage; nada de roxo/vermelho fora do `destructive`).

## O que **não** vou fazer

- Não vou criar tabelas `planos`, `plano_fornecedores`, `pagamentos`, `tarefas` novas — duplicaria o que já existe e quebraria triggers/RLS/seed de tarefas.
- Não vou mexer no fluxo do simulador além de gravar os campos novos.
- Não vou remover `QuotesKanban` do código (fica disponível caso seja útil em outro lugar), só do `/orcamento`.

Aprovando, implemento tudo: migração + 7 componentes + ajustes nas rotas e simulador.
