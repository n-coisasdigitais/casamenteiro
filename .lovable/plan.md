# Plano: Estrutura de Banco para Simulador de Orçamento

Objetivo: preparar o banco para a nova versão centrada no **simulador**, sem mexer em layout/UX agora. Apenas adicionar/criar o que falta, preservando o que já existe.

## 1. Estender `suppliers` (campos faltantes)

Adicionar colunas via migration (todas nullable para não quebrar dados atuais):

- `whatsapp text`
- `instagram text`
- `website text`
- `profile_photo_url text`
- `accepts_idle_dates boolean default false`
- `idle_discount_pct integer` (desconto específico para datas ociosas, distinto de `promo_percentage`)

Campos já existentes que cobrem a proposta: `id`, `category_id` (categoria), `company_name` (nome), `city`, `state`, `phone`, `price_min`/`price_max` (faixa de preço), `status`, `featured` (destaque), `created_at`. Galeria já está em `supplier_photos` (mantém normalizado, melhor que array).

## 2. Tabelas de detalhes por categoria (novas)

Padrão: cada tabela tem `id uuid pk`, `supplier_id uuid unique references suppliers(id) on delete cascade`, `created_at`, `updated_at`, RLS pública para leitura (fornecedores aprovados) e edição apenas pelo dono.

Tabelas a criar (uma por categoria principal — ajustamos conforme os CSVs reais):

- `supplier_details_buffet` — tipo de cardápio, opções de menu, bebidas inclusas, capacidade, etc.
- `supplier_details_fotografo` — estilos, entrega de fotos, álbum, horas inclusas, etc.
- `supplier_details_local` — capacidade, tipo (salão/sítio/igreja), estacionamento, hospedagem, etc.
- `supplier_details_decoracao` — estilos atendidos, itens inclusos, flores naturais/artificiais, etc.
- `supplier_details_musica` — formato (DJ/banda/ambiente), repertório, equipamentos, horas, etc.
- `supplier_details_cerimonialista` — pacotes, equipe, assessoria pré/dia, etc.
- `supplier_details_beleza` — serviços (cabelo/maquiagem/spa), atende noiva/madrinhas, etc.
- `supplier_details_trajes` — aluguel/venda, sob medida, prazo, ajustes inclusos, etc.
- `supplier_details_convites` — tipos (impresso/digital), prazo, personalização, etc.

> Observação: as colunas exatas de cada tabela serão derivadas dos CSVs que você tem. Como ainda não vi os CSVs, no momento da implementação você me envia (ou eu uso uma base mínima) e eu modelo coluna a coluna. Os scripts ficam idempotentes.

## 3. Nova tabela `supplier_leads` (rastreio de leads do simulador)

Diferente de `quotes` (que é uma conversa formal de orçamento). Leads vêm do simulador e podem ser anônimos no início.

Colunas:
- `id uuid pk`
- `supplier_id uuid references suppliers(id) on delete cascade`
- `couple_id uuid` nullable (se o casal estiver logado)
- `nome_casal text`
- `whatsapp_casal text`
- `email_casal text` nullable
- `orcamento_total numeric`
- `num_convidados integer`
- `cidade_evento text`
- `data_evento date` nullable
- `data_contato timestamptz default now()`
- `status_lead text` com check em `('novo','em_conversa','fechado','perdido')` default `'novo'`
- `valor_fechado numeric` nullable
- `comissao_gerada numeric` nullable
- `origem text` default `'simulador'`
- `created_at`, `updated_at`

RLS:
- INSERT permitido para qualquer um (inclusive anônimo) — para o simulador funcionar sem login.
- SELECT/UPDATE: o fornecedor dono (`suppliers.user_id = auth.uid()`), o casal dono (`couple_id = get_couple_id_for_user(auth.uid())`), e admin.

## 4. Nova tabela `simulated_budgets` (orçamentos do simulador)

Salva cada simulação feita (anônima ou logada), para analytics e para o casal recuperar depois.

Colunas:
- `id uuid pk`
- `couple_id uuid` nullable
- `orcamento_total numeric not null`
- `num_convidados integer not null`
- `cidade text`
- `estado text`
- `estilo text` (clássico, rústico, praia, mini-wedding, etc.)
- `distribuicao jsonb` — ex: `{ "buffet": 35, "decoracao": 15, "fotografia": 10, ... }`
- `categorias_selecionadas text[]`
- `created_at timestamptz default now()`

RLS:
- INSERT público (anônimo ok).
- SELECT: dono via `couple_id` e admin. Admin pode ler todas para analytics.

## 5. O que **não** muda

- `quotes` e `quote_messages` continuam para conversas formais de orçamento.
- `couple_suppliers`, `couple_favorites`, `wedding_tasks`, `budget_items`, etc. — intactos.
- `supplier_photos` continua sendo a galeria (não viramos array).
- Layouts e páginas atuais não são alterados nesta etapa.

## Detalhes técnicos

- Tudo em uma única migration SQL (alterações + criações + RLS + índices em FKs).
- `supplier_id` indexado em todas as novas tabelas.
- Triggers `update_updated_at_column` aplicados onde houver `updated_at`.
- Tipos enum não vou criar para `status_lead` (uso `text + check`) para facilitar evolução.
- `src/integrations/supabase/types.ts` é regenerado automaticamente após a migration.

## Próximo passo (após aprovação)

1. Eu rodo a migration com as colunas extras de `suppliers`, as 4 estruturas (`supplier_leads`, `simulated_budgets`) e tabelas de detalhes vazias com `supplier_id`.
2. Você me envia os CSVs (ou me diz as colunas) por categoria, e eu adiciono as colunas específicas em cada `supplier_details_*` numa segunda migration.
3. A partir daí podemos começar a página/lógica do simulador.
