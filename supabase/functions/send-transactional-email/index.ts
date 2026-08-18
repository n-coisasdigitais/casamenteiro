import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { logEmail, resendApiKey, sendViaResend } from '../_shared/resend.ts'

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

  const { to, subject, html, text, from, replyTo, label } = body ?? {}
  if (!to || !subject || (!html && !text)) {
    return new Response(
      JSON.stringify({ error: 'Campos obrigatórios: to, subject e html ou text' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

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
