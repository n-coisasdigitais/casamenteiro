# Reservas de data ociosa: pagamento da taxa, confirmação clara e regras de cancelamento

## O problema atual (confirmado)

A reserva `7c3dfdd2…` está `confirmada`, modo **taxa_reserva**, com `taxa_plataforma = R$ 100` e `taxa_status = pendente`. Ao clicar em "Pagar taxa da plataforma", a função de checkout recusa com *"Reserva não é do modo corretagem"* — ela só sabe cobrar reservas do modo corretagem (casal paga o fornecedor com split). O modo taxa_reserva (fornecedor paga R$ 100 à plataforma) nunca foi implementado no checkout. Por isso o valor fica pendente para sempre.

## O que será feito

### 1. Pagamento da taxa de reserva (correção do erro)
- O checkout passa a tratar os dois modos de reserva:
  - **corretagem**: casal paga o valor ofertado, com split para o fornecedor (comportamento atual).
  - **taxa_reserva**: fornecedor paga a taxa da plataforma (valor de `taxa_plataforma`), sem split. Só o dono do fornecedor pode pagar.
- Quando o pagamento é aprovado, a taxa passa a "paga" automaticamente e a reserva aparece quitada no painel e nas faturas do fornecedor.
- Se a taxa ainda estiver pendente, o card da reserva mostra aviso destacado e o botão de pagar continua visível no painel do fornecedor e na tela de faturas.

### 2. Mensagem de confirmação educativa (casal e fornecedor)
Quando o fornecedor confirma a data:
- Registro do momento exato: "Fornecedor confirmou a data em 04/08/2026 às 16:32".
- Notificação ao casal e ao fornecedor com orientação: a plataforma apenas intermedia a reserva; recomenda-se procurar o fornecedor, alinhar detalhes e formalizar um contrato próprio.
- O mesmo texto é postado automaticamente no chat do orçamento (quando existe orçamento entre o casal e aquele fornecedor), como mensagem do sistema, para ficar registrado e visível aos dois lados.
- Bloco fixo na tela "Minhas reservas" do casal com o aviso de intermediação e a data/hora do aceite.

### 3. Cancelamento com taxa e prazo
- Reservar é **gratuito** para o casal; cancelar pode ter custo. Isso é dito de forma explícita antes de solicitar e na tela de reservas.
- **Carência**: cancelamento em até X dias após a solicitação (padrão 7) é gratuito. Depois disso, cobra-se a taxa de cancelamento (padrão R$ 50), configurável na tabela de preços do admin — inclusive com valores diferentes por categoria.
- Ao cancelar com custo: a data é liberada na agenda do fornecedor, é gerada uma cobrança de cancelamento para o casal (pagável pelo mesmo checkout) e a taxa de R$ 100 já paga pelo fornecedor é marcada para estorno, aparecendo no controle financeiro do admin.
- Enquanto houver taxa de cancelamento em aberto, o casal não consegue abrir nova reserva de data ociosa.
- Fornecedor e casal recebem notificação do cancelamento com o motivo e os valores.

### 4. Antecedência mínima para reservar
- Nova configuração por fornecedor: **antecedência mínima em dias** (padrão 15). Datas dentro desse prazo não aparecem como reserváveis e a solicitação é bloqueada também no banco.
- Campo editável na área de datas ociosas do painel do fornecedor, com explicação do que significa.
- Padrão global (15 dias) e prazo de carência de cancelamento (7 dias) ficam nas configurações do admin.

## Detalhes técnicos

- **Banco**: `suppliers.reserva_antecedencia_min_dias` (int, default 15); `idle_date_reservations` ganha `confirmada_em`, `cancelada_em`, `cancelada_por`, `motivo_cancelamento`, `taxa_cancelamento`, `taxa_cancelamento_status`; nova chave `cancelamento_data_ociosa` (fixo, R$ 50) em `platform_prices`; `system_settings` para carência (dias) e antecedência padrão.
- **Regras no banco**: trigger de validação de antecedência mínima no insert de reserva; RPC `cancelar_reserva_casal(_reservation_id, _motivo)` que calcula se há custo, libera a data, marca estorno ao fornecedor e cria a cobrança.
- **Edge functions**: `mp-checkout` passa a aceitar `tipo: 'reserva'` em modo taxa_reserva (pagador = fornecedor, sem `marketplace_fee`) e um novo tipo `cancelamento` (pagador = casal); `mp-webhook` atualiza `taxa_status`/`taxa_cancelamento_status` conforme o tipo.
- **Frontend**: ajustes em `SupplierReservationsTab`, `MinhasReservas`, `RequestReservationDialog`, `PromoDatesManager`, `Pagamento`, `AdminPlatformPrices` e `AdminSettings`; mensagem de sistema no chat via `quote_messages`.
- Textos e status em pt-BR; nenhum valor fica hardcoded no código — tudo vem da tabela de preços/configurações.
