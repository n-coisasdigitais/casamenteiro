// Reconciliação manual: consulta o Mercado Pago pelo external_reference da assinatura
// e ativa a assinatura caso exista pagamento aprovado (ou preapproval autorizado)
// que o webhook não tenha processado.
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
  const referenciaId = body?.referencia_id as string | undefined;
  const tipo = (body?.tipo as string | undefined) ?? "assinatura";
  if (!referenciaId) return json({ error: "referencia_id ausente" }, 400);

  const tokens: Array<{ ambiente: "sandbox" | "live"; token?: string }> = [
    { ambiente: "sandbox", token: Deno.env.get("MP_ACCESS_TOKEN_TEST") },
    { ambiente: "live", token: Deno.env.get("MP_ACCESS_TOKEN_PROD") },
  ];

  async function buscarPagamentoAprovado(externalRef: string) {
    for (const c of tokens) {
      if (!c.token) continue;
      try {
        const r = await fetch(
          `https://api.mercadopago.com/v1/payments/search?external_reference=${encodeURIComponent(externalRef)}&sort=date_created&criteria=desc&limit=10`,
          { headers: { Authorization: `Bearer ${c.token}` } },
        );
        const j = await r.json().catch(() => ({}) as any);
        const aprovado = (j?.results ?? []).find((p: any) => p?.status === "approved");
        if (aprovado) return { ambiente: c.ambiente, paymentId: String(aprovado.id) };
      } catch (_e) {
        /* segue */
      }
    }
    return null;
  }

  // ---------- DESTAQUE ----------
  if (tipo === "destaque") {
    const { data: destaque } = await admin
      .from("featured_purchases")
      .select("*, supplier:suppliers(id, user_id)")
      .eq("id", referenciaId)
      .maybeSingle();
    if (!destaque) return json({ error: "Compra de destaque não encontrada" }, 404);

    const { data: ehAdminD } = await admin.rpc("has_role", { _user_id: userId, _role: "admin" });
    if ((destaque as any).supplier?.user_id !== userId && ehAdminD !== true)
      return json({ error: "Não autorizado" }, 403);

    if (destaque.status === "ativo") return json({ ok: true, encontrado: true, ja_ativo: true });

    const achado = await buscarPagamentoAprovado(`destaque:${referenciaId}`);
    if (!achado) return json({ ok: false, encontrado: false });

    const inicio = new Date();
    const fim = new Date(inicio.getTime() + Number(destaque.dias || 7) * 24 * 60 * 60 * 1000);

    await admin
      .from("featured_purchases")
      .update({
        status: "ativo",
        ambiente: achado.ambiente,
        mp_payment_id: achado.paymentId,
        inicio: inicio.toISOString(),
        fim: fim.toISOString(),
      })
      .eq("id", destaque.id);

    await admin
      .from("suppliers")
      .update({ featured: true, featured_until: fim.toISOString() })
      .eq("id", destaque.supplier_id);

    const { data: intentD } = await admin
      .from("payment_intents")
      .select("id")
      .eq("tipo", "destaque")
      .eq("referencia_id", referenciaId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (intentD) {
      await admin
        .from("payment_intents")
        .update({ status: "pago", ambiente: achado.ambiente, mp_payment_id: achado.paymentId })
        .eq("id", intentD.id);
    }

    return json({ ok: true, encontrado: true, ambiente: achado.ambiente, ate: fim.toISOString() });
  }


  const { data: assinatura } = await admin
    .from("supplier_subscriptions")
    .select("*, supplier:suppliers(id, user_id, trial_ends_at)")
    .eq("id", referenciaId)
    .maybeSingle();
  if (!assinatura) return json({ error: "Assinatura não encontrada" }, 404);

  const { data: ehAdmin } = await admin.rpc("has_role", { _user_id: userId, _role: "admin" });
  if ((assinatura as any).supplier?.user_id !== userId && ehAdmin !== true)
    return json({ error: "Não autorizado" }, 403);


  const credenciais: Array<{ ambiente: "sandbox" | "live"; token?: string }> = [
    { ambiente: "sandbox", token: Deno.env.get("MP_ACCESS_TOKEN_TEST") },
    { ambiente: "live", token: Deno.env.get("MP_ACCESS_TOKEN_PROD") },
  ];

  let encontrado: { ambiente: "sandbox" | "live"; paymentId?: string; preapprovalId?: string } | null = null;

  for (const c of credenciais) {
    if (!c.token) continue;
    // 1) pagamento avulso (Checkout Pro / fallback) com external_reference assinatura:<id>
    try {
      const r = await fetch(
        `https://api.mercadopago.com/v1/payments/search?external_reference=${encodeURIComponent(`assinatura:${referenciaId}`)}&sort=date_created&criteria=desc&limit=10`,
        { headers: { Authorization: `Bearer ${c.token}` } },
      );
      const j = await r.json().catch(() => ({}) as any);
      const aprovado = (j?.results ?? []).find((p: any) => p?.status === "approved");
      if (aprovado) {
        encontrado = { ambiente: c.ambiente, paymentId: String(aprovado.id) };
        break;
      }
    } catch (_e) {
      /* segue */
    }
    // 2) preapproval autorizado
    const paId = (assinatura as any).mp_preapproval_id;
    if (paId) {
      try {
        const r = await fetch(`https://api.mercadopago.com/preapproval/${paId}`, {
          headers: { Authorization: `Bearer ${c.token}` },
        });
        const pa = await r.json().catch(() => ({}) as any);
        if (r.ok && pa?.status === "authorized") {
          encontrado = { ambiente: c.ambiente, preapprovalId: String(pa.id) };
          break;
        }
      } catch (_e) {
        /* segue */
      }
    }
  }

  if (!encontrado) return json({ ok: false, encontrado: false });

  const ambiente = encontrado.ambiente;
  const agora = new Date();
  const trialFim = (assinatura as any).supplier?.trial_ends_at
    ? new Date((assinatura as any).supplier.trial_ends_at)
    : null;
  const inicio = trialFim && trialFim > agora ? trialFim : agora;
  const fim = new Date(inicio);
  if (assinatura.ciclo === "anual") fim.setFullYear(fim.getFullYear() + 1);
  else fim.setMonth(fim.getMonth() + 1);

  await admin
    .from("supplier_subscriptions")
    .update({
      status: "ativa",
      ambiente,
      ...(encontrado.preapprovalId ? { mp_preapproval_id: encontrado.preapprovalId } : {}),
      current_period_start: inicio.toISOString(),
      current_period_end: fim.toISOString(),
    })
    .eq("id", assinatura.id);

  const mpPayId = encontrado.paymentId ?? `preapproval:${encontrado.preapprovalId}`;

  const { data: intent } = await admin
    .from("payment_intents")
    .select("id")
    .eq("tipo", "assinatura")
    .eq("referencia_id", referenciaId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (intent) {
    await admin
      .from("payment_intents")
      .update({ status: "pago", ambiente, mp_payment_id: mpPayId })
      .eq("id", intent.id);
  }

  const { data: jaFat } = await admin
    .from("subscription_invoices")
    .select("id")
    .eq("mp_payment_id", mpPayId)
    .maybeSingle();
  if (!jaFat) {
    await admin.from("subscription_invoices").insert({
      subscription_id: assinatura.id,
      supplier_id: assinatura.supplier_id,
      valor: assinatura.valor,
      status: "pago",
      mp_payment_id: mpPayId,
      ambiente,
      periodo_inicio: inicio.toISOString(),
      periodo_fim: fim.toISOString(),
      pago_em: new Date().toISOString(),
    });
  }

  const { data: plano } = await admin
    .from("subscription_plans")
    .select("destaque_busca")
    .eq("id", assinatura.plan_id)
    .maybeSingle();
  if (plano?.destaque_busca) {
    await admin
      .from("suppliers")
      .update({ featured: true, featured_until: fim.toISOString() })
      .eq("id", assinatura.supplier_id);
  }

  try {
    await admin.rpc("marcar_indicacao_assinatura", { _supplier_id: assinatura.supplier_id });
  } catch (_e) {
    /* opcional */
  }

  return json({ ok: true, encontrado: true, ambiente, status: "ativa", ate: fim.toISOString() });
});
