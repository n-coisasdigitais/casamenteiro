# Corrigir loop de redirecionamento no checkout de teste (Mercado Pago)

## O que está acontecendo

O link para o qual o app envia o fornecedor no modo demo é o `sandbox_init_point`
(`sandbox.mercadopago.com.br`). Esse domínio de sandbox exige uma sessão de usuário de teste
e, quando o navegador já tem cookies de uma conta Mercado Pago (a sua conta real, por exemplo),
ele fica jogando o usuário entre a tela de login e o checkout — que é exatamente o
`ERR_TOO_MANY_REDIRECTS` que você viu.

Hoje o Mercado Pago já não recomenda o domínio de sandbox: quando a preferência/assinatura é
criada com **credenciais de teste**, o link normal (`init_point`, em `www.mercadopago.com.br`)
já abre em ambiente de teste. É essa a correção.

## Mudanças

1. **Preferir `init_point` também em sandbox**
   - No fluxo de fallback de cobrança única e no fluxo de assinatura (preapproval), passar a usar
     `init_point` como primeira opção e só cair para `sandbox_init_point` se o `init_point` não vier.
   - Aplica-se igualmente ao fluxo de preferência usado por reservas/destaques, para o
     comportamento ficar único em toda a plataforma.

2. **Aviso na tela de pagamento (modo demo)**
   - Um texto curto orientando: abrir o checkout em janela anônima e entrar com o
     **usuário de teste comprador**, nunca com a conta real do Mercado Pago — misturar as duas
     sessões é a causa mais comum de erro no ambiente de teste.

3. **Registro do link usado**
   - Guardar nos detalhes da cobrança qual link foi usado (`init_point` ou `sandbox_init_point`),
     para diagnóstico rápido caso o problema volte.

## Detalhes técnicos

- `supabase/functions/mp-checkout/index.ts`: trocar a escolha de URL nas três posições
  (fallback de preferência em sandbox, preapproval, preferência genérica) para
  `init_point || sandbox_init_point`, independentemente do ambiente.
- `src/pages/Pagamento.tsx`: bloco informativo exibido apenas quando `ambiente === "sandbox"`.
- Sem alterações de banco de dados.

## Como validar

1. No modo demo, iniciar a assinatura de um plano.
2. O redirecionamento deve ir para `www.mercadopago.com.br/checkout/...` (sem `sandbox.`).
3. Abrir em janela anônima e pagar com o usuário/cartão de teste; o webhook ativa o plano.
