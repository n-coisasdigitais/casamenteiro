// Webhook Mercado Pago — atrás da flag `corretagem_datas_ociosas`.
// Valida a assinatura (x-signature) contra os secrets de teste e produção;
// o secret que bater define o ambiente ('sandbox' ou 'live') e o access token usado.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

async function hmacHex(secret: string, message: string) {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const admin = createClient(SUPABASE_URL, SERVICE_KEY)

  const { data: flag } = await admin.from('feature_flags').select('enabled').eq('key', 'corretagem_datas_ociosas').maybeSingle()
  if (!flag?.enabled) {
    return json({ ok: true, ignored: 'flag_off' })
  }

  const payload = await req.json().catch(() => ({} as any))
  const paymentId = payload?.data?.id || payload?.payment_id
  if (!paymentId) {
    return json({ error: 'payment_id ausente' }, 400)
  }

  // --- Validação de assinatura (define o ambiente) ---
  const xSignature = req.headers.get('x-signature') || ''
  const xRequestId = req.headers.get('x-request-id') || ''
  const parts = Object.fromEntries(
    xSignature.split(',').map((p) => p.split('=').map((s) => s.trim())).filter((p) => p.length === 2),
  ) as Record<string, string>
  const ts = parts['ts']
  const v1 = parts['v1']

  const candidatos: Array<{ ambiente: 'sandbox' | 'live'; secret?: string; token?: string }> = [
    { ambiente: 'sandbox', secret: Deno.env.get('MP_WEBHOOK_SECRET_TEST'), token: Deno.env.get('MP_ACCESS_TOKEN_TEST') },
    { ambiente: 'live', secret: Deno.env.get('MP_WEBHOOK_SECRET_PROD'), token: Deno.env.get('MP_ACCESS_TOKEN_PROD') },
  ]

  let ambiente: 'sandbox' | 'live' | null = null
  let accessToken: string | undefined
  if (ts && v1) {
    const manifest = `id:${paymentId};request-id:${xRequestId};ts:${ts};`
    for (const c of candidatos) {
      if (!c.secret) continue
      if (await hmacHex(c.secret, manifest) === v1) {
        ambiente = c.ambiente
        accessToken = c.token
        break
      }
    }
  }

  if (!ambiente) {
    console.warn('Assinatura do webhook inválida ou ausente')
    return json({ error: 'assinatura inválida' }, 401)
  }
  if (!accessToken) {
    return json({ error: `access token ausente para ambiente ${ambiente}` }, 503)
  }

  // --- Consulta o pagamento real no Mercado Pago ---
  const payRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const pagamento = await payRes.json().catch(() => ({} as any))
  if (!payRes.ok) {
    console.error('Erro ao consultar pagamento MP:', payRes.status, pagamento)
    return json({ error: 'falha ao consultar pagamento' }, 502)
  }

  const status = pagamento?.status
  const reservationId = pagamento?.external_reference

  let reserva: any = null
  if (reservationId) {
    const { data } = await admin.from('idle_date_reservations').select('*').eq('id', reservationId).maybeSingle()
    reserva = data
  }
  if (!reserva) {
    const { data } = await admin.from('idle_date_reservations').select('*')
      .eq('mp_split_payment_id', String(pagamento?.order?.id ?? paymentId)).maybeSingle()
    reserva = data
  }
  if (!reserva) {
    return json({ ok: true, ignored: 'reserva_nao_encontrada' })
  }

  await admin.from('idle_date_reservations')
    .update({ mp_payment_id: String(paymentId), mp_status: status, ambiente })
    .eq('id', reserva.id)

  if (status === 'approved') {
    await admin.from('idle_date_reservations').update({ status: 'confirmada' }).eq('id', reserva.id)
    await admin.from('supplier_promo_dates').update({ disponivel: false }).eq('id', reserva.promo_date_id)

    const { data: jaExiste } = await admin.from('commission_ledger')
      .select('id').eq('mp_payment_id', String(paymentId)).maybeSingle()
    if (!jaExiste) {
      await admin.from('commission_ledger').insert({
        reservation_id: reserva.id,
        piso: reserva.piso_fornecedor,
        valor_ofertado: reserva.valor_ofertado,
        comissao: reserva.comissao_plataforma,
        mp_payment_id: String(paymentId),
        status: 'pago',
        ambiente,
      })
    }
  }

  return json({ ok: true, ambiente, status })
})