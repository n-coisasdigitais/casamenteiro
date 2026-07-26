
# Datas Ociosas, Reservas e Tabela de Preços

Quatro entregas conectadas, todas em pt-BR e atrás de feature flags. O núcleo é a **tabela de preços central** (item 4) — ela alimenta a taxa de reserva (item 1) e futuras cobranças. Reservas (item 2) e automação (item 3) usam essa taxa.

---

## 1. Tabela de preços central (fundação — construir primeiro)

Nova rota `/admin/tabela-precos` com abas. Fonte única para qualquer cobrança da plataforma.

**Migration**
- Tabela `platform_prices`:
  - `chave text unique` (ex.: `reserva_data_ociosa`, `assinatura_fornecedor_pro`, `destaque_busca`)
  - `categoria text` (aba: `reservas`, `assinaturas`, `destaques`, `outros`)
  - `label text`, `descricao text`
  - `modo check(fixo|percentual|hibrido) default 'fixo'`
  - `valor_fixo numeric default 0`, `percentual numeric default 0`, `valor_min numeric`, `valor_max numeric`
  - `moeda text default 'BRL'`, `ativo bool default true`
  - `overrides jsonb default '{}'` — overrides por categoria de fornecedor (`{ "buffet": { "modo": "percentual", "percentual": 3 } }`)
  - `updated_by uuid`, `updated_at`, `created_at`
- Seed: linha `reserva_data_ociosa` com `modo='fixo'`, `valor_fixo=100`.
- RLS: leitura pública (para exibir "taxa aplicável" ao fornecedor antes de aceitar); escrita só admin.
- GRANTs padrão + `SELECT` a `anon`.

**Helper**
- `src/lib/platformPricing.ts` com `getPreco(chave, { categoriaSlug?, valorBase? })` → resolve override por categoria e devolve `{ valorCalculado, memoria: { modo, base, aplicado } }` para explicar na UI.

**UI admin**
- Página com `Tabs`: Reservas / Assinaturas / Destaques / Outros.
- Cada linha edita modo, valor, min/max e permite adicionar overrides por categoria (drawer).
- Histórico simples: log em `admin_audit_log` a cada save.

---

## 2. Reservas de datas ociosas (flag `reserva_datas_ociosas`, Aquisição, essencial=false, off)

**Migration**
- Registrar flag no seed de `feature_flags` e em `FEATURE_FLAG_DEFAULTS`.
- Tabela `idle_date_reservations`:
  - `supplier_id`, `couple_id`, `promo_date date`, `guest_count int`, `valor_estimado numeric`, `desconto_pct numeric`
  - `status check(solicitada|pre_reservada|confirmada|recusada|expirada|cancelada) default 'solicitada'`
  - `solicitada_em timestamptz default now()`, `expira_em timestamptz`, `respondida_em timestamptz`
  - `taxa_plataforma numeric`, `taxa_status check(pendente|faturada|paga|estornada) default 'pendente'`
  - `taxa_memoria jsonb` (snapshot do cálculo), `mp_payment_id text`, `mp_status text`
  - GRANTs + RLS: casal cria/vê próprias; fornecedor vê/responde próprias; admin tudo.
  - Índice único parcial: `UNIQUE (supplier_id, promo_date) WHERE status = 'confirmada'`.
  - Índice `(supplier_id, status)` e `(couple_id, status)`.
- Trigger: ao virar `confirmada`, insere em `supplier_blocked_dates` (motivo "Reserva confirmada").

**Backend**
- Edge `reserva-solicitar` (JWT on): casal → cria `solicitada`, `expira_em = min(now()+24h, promo_date-48h)`, notifica fornecedor (in-app + e-mail via fila existente).
- Edge `reserva-responder` (JWT on): fornecedor recusa → `recusada`; fornecedor aceita → calcula taxa via `getPreco('reserva_data_ociosa', { categoriaSlug })`, grava `taxa_plataforma` e `taxa_memoria`, gera cobrança Mercado Pago:
  - Se `valor <= R$ 500` → Pix + cartão (Checkout Pro / Preference).
  - Se maior → Pix + boleto.
  - Status vira `pre_reservada`, `expira_em = now()+72h`.
- Webhook `mp-webhook` (público, valida assinatura): pagamento aprovado → `confirmada`, `taxa_status='paga'`, dispara notificação ao casal e insere bloqueio.
- Cron diário `reservas-expirar-cron`: marca `expirada` as vencidas (`solicitada` sem resposta ou `pre_reservada` sem pagamento).

**Segredo novo**
- Solicitar `MP_ACCESS_TOKEN` via add_secret quando o item 2 for para build.

