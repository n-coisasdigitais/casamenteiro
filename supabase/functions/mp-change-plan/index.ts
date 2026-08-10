// Troca de plano de uma assinatura ATIVA sem novo pagamento:
// ajusta o valor recorrente no Mercado Pago (PUT /preapproval) e troca o plan_id
// na linha, mantendo status 'ativa'. Usado em upgrade/downgrade durante vigência/trial.
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

  const body = await req.json().catch(() => ({}) as any);
  const { supplier_id, plan_id, ciclo, valor } = body ?? {};
  if (!supplier_id || !plan_id || !valor) return json({ error: "Dados incompletos" }, 400);

  // Segurança: confirma dono (ou admin)
  const { data: sup } = await admin.from("suppliers").select("id, user_id").eq("id", supplier_id).maybeSingle();
  if (!sup) return json({ error: "Fornecedor não encontrado" }, 404);
  if (sup.user_id !== userId) {
    const { data: role } = await admin.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!role) return json({ error: "Sem permissão" }, 403);
  }

  // Assinatura ativa com preapproval
  const { data: sub } = await admin
    .from("supplier_subscriptions")
    .select("id, mp_preapproval_id, ambiente, ciclo, status")
    .eq("supplier_id", supplier_id)
    .eq("status", "ativa")
    .order("created_at", { ascending: false })
    .maybeSingle();
  if (!sub) return json({ error: "Nenhuma assinatura ativa para alterar" }, 404);
  if (!sub.mp_preapproval_id) return json({ error: "Assinatura sem recorrência configurada" }, 409);

  const accessToken =
    sub.ambiente === "sandbox" ? Deno.env.get("MP_ACCESS_TOKEN_TEST") : Deno.env.get("MP_ACCESS_TOKEN_PROD");
  if (!accessToken) return json({ error: `Credencial do Mercado Pago ausente (${sub.ambiente}).` }, 503);

  // Atualiza o valor recorrente no MP. auto_recurring aceito no update de preapproval.
  const novoValor = Number(Number(valor).toFixed(2));
  const mpResp = await fetch(`https://api.mercadopago.com/preapproval/${sub.mp_preapproval_id}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ auto_recurring: { transaction_amount: novoValor, currency_id: "BRL" } }),
  });
  const mp = await mpResp.json().catch(() => ({}) as any);
  if (!mpResp.ok) {
    console.error("Erro MP change-plan:", mpResp.status, JSON.stringify(mp));
    return json(
      { error: "Falha ao atualizar o valor da assinatura no Mercado Pago", detalhe: mp?.message ?? null },
      502,
    );
  }

  // Troca o plano na linha, mantendo ATIVA (não perde acesso, não gera pagamento).
  const { error: upErr } = await admin
    .from("supplier_subscriptions")
    .update({ plan_id, ciclo: ciclo ?? sub.ciclo, valor: novoValor })
    .eq("id", sub.id);
  if (upErr)
    return json({ error: "Valor alterado no MP, mas falha ao atualizar o plano", detalhe: upErr.message }, 500);

  // Ajusta featured conforme o novo plano
  const { data: plano } = await admin
    .from("subscription_plans")
    .select("destaque_busca")
    .eq("id", plan_id)
    .maybeSingle();
  if (plano) {
    await admin.from("suppliers").update({ featured: !!plano.destaque_busca }).eq("id", supplier_id);
  }

  return json({ ok: true, novo_valor: novoValor, preapproval_id: sub.mp_preapproval_id });
});
