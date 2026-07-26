import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/resend'

interface SendBody {
  to: string | string[]
  subject: string
  html?: string
  text?: string
  from?: string
  replyTo?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
  const DEFAULT_FROM = Deno.env.get('RESEND_FROM') ?? 'Casamenteiro <onboarding@resend.dev>'

  if (!LOVABLE_API_KEY || !RESEND_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'Email service not configured' }),
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

  const { to, subject, html, text, from, replyTo } = body ?? {}
  if (!to || !subject || (!html && !text)) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields: to, subject, and html or text' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  const payload: Record<string, unknown> = {
    from: from ?? DEFAULT_FROM,
    to: Array.isArray(to) ? to : [to],
    subject,
  }
  if (html) payload.html = html
  if (text) payload.text = text
  if (replyTo) payload.reply_to = replyTo

  const response = await fetch(`${GATEWAY_URL}/emails`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      'X-Connection-Api-Key': RESEND_API_KEY,
    },
    body: JSON.stringify(payload),
  })

  const responseText = await response.text()
  if (!response.ok) {
    console.error(`Resend send failed [${response.status}]: ${responseText}`)
    return new Response(
      JSON.stringify({ error: 'Failed to send email', status: response.status, details: responseText }),
      { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  return new Response(responseText, {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})