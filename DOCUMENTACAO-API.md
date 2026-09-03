# Documentação da API — Casamenteiro (backend Lovable Cloud)

> Documento de referência para integração do **app mobile** (Flutter, React Native, Kotlin, Swift) com a plataforma Casamenteiro.

---

## 1. Visão geral

O backend é uma API REST hospedada na plataforma Lovable Cloud (baseada em Supabase/PostgreSQL). Toda a lógica de negócio, banco de dados, autenticação, pagamentos (Mercado Pago), e-mails e armazenamento de arquivos vivem nessa API. **Não existe** um endpoint separado `api.casamenteiro.com.br` — o app deve consumir a URL base abaixo diretamente.

A API segue 4 superfícies padronizadas:

| Superfície | Rota | Uso |
|---|---|---|
| **Auth** | `/auth/v1/...` | Cadastro, login, refresh de token, recuperação de senha, OAuth |
| **REST (tabelas)** | `/rest/v1/{tabela}` | CRUD direto em tabelas (com filtros, joins e RLS) |
| **Funções (RPC)** | `/rest/v1/rpc/{funcao}` | Lógica de negócio executada no servidor |
| **Edge Functions** | `/functions/v1/{nome}` | Pagamentos MP, e-mails, crons, admin |
| **Storage** | `/storage/v1/...` | Upload/download de fotos e arquivos |
| **Realtime** | `wss://.../realtime/v1/websocket` | Notificações em tempo real |

---

## 2. Credenciais e URLs

**Base URL da API (produção):**

```
https://fglpzxtrvipizoymwteg.supabase.co
```

**Chave pública (anon key):** valor da variável `VITE_SUPABASE_PUBLISHABLE_KEY` no arquivo `.env` do projeto (raiz do repositório). Essa chave é **pública por design** — pode ser embutida no app mobile. A segurança dos dados é garantida por Row Level Security (RLS) no servidor, não pela chave.

> **⚠️ Nunca** utilize a `service_role` key no app mobile. Ela é secreta, de uso exclusivo do servidor, e não está disponível na plataforma.

**URLs públicas do site:**

| Ambiente | URL |
|---|---|
| Produção | `https://www.casamenteiro.com.br` |
| Publicação Lovable | `https://casamenteiro.lovable.app` |

> As URLs do site são usadas para `redirect_to` no OAuth (Google) e para configurar o webhook do Mercado Pago.

---

## 3. Autenticação (GoTrue — `/auth/v1`)

Todos os endpoints de auth aceitam `application/json` e usam a chave anon no header `apikey`.

### 3.1 Cadastro

```
POST {base}/auth/v1/signup
```

```json
{
  "email": "noiva@email.com",
  "password": "senha-forte",
  "data": {
    "full_name": "Maria Silva",
    "account_type": "couple"
  }
}
```

`account_type` aceita: `couple` (casal), `supplier` (fornecedor), `professional` (profissional/equipe).

Resposta: `200` com `access_token`, `refresh_token`, `user` (e `weak_password` se aplicável). Se a confirmação por e-mail estiver habilitada, retorna `200` sem token — o usuário deve confirmar o link enviado.

### 3.2 Login

```
POST {base}/auth/v1/token?grant_type=password
```

```json
{
  "email": "noiva@email.com",
  "password": "senha-forte"
}
```

Resposta: `{ "access_token", "refresh_token", "expires_in", "user" }`.

### 3.3 Refresh de token

```
POST {base}/auth/v1/token?grant_type=refresh_token
```

```json
{ "refresh_token": "..." }
```

### 3.4 Sessão / usuário atual

```
GET {base}/auth/v1/user
Authorization: Bearer {access_token}
```

### 3.5 Logout

```
POST {base}/auth/v1/logout
Authorization: Bearer {access_token}
```

### 3.6 Esqueci a senha

```
POST {base}/auth/v1/recover
```

```json
{ "email": "noiva@email.com" }
```

### 3.7 OAuth (Google)

```
GET {base}/auth/v1/authorize?provider=google&redirect_to=https://www.casamenteiro.com.br/auth/callback
```

