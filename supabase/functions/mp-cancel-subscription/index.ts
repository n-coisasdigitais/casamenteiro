// Cancela a assinatura recorrente do fornecedor no Mercado Pago (preapproval).
// Mantém o acesso até o fim do período já pago: NÃO mexe em current_period_end.
// Marca status='cancelada' e cancelada_em=now(). O usePlanFeature continua liberando
// enquanto current_period_end > now().
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
  const supplierId = body?.supplier_id as string | undefined;
  if (!supplierId) return json({ error: "supplier_id obrigatório" }, 400);

  // 1) Confirma que o usuário é dono deste fornecedor (segurança)
  const { data: sup } = await admin.from("suppliers").select("id, user_id").eq("id", supplierId).maybeSingle();
  if (!sup) return json({ error: "Fornecedor não encontrado" }, 404);
  if (sup.user_id !== userId) {
    // admin também pode cancelar
    const { data: role } = await admin.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!role) return json({ error: "Sem permissão" }, 403);
  }

  // 2) Busca a assinatura ativa vigente
  const { data: sub } = await admin
    .from("supplier_subscriptions")
    .select("id, mp_preapproval_id, ambiente, status, current_period_end")
    .eq("supplier_id", supplierId)
    .in("status", ["ativa"])
    .order("created_at", { ascending: false })
    .maybeSingle();

  if (!sub) return json({ error: "Nenhuma assinatura ativa para cancelar" }, 404);

  // 3) Cancela no Mercado Pago SE houver preapproval (recorrência real).
  //    No Caminho 2 (cobrança manual) não há preapproval — apenas marca no banco.
  if (sub.mp_preapproval_id) {
    const accessToken =
      sub.ambiente === "sandbox" ? Deno.env.get("MP_ACCESS_TOKEN_TEST") : Deno.env.get("MP_ACCESS_TOKEN_PROD");
    if (accessToken) {
      const mpResp = await fetch(`https://api.mercadopago.com/preapproval/${sub.mp_preapproval_id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      if (!mpResp.ok) {
        const txt = await mpResp.text().catch(() => "");
        return json({ error: "Falha ao cancelar no Mercado Pago", detalhe: txt.slice(0, 300) }, 502);
      }
    }
  }
  // Sem preapproval: nada a cancelar no MP (cobrança é manual). Segue para marcar no banco.

  // 4) Marca cancelada no banco — MANTÉM current_period_end (acesso até o fim do ciclo)
  const { error: upErr } = await admin
    .from("supplier_subscriptions")
    .update({ status: "cancelada", cancelada_em: new Date().toISOString() })
    .eq("id", sub.id);
  if (upErr) return json({ error: "Cancelado no MP, mas falha ao atualizar o banco", detalhe: upErr.message }, 500);

  return json({
    ok: true,
    acesso_ate: sub.current_period_end,
    mensagem: "Assinatura cancelada. Acesso mantido até o fim do período pago.",
  });
});
