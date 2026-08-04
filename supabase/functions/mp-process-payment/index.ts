// Checkout transparente (Mercado Pago Bricks): recebe o token do cartão / Pix
// gerado no navegador e cria o pagamento no servidor.
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
  if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Não autorizado' }, 401)
  const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } })
  const { data: claims, error: claimsErr } = await userClient.auth.getClaims(authHeader.replace('Bearer ', ''))
  if (claimsErr || !claims?.claims) return json({ error: 'Não autorizado' }, 401)
  const userId = (claims.claims as any).sub as string

  const admin = createClient(SUPABASE_URL, SERVICE_KEY)

  const { data: flagCheckout } = await admin.from('feature_flags').select('enabled').eq('key', 'checkout_transparente').maybeSingle()
  if (!flagCheckout?.enabled) return json({ error: 'Checkout transparente desativado.' }, 403)

  const body = await req.json().catch(() => ({} as any))
  const { tipo, referencia_id, formData } = body ?? {}
  if (!tipo || !referencia_id || !formData) return json({ error: 'Dados de pagamento incompletos' }, 400)

  const { data: intent } = await admin
    .from('payment_intents')
    .select('*')
    .eq('tipo', tipo)
    .eq('referencia_id', referencia_id)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!intent) return json({ error: 'Cobrança não encontrada. Reinicie o pagamento.' }, 404)

  const ambiente = intent.ambiente as 'sandbox' | 'live'
  const accessToken = ambiente === 'sandbox'
    ? Deno.env.get('MP_ACCESS_TOKEN_TEST')
    : Deno.env.get('MP_ACCESS_TOKEN_PROD')
  if (!accessToken) return json({ error: `Credencial do Mercado Pago ausente (${ambiente}).` }, 503)

  const payload: Record<string, unknown> = {
    transaction_amount: Number(intent.valor),
    description: `${tipo} ${referencia_id}`,
    external_reference: `${tipo}:${referencia_id}`,
    payment_method_id: formData.payment_method_id,
    payer: formData.payer,
    notification_url: `${SUPABASE_URL}/functions/v1/mp-webhook`,
  }
  if (formData.token) payload.token = formData.token
  if (formData.installments) payload.installments = Number(formData.installments)
  if (formData.issuer_id) payload.issuer_id = formData.issuer_id
  if (Number(intent.comissao) > 0) payload.application_fee = Number(intent.comissao)

  const res = await fetch('https://api.mercadopago.com/v1/payments', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': `${tipo}-${referencia_id}-${Date.now()}`,
    },
    body: JSON.stringify(payload),
  })
  const pagamento = await res.json().catch(() => ({} as any))
  if (!res.ok) {
    console.error('Erro MP payment:', res.status, pagamento)
    return json({ error: 'Falha ao processar pagamento', detalhe: pagamento?.message ?? null }, res.status)
  }

  await admin.from('payment_intents').update({
    status: pagamento.status === 'approved' ? 'pago' : pagamento.status,
    mp_payment_id: String(pagamento.id),
    metodo: 'bricks',
    detalhes: { ...(intent.detalhes as any ?? {}), mp_status_detail: pagamento.status_detail },
  }).eq('id', intent.id)

  return json({
    id: pagamento.id,
    status: pagamento.status,
    status_detail: pagamento.status_detail,
    qr_code: pagamento?.point_of_interaction?.transaction_data?.qr_code ?? null,
    qr_code_base64: pagamento?.point_of_interaction?.transaction_data?.qr_code_base64 ?? null,
  })
})