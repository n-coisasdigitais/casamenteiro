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

## Como validar

- Abrir `/fornecedor/painel`, clicar em "Conectar Mercado Pago" e conferir que a URL gerada traz o redirect com `www`.
- Autorizar com a conta de teste vendedor e cair em `/fornecedor/painel?mp=conectado`, com o card mostrando "Mercado Pago conectado".
- Em seguida, testar uma reserva de data ociosa com split.
