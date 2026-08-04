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

  const payload = await req.json().catch(() => ({} as any))
  const paymentId = payload?.data?.id || payload?.payment_id

  // Registro de todas as tentativas de webhook (inspecionável no admin)
  const registro: Record<string, unknown> = {
    provider: 'mercadopago',
    evento: payload?.type ?? payload?.topic ?? payload?.action ?? null,
    mp_payment_id: paymentId ? String(paymentId) : null,
    payload,
  }
  const registrar = async (extra: Record<string, unknown>, httpStatus: number) => {
    try {
      await admin.from('webhook_events').insert({ ...registro, ...extra, http_status: httpStatus })
    } catch (_e) { /* nunca derruba o webhook */ }
  }

  if (!paymentId) {
    await registrar({ resultado: 'payment_id_ausente', erro: 'payment_id ausente' }, 400)
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
    await registrar({ resultado: 'assinatura_invalida', erro: 'assinatura inválida ou ausente' }, 401)
    return json({ error: 'assinatura inválida' }, 401)
  }
  registro.ambiente = ambiente
  registro.assinatura_valida = true
  if (!accessToken) {
    await registrar({ resultado: 'token_ausente', erro: `access token ausente para ambiente ${ambiente}` }, 503)
    return json({ error: `access token ausente para ambiente ${ambiente}` }, 503)
  }

  // --- Consulta o pagamento real no Mercado Pago ---
  const payRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const pagamento = await payRes.json().catch(() => ({} as any))
  if (!payRes.ok) {
    console.error('Erro ao consultar pagamento MP:', payRes.status, pagamento)
    await registrar({ resultado: 'falha_consulta_pagamento', erro: String(pagamento?.message ?? payRes.status) }, 502)
    return json({ error: 'falha ao consultar pagamento' }, 502)
  }

  const status = pagamento?.status
  const externalRef = String(pagamento?.external_reference ?? '')
  const [refTipoRaw, refIdRaw] = externalRef.includes(':') ? externalRef.split(':') : ['reserva', externalRef]
  const tipo = ['reserva', 'assinatura', 'destaque', 'cancelamento'].includes(refTipoRaw) ? refTipoRaw : 'reserva'
  const referenciaId = refIdRaw || null
  const aprovado = status === 'approved'
  registro.tipo = tipo
  registro.referencia_id = referenciaId
  registro.status_recebido = status ?? null
  if (tipo === 'reserva') registro.reservation_id = referenciaId

  // Histórico unificado de pagamentos
  if (referenciaId) {
    const { data: intent } = await admin.from('payment_intents')
      .select('id').eq('tipo', tipo).eq('referencia_id', referenciaId)
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (intent) {
      await admin.from('payment_intents')
        .update({ status: aprovado ? 'pago' : status, mp_payment_id: String(paymentId), ambiente })
        .eq('id', intent.id)
    }
  }

  if (tipo === 'assinatura' && referenciaId) {
    const { data: assinatura } = await admin.from('supplier_subscriptions').select('*').eq('id', referenciaId).maybeSingle()
    if (!assinatura) { await registrar({ resultado: 'assinatura_nao_encontrada' }, 200); return json({ ok: true, ignored: 'assinatura_nao_encontrada' }) }
    if (aprovado) {
      const inicio = new Date()
      const fim = new Date(inicio)
      if (assinatura.ciclo === 'anual') fim.setFullYear(fim.getFullYear() + 1)
      else fim.setMonth(fim.getMonth() + 1)
      await admin.from('supplier_subscriptions').update({
        status: 'ativa',
        ambiente,
        current_period_start: inicio.toISOString(),
        current_period_end: fim.toISOString(),
      }).eq('id', assinatura.id)

      const { data: jaFaturado } = await admin.from('subscription_invoices')
        .select('id').eq('mp_payment_id', String(paymentId)).maybeSingle()
      if (!jaFaturado) {
        await admin.from('subscription_invoices').insert({
          subscription_id: assinatura.id,
          supplier_id: assinatura.supplier_id,
          valor: assinatura.valor,
          status: 'pago',
          mp_payment_id: String(paymentId),
          ambiente,
          periodo_inicio: inicio.toISOString(),
          periodo_fim: fim.toISOString(),
          pago_em: new Date().toISOString(),
        })
      }

      const { data: plano } = await admin.from('subscription_plans')
        .select('destaque_busca').eq('id', assinatura.plan_id).maybeSingle()
      if (plano?.destaque_busca) {
        await admin.from('suppliers')
          .update({ featured: true, featured_until: fim.toISOString() })
          .eq('id', assinatura.supplier_id)
      }
    }
    await registrar({ resultado: aprovado ? 'assinatura_ativada' : 'assinatura_atualizada' }, 200)
    return json({ ok: true, tipo, ambiente, status })
  }

  if (tipo === 'destaque' && referenciaId) {
    const { data: destaque } = await admin.from('featured_purchases').select('*').eq('id', referenciaId).maybeSingle()
    if (!destaque) { await registrar({ resultado: 'destaque_nao_encontrado' }, 200); return json({ ok: true, ignored: 'destaque_nao_encontrado' }) }
    if (aprovado) {
      const inicio = new Date()
      const fim = new Date(inicio.getTime() + Number(destaque.dias || 7) * 24 * 60 * 60 * 1000)
      await admin.from('featured_purchases').update({
        status: 'ativo',
        mp_payment_id: String(paymentId),
        ambiente,
        inicio: inicio.toISOString(),
        fim: fim.toISOString(),
      }).eq('id', destaque.id)
      await admin.from('suppliers')
        .update({ featured: true, featured_until: fim.toISOString() })
        .eq('id', destaque.supplier_id)
    }
    await registrar({ resultado: aprovado ? 'destaque_ativado' : 'destaque_atualizado' }, 200)
    return json({ ok: true, tipo, ambiente, status })
  }

  // --- Taxa de cancelamento paga pelo casal ---
  if (tipo === 'cancelamento' && referenciaId) {
    if (aprovado) {
      await admin.from('idle_date_reservations')
        .update({ taxa_cancelamento_status: 'paga' })
        .eq('id', referenciaId)
    }
    await registrar({ resultado: aprovado ? 'cancelamento_pago' : 'cancelamento_atualizado', reservation_id: referenciaId }, 200)
    return json({ ok: true, tipo, ambiente, status })
  }

  // --- Reserva de data ociosa ---
  let reserva: any = null
  if (referenciaId) {
    const { data } = await admin.from('idle_date_reservations').select('*').eq('id', referenciaId).maybeSingle()
    reserva = data
  }
  if (!reserva) {
    const { data } = await admin.from('idle_date_reservations').select('*')
      .eq('mp_split_payment_id', String(pagamento?.order?.id ?? paymentId)).maybeSingle()
    reserva = data
  }
  if (!reserva) {
    await registrar({ resultado: 'reserva_nao_encontrada' }, 200)
    return json({ ok: true, ignored: 'reserva_nao_encontrada' })
  }

  await admin.from('idle_date_reservations')
    .update({ mp_payment_id: String(paymentId), mp_status: status, ambiente })
    .eq('id', reserva.id)

  if (aprovado) {
    if (reserva.modo_cobranca === 'taxa_reserva') {
      // Fornecedor quitou a taxa da plataforma; a data já está confirmada.
      await admin.from('idle_date_reservations').update({ taxa_status: 'paga' }).eq('id', reserva.id)
      await admin.from('supplier_promo_dates').delete()
        .eq('supplier_id', reserva.supplier_id)
        .eq('promo_date', reserva.promo_date)
      await registrar({ resultado: 'taxa_reserva_paga', reservation_id: reserva.id }, 200)
      return json({ ok: true, tipo, ambiente, status })
    }
    await admin.from('idle_date_reservations').update({ status: 'confirmada', confirmada_em: new Date().toISOString() }).eq('id', reserva.id)
    // A data deixa de ser ofertada como ociosa
    await admin.from('supplier_promo_dates').delete()
      .eq('supplier_id', reserva.supplier_id)
      .eq('promo_date', reserva.promo_date)

    const { data: jaExiste } = await admin.from('commission_ledger')
      .select('id').eq('mp_payment_id', String(paymentId)).maybeSingle()
    if (!jaExiste) {
      await admin.from('commission_ledger').insert({
        reservation_id: reserva.id,
        supplier_id: reserva.supplier_id,
        couple_id: reserva.couple_id,
        piso: reserva.piso_fornecedor,
        valor_ofertado: reserva.valor_ofertado,
        comissao: reserva.comissao_plataforma,
        mp_payment_id: String(paymentId),
        status: 'pago',
        paid_at: new Date().toISOString(),
        ambiente,
      })
    }
  }

  await registrar({ resultado: aprovado ? 'reserva_confirmada' : 'reserva_atualizada', reservation_id: reserva.id }, 200)
  return json({ ok: true, tipo, ambiente, status })
})