
# Painel Completo do Casamento - Plano de Implementacao

Este e um projeto grande que cobre 5 funcionalidades principais. Recomendo implementar em **3 fases** para manter a qualidade e evitar problemas.

---

## Fase 1 - Estrutura de Dados + Dashboard Reformulado + Agenda de Tarefas

### 1.1 Novas Tabelas no Banco de Dados

**`wedding_tasks`** - Agenda de tarefas do casal
- `id`, `couple_id` (FK couples), `title`, `description`, `category` (text), `priority` (text: essential/recommended/optional), `due_period` (text: "10-12 meses", "7-9 meses", etc.), `due_date` (date, nullable), `is_completed` (boolean), `completed_at` (timestamp), `is_custom` (boolean), `action_label` (text, nullable), `action_url` (text, nullable), `sort_order` (int), `created_at`, `updated_at`
- RLS: casal so ve/edita suas proprias tarefas

**`wedding_guests`** - Lista de convidados
- `id`, `couple_id` (FK couples), `group_id` (FK guest_groups, nullable), `name`, `email` (nullable), `phone` (nullable), `guest_type` (text: adult/child/baby), `rsvp_status` (text: pending/confirmed/declined), `menu_preference` (text, nullable), `table_number` (int, nullable), `notes` (text, nullable), `created_at`, `updated_at`
- RLS: casal so ve/edita seus proprios convidados

**`guest_groups`** - Agrupamento de convidados
- `id`, `couple_id` (FK couples), `name` (ex: "Familia da Noiva"), `created_at`
- RLS: casal so ve/edita seus proprios grupos

**`budget_items`** - Itens de orcamento por categoria
- `id`, `couple_id` (FK couples), `category` (text), `description` (text), `supplier_id` (FK suppliers, nullable), `estimated_cost` (numeric), `final_cost` (numeric, nullable), `status` (text: estimated/contracted/paid), `notes` (text, nullable), `created_at`, `updated_at`
- RLS: casal so ve/edita seus proprios itens

**`budget_payments`** - Pagamentos registrados
- `id`, `budget_item_id` (FK budget_items), `couple_id` (FK couples), `amount` (numeric), `payment_date` (date), `due_date` (date, nullable), `status` (text: paid/pending/overdue), `description` (text, nullable), `created_at`
- RLS: casal so ve/edita seus proprios pagamentos

**`couple_suppliers`** - Fornecedores contratados/salvos pelo casal
- `id`, `couple_id` (FK couples), `supplier_id` (FK suppliers), `category_id` (FK categories), `status` (text: saved/contacted/contracted), `contract_value` (numeric, nullable), `notes` (text, nullable), `created_at`, `updated_at`
- RLS: casal so ve/edita seus proprios fornecedores

### 1.2 Seed de Tarefas Padrao

Criar uma funcao de banco `seed_default_tasks(couple_id, wedding_date)` que popula ~100 tarefas padrao organizadas por periodo (10-12 meses, 7-9, 4-6, 2-3, ultimo mes, ultimas semanas, dia do casamento), inspiradas na imagem de referencia do casamentos.com.br.

### 1.3 Dashboard Reformulado (`/dashboard`)

O dashboard atual sera expandido com:

- **Cabecalho personalizado**: Saudacao "Ola, [Nome] & [Parceiro]", foto do casal (upload), contador regressivo visual
- **KPIs com barra de progresso**: Tarefas (X/Y concluidas), Orcamento (gasto/total), Convidados (confirmados/total), Fornecedores (contratados/total)
- **Proximas 3 tarefas urgentes**: com checkbox para marcar direto do painel
- **Widget Orcamento**: custo estimado vs final, botao "+ Adicionar Gasto"
- **Widget Convidados**: resumo RSVP (confirmados, pendentes, recusados)
- **Acoes rapidas**: links para Tarefas, Fornecedores, Convidados, Orcamento
- **Secao de orcamentos/quotes** (ja existente, mantida)

### 1.4 Navegacao por Abas no Header

Adicionar barra de navegacao secundaria abaixo do header principal com icones:
- Meu Casamento | Agenda de Tarefas | Fornecedores | Convidados | Orcamento | Perfil

### 1.5 Pagina Agenda de Tarefas (`/tarefas`)

