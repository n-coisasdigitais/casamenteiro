// Checkout unificado Mercado Pago: reserva (com split), assinatura e destaque.
// Ambiente: usuário demo -> credenciais de teste; usuário real -> produção.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

type Tipo = 'reserva' | 'assinatura' | 'destaque' | 'cancelamento'

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

  const body = await req.json().catch(() => ({} as any))
  const tipo = body?.tipo as Tipo
  const referenciaId = body?.referencia_id as string | undefined
  if (!tipo || !['reserva', 'assinatura', 'destaque', 'cancelamento'].includes(tipo)) {
    return json({ error: 'tipo inválido' }, 400)
  }
  if (!referenciaId) return json({ error: 'referencia_id obrigatório' }, 400)

  const { data: perfil } = await admin.from('profiles').select('is_demo').eq('user_id', userId).maybeSingle()
  const ambiente: 'sandbox' | 'live' = perfil?.is_demo ? 'sandbox' : 'live'
  const accessToken = ambiente === 'sandbox'
    ? Deno.env.get('MP_ACCESS_TOKEN_TEST')
    : Deno.env.get('MP_ACCESS_TOKEN_PROD')
  const publicKey = ambiente === 'sandbox'
    ? Deno.env.get('MP_PUBLIC_KEY_TEST')
    : Deno.env.get('MP_PUBLIC_KEY_PROD')
  if (!accessToken) {
    return json({ error: `Credencial do Mercado Pago não configurada para o ambiente ${ambiente}.`, ambiente }, 503)
  }

  let titulo = ''
  let valor = 0
  let comissao = 0
  let supplierId: string | null = null
  let coupleId: string | null = null
  let marketplaceAccount: string | null = null

  const flagLiberada = async (key: string) => {
    const { data: flag } = await admin.from('feature_flags').select('enabled').eq('key', key).maybeSingle()
    return !!flag?.enabled
  }

  if (tipo === 'reserva' || tipo === 'cancelamento') {
    const { data: reserva } = await admin
      .from('idle_date_reservations')
      .select('*, supplier:suppliers(id, mp_account_id, company_name)')
      .eq('id', referenciaId)
      .maybeSingle()
    if (!reserva) return json({ error: 'Reserva não encontrada' }, 404)
    supplierId = reserva.supplier_id
    coupleId = reserva.couple_id
    const nomeFornecedor = (reserva as any).supplier?.company_name ?? 'Fornecedor'

    if (tipo === 'cancelamento') {
      // Taxa de cancelamento paga pelo casal
      const { data: couple } = await admin.from('couples').select('user_id').eq('id', reserva.couple_id).maybeSingle()
      const { data: vinculo } = await admin.from('couple_links').select('linked_user_id')
        .eq('couple_id', reserva.couple_id).eq('linked_user_id', userId).maybeSingle()
      if (couple?.user_id !== userId && !vinculo) return json({ error: 'Não autorizado' }, 403)
      if (reserva.taxa_cancelamento_status !== 'pendente') {
        return json({ error: 'Não há taxa de cancelamento pendente para esta reserva.' }, 400)
      }
      valor = Number(reserva.taxa_cancelamento || 0)
      titulo = `Taxa de cancelamento de reserva — ${nomeFornecedor}`
    } else if (reserva.modo_cobranca === 'corretagem') {
      if (!(await flagLiberada('corretagem_datas_ociosas'))) {
        return json({ error: 'Este pagamento ainda não está liberado.' }, 403)
      }
      valor = Number(reserva.valor_ofertado || 0)
      comissao = Number(reserva.comissao_plataforma || 0)
      marketplaceAccount = (reserva as any).supplier?.mp_account_id ?? null
      titulo = `Reserva de data — ${nomeFornecedor}`
      if (!marketplaceAccount) return json({ error: 'Fornecedor sem conta Mercado Pago vinculada' }, 400)
    } else {
      // taxa_reserva: o fornecedor paga a taxa da plataforma (sem split)
      const { data: fornecedor } = await admin.from('suppliers').select('user_id').eq('id', reserva.supplier_id).maybeSingle()
      if (fornecedor?.user_id !== userId) {
        return json({ error: 'Apenas o fornecedor responsável pode pagar a taxa desta reserva.' }, 403)
      }
      if (reserva.taxa_status === 'paga') return json({ error: 'Esta taxa já foi paga.' }, 400)
      valor = Number(reserva.taxa_plataforma || 0)
      titulo = `Taxa de reserva de data — ${new Date(reserva.promo_date + 'T00:00:00').toLocaleDateString('pt-BR')}`
    }
  } else if (tipo === 'assinatura') {
    if (!(await flagLiberada('assinatura_fornecedor'))) return json({ error: 'Este pagamento ainda não está liberado.' }, 403)
    const { data: assinatura } = await admin
      .from('supplier_subscriptions')
      .select('*, plan:subscription_plans(nome), supplier:suppliers(id, user_id)')
      .eq('id', referenciaId)
      .maybeSingle()
    if (!assinatura) return json({ error: 'Assinatura não encontrada' }, 404)
    if ((assinatura as any).supplier?.user_id !== userId) return json({ error: 'Não autorizado' }, 403)
    valor = Number(assinatura.valor || 0)
    supplierId = assinatura.supplier_id
    titulo = `Assinatura ${(assinatura as any).plan?.nome ?? ''} (${assinatura.ciclo})`
  } else {
    if (!(await flagLiberada('destaque_pago'))) return json({ error: 'Este pagamento ainda não está liberado.' }, 403)
    const { data: destaque } = await admin
      .from('featured_purchases')
      .select('*, supplier:suppliers(id, user_id, company_name)')
      .eq('id', referenciaId)
      .maybeSingle()
    if (!destaque) return json({ error: 'Compra de destaque não encontrada' }, 404)
    if ((destaque as any).supplier?.user_id !== userId) return json({ error: 'Não autorizado' }, 403)
    valor = Number(destaque.valor || 0)
    supplierId = destaque.supplier_id
    titulo = `Destaque na busca — ${destaque.dias} dias`
  }

  if (valor <= 0) return json({ error: 'Valor inválido para cobrança' }, 400)

  const externalReference = `${tipo}:${referenciaId}`
  const origin = req.headers.get('origin') || 'https://casamenteiro.lovable.app'
  const retorno = tipo === 'cancelamento'
    ? '/minhas-reservas'
    : tipo === 'reserva'
      ? '/fornecedor/painel?tab=reservas'
      : '/fornecedor/planos'

  const prefRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': `${tipo}-${referenciaId}`,
    },
    body: JSON.stringify({
      items: [{ id: referenciaId, title: titulo, quantity: 1, currency_id: 'BRL', unit_price: valor }],
      ...(comissao > 0 ? { marketplace_fee: comissao } : {}),
      external_reference: externalReference,
      back_urls: (() => {
        const sep = retorno.includes('?') ? '&' : '?'
        return {
          success: `${origin}${retorno}${sep}pagamento=sucesso`,
          pending: `${origin}${retorno}${sep}pagamento=pendente`,
          failure: `${origin}${retorno}${sep}pagamento=falha`,
        }
      })(),
      auto_return: 'approved',
      notification_url: `${SUPABASE_URL}/functions/v1/mp-webhook`,
    }),
  })

  const pref = await prefRes.json().catch(() => ({}))
  if (!prefRes.ok) {
    console.error('Erro MP preference:', prefRes.status, pref)
    return json({ error: 'Falha ao criar checkout no Mercado Pago', detalhe: pref?.message ?? null, ambiente }, 502)
  }

  await admin.from('payment_intents').insert({
    tipo,
    referencia_id: referenciaId,
    user_id: userId,
    supplier_id: supplierId,
    couple_id: coupleId,
    valor,
    comissao,
    metodo: 'checkout_pro',
    status: 'pendente',
    ambiente,
    detalhes: { preference_id: pref.id },
  })

  if (tipo === 'reserva' && comissao > 0) {
    await admin.from('idle_date_reservations')
      .update({ mp_split_payment_id: String(pref.id), mp_status: 'pendente', ambiente })
      .eq('id', referenciaId)
  }

  const checkoutUrl = ambiente === 'sandbox' ? (pref.sandbox_init_point || pref.init_point) : pref.init_point

  return json({
    ambiente,
    tipo,
    valor,
    comissao,
    titulo,
    preference_id: pref.id,
    checkout_url: checkoutUrl,
    public_key: publicKey ?? null,
  })
})