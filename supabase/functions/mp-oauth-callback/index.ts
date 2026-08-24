// Callback do OAuth do Mercado Pago: troca o code por tokens e vincula a conta ao fornecedor.
// Pública (o Mercado Pago redireciona o navegador do fornecedor para cá).
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { redirectUriMp } from "../_shared/mp-redirect.ts";

const BASE_PUBLICA = "https://www.casamenteiro.com.br";

const redirect = (destino: string) =>
  new Response(null, { status: 302, headers: { ...corsHeaders, Location: destino } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  const url = new URL(req.url);
  let code = url.searchParams.get("code") ?? undefined;
  let state = url.searchParams.get("state") ?? undefined;
  let origem = url.searchParams.get("origem") ?? undefined; // origem do front (opcional)

  if (req.method === "POST") {
    const body = await req.json().catch(() => ({}) as any);
    code = code ?? body?.code;
    state = state ?? body?.state;
    origem = origem ?? body?.origem;
  }

  const base = origem && /^https?:\/\//.test(origem) ? origem.replace(/\/$/, "") : BASE_PUBLICA;
  const okUrl = `${base}/fornecedor/painel?mp=conectado`;
  const erroUrl = (motivo: string) => `${base}/fornecedor/painel?mp=erro&motivo=${encodeURIComponent(motivo)}`;

  if (!code || !state) return redirect(erroUrl("Código de autorização ausente."));

  const { data: registro } = await admin
    .from("mp_oauth_states")
    .select("state, supplier_id, expira_em")
    .eq("state", state)
    .maybeSingle();

  if (!registro) return redirect(erroUrl("Sessão de conexão inválida."));
  if (new Date(registro.expira_em).getTime() < Date.now()) {
    await admin.from("mp_oauth_states").delete().eq("state", state);
    return redirect(erroUrl("Sessão de conexão expirada. Tente novamente."));
  }

  const CLIENT_ID = Deno.env.get("MP_OAUTH_CLIENT_ID");
  const CLIENT_SECRET = Deno.env.get("MP_OAUTH_CLIENT_SECRET");
  const REDIRECT_URI = Deno.env.get("MP_OAUTH_REDIRECT_URI");
  if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
    return redirect(erroUrl("Integração do Mercado Pago não configurada."));
  }

  const tokenRes = await fetch("https://api.mercadopago.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });
  const tk = await tokenRes.json().catch(() => ({}) as any);
  if (!tokenRes.ok || !tk?.access_token || !tk?.user_id) {
    console.error("Erro OAuth MP:", tokenRes.status, JSON.stringify(tk));
    return redirect(erroUrl("O Mercado Pago recusou a autorização."));
  }

  const expiraEm = new Date(Date.now() + Number(tk.expires_in ?? 0) * 1000).toISOString();

  const { error: upErr } = await admin
    .from("suppliers")
    .update({
      mp_account_id: String(tk.user_id),
      mp_access_token: tk.access_token,
      mp_refresh_token: tk.refresh_token ?? null,
      mp_token_expires_at: expiraEm,
      mp_connected_at: new Date().toISOString(),
    })
    .eq("id", registro.supplier_id);

  await admin.from("mp_oauth_states").delete().eq("state", state);

  if (upErr) {
    console.error("Erro ao salvar conexão MP:", upErr);
    return redirect(erroUrl("Não foi possível salvar a conexão."));
  }

  return redirect(okUrl);
});
