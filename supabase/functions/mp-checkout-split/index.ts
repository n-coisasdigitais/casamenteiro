// Mercado Pago Split Checkout — atrás da flag `corretagem_datas_ociosas`.
// Seleção automática de credenciais:
//   usuário demo  -> MP_ACCESS_TOKEN_TEST  (ambiente = 'sandbox')
//   usuário real  -> MP_ACCESS_TOKEN_PROD  (ambiente = 'live')
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const ANON = Deno.env.get('SUPABASE_ANON_KEY')!
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return json({ error: 'Unauthorized' }, 401)
  }

  const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } })
  const { data: claims, error: claimsErr } = await userClient.auth.getClaims(authHeader.replace('Bearer ', ''))
  if (claimsErr || !claims?.claims) {
    return json({ error: 'Unauthorized' }, 401)
  }
  const userId = (claims.claims as any).sub as string

  const admin = createClient(SUPABASE_URL, SERVICE_KEY)

  // Verifica flag
  const { data: flag } = await admin.from('feature_flags').select('enabled').eq('key', 'corretagem_datas_ociosas').maybeSingle()
  if (!flag?.enabled) {
    return json({ error: 'Corretagem desativada. Aguardando liberação jurídica.' }, 403)
  }

  const { reservation_id } = await req.json().catch(() => ({} as any))
  if (!reservation_id) {
    return json({ error: 'reservation_id obrigatório' }, 400)
  }

  const { data: reserva, error: rErr } = await admin
    .from('idle_date_reservations')
    .select('*, supplier:suppliers(id, mp_account_id, company_name)')
    .eq('id', reservation_id)
    .maybeSingle()
  if (rErr || !reserva) {
    return json({ error: 'Reserva não encontrada' }, 404)
  }

  if (reserva.modo_cobranca !== 'corretagem') {
    return json({ error: 'Reserva não é modo corretagem' }, 400)
  }
  if (!reserva.supplier?.mp_account_id) {
    return json({ error: 'Fornecedor sem conta Mercado Pago vinculada' }, 400)
  }

  // Ambiente: demo -> sandbox (chaves de teste), real -> live (chaves de produção)
  const { data: perfil } = await admin
    .from('profiles')
    .select('is_demo')
    .eq('user_id', userId)
    .maybeSingle()
  const ambiente = perfil?.is_demo ? 'sandbox' : 'live'

  const accessToken = ambiente === 'sandbox'
    ? Deno.env.get('MP_ACCESS_TOKEN_TEST')
    : Deno.env.get('MP_ACCESS_TOKEN_PROD')

  if (!accessToken) {
    return json({
      error: ambiente === 'sandbox'
        ? 'Credencial de teste do Mercado Pago não configurada (MP_ACCESS_TOKEN_TEST).'
        : 'Credencial de produção do Mercado Pago não configurada (MP_ACCESS_TOKEN_PROD).',
      ambiente,
    }, 503)
  }

  const valor = Number(reserva.valor_ofertado || 0)
  const comissao = Number(reserva.comissao_plataforma || 0)
  if (valor <= 0) return json({ error: 'Valor ofertado inválido' }, 400)

  const origin = req.headers.get('origin') || 'https://casamenteiro.lovable.app'

  const prefRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': `reserva-${reservation_id}`,
    },
    body: JSON.stringify({
      items: [{
        id: reservation_id,
        title: `Reserva de data — ${reserva.supplier?.company_name ?? 'Fornecedor'}`,
        quantity: 1,
        currency_id: 'BRL',
        unit_price: valor,
      }],
      marketplace_fee: comissao,
      external_reference: reservation_id,
      back_urls: {
        success: `${origin}/meu-plano?reserva=sucesso`,
        pending: `${origin}/meu-plano?reserva=pendente`,
        failure: `${origin}/meu-plano?reserva=falha`,
      },
      auto_return: 'approved',
      notification_url: `${SUPABASE_URL}/functions/v1/mp-webhook`,
    }),
  })

  const pref = await prefRes.json().catch(() => ({}))
  if (!prefRes.ok) {
    console.error('Erro MP:', prefRes.status, pref)
    return json({ error: 'Falha ao criar checkout no Mercado Pago', detalhe: pref?.message ?? null, ambiente }, 502)
  }

  const checkoutUrl = ambiente === 'sandbox' ? (pref.sandbox_init_point || pref.init_point) : pref.init_point

  await admin.from('idle_date_reservations').update({
    mp_split_payment_id: String(pref.id),
    mp_status: 'pendente',
    ambiente,
  }).eq('id', reservation_id)

  return json({
    ambiente,
    checkout_url: checkoutUrl,
    preference_id: pref.id,
    valor_ofertado: valor,
    piso_fornecedor: reserva.piso_fornecedor,
    comissao_plataforma: comissao,
  })
})