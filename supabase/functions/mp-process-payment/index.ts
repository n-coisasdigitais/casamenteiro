// Checkout transparente (Mercado Pago Bricks): recebe o token do cartão / Pix
// gerado no navegador e cria o pagamento no servidor.
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

  const { data: flagCheckout } = await admin
    .from("feature_flags")
    .select("enabled")
    .eq("key", "checkout_transparente")
    .maybeSingle();
  if (!flagCheckout?.enabled) return json({ error: "Checkout transparente desativado." }, 403);

  const body = await req.json().catch(() => ({}) as any);
  const { tipo, referencia_id, formData } = body ?? {};
  if (!tipo || !referencia_id || !formData) return json({ error: "Dados de pagamento incompletos" }, 400);

  const { data: intent } = await admin
    .from("payment_intents")
    .select("*")
    .eq("tipo", tipo)
    .eq("referencia_id", referencia_id)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!intent) return json({ error: "Cobrança não encontrada. Reinicie o pagamento." }, 404);

  const ambiente = intent.ambiente as "sandbox" | "live";
  const accessToken =
    ambiente === "sandbox" ? Deno.env.get("MP_ACCESS_TOKEN_TEST") : Deno.env.get("MP_ACCESS_TOKEN_PROD");
  if (!accessToken) return json({ error: `Credencial do Mercado Pago ausente (${ambiente}).` }, 503);

  // ===== WHITELABEL: assinatura recorrente sem redirect (preapproval + card_token) =====
  if (tipo === "assinatura") {
    // O whitelabel (card_token + preapproval) NÃO funciona no sandbox do MP
    // ("Card token service not found"). Em sandbox, orienta o front a usar o redirect.
    if (ambiente === "sandbox") {
      return json(
        {
          error: "whitelabel_indisponivel_sandbox",
          detalhe: "Assinatura no cartão embutido não é suportada no ambiente de testes. Use o redirect.",
          usar_redirect: true,
          ambiente,
        },
        409,
      );
    }
    if (!formData.token) return json({ error: "Token do cartão ausente. Preencha os dados do cartão." }, 400);

    const { data: assinatura } = await admin
      .from("supplier_subscriptions")
      .select("*, plan:subscription_plans(nome), supplier:suppliers(id, user_id, trial_ends_at)")
      .eq("id", referencia_id)
      .maybeSingle();
    if (!assinatura) return json({ error: "Assinatura não encontrada" }, 404);
    if ((assinatura as any).supplier?.user_id !== userId) return json({ error: "Não autorizado" }, 403);

    const valor = Number(assinatura.valor || 0);
    if (valor <= 0) return json({ error: "Valor inválido" }, 400);

    // Regra B: se ainda em trial, a 1ª cobrança começa no fim do trial.
    const trialFim = (assinatura as any).supplier?.trial_ends_at
      ? new Date((assinatura as any).supplier.trial_ends_at)
      : null;
    const agora = new Date();
    const startDate = trialFim && trialFim > agora ? trialFim : new Date(agora.getTime() + 5 * 60000);
    const freq =
      assinatura.ciclo === "anual"
        ? { frequency: 12, frequency_type: "months" }
        : { frequency: 1, frequency_type: "months" };

    const preapprovalBody: Record<string, unknown> = {
      reason: `Assinatura ${(assinatura as any).plan?.nome ?? ""} (${assinatura.ciclo})`,
      external_reference: `assinatura:${referencia_id}`,
      payer_email: formData?.payer?.email,
      card_token_id: formData.token,
      status: "authorized", // autoriza direto, sem redirect
      auto_recurring: {
        ...freq,
        transaction_amount: valor,
        currency_id: "BRL",
        start_date: startDate.toISOString(),
      },
    };

    const paRes = await fetch("https://api.mercadopago.com/preapproval", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": `assinatura-${referencia_id}-${Date.now()}`,
      },
      body: JSON.stringify(preapprovalBody),
    });
    const pa = await paRes.json().catch(() => ({}) as any);
    if (!paRes.ok) {
      console.error(
        "Erro MP preapproval (whitelabel):",
        paRes.status,
        JSON.stringify(pa),
        "req-id:",
        paRes.headers.get("x-request-id"),
      );
      const interno = paRes.status >= 500;
      return json(
        {
          error: "Falha ao criar assinatura",
          detalhe: interno
            ? ambiente === "sandbox"
              ? "O Mercado Pago recusou a assinatura de teste. Use cartão de teste (nome APRO) e e-mail de comprador de teste."
              : "Não foi possível processar a assinatura agora. Verifique os dados do cartão e tente novamente."
            : (pa?.message ?? null),
          causa: pa?.cause ?? null,
          ambiente,
        },
        paRes.status >= 500 ? 502 : paRes.status,
      );
    }

    // Assinatura criada e autorizada. Guarda preapproval_id; a ativação/vigência
    // é consolidada pelo webhook (subscription_preapproval authorized).
    await admin
      .from("supplier_subscriptions")
      .update({ mp_preapproval_id: String(pa.id), ambiente })
      .eq("id", referencia_id);

    await admin
      .from("payment_intents")
      .update({
        status: pa.status === "authorized" ? "pago" : (pa.status ?? "pendente"),
        metodo: "preapproval_bricks",
        detalhes: { ...((intent.detalhes as any) ?? {}), preapproval_id: pa.id, preapproval_status: pa.status },
      })
      .eq("id", intent.id);

    return json({ id: pa.id, status: pa.status, tipo: "assinatura", preapproval_id: pa.id });
  }

  const payload: Record<string, unknown> = {
    transaction_amount: Number(Number(intent.valor).toFixed(2)),
    description: `${tipo} ${referencia_id}`,
    external_reference: `${tipo}:${referencia_id}`,
    payment_method_id: formData.payment_method_id,
    payer: {
      email: formData?.payer?.email,
      ...(formData?.payer?.identification?.number
        ? {
            identification: {
              type: formData.payer.identification.type ?? "CPF",
              number: String(formData.payer.identification.number).replace(/\D/g, ""),
            },
          }
        : {}),
    },
    notification_url: `${SUPABASE_URL}/functions/v1/mp-webhook`,
  };
  if (formData.token) payload.token = formData.token;
  if (formData.installments) payload.installments = Number(formData.installments);
  if (formData.issuer_id) payload.issuer_id = String(formData.issuer_id);
  // application_fee só é aceito em pagamentos de marketplace (com conta do vendedor).
  if (tipo === "reserva" && Number(intent.comissao) > 0) payload.application_fee = Number(intent.comissao);

  const criarPagamento = async (corpo: Record<string, unknown>) => {
    const r = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": crypto.randomUUID(),
      },
      body: JSON.stringify(corpo),
    });
    return { r, body: await r.json().catch(() => ({}) as any) };
  };

  // O MP às vezes devolve 500 "internal_error" por causa de campos opcionais
  // (issuer_id / notification_url / external_reference / description). Tentamos variações.
  const { notification_url: _n, external_reference: _e, description: _d, issuer_id: _i, ...minimo } = payload;
  const variantes: Array<[string, Record<string, unknown>]> = [
    ["completo", payload],
    ["sem issuer_id", { ...payload, issuer_id: undefined }],
    ["sem notification_url", { ...payload, issuer_id: undefined, notification_url: undefined }],
    ["mínimo", minimo],
  ];

  let res!: Response;
  let pagamento: any = {};
  for (const [nome, corpo] of variantes) {
    const limpo = JSON.parse(JSON.stringify(corpo));
    const tentativa = await criarPagamento(limpo);
    res = tentativa.r;
    pagamento = tentativa.body;
    if (res.ok) {
      if (nome !== "completo") console.log("Pagamento criado com variante:", nome);
      break;
    }
    console.error(
      `Falha variante "${nome}":`,
      res.status,
      JSON.stringify(pagamento),
      "req-id:",
      res.headers.get("x-request-id"),
    );
    // Erros de negócio (4xx) não melhoram com nova tentativa.
    if (res.status < 500) break;
  }

  if (!res.ok) {
    console.error(
      "Erro MP payment:",
      res.status,
      JSON.stringify(pagamento),
      "req-id:",
      res.headers.get("x-request-id"),
    );
    console.error("Payload enviado:", JSON.stringify({ ...payload, token: payload.token ? "REDACTED" : null }));
    // Diagnóstico: a credencial de acesso corresponde à conta que gerou o token do cartão?
    try {
      const me = await fetch("https://api.mercadopago.com/users/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const meJson = await me.json().catch(() => ({}));
      console.error(
        "MP conta do access token:",
        me.status,
        JSON.stringify({ id: meJson?.id, site: meJson?.site_id, email: meJson?.email }),
      );
    } catch (_) {
      /* ignora */
    }
    const interno = res.status >= 500 || pagamento?.message === "internal_error";
    return json(
      {
        error: "Falha ao processar pagamento",
        detalhe: interno
          ? ambiente === "sandbox"
            ? "O Mercado Pago recusou a cobrança de teste. Use um cartão de teste e um e-mail de comprador de teste (test_user_...@testuser.com) diferente da conta dona das credenciais."
            : "O Mercado Pago não conseguiu processar o pagamento agora. Tente novamente em instantes ou use outro meio de pagamento."
          : (pagamento?.message ?? null),
        causa: pagamento?.cause ?? null,
        ambiente,
      },
      res.status >= 500 ? 502 : res.status,
    );
  }

  await admin
    .from("payment_intents")
    .update({
      status: pagamento.status === "approved" ? "pago" : pagamento.status,
      mp_payment_id: String(pagamento.id),
      metodo: "bricks",
      detalhes: { ...((intent.detalhes as any) ?? {}), mp_status_detail: pagamento.status_detail },
    })
    .eq("id", intent.id);

  return json({
    id: pagamento.id,
    status: pagamento.status,
    status_detail: pagamento.status_detail,
    qr_code: pagamento?.point_of_interaction?.transaction_data?.qr_code ?? null,
    qr_code_base64: pagamento?.point_of_interaction?.transaction_data?.qr_code_base64 ?? null,
  });
});
