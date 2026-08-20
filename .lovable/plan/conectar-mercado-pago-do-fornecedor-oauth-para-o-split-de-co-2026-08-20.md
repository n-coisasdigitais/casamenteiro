# Conectar Mercado Pago do fornecedor (OAuth) para o split de corretagem

O checkout com split já existe em `mp-checkout` (modo `corretagem` usa `suppliers.mp_account_id` + `marketplace_fee`), mas hoje não há como o fornecedor vincular a conta dele — por isso o erro "Fornecedor sem conta Mercado Pago vinculada". Este plano cria o fluxo de OAuth que preenche esse vínculo.

Observação importante: hoje a flag `corretagem_datas_ociosas` está **ligada** no banco. Não vou alterá-la; a UI nova respeita a flag, então ela já apareceria. Se quiser a UI escondida agora, é só desligar a flag em /admin/configuracoes.

## Banco de dados

Migration em `suppliers` (colunas novas, `mp_account_id` já existe):
- `mp_access_token text`, `mp_refresh_token text`, `mp_token_expires_at timestamptz`, `mp_connected_at timestamptz`.
- Proteção dos tokens: `REVOKE SELECT (mp_access_token, mp_refresh_token) ON public.suppliers FROM anon, authenticated;` — as políticas atuais de `suppliers` são por linha (o dono e o público aprovado leem a linha inteira), então a proteção precisa ser em nível de coluna. Só `service_role` (edge functions) lê os tokens.
- Nova tabela `public.mp_oauth_states` (`state text primary key`, `supplier_id uuid`, `expira_em timestamptz`, `created_at`), com GRANTs apenas para `service_role`, RLS habilitada e sem policies públicas (uso exclusivo das edge functions).

## Secrets (a serem configurados por você depois)

`MP_OAUTH_CLIENT_ID`, `MP_OAUTH_CLIENT_SECRET`, `MP_OAUTH_REDIRECT_URI` (ex.: `https://www.casamenteiro.com.br/fornecedor/mp-callback`). Nenhum valor é inventado no código; se faltarem, a função retorna erro claro em pt-BR.

## Edge functions

1. `mp-oauth-start`
   - Valida JWT do fornecedor e a posse do supplier.
   - Checa a flag `corretagem_datas_ociosas`; se off → 403 "Funcionalidade não liberada".
   - Gera `state` aleatório, grava em `mp_oauth_states` (expira em 10 min) e devolve a URL:
     `https://auth.mercadopago.com.br/authorization?client_id=...&response_type=code&platform_id=mp&redirect_uri=...&state=...`

2. `mp-oauth-callback` (pública, chamada pelo redirect do MP)
   - Recebe `code` e `state`; valida existência/expiração e resolve o `supplier_id`; inválido → 400.
   - Troca o code por tokens em `POST https://api.mercadopago.com/oauth/token`.
   - Grava `mp_account_id = user_id`, tokens, `mp_token_expires_at = agora + expires_in`, `mp_connected_at = agora`; apaga o state.
   - Redireciona (302) para `/fornecedor/painel?mp=conectado` ou `?mp=erro`.

3. `mp-oauth-refresh`
   - Renova o `access_token` via `grant_type=refresh_token` quando faltar menos de ~24h para expirar. Reutilizável por outras funções antes de um pagamento com split.

## Frontend

- Novo componente `src/components/supplier/MercadoPagoConnectCard.tsx`, renderizado no painel do fornecedor (`SupplierDashboard`, aba de configurações/planos do painel) dentro de `useFeatureFlag("corretagem_datas_ociosas")`:
  - Sem `mp_account_id`: card explicativo + botão "Conectar Mercado Pago" (invoca `mp-oauth-start` e redireciona).
  - Com `mp_account_id`: "Mercado Pago conectado ✓" + data de conexão + botão "Desconectar" (limpa os campos `mp_*` via update do dono).
  - Flag off: card oculto (ou botão desabilitado com "Disponível em breve").
  - Texto de apoio: "Ao vender uma data sua com desconto, o casal paga pela plataforma. Você recebe o valor combinado direto na sua conta Mercado Pago; a plataforma retém apenas a comissão."
- Rota `/fornecedor/mp-callback` (`src/pages/MpCallback.tsx`): repassa `code`/`state` para `mp-oauth-callback` e mostra sucesso/erro, redirecionando ao painel.
- `src/lib/suppliers.ts`: adicionar `mp_connected_at` ao `SUPPLIER_COLS` (nunca os tokens).
- Toast em `/fornecedor/painel` para `?mp=conectado|erro`.

## Split em `mp-checkout` (ajuste pontual)

Somente no caminho `modo_cobranca === "corretagem"`: criar a preferência com o **access token do fornecedor** (collector = fornecedor, renovado via refresh se necessário) e `marketplace_fee` = comissão da plataforma, que é o modelo de marketplace do MP. Os caminhos de **taxa de reserva simples**, **assinatura** e **destaque** ficam intocados.

Parcelamento: como a preferência passa a ser criada na conta do fornecedor, as regras de parcelamento/juros seguem a configuração da conta MP dele, sem forçar `installments` no código.

## Testes

- Flag off → botão não aparece; `mp-oauth-start` responde 403.
- Flag on → OAuth completo grava `mp_account_id` e `mp_connected_at`; desconectar limpa os campos.
- Split ponta a ponta fica pronto, mas só validável depois com contas de teste de marketplace do MP.
