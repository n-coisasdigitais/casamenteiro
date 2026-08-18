// Envio direto pela API do Resend (sem gateway), com retentativa em falhas temporárias.

const RESEND_ENDPOINT = 'https://api.resend.com/emails'

export interface ResendPayload {
  to: string | string[]
  subject: string
  html?: string
  text?: string
  from?: string
  replyTo?: string
  headers?: Record<string, string>
}

export interface ResendResult {
  ok: boolean
  status: number
  id?: string
  error?: string
}

export function resendApiKey(): string | undefined {
  return Deno.env.get('RESEND_API_KEY_DIRECT') ?? Deno.env.get('RESEND_API_KEY')
}

export function defaultFrom(): string {
  return Deno.env.get('RESEND_FROM') ?? 'Casamenteiro <contato@casamenteiro.com.br>'
}

export function appUrl(): string {
  return (Deno.env.get('APP_URL') ?? 'https://www.casamenteiro.com.br').replace(/\/$/, '')
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export async function sendViaResend(payload: ResendPayload, attempts = 3): Promise<ResendResult> {
  const apiKey = resendApiKey()
  if (!apiKey) return { ok: false, status: 500, error: 'RESEND_API_KEY_DIRECT não configurada' }

  const body: Record<string, unknown> = {
    from: payload.from ?? defaultFrom(),
    to: Array.isArray(payload.to) ? payload.to : [payload.to],
    subject: payload.subject,
  }
  if (payload.html) body.html = payload.html
  if (payload.text) body.text = payload.text
  const replyTo = payload.replyTo ?? Deno.env.get('RESEND_REPLY_TO')
  if (replyTo) body.reply_to = replyTo
  if (payload.headers) body.headers = payload.headers

  let last: ResendResult = { ok: false, status: 500, error: 'unknown' }

  for (let i = 0; i < attempts; i++) {
    let res: Response
    try {
      res = await fetch(RESEND_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      })
    } catch (e) {
      last = { ok: false, status: 0, error: (e as Error).message }
      await sleep(500 * (i + 1))
      continue
    }

    const raw = await res.text()
    if (res.ok) {
      let id: string | undefined
      try { id = JSON.parse(raw)?.id } catch { /* ignore */ }
      return { ok: true, status: res.status, id }
    }

    last = { ok: false, status: res.status, error: raw }
    console.error(`Resend falhou [${res.status}]: ${raw}`)

    // Só vale retentar em rate limit / erro temporário
    if (res.status !== 429 && res.status < 500) break
    await sleep(res.status === 429 ? 1500 * (i + 1) : 700 * (i + 1))
  }

  return last
}

// Registra o envio em email_send_log (não interrompe o fluxo se falhar).
export async function logEmail(
  supabase: any,
  row: {
    message_id: string
    template_name: string
    recipient_email: string
    status: string
    error_message?: string | null
    metadata?: Record<string, unknown> | null
  },
) {
  try {
    await supabase.from('email_send_log').insert({
      message_id: row.message_id,
      template_name: row.template_name,
      recipient_email: row.recipient_email,
      status: row.status,
      error_message: row.error_message ?? null,
      metadata: row.metadata ?? null,
    })
  } catch (e) {
    console.error('Falha ao registrar email_send_log', e)
  }
}
