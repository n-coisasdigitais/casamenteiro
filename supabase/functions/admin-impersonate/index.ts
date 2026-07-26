import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const ANON = Deno.env.get('SUPABASE_ANON_KEY')!

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } })
  const token = authHeader.replace('Bearer ', '')
  const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token)
  if (claimsErr || !claims?.claims) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
  const adminId = claims.claims.sub as string

  const admin = createClient(SUPABASE_URL, SERVICE_KEY)

  const { data: hasAdmin, error: roleErr } = await admin.rpc('has_role', { _user_id: adminId, _role: 'admin' })
  if (roleErr || !hasAdmin) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const { target_user_id } = await req.json().catch(() => ({} as any))
  if (!target_user_id) {
    return new Response(JSON.stringify({ error: 'target_user_id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  // Busca e-mail do usuário alvo
  const { data: userData, error: userErr } = await admin.auth.admin.getUserById(target_user_id)
  if (userErr || !userData?.user?.email) {
    return new Response(JSON.stringify({ error: 'Usuário alvo não encontrado' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  // Gera magic link para o alvo
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: userData.user.email,
  })
  if (linkErr || !linkData?.properties?.action_link) {
    return new Response(JSON.stringify({ error: linkErr?.message || 'Não foi possível gerar link' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  // Registra auditoria
  await admin.from('admin_audit_log').insert({
    admin_id: adminId,
    action: 'impersonate',
    target_table: 'auth.users',
    target_id: target_user_id,
    details: { email: userData.user.email },
  })

  return new Response(JSON.stringify({ action_link: linkData.properties.action_link, target_email: userData.user.email }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})