- **App mobile nativo:** use o fluxo **PKCE** (o SDK cuida disso automaticamente) com `redirect_to` apontando para um deep link registrado no app.
- Nunca aponte `redirect_to` diretamente para rotas protegidas (ex.: `/dashboard`). Guarde a rota de destino separadamente e navegue após a sessão hidratar.

### 3.8 Headers comuns

| Header | Valor |
|---|---|
| `apikey` | chave anon (obrigatório em **todas** as chamadas) |
| `Authorization` | `Bearer {access_token}` (obrigatório em chamadas autenticadas) |
| `Content-Type` | `application/json` (POST/PATCH) |
| `Prefer` | `return=representation` (opcional — retorna a linha inserida/atualizada) |

---

## 4. REST/PostgREST — tabelas principais

Formato: `{base}/rest/v1/{tabela}` com filtros tipo `?select=...&coluna=eq.valor&order=...&limit=...`.

**Filtros comuns:** `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `like`, `ilike`, `in`, `is`, `not`, `or`, `fts` (busca full-text).

### 4.1 Exemplos

Listar fornecedores aprovados com categoria:

```
GET {base}/rest/v1/suppliers?select=*,categories(id,name,slug)&status=eq.approved&limit=20
```

Buscar fornecedores por cidade e categoria:

```
GET {base}/rest/v1/suppliers?select=id,company_name,city,state,min_price,max_price
  &status=eq.approved&city=ilike.*são paulo*&category_id=eq.{uuid}
