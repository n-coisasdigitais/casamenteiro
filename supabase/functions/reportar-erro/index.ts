import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { sendViaResend } from '../_shared/resend.ts'
import { adminClient, getUserId } from '../_shared/auth.ts'

const ORIGENS = ['fornecedor', 'profissional', 'casal'] as const
const EMAIL_FALLBACK = 'carlosbelo@gmail.com'

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const userId = await getUserId(req)
  if (!userId) {
    return json({ error: 'Não autenticado' }, 401)
  }

  let body: { origem?: string; assunto?: string; descricao?: string; anexo_path?: string | null }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'JSON inválido' }, 400)
  }

  const origem = body.origem ?? ''
  const assunto = (body.assunto ?? '').trim()
  const descricao = (body.descricao ?? '').trim()
  const anexoPath = body.anexo_path ?? null

  if (!ORIGENS.includes(origem as (typeof ORIGENS)[number])) {
    return json({ error: 'Origem inválida' }, 400)
  }
  if (!assunto || assunto.length > 120) {
    return json({ error: 'Assunto obrigatório (máx. 120 caracteres)' }, 400)
  }
  if (!descricao || descricao.length > 2000) {
    return json({ error: 'Descrição obrigatória (máx. 2000 caracteres)' }, 400)
  }
  // O anexo precisa estar na pasta do próprio usuário no bucket "suporte".
  if (anexoPath && !anexoPath.startsWith(`${userId}/`)) {
    return json({ error: 'Anexo inválido' }, 400)
  }

  const supabase = adminClient()

  const { data: reporte, error: insertErr } = await supabase
    .from('suporte_reportes')
    .insert({ user_id: userId, origem, assunto, descricao, anexo_path: anexoPath })
    .select('id, created_at')
    .single()

  if (insertErr) {
    return json({ error: 'Falha ao registrar o reporte' }, 500)
  }

  // E-mail do usuário que reportou (para reply-to e identificação).
  const { data: userData } = await supabase.auth.admin.getUserById(userId)
  const userEmail = userData?.user?.email ?? 'desconhecido'

  // E-mail do responsável pelo suporte, configurável em system_settings.
  const { data: cfg } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'suporte_email')
    .maybeSingle()
  const destinatario =
    (cfg?.value as { email?: string } | null)?.email ?? EMAIL_FALLBACK

  // Link assinado do anexo (válido por 7 dias), se houver.
  let anexoUrl: string | null = null
  if (anexoPath) {
    const { data: signed } = await supabase.storage
      .from('suporte')
      .createSignedUrl(anexoPath, 60 * 60 * 24 * 7)
    anexoUrl = signed?.signedUrl ?? null
  }

  const origemLabel =
    origem === 'fornecedor' ? 'Fornecedor' : origem === 'profissional' ? 'Profissional' : 'Casal'

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #b3543a; margin-bottom: 8px;">Novo reporte de erro — Casamenteiro</h2>
      <p style="color: #555; margin-top: 0;">Enviado pela aba Ajuda do painel.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 6px 0; color: #777; width: 120px;">Origem</td><td style="padding: 6px 0;"><strong>${origemLabel}</strong></td></tr>
        <tr><td style="padding: 6px 0; color: #777;">Usuário</td><td style="padding: 6px 0;">${escapeHtml(userEmail)}</td></tr>
        <tr><td style="padding: 6px 0; color: #777;">Assunto</td><td style="padding: 6px 0;"><strong>${escapeHtml(assunto)}</strong></td></tr>
      </table>
      <div style="background: #f7f4ef; border-radius: 8px; padding: 16px; white-space: pre-wrap;">${escapeHtml(descricao)}</div>
      ${anexoUrl ? `<p style="margin-top: 16px;"><a href="${anexoUrl}" style="color: #b3543a;">Ver anexo (link válido por 7 dias)</a></p>` : ''}
      <p style="color: #999; font-size: 12px; margin-top: 24px;">Responda diretamente a este e-mail para falar com o usuário.</p>
    </div>
  `

  const envio = await sendViaResend({
    to: destinatario,
    subject: `[Suporte] ${assunto}`,
    html,
    replyTo: userEmail !== 'desconhecido' ? userEmail : undefined,
  })

  if (!envio.ok) {
    // O reporte fica registrado mesmo se o e-mail falhar.
    return json({ ok: true, emailEnviado: false, id: reporte.id })
  }

  return json({ ok: true, emailEnviado: true, id: reporte.id })
})
