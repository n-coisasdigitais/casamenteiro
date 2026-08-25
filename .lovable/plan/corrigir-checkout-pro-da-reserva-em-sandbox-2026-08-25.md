# Corrigir Checkout Pro da reserva em sandbox

## Diagnóstico confirmado

A configuração das contas agora está correta:

- fornecedor reconectado como vendedor de teste, conta MP `3589887094`;
- a nova preferência `3589887094-f3825e75-b9ca-44b9-b4bf-22f19490e5f3` foi criada pelo vendedor correto;
- reserva de R$ 7.360 registrada como `sandbox`;
- pagamento acessado pelo comprador de teste diferente do vendedor.

O erro restante está na seleção do link devolvido pelo Mercado Pago. Hoje `mp-checkout` escolhe sempre `pref.init_point` antes de `pref.sandbox_init_point`, inclusive quando a reserva está em sandbox. O token do novo redirecionamento confirma o efeito: `sandbox: false`.

A tentativa anterior de usar `init_point` contornava um loop causado por sessão de conta real. Agora que vendedor e comprador de teste estão corretamente separados e o checkout é aberto em janela anônima, devemos voltar ao link próprio de sandbox.

## Implementação

1. Em `mp-checkout`, selecionar o link por ambiente:
   - sandbox: `sandbox_init_point`, com fallback para `init_point` somente se o MP não devolver o link de teste;
   - produção: somente `init_point`.
2. Corrigir o campo de auditoria `link_usado` em `payment_intents` para registrar o link realmente selecionado.
3. Manter inalterados o split, o valor (R$ 6.400 ao fornecedor + R$ 960 de comissão), o comprador configurado e o webhook.
4. Publicar novamente apenas a função `mp-checkout`.

## Validação

1. Gerar uma nova preferência para a reserva, evitando reutilizar a tentativa que já nasceu com o link incorreto.
2. Confirmar na resposta do checkout que:
   - `ambiente = sandbox`;
   - a URL escolhida é `sandbox_init_point`;
   - a conta vendedora é `3589887094` e está identificada como teste.
3. Abrir o checkout em janela anônima, entrar com o comprador de teste e usar cartão de teste.
4. Confirmar que o pagamento deixa de cair no redirect de erro com `sandbox: false`.
5. Verificar que o webhook aprova a reserva e atualiza o registro financeiro; se houver atraso, validar também a reconciliação manual.

## Produção

O fluxo de produção continuará usando `init_point` e as credenciais reais, sem mudança de comportamento.