- Cabecalho com progresso "Voce completou X de Y tarefas" + barra de progresso
- Botao "+ Criar nova tarefa"
- Filtros na lateral esquerda: por estado (pendentes/completadas), por data/periodo, por categoria
- Lista principal agrupada por periodo ("De 10 a 12 meses", "De 7 a 9 meses", etc.)
- Cada tarefa: checkbox, titulo, tags de categoria, link de acao
- Botoes "Baixar" e "Imprimir"

---

## Fase 2 - Fornecedores + Convidados

### 2.1 Pagina Meus Fornecedores (`/meus-fornecedores`)

- Cabecalho: "Meus Fornecedores", contador "X de Y contratados"
- Filtros: Guardados (favoritos) e Contratados
- Botao "+ Adicionar fornecedor" (externo)
- Grid de categorias com cards (icone, nome, botao "Pesquisar")
- Indicador visual se categoria ja tem fornecedor contratado

### 2.2 Pagina Meus Convidados (`/convidados`)

- Dashboard no topo: total de convidados (adultos/criancas/bebes), RSVP (confirmados/pendentes/recusados), mesas
- Botoes: "+ Convidado", "+ Grupo", "Enviar mensagem", "Baixar", "Imprimir"
- Tabela com busca, selecao em massa
- Agrupamento por grupo (ex: "Familia da Noiva")
- Cada linha: checkbox, nome, dropdown RSVP, dropdown menu, dropdown mesa, acoes
- Importacao de CSV/Excel (futuro)

---

## Fase 3 - Orcamento

### 3.1 Pagina Gestao de Orcamento (`/orcamento`)

- Painel resumo: custo estimado, custo final, saldo
- Grafico de pizza com distribuicao por categoria (usando Recharts, ja instalado)
- Detalhamento por categoria na lateral (valor orcado vs gasto, barra de progresso)
- Aba "Fornecedores": tabela com fornecedor, categoria, status, valor proposta, valor pago, saldo
- Aba "Pagamentos": tabela com descricao, vencimento, valor, status, botao "Marcar como pago"
- Botao "+ Adicionar Despesa Manual"

---

## Resumo de Arquivos

### Novas paginas
- `src/pages/WeddingTasks.tsx` - Agenda de Tarefas
- `src/pages/MySuppliers.tsx` - Meus Fornecedores
- `src/pages/WeddingGuests.tsx` - Meus Convidados
- `src/pages/WeddingBudget.tsx` - Gestao de Orcamento

### Novos componentes
- `src/components/DashboardNav.tsx` - Barra de navegacao secundaria com abas/icones
- `src/components/TaskItem.tsx` - Linha de tarefa reutilizavel
- `src/components/GuestRow.tsx` - Linha de convidado reutilizavel
- `src/components/BudgetChart.tsx` - Grafico de distribuicao de gastos
- `src/components/AddExpenseDialog.tsx` - Dialog para adicionar gasto
- `src/components/AddGuestDialog.tsx` - Dialog para adicionar convidado
- `src/components/AddTaskDialog.tsx` - Dialog para criar tarefa personalizada

### Arquivos modificados
- `src/App.tsx` - Novas rotas (/tarefas, /meus-fornecedores, /convidados, /orcamento)
- `src/pages/CoupleDashboard.tsx` - Reformulacao completa com KPIs, widgets e navegacao
- `src/components/UserMenu.tsx` - Adicionar links para novas paginas

### Migracao de banco
- 1 migracao SQL criando as 6 tabelas com RLS
- 1 migracao com funcao `seed_default_tasks` e trigger para popular tarefas ao completar onboarding

---

## Consideracoes Tecnicas

- **Recharts** ja esta instalado para os graficos de orcamento
- **date-fns** ja esta instalado para manipulacao de datas
- Todas as tabelas terao RLS baseado no `couple_id` do usuario autenticado, usando a funcao existente `get_couple_id_for_user`
- Upload de foto do casal usara o bucket `supplier-photos` existente ou criaremos um novo bucket `couple-photos`
- A seed de tarefas sera executada automaticamente quando o casal completar o onboarding

Recomendo comecar pela **Fase 1** (banco + dashboard + tarefas), que e a base para tudo. Posso implementar fase por fase para manter o controle de qualidade.