```

Criar um pedido de orçamento (casal autenticado):

```
POST {base}/rest/v1/quotes
```

```json
{
  "supplier_id": "{uuid}",
  "category_id": "{uuid}",
  "event_date": "2027-05-15",
  "guests": 150,
  "description": "Quero um pacote completo de buffet"
}
```

### 4.2 Tabelas por domínio

**Perfil e contas**
`profiles`, `user_roles`, `couples`, `suppliers`, `staff_profiles`

**Planejamento do casamento**
`wedding_tasks`, `wedding_guests`, `guest_groups`, `guest_invites`, `budget_items`, `budget_payments`, `couple_suppliers`, `couple_links`

**Perfil social do casal**
`couple_public_profiles`, `couple_photos`, `couple_videos`, `couple_profile_comments`, `couple_messages`, `couple_favorites`, `couple_supplier_events`

**Fornecedores e marketplace**
`categories`, `supplier_photos`, `reviews`, `supplier_blocked_dates`, `supplier_promo_dates`, `supplier_leads`, `lead_notes`, `lead_events`, `supplier_attachments`, `supplier_calendar_connections`, `fornecedor_campos`, `fornecedor_aprovacoes`

**Cotações e propostas**
`quotes`, `quote_messages`, `quote_proposals`

**Simulador**
`home_simulacoes` (sessões de simulação), `cidades_interesse` (demanda de cidades sem fornecedor), `cidades_coordenadas`, `budget_distribution_defaults`, `secoes_home`, `frases_home`

**Vagas e profissionais**
`staff_jobs`, `staff_applications`, `staff_reviews`, `staff_unavailability`, `staff_documents`, `staff_messages`

**Reservas e datas ociosas**
`idle_date_reservations`, `reservation_contracts`, `reservation_events`, `idle_match_notifications`, `platform_prices`, `commission_ledger`

**Pagamentos e planos**
`payment_intents`, `subscription_plans`, `supplier_subscriptions`, `subscription_invoices`, `featured_packages`, `featured_purchases`, `webhook_events`, `coupons`, `coupon_redemptions`, `supplier_credits`

**Notificações e sistema**
`notifications`, `broadcast_history`, `platform_events`, `admin_audit_log`, `system_settings`, `feature_flags`, `default_tasks`

> **Importante:** o acesso a cada tabela é controlado por RLS. Um usuário só lê/grava o que a política permite — por exemplo, um casal só enxerga as próprias tarefas e orçamentos; um fornecedor só enxerga os próprios leads. Sem token válido, apenas leituras públicas (fornecedores aprovados, categorias, avaliações) funcionam.

---

## 5. Funções RPC — lógica de negócio

Formato: `POST {base}/rest/v1/rpc/{funcao}` com corpo JSON (nome dos parâmetros = colunas da função). Requer `Authorization: Bearer {token}` (exceto as marcadas como públicas).

### 5.1 Contato e segurança (protegem telefone/WhatsApp)

| Função | Parâmetros | Retorno |
|---|---|---|
| `get_supplier_contact` | `supplier_id` | `{ phone, whatsapp }` — **exige login**; bloqueia extração em massa |
| `my_supplier_contacts` | — | Contatos que o fornecedor logado pode ver |
| `admin_suppliers_contacts` | — | Apenas admin |
| `has_role` | `user_id`, `role` | `boolean` (admin/mod/user) |
| `get_staff_contact` | `staff_id` | Contato do profissional (autenticado) |
| `can_access_staff_application` | `application_id` | `boolean` |

### 5.2 Casal e convites

| Função | Uso |
|---|---|
| `get_couple_id_for_user` | Retorna o `couple_id` do usuário logado |
| `link_partner_by_invite_code` | Vincula o par pelo código de convite |
| `get_invite_by_token` / `respond_invite` | Convites de convidados (token público + ação) |
| `seed_default_tasks_smart` | Semear 79 tarefas padrão ajustadas à data do casamento |
| `expandir_tarefas_detalhadas` | Expandir tarefas em subtarefas |

### 5.3 Cidades (IBGE)

| Função | Uso |
|---|---|
| `buscar_cidades_brasil` | Autocomplete de municípios por termo + UF (`termo`, `uf`) |
| `cidades_disponiveis` | Lista cidades com fornecedores |

### 5.4 Simulador e indicações

| Função | Uso |
|---|---|
| `generate_couple_profile_slug` | Slug público do perfil do casal |
| `generate_referral_code` | Código de indicação do usuário |
| `registrar_minha_indicacao_fornecedor` / `registrar_etapa_indicacao_fornecedor` / `registrar_clique_indicacao_fornecedor` | Funil de indicação |
| `increment_referral_conversions` | Converte indicação |
| `get_or_create_supplier_referral` / `marcar_indicacao_assinatura` | Indicação ligada a assinatura |

### 5.5 Reservas e corretagem

| Função | Uso |
|---|---|
| `calc_platform_fee` | Calcula taxa da plataforma por tipo/valor |
| `calc_oferta_corretagem` | Calcula valor de corretagem da oferta |
| `validate_reservation_lead_time` | Valida antecedência mínima da reserva |
| `cancelar_reserva_casal` / `cancelar_reserva_fornecedor` | Cancelamentos com regras e taxa |
| `expire_idle_reservations` | Expira reservas não confirmadas |
| `sync_guest_total_pessoas` | Sincroniza total de convidados |

### 5.6 Pagamentos e monetização

| Função | Uso |
|---|---|
| `resgatar_cupom` | Aplica cupom de desconto |
| `consumir_creditos_ciclo` | Consome créditos do ciclo |
| `expirar_monetizacao` | Expira benefícios vencidos |

### 5.7 Admin (somente usuários com role `admin`)

`admin_broadcast_notification`, `admin_broadcast_segmented`, `admin_set_user_suspended`, `admin_toggle_admin_role`, `admin_mark_commission_paid`, `admin_reset_demo`, `admin_conceder_beneficio`

### 5.8 Auditoria e e-mails

`log_platform_event` (registra evento de auditoria), `purge_platform_events` (limpeza), `enqueue_email` (enfileira e-mail transacional)

---

## 6. Edge Functions — `/functions/v1/{nome}`

Todas são `POST` com corpo JSON. `verify_jwt = false` → basta o header `apikey` (anon); `verify_jwt = true` → exige `Authorization: Bearer {jwt do usuário}`.

### 6.1 Pagamentos — Mercado Pago

| Função | Payload | Descrição |
|---|---|---|
| `mp-checkout` | `{ tipo, referencia_id }` | Cria checkout. `tipo`: `assinatura`, `reserva`, `taxa_reserva`, `destaque`, `plano`, etc. Retorna `checkout_url` (init_point) e `public_key` |
| `mp-checkout-split` | `{ reservation_id }` | Checkout com split de corretagem entre plataforma e fornecedor |
| `mp-process-payment` | payload do Bricks | Pagamento transparente com cartão (card form) |
| `mp-webhook` | evento do MP | Recebe notificações do Mercado Pago (assinado com `X-Signature`) — **não chamar do app** |
| `mp-sync-assinatura` | `{ preapproval_id }` ou similar | Verifica/sincroniza status da assinatura |
| `mp-cancel-subscription` | `{ subscription_id }` | Cancela assinatura |
| `mp-change-plan` | `{ subscription_id, plan_id }` | Troca de plano |
| `mp-oauth-start` / `mp-oauth-callback` / `mp-oauth-refresh` | — | Conecta a conta Mercado Pago do fornecedor (vendedor) |

**Fluxo típico de pagamento:**

1. App chama `mp-checkout` → recebe `checkout_url` (redireciona para o Mercado Pago) ou `public_key` (pagamento transparente via Bricks no app).
2. Mercado Pago notifica `mp-webhook` → o backend atualiza assinatura/reserva/pagamento.
3. App consulta o status na tabela correspondente (`supplier_subscriptions`, `payment_intents`, `idle_date_reservations`) ou chama `mp-sync-assinatura` para "Já paguei, verificar".

> **Webhook no painel do MP:** cadastrar a URL `https://fglpzxtrvipizoymwteg.supabase.co/functions/v1/mp-webhook` como webhook de pagamentos e preapprovals.

