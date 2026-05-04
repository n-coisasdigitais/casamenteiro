## Objetivo

Simplificar o modelo: **Simulação** é só ponto de partida; **Plano = Orçamento** (mesma fonte de dados); **Fornecedores contratados** entram automaticamente; **Tarefas** se concluem com confirmação do casal.

---

## 1. Unificar Plano e Orçamento

- A página `/orcamento` passa a ler de `couple_suppliers` + `budget_items` (não mais da `home_simulacoes`).
- A página `/meu-plano/:id` vira um redirect para `/orcamento` (ou é removida do menu — manter rota só por compatibilidade).
- **Estrutura única do Orçamento:**
  - Cabeçalho com meta total (`couples.target_budget`) + total estimado + total contratado.
  - Lista de categorias (vindas de `categories` ativas no plano), cada uma com:
    - valor estimado (vindo de `couple_suppliers.estimated_value` ou `budget_items.estimated_cost`)
    - fornecedor vinculado (se houver) + status
    - botão para editar valor / adicionar fornecedor manualmente / remover
- **Quando há nova simulação:** apenas adiciona categorias/valores que ainda não existem no plano (merge, nunca sobrescreve). Categorias já contratadas são preservadas.

## 2. Empty state do Orçamento (sem simulação)

- Card grande no topo: "Comece definindo seu orçamento"
- Dois CTAs lado a lado:
  - **"Fazer simulação"** → vai para `/simulador`
  - **"Definir manualmente"** → abre dialog pedindo meta total (R$) e popula categorias usando `budget_distribution_defaults` (porte simples/médio/grande conforme valor).

## 3. Pop-up de confirmação ao contratar fornecedor

- Em `QuoteProposalPanel.marcarContratado` e em `QuotesKanban` (adicionar contrato manual) e em `MySuppliers` (marcar contratado):
  - Após gravar o contrato, **buscar tarefas abertas** com `ilike '%contratar%[categoria]%'` em `wedding_tasks` do casal.
  - Se houver pelo menos 1, abrir um **AlertDialog**: 
    > "Podemos finalizar a tarefa 'Contratar Fotografia'?"
    > [Sim, finalizar] [Manter aberta]
  - Ao confirmar: marca `is_completed = true`, `completed_at = now()` e grava `supplier_id` na tarefa (vincular fornecedor).
- Remover a finalização automática silenciosa que existe hoje no trigger/função.

## 4. Vincular fornecedor à tarefa

**Migração:**
```sql
ALTER TABLE wedding_tasks ADD COLUMN supplier_id uuid REFERENCES suppliers(id);
```
- Exibir badge na tarefa quando vinculada: "Contratado: [Nome do fornecedor]" + link para perfil.

## 5. Simplificar navegação

- No `DashboardNav`, manter: **Painel · Tarefas · Convidados · Orçamento · Fornecedores · Perfil**.
- Remover link "Meu Plano" (substituído por Orçamento).
- A simulação some do menu principal — fica como CTA dentro de Orçamento e na home.

## 6. Resumo visual do fluxo unificado

```text
Simulação (opcional)
        │
        ▼
   ORÇAMENTO  ◄────  Fornecedores contratados (auto-add)
   (= Plano)         Itens manuais
        │
        ▼
   TAREFAS  ◄────  Pop-up "Finalizar Contratar X?"
                        ao marcar fornecedor contratado
```

---

## Arquivos afetados

- **Migração SQL:** adicionar `wedding_tasks.supplier_id`; ajustar `sync_budget_on_contract` para não tocar em tarefas (movido para o front com confirmação).
- **`src/pages/WeddingBudget.tsx`:** reescrever para ser fonte única (lê `couple_suppliers` + `budget_items`); novo empty state; merge de simulação.
- **`src/pages/MeuPlano.tsx`:** vira redirect → `/orcamento`.
- **`src/components/DashboardNav.tsx`:** remover "Meu Plano".
- **`src/components/QuoteProposalPanel.tsx`:** adicionar AlertDialog de confirmação de tarefa.
- **`src/components/QuotesKanban.tsx`:** mesmo dialog ao adicionar contrato manual.
- **`src/pages/MySuppliers.tsx`:** mesmo dialog ao alterar status para contratado.
- **`src/pages/WeddingTasks.tsx`:** exibir badge "Contratado: [Fornecedor]".
- **Novo componente:** `ConfirmFinishTaskDialog.tsx` reutilizável.
- **Novo componente:** `BudgetManualSetupDialog.tsx` para definir meta + distribuição padrão.
