# Reservas: erro ao aceitar data duplicada + cancelamento pelo fornecedor

## O que está acontecendo

**1. "Registro já existe" ao aceitar a reserva do dia 29/09**

Confirmado no banco: já existe uma reserva **confirmada** para o mesmo fornecedor na mesma data (29/09/2026, confirmada às 00:05). Uma segunda solicitação chegou às 00:27 para a mesma data. O banco tem uma regra que impede duas reservas confirmadas para o mesmo fornecedor e a mesma data — por isso o erro técnico "Registro já existe". Não é bug de gravação: é uma trava correta, mas com mensagem ruim e sem tratamento na tela.

**2. Fornecedor não consegue cancelar depois de aceitar**

Hoje só existe cancelamento pelo casal. O fornecedor não tem nenhum botão nem permissão para cancelar uma reserva já confirmada.

**3. Sandbox do Mercado Pago (botão de pagar desabilitado)**

Comportamento típico de limitação das contas de teste. Sem alteração de código proposta aqui; validar em produção conforme você planejou.

## O que será feito

### A. Data já reservada
- Na aba Reservas do fornecedor, solicitações cujo dia já tem outra reserva confirmada aparecem marcadas como **"Data já reservada"**, com o botão Confirmar desabilitado e apenas a opção de recusar.
- Se ainda assim o erro ocorrer (corrida entre duas confirmações), mostrar mensagem em pt-BR: "Você já tem uma reserva confirmada para esta data. Recuse esta solicitação ou libere a data antes."
- Ao confirmar uma reserva, as demais solicitações pendentes do mesmo fornecedor para a mesma data são automaticamente recusadas, com notificação ao casal explicando que a data foi ocupada.

### B. Cancelamento pelo fornecedor
- Nova função no banco `cancelar_reserva_fornecedor(_reservation_id, _motivo)`:
  - só o dono do fornecedor (ou admin) pode chamar;
  - bloqueia se a reserva já estiver encerrada;
  - aplica o mesmo prazo de carência configurável (padrão 7 dias, contados da confirmação): dentro do prazo é sem custo; fora do prazo registra taxa de cancelamento pendente para o fornecedor;
  - marca a reserva como cancelada, guarda motivo/quem cancelou, libera a data na agenda e estorna/zera a taxa de reserva quando aplicável;
  - notifica o casal ("O fornecedor cancelou a data …") e o fornecedor.
- Na aba Reservas do fornecedor, reservas confirmadas ganham o botão **"Cancelar reserva"** com diálogo de confirmação que mostra se o cancelamento é gratuito ou com taxa, e campo de motivo obrigatório.

## Detalhes técnicos
- Índice existente: `idle_reservations_unique_confirmada (supplier_id, promo_date) WHERE status = 'confirmada'` — origem do erro 23505.
- Migração: criar `public.cancelar_reserva_fornecedor` (SECURITY DEFINER, `search_path = public`), espelhando `cancelar_reserva_casal`, usando `system_settings.cancelamento_carencia_dias` e `calc_platform_fee('cancelamento_data_ociosa', …)`, com `GRANT EXECUTE` para `authenticated`.
- Frontend: `src/components/reservas/SupplierReservationsTab.tsx` (checagem de data ocupada, recusa em lote das duplicadas, botão + diálogo de cancelamento) e `src/lib/reservas.ts` (wrapper `cancelarReservaFornecedor`). Mensagem específica para o código 23505 em `src/lib/errorMessages.ts`.