### 6.2 E-mails

| Função | Descrição |
|---|---|
| `send-transactional-email` | E-mail transacional (confirmação, notificações) |
| `send-invite-emails` | Convites de convidados |
| `send-job-match-emails` | Match de vagas para profissionais |
| `send-bulk-supplier-emails` | Envio em massa do fornecedor |
| `process-email-queue` | Processa a fila de e-mails |
| `auth-email-hook` | Customiza e-mails de auth (confirmação, reset) |

### 6.3 Crons / automação

`broadcast-cron` (broadcasts agendados), `calendar-sync-cron` (sincronização de calendário), `convite-cron` (lembretes de convites), `aplicar-descontos-agendados`

### 6.4 Admin/demo

`admin-seed-demo` (popular dados de demonstração), `admin-impersonate` (impersonar usuário)

---

## 7. Storage — arquivos e fotos

| Bucket | Público | Uso |
|---|---|---|
| `supplier-photos` | ✅ | Fotos dos fornecedores |
| `couple-photos` | ✅ | Fotos do casal |
| `home-photos` | ✅ | Imagens da home |
| `avatars` | ❌ | Avatares de usuários |
| `couple-profile` | ❌ | Mídia do perfil social do casal |
| `quote-attachments` | ❌ | Anexos de cotações |
| `supplier-landing` | ❌ | Landing pages dos fornecedores |

**Upload:**

```
POST {base}/storage/v1/object/{bucket}/{caminho}
Content-Type: multipart/form-data (arquivo)
apikey: {anon}
Authorization: Bearer {token}
```

**Download público:**

```
GET {base}/storage/v1/object/public/{bucket}/{caminho}
```

**Download privado (autenticado):**

```
GET {base}/storage/v1/object/{bucket}/{caminho}
Authorization: Bearer {token}
```

---

## 8. Realtime (notificações em tempo real)

```
wss://{base}/realtime/v1/websocket?apikey={anon}&vsn=1.0.0
```

Use o canal `postgres_changes` para observar a tabela `notifications` do usuário logado (ex.: novas mensagens, novas propostas, reservas). O SDK gerencia a conexão; o backend só envia eventos para linhas que o usuário pode ver (RLS).

---

## 9. CORS

- **Web/PWA:** a API já responde com CORS habilitado para os domínios do site — chamadas diretas do browser funcionam.
- **Apps nativos (Flutter, Kotlin, Swift, React Native):** CORS **não se aplica** (é uma proteção de browser). Não precisa de proxy nem de configuração especial.
- Para chamar as edge functions de um app nativo, basta enviar `apikey` (e `Authorization` quando exigido) nos headers.

---

## 10. SDKs recomendados (use o SDK oficial, não HTTP puro)