**UI casal**
- Botão "Solicitar esta data" no `SupplierProfile.tsx` (badge de data promo) e nos cards do `SimuladorResultado.tsx`.
- Modal explica: "A data só está garantida após a confirmação do fornecedor. Você não paga nada."
- Nova aba em `MeuPlano.tsx` ou seção em `MySuppliers.tsx`: "Minhas solicitações de reserva" com status humanizado (**solicitada → aguardando confirmação → confirmada**). Nunca usar "reservada"/"garantida" antes de `confirmada`.

**UI fornecedor**
- Nova aba "Reservas" em `SupplierDashboard.tsx` (atrás da flag): lista de solicitadas com card mostrando **valor da taxa calculada antes do aceite** ("Ao confirmar, será cobrada uma taxa de reserva de R$ X — cobrada só se o casal fechar? Não, cobrada agora, no aceite"). Ações: Confirmar disponibilidade / Recusar. Estado `pre_reservada` mostra "Aguardando pagamento da taxa" com link de checkout MP.

**UI admin**
- `/admin/reservas`: filtros por status, coluna taxa (pendente/faturada/paga), export CSV. Métricas: % confirmação, nº expirações por fornecedor (para política de saída). Card "higiene": promo dates sem revisão há 30 dias.

---

## 3. Automação demanda × oferta (usa flag `datas_ociosas` existente)

**Migration**
- `couples`: adicionar `quer_datas_ociosas bool default false`, `data_pretendida date` (só se ainda não existir; verificar antes).
- `home_simulacoes`: garantir `data_pretendida date` e `quer_datas_ociosas bool` no payload/coluna.
- Tabela `idle_match_notifications` para dedup: `(couple_id, supplier_id, promo_date)` unique + `sent_at`, com janela de 7 dias para respeitar "máx 1 e-mail/casal/semana".

**Automação 1 — casal → fornecedor**
- Trigger em `couples`/`home_simulacoes` quando `data_pretendida` bater com algum `supplier_promo_dates` compatível (cidade/categoria) → enfileira notificação e-mail + in-app para o fornecedor: "Um casal quer casar em [data], uma das suas datas com desconto."

**Automação 2 — fornecedor → casais**
- Trigger em `INSERT supplier_promo_dates` → função que busca casais compatíveis (cidade/região, orçamento, categoria ainda faltando no `couple_suppliers`) e enfileira notificação respeitando `idle_match_notifications`.

**Painel admin `/admin/datas-ociosas`**
- Cards: casais interessados por mês/cidade, promo dates publicadas, funil solicitada→confirmada, receita de taxa por status.
- Tabela cruzada data × casais com ação "Notificar compatíveis".
- Botão "Gerar campanha" → cria segmento em `/admin/broadcast` (casais da cidade X sem data).

**UI casal**
- Toggle "Quero considerar datas com desconto" no `UserProfile.tsx` (aba Casamento) e no simulador.

---

## 4. Ordem de execução e flags

1. Migration da **tabela de preços** + UI admin (item 4).
2. Migration `idle_date_reservations` + flag `reserva_datas_ociosas` + helper de preço.
3. Edge functions solicitar/responder/webhook + cron expiração.
4. UI casal/fornecedor/admin do item 2.
5. Automação item 3 (triggers + dedup + painel).

Flags ficam **desligadas** ao subir; ativação em `/admin/configuracoes` depois de testar.

---

## Detalhes técnicos

- **Mercado Pago**: usar Checkout Pro (Preference API) para o fornecedor pagar a taxa; webhook público em `supabase/functions/mp-webhook/` com `verify_jwt=false` e validação de assinatura (`x-signature`). Segredo `MP_ACCESS_TOKEN` via `add_secret` no momento do build.
- **Notificações**: reaproveitar `notifications` + fila de e-mails existente (`enqueue_email`). Templates novos em `supabase/functions/_shared/email-templates/`: `reserva-solicitada.tsx`, `reserva-confirmada.tsx`, `reserva-recusada.tsx`, `match-casal-fornecedor.tsx`, `match-fornecedor-casais.tsx`.
- **Cron**: novas edges `reservas-expirar-cron` e opcional `idle-hygiene-cron` (limpa promo dates estagnadas), registradas via `pg_cron` + `pg_net` (padrão do projeto, sem migration — usar tool `insert`).
- **Copy**: nunca usar "reservado"/"garantido" antes de `confirmada`. Padronizar em `src/lib/reservas.ts` (labels de status).
- **Tipagem**: `pricing_model`, `overrides` e `taxa_memoria` como `jsonb` tipado no client via zod.
- **RLS**: `platform_prices` leitura pública; `idle_date_reservations` scoped por `auth.uid()` via `get_couple_id_for_user` e `suppliers.user_id`.

## Fora de escopo

- Split payment (repasse ao fornecedor do valor do evento) — a plataforma só cobra a taxa; o pagamento do evento continua fora.
- Faturamento consolidado / notas fiscais.
- Assinaturas de fornecedor (só cria a linha na tabela de preços; cobrança recorrente fica para outro plano).
