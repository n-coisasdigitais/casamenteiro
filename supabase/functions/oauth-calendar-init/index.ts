import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const REDIRECT_URI = `${SUPABASE_URL}/functions/v1/oauth-calendar-callback`;

function buildGoogleUrl(state: string) {
  const id = Deno.env.get("GOOGLE_CALENDAR_CLIENT_ID");
  if (!id) throw new Error("GOOGLE_CALENDAR_CLIENT_ID não configurado");
  const u = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  u.searchParams.set("client_id", id);
  u.searchParams.set("redirect_uri", REDIRECT_URI);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("access_type", "offline");
  u.searchParams.set("prompt", "consent");
  u.searchParams.set(
    "scope",
    "https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/userinfo.email openid",
  );
  u.searchParams.set("state", state);
  return u.toString();
}

function buildOutlookUrl(state: string) {
  const id = Deno.env.get("MICROSOFT_CALENDAR_CLIENT_ID");
  if (!id) throw new Error("MICROSOFT_CALENDAR_CLIENT_ID não configurado");
  const u = new URL("https://login.microsoftonline.com/common/oauth2/v2.0/authorize");
  u.searchParams.set("client_id", id);
  u.searchParams.set("redirect_uri", REDIRECT_URI);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("response_mode", "query");
  u.searchParams.set("scope", "offline_access Calendars.Read User.Read");
  u.searchParams.set("state", state);
  return u.toString();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") || "";
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Não autenticado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json().catch(() => ({}));
    const provider = body.provider as string;
    const returnTo = (body.return_to as string) || "/fornecedor/painel";
    if (!["google", "outlook"].includes(provider)) {
      return new Response(JSON.stringify({ error: "provider inválido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: supplier } = await admin.from("suppliers").select("id").eq("user_id", user.id).maybeSingle();
    if (!supplier) {
      return new Response(JSON.stringify({ error: "Apenas fornecedores podem conectar agenda" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // state codifica supplier_id, provider e return_to
    const statePayload = btoa(JSON.stringify({ s: supplier.id, p: provider, r: returnTo, t: Date.now() }));
    const url = provider === "google" ? buildGoogleUrl(statePayload) : buildOutlookUrl(statePayload);

    return new Response(JSON.stringify({ url }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});