| Plataforma | SDK |
|---|---|
| Flutter / Dart | `supabase_flutter` (pub.dev) |
| React Native / Expo | `@supabase/supabase-js` (npm) |
| Android / Kotlin | `supabase-kt` |
| iOS / Swift | `supabase-swift` |

**Inicialização (Flutter):**

```dart
final supabase = Supabase.initialize(
  url: 'https://fglpzxtrvipizoymwteg.supabase.co',
  anonKey: '<VITE_SUPABASE_PUBLISHABLE_KEY>',
);
```

**Inicialização (React Native):**

```ts
import { createClient } from '@supabase/supabase-js';
export const supabase = createClient(
  'https://fglpzxtrvipizoymwteg.supabase.co',
  '<VITE_SUPABASE_PUBLISHABLE_KEY>'
);
```

---

## 11. Fluxos ponta a ponta (exemplos)

### 11.1 Login e sessão

```dart
await supabase.auth.signInWithPassword(email: e, password: p);
final user = supabase.auth.currentUser;
// Toda chamada seguinte já envia o JWT automaticamente
```

### 11.2 Listar fornecedores aprovados

```dart
final res = await supabase
  .from('suppliers')
  .select('id, company_name, city, state, min_price, max_price, categories(name, slug)')
  .eq('status', 'approved')
  .order('featured', ascending: false);
```

### 11.3 Pedir orçamento (chat)

```dart
final { data } = await supabase
  .from('quotes')
  .insert({ supplier_id: sId, category_id: cId, event_date: '2027-05-15', guests: 150 })
  .select()
  .single();
// Depois: mensagens na tabela quote_messages (quote_id, sender_id, content)
```

### 11.4 Simulador

```dart
// 1) Salvar sessão (visitante ou casal logado):
final { data } = await supabase.from('home_simulacoes').insert({
  orcamento_total: 60000, num_convidados: 150, cidade: 'São Paulo - SP', estilo: 'clássico'
}).select().single();

// 2) Cidade sem fornecedores? Registra demanda:
await supabase.from('cidades_interesse').insert({ cidade: 'Cidade X', estado: 'SP' });
```

### 11.5 Reservar data ociosa

```dart
// Casal oferece valor por uma data ociosa do fornecedor:
final { data } = await supabase.from('idle_date_reservations').insert({
  supplier_id: sId, event_date: '2027-05-15', offered_amount: 8500, notes: '...'
}).select().single();

// Pagamento da taxa da plataforma (fornecedor) ou do valor (casal):
final r = await supabase.functions.invoke('mp-checkout', {
  body: { tipo: 'reserva', referencia_id: data.id }
});
// Abrir r.checkout_url em WebView/browser
```

### 11.6 Assinatura do fornecedor

```dart
final r = await supabase.functions.invoke('mp-checkout', {
  body: { tipo: 'assinatura', referencia_id: planoId }
});
// r.checkout_url → Mercado Pago → webhook atualiza supplier_subscriptions
// Botão "Já paguei": invoke('mp-sync-assinatura', body: {...}) e recarregar status
```

### 11.7 Upload de foto do fornecedor

```dart
await supabase.storage
  .from('supplier-photos')
  .upload('${userId}/${DateTime.now().millisecondsSinceEpoch}.jpg', fileBytes);
// URL pública:
final url = supabase.storage.from('supplier-photos').getPublicUrl(caminho);
```

---

## 12. Observações de segurança

1. **Nunca** coloque `service_role` ou segredos no app mobile.
2. Todo acesso passa por **RLS**: o app deve sempre autenticar o usuário e usar o token dele.
3. Telefone/WhatsApp de fornecedores **só** saem pela RPC `get_supplier_contact` (autenticada) — não leia direto de `suppliers`.
4. O webhook do Mercado Pago (`mp-webhook`) é chamado pelo próprio MP e valida a assinatura — não invoque do app.
5. Fluxos OAuth (Google, MP) exigem `redirect_to` de origem registrada (domínio do site ou deep link do app).

---

*Documentação gerada em 03/09/2026. Em caso de dúvida sobre tabelas ou funções específicas, consulte o repositório (pasta `supabase/migrations/` e `supabase/functions/`).*