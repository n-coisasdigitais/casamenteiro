// Stub Mercado Pago Split Checkout — atrás da flag `corretagem_datas_ociosas`.
// NÃO chama a API real do MP. Quando o jurídico/contábil liberar:
//   1. Adicionar secret MP_ACCESS_TOKEN
//   2. Trocar o bloco STUB por chamada real a POST https://api.mercadopago.com/checkout/preferences
//      com marketplace_fee = comissao_plataforma e collector_id = suppliers.mp_account_id
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const ANON = Deno.env.get('SUPABASE_ANON_KEY')!
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } })
  const { data: claims, error: claimsErr } = await userClient.auth.getClaims(authHeader.replace('Bearer ', ''))
  if (claimsErr || !claims?.claims) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY)

  // Verifica flag
  const { data: flag } = await admin.from('feature_flags').select('enabled').eq('key', 'corretagem_datas_ociosas').maybeSingle()
  if (!flag?.enabled) {
    return new Response(JSON.stringify({ error: 'Corretagem desativada. Aguardando liberação jurídica.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const { reservation_id } = await req.json().catch(() => ({} as any))
  if (!reservation_id) {
    return new Response(JSON.stringify({ error: 'reservation_id obrigatório' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const { data: reserva, error: rErr } = await admin
    .from('idle_date_reservations')
    .select('*, supplier:suppliers(id, mp_account_id, company_name)')
    .eq('id', reservation_id)
    .maybeSingle()
  if (rErr || !reserva) {
    return new Response(JSON.stringify({ error: 'Reserva não encontrada' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  if (reserva.modo_cobranca !== 'corretagem') {
    return new Response(JSON.stringify({ error: 'Reserva não é modo corretagem' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
  if (!reserva.supplier?.mp_account_id) {
    return new Response(JSON.stringify({ error: 'Fornecedor sem conta Mercado Pago vinculada' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  // === STUB — substituir por chamada real ao Mercado Pago ===
  const stubPaymentId = `STUB-${reservation_id}-${Date.now()}`
  const stubCheckoutUrl = `https://checkout.stub.mercadopago/${stubPaymentId}`
  // ============================================================

  await admin.from('idle_date_reservations').update({ mp_split_payment_id: stubPaymentId }).eq('id', reservation_id)

  return new Response(JSON.stringify({
    stub: true,
    checkout_url: stubCheckoutUrl,
    payment_id: stubPaymentId,
    valor_ofertado: reserva.valor_ofertado,
    piso_fornecedor: reserva.piso_fornecedor,
    comissao_plataforma: reserva.comissao_plataforma,
    aviso: 'Integração real com Mercado Pago pendente de liberação jurídica.',
  }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})