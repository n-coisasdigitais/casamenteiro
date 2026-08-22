import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { logEmail, resendApiKey, sendViaResend } from '../_shared/resend.ts'
import { adminClient, getUserId, isAdmin, isServiceRole } from '../_shared/auth.ts'

interface SendBody {
  to: string | string[]
  subject: string
  html?: string
  text?: string
  from?: string
  replyTo?: string
  label?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (!resendApiKey()) {
    return new Response(
      JSON.stringify({ error: 'Serviço de e-mail não configurado' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  let body: SendBody
  try {
    body = await req.json()
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  let { to, subject, html, text, from, replyTo, label } = body ?? {}
  if (!to || !subject || (!html && !text)) {
    return new Response(
      JSON.stringify({ error: 'Campos obrigatórios: to, subject e html ou text' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  const supabase = adminClient()

  // Não é um relay aberto: exige chamada interna (service role) ou usuário autenticado.
  const interno = isServiceRole(req)
  let admin = false
  if (!interno) {
    const userId = await getUserId(req)
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }
    admin = await isAdmin(userId)
  }

  if (!interno && !admin) {
    // Usuários comuns: remetente fixo da plataforma e poucos destinatários por chamada.
    from = undefined
    const destinatarios = Array.isArray(to) ? to : [to]
    if (destinatarios.length > 5) {
      return new Response(
        JSON.stringify({ error: 'Máximo de 5 destinatários por envio' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }
    const invalido = destinatarios.some((e) => typeof e !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
    if (invalido) {
      return new Response(
        JSON.stringify({ error: 'Destinatário inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }
    to = destinatarios
  }

  const recipient = Array.isArray(to) ? to[0] : to
  const messageId = crypto.randomUUID()
  const templateName = label || 'transactional'

  const result = await sendViaResend({ to, subject, html, text, from, replyTo })

  await logEmail(supabase, {
    message_id: result.id || messageId,
    template_name: templateName,
    recipient_email: recipient,
    status: result.ok ? 'sent' : 'failed',
    error_message: result.ok ? null : `[${result.status}] ${result.error}`,
    metadata: { subject, provider: 'resend' },
  })

  if (!result.ok) {
    return new Response(
      JSON.stringify({ error: 'Falha ao enviar e-mail', status: result.status, details: result.error }),
      { status: result.status || 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  return new Response(JSON.stringify({ id: result.id, sent: true }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
