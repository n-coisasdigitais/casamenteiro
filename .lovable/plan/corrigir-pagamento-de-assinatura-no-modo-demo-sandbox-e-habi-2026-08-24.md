# Corrigir pagamento de assinatura no modo demo (sandbox) e habilitar teste em produção

## O que os logs mostram

A chamada ao Mercado Pago falhou com `400 {"message":"User bad request"}` ao criar a assinatura recorrente (preapproval). O payload enviado estava correto no formato:

- vendedor: conta de teste `TESTUSER6070460288799044229` (id `3589887094`, site MLB) — credencial de teste, ok
- pagador: `test_user_3589881038@testuser.com`
- valor R$ 97, ciclo mensal, `start_date` em 06/10/2026 (fim do trial)

Ou seja: as credenciais de teste estão certas e o ambiente está sendo escolhido corretamente (demo → sandbox). O erro vem do próprio Mercado Pago recusando o par vendedor/pagador no fluxo de assinatura. Causa mais provável (ainda não confirmada): o usuário de teste comprador não pertence à mesma aplicação/país do vendedor de teste, ou a conta de teste vendedora não está habilitada para assinaturas (preapproval). `User bad request` não detalha qual dos dois.

Como não há redirecionamento, a página de pagamento fica sem link — é consequência da falha acima, não um bug separado.

## Passo 1 — Confirmar a causa (antes de mudar comportamento)

Adicionar um diagnóstico temporário no checkout que, quando o preapproval falhar em sandbox, consulta a API do Mercado Pago para registrar:

- se o e-mail do comprador de teste existe e sob qual aplicação/país
- se a conta vendedora aceita `preapproval` (tentativa mínima sem `start_date` e sem trial)

O resultado aparece nos logs da função e diz se o problema é o comprador de teste ou a conta vendedora.

## Passo 2 — Tornar o teste de assinatura possível no sandbox

Independente do resultado acima, o sandbox do Mercado Pago é instável para assinaturas recorrentes. Mudança:

- Em sandbox, quando o `preapproval` falhar, cair automaticamente para uma **preferência de pagamento único** (Checkout Pro) com o mesmo valor e `external_reference` da assinatura. Isso gera `sandbox_init_point` e o redirecionamento volta a funcionar.
- O webhook passa a reconhecer esse pagamento único de sandbox e ativa a assinatura como se fosse a primeira cobrança (apenas em `ambiente = sandbox`, nunca em produção).
- Mensagem de erro na tela de pagamento fica explícita quando nem o fallback funciona (hoje mostra só "Falha ao criar assinatura").

Resultado: no `/demo` é possível validar ponta a ponta — criar assinatura, pagar com cartão de teste, webhook, ativação do plano, fatura e cancelamento.

## Passo 3 — Testar em produção (whitelabel)

Fluxo já implementado, mas depende de três condições. O plano inclui verificá-las e documentar na tela:

1. Usuário **não demo** (`profiles.is_demo = false`) → ambiente `live`.
2. Secrets `MP_ACCESS_TOKEN_PROD` e `MP_PUBLIC_KEY_PROD` presentes (verificar; se faltar, você fornece).
3. Flag `checkout_transparente` ligada → o checkout monta o formulário de cartão (Bricks) na própria página, sem redirect.

Para testar sem gastar dinheiro real, o caminho é criar um plano temporário de valor mínimo (ex.: R$ 1,00) no admin de planos, assinar com um cartão real, confirmar ativação e cancelar em seguida — produção do Mercado Pago não aceita cartões de teste.

Também será adicionado, na tela de pagamento, um indicador claro de qual ambiente está em uso (teste x produção) e qual conta Mercado Pago é a vendedora, para evitar confusão nos testes.

## Detalhes técnicos

- `supabase/functions/mp-checkout/index.ts`: diagnóstico do preapproval em sandbox; fallback para `/checkout/preferences` quando `preapproval` retorna 4xx em sandbox; retorno de `detalhe` mais informativo.
- `supabase/functions/mp-webhook/index.ts`: tratar `payment` com `external_reference` `assinatura:<id>` (apenas sandbox) ativando `supplier_subscriptions`.
- `src/pages/Pagamento.tsx`: mensagens de erro específicas e badge de ambiente/conta vendedora.
- Nenhuma mudança de schema.
