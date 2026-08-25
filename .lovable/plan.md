# Pagamento da reserva de R$ 7.360 em sandbox

## O que aconteceu

A reserva de 08/10/2026 (Studio Flor de Liz) foi criada em modo **corretagem**, com:

- piso do fornecedor: R$ 6.400
- comissão da plataforma: R$ 960
- total ao casal: R$ 7.360
- ambiente gravado: **sandbox**

Como o casal usado é um usuário demo, a preferência foi criada com as **credenciais de teste** (`MP_ACCESS_TOKEN_TEST`) e com split para a conta do fornecedor (collector `3589887092`).

O link de checkout, porém, foi aberto em uma sessão de **conta real** do Mercado Pago: o token do URL de erro traz `sandbox: false` e o desafio `EMAIL_VALIDATION` da conta real (`sub 3589881038`). Pagar uma cobrança de vendedor de teste com conta real é bloqueado pelo Mercado Pago, e o retorno genérico é justamente "Ops, tente novamente". O código de e-mail copiado do painel de developers não se aplica a esse desafio.

## Como testar corretamente (sem mudanças de código)

1. Confirmar no painel de developers do Mercado Pago que existe um **usuário de teste COMPRADOR**, criado na mesma aplicação e país (Brasil) das credenciais de teste — é o e-mail já guardado em `MP_TEST_BUYER_EMAIL`.
2. Verificar que a conta conectada do fornecedor (`3589887092`) também é um **usuário de teste VENDEDOR** da mesma aplicação. Se ela for uma conta real, o split de teste nunca vai concluir: nesse caso o fornecedor demo precisa reconectar o Mercado Pago logado no usuário de teste vendedor.
3. Abrir o link de pagamento em **janela anônima**, sem nenhuma sessão do Mercado Pago ativa.
4. Entrar com as credenciais do **comprador de teste** (usuário e senha gerados no painel), nunca com a conta pessoal.
5. Pagar com **cartão de teste**, por exemplo: Mastercard 5031 4332 1540 6351, CVV 123, validade 11/30, titular `APRO`, CPF 12345678909.
6. Após aprovar, acompanhar a reserva em "Minhas reservas": o webhook deve mudar `mp_status` para aprovado e a reserva para confirmada. Se demorar, usar o botão de verificação manual de pagamento.

## Pontos de atenção

- Comprador e vendedor precisam ser usuários de teste **diferentes** e da **mesma aplicação**; o mesmo usuário não pode pagar a si mesmo.
- Contas de teste costumam não ter saldo em conta; usar sempre cartão de teste.
- Enquanto o ambiente da reserva for `sandbox`, nenhum valor real é movimentado — o R$ 7.360 não será cobrado de ninguém.

## Escopo

Nenhuma alteração de código nesta etapa: você optou por não adicionar avisos ou bloqueios de ambiente na tela de pagamento por enquanto.
