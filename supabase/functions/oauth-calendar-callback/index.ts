import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const REDIRECT_URI = `${SUPABASE_URL}/functions/v1/oauth-calendar-callback`;
const APP_ORIGIN = Deno.env.get("APP_PUBLIC_URL") || "https://casamenteiro.lovable.app";

function htmlRedirect(url: string, msg: string) {
  return new Response(
    `<!doctype html><meta charset="utf-8"><title>Casamenteiro</title>
    <meta http-equiv="refresh" content="2;url=${url}">
    <body style="font-family:Inter,system-ui;text-align:center;padding:60px;color:#333">
      <h2>${msg}</h2>
      <p>Redirecionando…</p>
      <p><a href="${url}">Clique aqui se não for redirecionado</a></p>
    </body>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

async function exchangeGoogle(code: string) {
  const id = Deno.env.get("GOOGLE_CALENDAR_CLIENT_ID")!;
  const secret = Deno.env.get("GOOGLE_CALENDAR_CLIENT_SECRET")!;
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code, client_id: id, client_secret: secret,
      redirect_uri: REDIRECT_URI, grant_type: "authorization_code",
    }),
  });
  if (!r.ok) throw new Error(`Google token: ${await r.text()}`);
  const tok = await r.json();
  // pega email da conta
  const me = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tok.access_token}` },
  }).then((x) => x.json()).catch(() => ({}));
  return {
    access_token: tok.access_token,
    refresh_token: tok.refresh_token,
    expires_at: new Date(Date.now() + (tok.expires_in ?? 3600) * 1000).toISOString(),
    account_email: me.email || null,
    calendar_id: "primary",
  };
}

async function exchangeOutlook(code: string) {
  const id = Deno.env.get("MICROSOFT_CALENDAR_CLIENT_ID")!;
  const secret = Deno.env.get("MICROSOFT_CALENDAR_CLIENT_SECRET")!;
  const r = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code, client_id: id, client_secret: secret,
      redirect_uri: REDIRECT_URI, grant_type: "authorization_code",
      scope: "offline_access Calendars.Read User.Read",
    }),
  });
  if (!r.ok) throw new Error(`Outlook token: ${await r.text()}`);
  const tok = await r.json();
  const me = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: { Authorization: `Bearer ${tok.access_token}` },
  }).then((x) => x.json()).catch(() => ({}));
  return {
    access_token: tok.access_token,
    refresh_token: tok.refresh_token,
    expires_at: new Date(Date.now() + (tok.expires_in ?? 3600) * 1000).toISOString(),
    account_email: me.mail || me.userPrincipalName || null,
    calendar_id: null,
  };
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");

  if (errorParam) {
    return htmlRedirect(`${APP_ORIGIN}/fornecedor/painel?calendar=error`, "Conexão cancelada");
  }
  if (!code || !state) {
    return htmlRedirect(`${APP_ORIGIN}/fornecedor/painel?calendar=error`, "Código de autorização ausente");
  }

  let payload: { s: string; p: string; r: string };
  try {
    payload = JSON.parse(atob(state));
  } catch {
    return htmlRedirect(`${APP_ORIGIN}/fornecedor/painel?calendar=error`, "State inválido");
  }

  try {
    const tokens = payload.p === "google" ? await exchangeGoogle(code) : await exchangeOutlook(code);
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    await admin.from("supplier_calendar_connections").upsert({
      supplier_id: payload.s,
      provider: payload.p,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: tokens.expires_at,
      account_email: tokens.account_email,
      calendar_id: tokens.calendar_id,
      sync_enabled: true,
    }, { onConflict: "supplier_id,provider" });

    // dispara primeira sincronização (não bloqueante)
    fetch(`${SUPABASE_URL}/functions/v1/calendar-sync-cron`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ supplier_id: payload.s }),
    }).catch(() => {});

    return htmlRedirect(`${APP_ORIGIN}${payload.r || "/fornecedor/painel"}?calendar=ok`, "Agenda conectada com sucesso!");
  } catch (e) {
    console.error("oauth callback error:", e);
    return htmlRedirect(`${APP_ORIGIN}/fornecedor/painel?calendar=error`, "Erro ao trocar tokens");
  }
});