# Monetização: reservas, assinaturas e destaques

## Situação atual (verificada no código)

| Módulo | Estado |
|---|---|
| Tabela de preços (`platform_prices`) | Pronta, com admin em `/admin/tabela-precos`. Já tem linhas para reservas, assinaturas e destaques. |
| Datas ociosas / reservas | Estrutura completa (datas promocionais do fornecedor, pedido de reserva, painel do fornecedor, `/admin/reservas`, corretagem e ledger de comissões). **Desligado** pelas flags `reserva_datas_ociosas` e `corretagem_datas_ociosas`. |
| Pagamento da reserva | A função `mp-checkout-split` existe e cria preferência real no Mercado Pago, mas **nenhuma tela chama essa função** — o casal solicita e recebe a mensagem "pagamento em breve". |
| Assinatura do fornecedor | **Não existe.** Só há a linha de preço `assinatura_fornecedor_pro`. Sem planos, sem tela, sem cobrança, sem limites por plano. |
| Destaques | Só existe o checkbox `featured` que o admin marca à mão em `/admin/fornecedores`. **Não há compra de destaque.** |
| Checkout transparente | Hoje o fluxo é redirecionamento para o Mercado Pago (Checkout Pro). |

## O que vou construir

### 1. Fechar o ciclo da reserva (casal consegue reservar de fato)
- Ligar as flags `reserva_datas_ociosas` e `corretagem_datas_ociosas` (com o admin podendo desligar).
- No perfil do fornecedor, a data promocional passa a ter botão **Reservar**; após a solicitação, a reserva aparece em "Meu plano" com o botão **Pagar agora**, que chama `mp-checkout-split`.
- Página de status da reserva: aguardando pagamento, paga, confirmada pelo fornecedor, expirada. Webhook já grava o pagamento; ele passa a mudar o status da reserva e notificar os dois lados.

### 2. Assinatura do fornecedor (novo)
- Planos de assinatura configuráveis pelo admin (nome, preço mensal/anual, benefícios, limites).
- Página **Planos** no painel do fornecedor com comparação e botão de assinar.
- Cobrança recorrente via Mercado Pago (preapproval), com registro do status da assinatura, renovação, cancelamento e período de graça.
- Aplicação prática do plano: limites de orçamentos, destaque na busca, selo "Pro" e acesso a módulos (ex.: CRM, vagas) conforme o plano.
- Aba de assinaturas no admin, com histórico de cobranças.

### 3. Destaques pagos (novo)
- Produto "Destaque" com período (7/15/30 dias) e escopo (categoria e/ou cidade), preço vindo da tabela de preços.
- Compra pelo painel do fornecedor; ao pagar, o destaque ativa automaticamente e expira sozinho no fim do período.
- Ordenação da busca e das páginas de categoria passa a respeitar destaques ativos; admin vê e pode encerrar destaques.

### 4. Checkout transparente
Sim, é possível. Vou trocar o redirecionamento pelo **Checkout Bricks** do Mercado Pago: o pagamento (cartão, Pix, boleto) acontece dentro do site, sem sair da plataforma.
- Pagamento único (reserva e destaque): Brick de pagamento + criação do pagamento no backend, com split da comissão.
- Assinatura: cartão tokenizado no próprio site e assinatura criada no backend.
- Mantém a seleção automática de ambiente já existente: usuário demo usa credenciais de teste; usuário real usa produção.

## Detalhes técnicos
- Novas tabelas: `subscription_plans`, `supplier_subscriptions`, `subscription_invoices`, `featured_purchases`, e log de pagamentos unificado. Todas com GRANTs + RLS (fornecedor vê o que é dele; admin vê tudo; leitura pública apenas dos planos).
- Novas edge functions: `mp-subscribe` (preapproval), `mp-create-payment` (transparente, reserva/destaque), `mp-cancel-subscription`; `mp-webhook` estendido para `payment`, `preapproval` e `subscription_authorized_payment`.
- Frontend: SDK `@mercadopago/sdk-react` para os Bricks; public key exposta por ambiente.
- Novas flags: `assinatura_fornecedor`, `destaque_pago`, `checkout_transparente` — tudo entregue desligável pelo admin.
- Job diário para expirar destaques e marcar assinaturas vencidas.

## Ordem de entrega
1. Fechar o ciclo de reserva com pagamento (usa o que já existe).
2. Checkout transparente (Bricks) aplicado à reserva.
3. Destaques pagos.
4. Assinatura do fornecedor com recorrência e limites por plano.

Para produção será necessário `MP_ACCESS_TOKEN_PROD`, `MP_WEBHOOK_SECRET_PROD` e a public key do Mercado Pago; em sandbox seguimos com as chaves de teste já salvas.
