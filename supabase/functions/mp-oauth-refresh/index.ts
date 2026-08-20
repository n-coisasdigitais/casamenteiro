// Renova sob demanda o access_token da conta Mercado Pago do fornecedor.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { obterTokenFornecedor } from "../_shared/mp-oauth.ts";

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

  const body = await req.json().catch(() => ({}) as any);
  const supplierId = body?.supplier_id as string | undefined;
  if (!supplierId) return json({ error: "supplier_id obrigatório" }, 400);

  const { data: fornecedor } = await admin
    .from("suppliers")
    .select("id, user_id")
    .eq("id", supplierId)
    .maybeSingle();

  const ehAdmin = await admin.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!fornecedor || (fornecedor.user_id !== userId && !ehAdmin.data)) {
    return json({ error: "Não autorizado" }, 403);
  }

  const { accessToken, accountId, erro } = await obterTokenFornecedor(admin, supplierId);
  if (erro || !accessToken) return json({ error: erro ?? "Não foi possível renovar o token." }, 400);

  // Nunca devolvemos o token ao cliente.
  return json({ ok: true, mp_account_id: accountId });
});
