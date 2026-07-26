// Stub webhook Mercado Pago — atrás da flag `corretagem_datas_ociosas`.
// Quando liberado:
//   1. Validar assinatura (header x-signature) com MP_WEBHOOK_SECRET
//   2. Buscar pagamento em GET https://api.mercadopago.com/v1/payments/{id}
//   3. Se status='approved' → confirmar reserva + registrar commission_ledger
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const admin = createClient(SUPABASE_URL, SERVICE_KEY)

  const { data: flag } = await admin.from('feature_flags').select('enabled').eq('key', 'corretagem_datas_ociosas').maybeSingle()
  if (!flag?.enabled) {
    return new Response(JSON.stringify({ ok: true, ignored: 'flag_off' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const payload = await req.json().catch(() => ({} as any))
  const paymentId = payload?.data?.id || payload?.payment_id
  if (!paymentId) {
    return new Response(JSON.stringify({ error: 'payment_id ausente' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  // === STUB — trocar por GET real ao MP e validação de status ===
  const status = payload?.status || 'approved'
  // ================================================================

  const { data: reserva } = await admin
    .from('idle_date_reservations')
    .select('*')
    .eq('mp_split_payment_id', String(paymentId))
    .maybeSingle()

  if (!reserva) {
    return new Response(JSON.stringify({ ok: true, ignored: 'reserva_nao_encontrada' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  if (status === 'approved') {
    await admin.from('idle_date_reservations').update({ status: 'confirmada' }).eq('id', reserva.id)
    await admin.from('supplier_promo_dates').update({ disponivel: false }).eq('id', reserva.promo_date_id)
    await admin.from('commission_ledger').insert({
      reservation_id: reserva.id,
      piso: reserva.piso_fornecedor,
      valor_ofertado: reserva.valor_ofertado,
      comissao: reserva.comissao_plataforma,
      mp_payment_id: String(paymentId),
      status: 'pago',
    })
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})