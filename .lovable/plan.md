## Objetivo

Corrigir a experiência atual em que as 79 tarefas nascem marcadas em vermelho quando o casamento está próximo, e reorganizar a visualização para focar no que importa agora.

## Diagnóstico rápido (confirmado)

- `default_tasks` tem 79 linhas (41 essenciais, 29 recomendadas, 9 opcionais) e coluna `priority`. Não precisa nova coluna — reaproveitamos `priority='essential'`, apenas revisando a lista para deixar entre 20-25 essenciais.
- `wedding_tasks` já tem `due_date`, `due_period`, `priority`, `created_at`, `is_custom`, `auto_completed_*`. Falta um marcador de "criada em faixa passada" para distinguir de "vencida em uso".
- `WeddingTasks.tsx` renderiza tudo agrupado por `due_period` na ordem fixa. `TaskItem` marca `overdue` (vermelho) sempre que `due_date < hoje`.
- `seed_default_tasks_from_table` gera todas as 79 sem levar em conta o quão perto está o casamento.

## Mudanças

### 1. Banco (migration)

- **`default_tasks`**: revisar `priority`. Rebaixar para `recommended` as ~16-21 tarefas essenciais menos críticas para deixar 20-25 verdadeiramente essenciais (as âncoras: local, buffet, foto, música, alianças, convites, cerimônia civil, decoração, RSVP, últimos ajustes, dia D).
- **`wedding_tasks`**: adicionar coluna `seeded_as_backlog boolean NOT NULL DEFAULT false`. Sinaliza tarefas cujo `due_period` já estava vencido no momento do plano — vão para o bucket "Comece por aqui" e nunca aparecem como "Atrasada".
- **Nova função `seed_default_tasks_smart(_couple_id, _wedding_date)`** (SECURITY DEFINER, search_path=public):
  1. Calcula `meses_ate` = meses entre hoje e `_wedding_date` (NULL → semeia tudo como hoje).
  2. Define, para cada `due_period`, se está `passado`, `atual`, `futuro` em relação a `meses_ate`.
  3. Se `meses_ate < 6`: insere só tarefas `priority='essential'` (das faixas atual + futuras) + as vencidas essenciais como backlog. Insere também uma tarefa marcadora `is_custom=true`, título "Adicionar tarefas detalhadas ao meu plano", `action_label='Adicionar todas'`, `action_url='/tarefas?expandir=1'`.
  4. Caso contrário: insere todas as ativas.
  5. Para toda tarefa cujo `due_period` está `passado`, marca `seeded_as_backlog=true` e zera `due_date` (não vira "Atrasada").
  6. Preserva a chamada de `recalc_task_due_dates` no fim para faixas atual/futura.
- **Trigger `trigger_seed_tasks_on_onboarding`**: passa a chamar `seed_default_tasks_smart` em vez de `seed_default_tasks`.
- **Não deleta nada de casais existentes.** Migração só afeta novos onboardings e novas semeaduras manuais.
- **Endpoint manual para expandir**: função `expandir_tarefas_detalhadas(_couple_id)` que insere as tarefas não-essenciais que faltam, respeitando faixas passadas como backlog. Chamada pelo botão "Adicionar tarefas detalhadas".

### 2. Front (`src/lib/taskDueDate.ts` + `TaskItem`)

- `dueStatus` recebe também `createdAt` e `seededAsBacklog`. Regra nova para "overdue":
  - Se `seededAsBacklog` → retorna `"backlog"` (sem vermelho).
  - Se `due_date < hoje` **E** `due_date > createdAt` → `"overdue"` (vermelho).
  - Caso contrário, mesmo se `due_date < hoje` mas foi criada depois do prazo → `"backlog"`.
- `TaskItem`: novo chip cinza "Comece por aqui" para `backlog`; mantém "Atrasada" vermelho só para `overdue` real.

### 3. Front (`src/pages/WeddingTasks.tsx`)

- Carrega `created_at` e `seeded_as_backlog` no select.
- **Agrupamento** vira: `["comece-aqui", ...periodOrder]`, onde `comece-aqui` recebe tudo com `seeded_as_backlog=true`.
- **Ordena "Comece por aqui"** por `priority` (essential → recommended → optional).
- **Colapso por padrão**:
  - Identifica `faseAtual` = primeira faixa não-passada com tarefas pendentes.
  - Expande por padrão: `comece-aqui`, `faseAtual`, `faseSeguinte`. As demais ficam recolhidas atrás de um botão "Ver todas as fases".
- **Resumo (header)**:
  - Destaque grande: "Nesta fase: **X/Y concluídas** — {periodLabels[faseAtual]}".
  - Linha menor, cinza: "Total geral: N/M ({pct}%)".
  - Barra de progresso passa a refletir a fase atual; total vira texto secundário.
- **Botão "Adicionar tarefas detalhadas"** aparece quando a tarefa marcadora está presente; chama a RPC `expandir_tarefas_detalhadas` e recarrega.

### 4. Filtros

- Novo item no filtro de Período: "Comece por aqui" no topo, antes de "10-12 meses".

## Detalhes técnicos

```text
Regra de faixa vs. meses_ate:
  10-12 meses     → passado se meses_ate < 10
  7-9 meses       → passado se meses_ate < 7
  4-6 meses       → passado se meses_ate < 4
  2-3 meses       → passado se meses_ate < 2
  ultimo-mes      → passado se meses_ate < 1
  ultima-semana   → passado se dias_ate < 7
  dia-do-casamento→ nunca "passado" antes do dia
```

```text
faseAtual = menor faixa cujo início ≤ meses_ate
faseSeguinte = próxima na ordem
```

## Fora do escopo

- Não mexe em `couples`, `budget_items`, `guest_*`, kanban.
- Não altera visual dos filtros (só adiciona "Comece por aqui").
- Não migra tarefas de casais existentes — a nova lógica vale para novos plans e para quem clicar em "resetar" (não implementado nesta iteração).

## Idioma

Todos os labels em pt-BR: "Comece por aqui", "Adicionar tarefas detalhadas ao meu plano", "Ver todas as fases", "Nesta fase", "Total geral".
