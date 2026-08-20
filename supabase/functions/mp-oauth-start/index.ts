// Inicia o vínculo OAuth da conta Mercado Pago do fornecedor (necessário para o split de corretagem).
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Não autorizado" }, 401);

  const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
  const { data: claims, error: claimsErr } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
  if (claimsErr || !claims?.claims) return json({ error: "Não autorizado" }, 401);
  const userId = (claims.claims as any).sub as string;

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  const { data: flag } = await admin
    .from("feature_flags")
    .select("enabled")
    .eq("key", "corretagem_datas_ociosas")
    .maybeSingle();
  if (!flag?.enabled) return json({ error: "Funcionalidade não liberada" }, 403);

  const CLIENT_ID = Deno.env.get("MP_OAUTH_CLIENT_ID");
  const REDIRECT_URI = Deno.env.get("MP_OAUTH_REDIRECT_URI");
  if (!CLIENT_ID || !REDIRECT_URI) {
    return json(
      { error: "Integração do Mercado Pago não configurada (MP_OAUTH_CLIENT_ID / MP_OAUTH_REDIRECT_URI)." },
      503,
    );
  }

  const body = await req.json().catch(() => ({}) as any);
  const supplierId = body?.supplier_id as string | undefined;

  const query = admin.from("suppliers").select("id, user_id").eq("user_id", userId);
  const { data: fornecedor } = supplierId
    ? await query.eq("id", supplierId).maybeSingle()
    : await query.limit(1).maybeSingle();

  if (!fornecedor) return json({ error: "Fornecedor não encontrado para este usuário." }, 403);

  const state = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  const expira = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  const { error: stErr } = await admin
    .from("mp_oauth_states")
    .insert({ state, supplier_id: fornecedor.id, expira_em: expira });
  if (stErr) {
    console.error("Erro ao salvar state:", stErr);
    return json({ error: "Não foi possível iniciar a conexão. Tente novamente." }, 500);
  }

  // Limpeza oportunista de states vencidos
  await admin.from("mp_oauth_states").delete().lt("expira_em", new Date().toISOString());

  const url =
    "https://auth.mercadopago.com.br/authorization" +
    `?client_id=${encodeURIComponent(CLIENT_ID)}` +
    "&response_type=code&platform_id=mp" +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&state=${encodeURIComponent(state)}`;

  return json({ url });
});
