# Corrigir conexão do Mercado Pago do fornecedor (OAuth)

## O que está acontecendo

A URL de autorização gerada usa este redirect:

```text
redirect_uri = https://casamenteiro.com.br/fornecedor/mp-callback
```

Verifiquei agora: o domínio **sem www** não responde (o domínio `casamenteiro.com.br` está fora do ar/tombstoned); só `https://www.casamenteiro.com.br` responde (HTTP 200). O Mercado Pago recusa a autorização quando a `redirect_uri` enviada não é exatamente uma das URLs cadastradas na aplicação dele — e uma URL de domínio inválido nunca vai bater. Daí a mensagem "não foi possível conectar o aplicativo à sua conta".

Há duas peças que precisam combinar **caractere por caractere**:
1. O secret `MP_OAUTH_REDIRECT_URI` (usado pelas funções `mp-oauth-start` e `mp-oauth-callback`).
2. A "Redirect URI" cadastrada no painel de desenvolvedores do Mercado Pago, na mesma aplicação do `client_id` 7226741254250489.

## O que vou fazer

1. Atualizar o secret `MP_OAUTH_REDIRECT_URI` para:
   `https://www.casamenteiro.com.br/fornecedor/mp-callback`
2. Reimplantar `mp-oauth-start` e `mp-oauth-callback` para pegarem o novo valor.
3. Deixar o start mais defensivo: se `MP_OAUTH_REDIRECT_URI` não for `https://` ou não terminar em `/fornecedor/mp-callback`, retornar erro claro em pt-BR em vez de mandar o fornecedor para uma tela de erro do Mercado Pago.
4. No `MercadoPagoConnectCard`, mostrar a mensagem de erro devolvida pela função (hoje alguns erros aparecem genéricos), para você ver o motivo real na hora.

## O que só você pode fazer (no painel do Mercado Pago)

Na aplicação do `client_id` 7226741254250489:
- Cadastrar exatamente `https://www.casamenteiro.com.br/fornecedor/mp-callback` como Redirect URI.
- Confirmar que a aplicação tem o modelo de **marketplace/split** habilitado — sem isso o MP também barra a vinculação.
- Para testar em sandbox: a conta que autoriza precisa ser uma **conta de teste vendedor** diferente da conta dona da aplicação (o MP recusa vincular a aplicação à própria conta que a criou). Faça a autorização em janela anônima, logado com o usuário de teste vendedor.

## Produção (mesmo fluxo, sem mudança de código)

O OAuth é idêntico em produção: o fornecedor clica em "Conectar Mercado Pago", entra na conta dele (real) e autoriza o Casamenteiro. O que muda é apenas qual aplicação/credencial é usada. Para isso:

- Usar em produção o `client_id`/`client_secret` da aplicação de produção (secrets `MP_OAUTH_CLIENT_ID` / `MP_OAUTH_CLIENT_SECRET`), com a mesma Redirect URI `https://www.casamenteiro.com.br/fornecedor/mp-callback` cadastrada.
- O token do fornecedor já é guardado em `suppliers.mp_access_token` / `mp_refresh_token` (colunas sem leitura por `anon`/`authenticated`) e renovado automaticamente por `_shared/mp-oauth.ts`.

## Fornecedor que ainda não tem conta no Mercado Pago

- No card de conexão vou adicionar o link "Ainda não tenho conta — criar no Mercado Pago" (abre o cadastro do MP em nova aba) e um texto curto de 3 passos: criar conta → voltar → conectar.
- Na própria tela de autorização do MP já existe a opção de criar conta, então quem clicar em "Conectar" sem conta também consegue concluir sem sair do fluxo.

## Split: como o dinheiro é distribuído

O modelo é o marketplace do Mercado Pago:
- A preferência/pagamento é criada **na conta do fornecedor** (com o access token dele) e o Casamenteiro cobra a comissão pelo campo `marketplace_fee`.
- O casal paga → o valor cai na conta MP do fornecedor → o MP retém a `marketplace_fee` e credita na conta MP dona da aplicação (a do Casamenteiro).
- Ou seja, a plataforma **não precisa** de cadastro de repasse/conta bancária adicional: basta a conta MP do Casamenteiro (dona da aplicação) estar com dados completos e verificados para sacar. Vale conferir na conta da plataforma: CPF/CNPJ validado, conta bancária cadastrada para saque e a aplicação com "Marketplace" habilitado.

## Como validar

- Abrir `/fornecedor/painel`, clicar em "Conectar Mercado Pago" e conferir que a URL gerada traz o redirect com `www`.
- Autorizar com a conta de teste vendedor e cair em `/fornecedor/painel?mp=conectado`, com o card mostrando "Mercado Pago conectado".
- Em seguida, testar uma reserva de data ociosa com split (checar no MP: pagamento na conta do vendedor + `marketplace_fee` na conta da plataforma).
- Em produção, repetir com valor baixo (R$ 1,00) usando uma conta real de fornecedor.

