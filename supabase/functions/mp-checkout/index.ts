// Checkout unificado Mercado Pago: reserva (com split), assinatura e destaque.
// Ambiente: usuário demo -> credenciais de teste; usuário real -> produção.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { obterTokenFornecedor } from "../_shared/mp-oauth.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

type Tipo = "reserva" | "assinatura" | "destaque" | "cancelamento";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  console.log("DIAG mp-checkout VERSAO-PREAPPROVAL-V4 iniciada", req.method);

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
  const tipo = body?.tipo as Tipo;
  const referenciaId = body?.referencia_id as string | undefined;
  if (!tipo || !["reserva", "assinatura", "destaque", "cancelamento"].includes(tipo)) {
    return json({ error: "tipo inválido" }, 400);
  }
  if (!referenciaId) return json({ error: "referencia_id obrigatório" }, 400);

  const { data: perfil, error: perfilErr } = await admin
    .from("profiles")
    .select("is_demo")
    .eq("user_id", userId)
    .maybeSingle();
  // DEFAULT SEGURO: se não conseguimos ler o perfil, NÃO caímos em produção.
  // Recusa explicitamente em vez de arriscar cobrar de verdade um usuário demo.
  if (perfilErr || !perfil) {
    return json({ error: "Não foi possível determinar o ambiente de cobrança. Tente novamente." }, 503);
  }
  const ambiente: "sandbox" | "live" = perfil.is_demo ? "sandbox" : "live";
  const accessToken =
    ambiente === "sandbox" ? Deno.env.get("MP_ACCESS_TOKEN_TEST") : Deno.env.get("MP_ACCESS_TOKEN_PROD");
  // Em sandbox NUNCA expomos public_key: o brick (whitelabel) não funciona no teste do MP,
  // então todos os tipos caem no redirect. public_key só existe em produção.
  const publicKey = ambiente === "sandbox" ? null : Deno.env.get("MP_PUBLIC_KEY_PROD");
  if (!accessToken) {
    return json({ error: `Credencial do Mercado Pago não configurada para o ambiente ${ambiente}.`, ambiente }, 503);
  }

  // DIAGNÓSTICO: identifica a conta MP dona do token (teste x real).
  // Não expõe o token; serve para confirmar que o modo demo usa credencial de teste.
  let mpAccount: { id?: unknown; nickname?: string | null; is_test?: boolean; site_id?: string | null } | null = null;
  try {
    const meRes = await fetch("https://api.mercadopago.com/users/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const me = await meRes.json().catch(() => ({}) as any);
    if (meRes.ok) {
      const nickname: string | null = me?.nickname ?? null;
      const tags: string[] = Array.isArray(me?.tags) ? me.tags : [];
      const isTest = tags.includes("test_user") || (nickname ?? "").startsWith("TEST");
      mpAccount = { id: me?.id ?? null, nickname, is_test: isTest, site_id: me?.site_id ?? null };
      console.log("DIAG mp conta:", ambiente, JSON.stringify(mpAccount));
      if (ambiente === "sandbox" && !isTest) {
        console.error("ALERTA: ambiente sandbox usando credencial de conta REAL do Mercado Pago.");
      }
    } else {
      console.error("DIAG /users/me falhou:", meRes.status, JSON.stringify(me));
    }
  } catch (e) {
    console.error("DIAG /users/me erro:", String(e));
  }

  let titulo = "";
  let valor = 0;
  let comissao = 0;
  let supplierId: string | null = null;
  let coupleId: string | null = null;
  let marketplaceAccount: string | null = null;
  // No split de corretagem a preferência é criada NA CONTA DO FORNECEDOR (collector),
  // com marketplace_fee = comissão da plataforma. Demais fluxos usam o token da plataforma.
  let collectorToken: string | null = null;

  const flagLiberada = async (key: string) => {
    const { data: flag } = await admin.from("feature_flags").select("enabled").eq("key", key).maybeSingle();
    return !!flag?.enabled;
  };

  if (tipo === "reserva" || tipo === "cancelamento") {
    const { data: reserva } = await admin
      .from("idle_date_reservations")
      .select("*, supplier:suppliers(id, mp_account_id, company_name)")
      .eq("id", referenciaId)
      .maybeSingle();
    if (!reserva) return json({ error: "Reserva não encontrada" }, 404);
    supplierId = reserva.supplier_id;
    coupleId = reserva.couple_id;
    const nomeFornecedor = (reserva as any).supplier?.company_name ?? "Fornecedor";

    if (tipo === "cancelamento") {
      // Taxa de cancelamento paga pelo casal
      const { data: couple } = await admin.from("couples").select("user_id").eq("id", reserva.couple_id).maybeSingle();
      const { data: vinculo } = await admin
        .from("couple_links")
        .select("linked_user_id")
        .eq("couple_id", reserva.couple_id)
        .eq("linked_user_id", userId)
        .maybeSingle();
      if (couple?.user_id !== userId && !vinculo) return json({ error: "Não autorizado" }, 403);
      if (reserva.taxa_cancelamento_status !== "pendente") {
        return json({ error: "Não há taxa de cancelamento pendente para esta reserva." }, 400);
      }
      valor = Number(reserva.taxa_cancelamento || 0);
      titulo = `Taxa de cancelamento de reserva — ${nomeFornecedor}`;
    } else if (reserva.modo_cobranca === "corretagem") {
      if (!(await flagLiberada("corretagem_datas_ociosas"))) {
        return json({ error: "Este pagamento ainda não está liberado." }, 403);
      }
      valor = Number(reserva.valor_ofertado || 0);
      comissao = Number(reserva.comissao_plataforma || 0);
      marketplaceAccount = (reserva as any).supplier?.mp_account_id ?? null;
      titulo = `Reserva de data — ${nomeFornecedor}`;
      if (!marketplaceAccount) return json({ error: "Fornecedor sem conta Mercado Pago vinculada" }, 400);
      const conexao = await obterTokenFornecedor(admin, reserva.supplier_id);
      if (conexao.erro || !conexao.accessToken) {
        return json({ error: conexao.erro ?? "Fornecedor sem conta Mercado Pago vinculada" }, 400);
      }
      collectorToken = conexao.accessToken;
    } else {
      // taxa_reserva: o fornecedor paga a taxa da plataforma (sem split)
      const { data: fornecedor } = await admin
        .from("suppliers")
        .select("user_id")
        .eq("id", reserva.supplier_id)
        .maybeSingle();
      if (fornecedor?.user_id !== userId) {
        return json({ error: "Apenas o fornecedor responsável pode pagar a taxa desta reserva." }, 403);
      }
      if (reserva.taxa_status === "paga") return json({ error: "Esta taxa já foi paga." }, 400);
      valor = Number(reserva.taxa_plataforma || 0);
      titulo = `Taxa de reserva de data — ${new Date(reserva.promo_date + "T00:00:00").toLocaleDateString("pt-BR")}`;
    }
  } else if (tipo === "assinatura") {
    if (!(await flagLiberada("assinatura_fornecedor")))
      return json({ error: "Este pagamento ainda não está liberado." }, 403);
    const { data: assinatura } = await admin
      .from("supplier_subscriptions")
      .select("*, plan:subscription_plans(nome), supplier:suppliers(id, user_id, trial_ends_at)")
      .eq("id", referenciaId)
      .maybeSingle();
    if (!assinatura) return json({ error: "Assinatura não encontrada" }, 404);
    if ((assinatura as any).supplier?.user_id !== userId) return json({ error: "Não autorizado" }, 403);
    valor = Number(assinatura.valor || 0);
    supplierId = assinatura.supplier_id;
    titulo = `Assinatura ${(assinatura as any).plan?.nome ?? ""} (${assinatura.ciclo})`;

    if (valor <= 0) return json({ error: "Valor inválido para cobrança" }, 400);

    // Se o checkout transparente (whitelabel) estiver ligado, NÃO cria o preapproval aqui.
    // O cartão é coletado no brick e o preapproval é criado em mp-process-payment com o token.
    const { data: flagTransp } = await admin
      .from("feature_flags")
      .select("enabled")
      .eq("key", "checkout_transparente")
      .maybeSingle();
    // O whitelabel (preapproval + card_token) NÃO funciona no sandbox do MP
    // ("Card token service not found" — falha conhecida do ambiente de teste).
    // Então: whitelabel só em produção; sandbox cai no redirect (que funciona).
    // Sem public key do ambiente não dá para montar o brick: cai no redirect.
    if (flagTransp?.enabled && ambiente === "live" && publicKey) {
      // registra intent para o process-payment localizar
      await admin.from("payment_intents").insert({
        tipo,
        referencia_id: referenciaId,
        user_id: userId,
        supplier_id: supplierId,
        valor,
        metodo: "preapproval_bricks",
        status: "pendente",
        ambiente,
      });
      return json({ ambiente, tipo, valor, titulo, checkout_url: null, public_key: publicKey ?? null, mp_account: mpAccount });
    }

    // ===== CAMINHO 1 (redirect): assinatura recorrente via preapproval =====
    // Email do pagador (exigido pelo preapproval).
    // Regra: em SANDBOX, o pagador precisa ser um COMPRADOR DE TESTE (não a conta logada,
    // e nunca o mesmo test user dono das credenciais). Em PRODUÇÃO, é o e-mail real do fornecedor.
    let payerEmail: string | undefined;

    if (ambiente === "sandbox") {
      // E-mail do comprador de teste, configurável por secret. Nunca vazio.
      payerEmail = Deno.env.get("MP_TEST_BUYER_EMAIL") ?? undefined;
      if (!payerEmail) {
        return json({
          error: "Configure o secret MP_TEST_BUYER_EMAIL com o e-mail de um usuário de teste COMPRADOR do Mercado Pago para testar assinatura no sandbox.",
          ambiente,
        }, 400);
      }
    } else {
      const { data: perfilPagador } = await admin.from("profiles").select("email").eq("user_id", userId).maybeSingle();
      payerEmail = (perfilPagador?.email as string | undefined) || undefined;
      if (!payerEmail) {
        const { data: authUser } = await admin.auth.admin.getUserById(userId);
        payerEmail = authUser?.user?.email ?? undefined;
      }
    }

    // Sanitiza: string vazia NÃO é e-mail válido.
    if (!payerEmail || !payerEmail.includes("@")) {
      return json({ error: "E-mail do pagador não encontrado para criar a assinatura.", ambiente }, 400);
    }

    // REGRA B: se ainda em trial, a 1ª cobrança começa no fim do trial.
    const trialFim = (assinatura as any).supplier?.trial_ends_at
      ? new Date((assinatura as any).supplier.trial_ends_at)
      : null;
    const agora = new Date();
    const startDate = trialFim && trialFim > agora ? trialFim : new Date(agora.getTime() + 5 * 60000); // +5min p/ margem
    const freq =
      assinatura.ciclo === "anual"
        ? { frequency: 12, frequency_type: "months" }
        : { frequency: 1, frequency_type: "months" };

    // O Mercado Pago valida o conteúdo de `reason` e das URLs. Textos com acentos,
    // parênteses/símbolos ou domínios de preview costumam devolver
    // "Request contains invalid or disallowed content". Então normalizamos tudo.
    const sanitizarTexto = (t: string) =>
      t
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^A-Za-z0-9 .-]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 100) || "Assinatura Casamenteiro";
    const reason = sanitizarTexto(titulo);
    // back_url precisa ser um domínio público e estável (sem query string).
    const BASE_PUBLICA = "https://www.casamenteiro.com.br";
    const preapprovalBody = {
      reason,
      external_reference: `assinatura:${referenciaId}`,
      payer_email: payerEmail,
      back_url: `${BASE_PUBLICA}/fornecedor/planos`,
      // Carimba o ambiente na URL: o webhook precisa saber qual token usar ao consultar a API.
      notification_url: `${SUPABASE_URL}/functions/v1/mp-webhook?env=${ambiente}&topic=preapproval`,
      auto_recurring: {
        ...freq,
        transaction_amount: Math.round(valor * 100) / 100,
        currency_id: "BRL",
        start_date: startDate.toISOString(),
      },
      status: "pending",
    };

    const paRes = await fetch("https://api.mercadopago.com/preapproval", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": `assinatura-${referenciaId}-${Date.now()}`,
      },
      body: JSON.stringify(preapprovalBody),
    });
    const pa = await paRes.json().catch(() => ({}));
    // Log de diagnóstico: o que foi enviado e o que o MP devolveu.
    console.log("DIAG preapproval enviado:", JSON.stringify(preapprovalBody));
    console.log("DIAG preapproval resposta:", paRes.status, JSON.stringify(pa));
    if (!paRes.ok) {
      console.error("Erro MP preapproval:", paRes.status, pa);

      if (ambiente === "sandbox") {
        // --- DIAGNÓSTICO 1: o preapproval funciona sem trial/start_date? ---
        try {
          const minimo = {
            reason: reason,
            external_reference: `diag:${referenciaId}`,
            payer_email: payerEmail,
            back_url: `${BASE_PUBLICA}/fornecedor/planos`,
            auto_recurring: { frequency: 1, frequency_type: "months", transaction_amount: 10, currency_id: "BRL" },
            status: "pending",
          };
          const dRes = await fetch("https://api.mercadopago.com/preapproval", {
            method: "POST",
            headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify(minimo),
          });
          const dJson = await dRes.json().catch(() => ({}));
          console.log("DIAG preapproval minimo:", dRes.status, JSON.stringify(dJson));
        } catch (e) {
          console.error("DIAG preapproval minimo erro:", String(e));
        }

        // --- DIAGNÓSTICO 2: usuários de teste da aplicação (o comprador precisa ser da mesma app/país) ---
        try {
          const tuRes = await fetch("https://api.mercadopago.com/users/test_user", {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          console.log("DIAG test_user status:", tuRes.status, (await tuRes.text()).slice(0, 300));
        } catch (e) {
          console.error("DIAG test_user erro:", String(e));
        }

        // --- FALLBACK: pagamento único (Checkout Pro) para validar o fluxo ponta a ponta ---
        // O sandbox do MP é instável para assinatura recorrente; o webhook trata
        // external_reference "assinatura:<id>" de payment e ativa a assinatura.
        const prefBody = {
          items: [{ title: reason, quantity: 1, unit_price: Math.round(valor * 100) / 100, currency_id: "BRL" }],
          external_reference: `assinatura:${referenciaId}`,
          back_urls: {
            success: `${BASE_PUBLICA}/fornecedor/planos`,
            failure: `${BASE_PUBLICA}/fornecedor/planos`,
            pending: `${BASE_PUBLICA}/fornecedor/planos`,
          },
          notification_url: `${SUPABASE_URL}/functions/v1/mp-webhook?env=${ambiente}`,
        };
        const prefRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify(prefBody),
        });
        const pref = await prefRes.json().catch(() => ({}));
        console.log("DIAG fallback preference:", prefRes.status, JSON.stringify(pref).slice(0, 500));
        // Sempre preferimos init_point: o domínio sandbox.mercadopago.com.br entra em
        // loop de login (ERR_TOO_MANY_REDIRECTS) quando há sessão de conta real no navegador.
        const fallbackUrl = prefRes.ok ? pref.init_point || pref.sandbox_init_point || null : null;
        if (fallbackUrl) {
          await admin.from("payment_intents").insert({
            tipo,
            referencia_id: referenciaId,
            user_id: userId,
            supplier_id: supplierId,
            valor,
            metodo: "preference_sandbox_fallback",
            status: "pendente",
            ambiente,
            detalhes: {
              preference_id: pref.id,
              motivo_fallback: pa?.message ?? "preapproval_falhou",
              link_usado: pref.init_point ? "init_point" : "sandbox_init_point",
            },
          });
          return json({
            ambiente,
            tipo,
            valor,
            titulo,
            checkout_url: fallbackUrl,
            public_key: null,
            mp_account: mpAccount,
            aviso:
              "Assinatura recorrente indisponível no ambiente de testes do Mercado Pago. Gerando cobrança única de teste para validar o fluxo.",
          });
        }
      }

      return json(
        {
          error: "Falha ao criar assinatura no Mercado Pago",
          detalhe:
            pa?.message === "User bad request" && ambiente === "sandbox"
              ? "O Mercado Pago recusou o par vendedor/comprador de teste (User bad request). Verifique se MP_TEST_BUYER_EMAIL é um usuário de teste COMPRADOR criado na MESMA aplicação e país (Brasil) das credenciais de teste."
              : (pa?.message ?? null),
          causa: pa?.cause ?? null,
          ambiente,
        },
        502,
      );
    }


    // Guarda o preapproval_id na assinatura + registra intent
    await admin
      .from("supplier_subscriptions")
      .update({ mp_preapproval_id: String(pa.id), ambiente })
      .eq("id", referenciaId);

    await admin.from("payment_intents").insert({
      tipo,
      referencia_id: referenciaId,
      user_id: userId,
      supplier_id: supplierId,
      valor,
      metodo: "preapproval",
      status: "pendente",
      ambiente,
      detalhes: {
        preapproval_id: pa.id,
        link_usado: pa.init_point ? "init_point" : "sandbox_init_point",
      },
    });

    // Sempre init_point: o domínio sandbox.mercadopago.com.br entra em loop de login
    // (ERR_TOO_MANY_REDIRECTS) quando o navegador já tem sessão de uma conta MP real.
    // Com credenciais de teste, o init_point normal já abre em ambiente de teste.
    const initPoint = pa.init_point || pa.sandbox_init_point || null;
    if (!initPoint) {
      console.error("Preapproval criado mas sem init_point:", JSON.stringify(pa));
      return json(
        {
          error: "Assinatura criada, mas o Mercado Pago não retornou o link de pagamento.",
          detalhe: "init_point ausente",
          preapproval_id: pa.id,
          ambiente,
        },
        502,
      );
    }
    // NÃO enviar public_key aqui: sem ele, o front usa o botão de redirect (não monta o brick).
    return json({
      ambiente,
      tipo,
      valor,
      titulo,
      preapproval_id: pa.id,
      checkout_url: initPoint,
      public_key: null,
      mp_account: mpAccount,
    });
  } else if (tipo === "destaque") {
    if (!(await flagLiberada("destaque_pago"))) return json({ error: "Este pagamento ainda não está liberado." }, 403);
    const { data: destaque } = await admin
      .from("featured_purchases")
      .select("*, supplier:suppliers(id, user_id, company_name)")
      .eq("id", referenciaId)
      .maybeSingle();
    if (!destaque) return json({ error: "Compra de destaque não encontrada" }, 404);
    if ((destaque as any).supplier?.user_id !== userId) return json({ error: "Não autorizado" }, 403);
    valor = Number(destaque.valor || 0);
    supplierId = destaque.supplier_id;
    titulo = `Destaque na busca — ${destaque.dias} dias`;
  }

  if (valor <= 0) return json({ error: "Valor inválido para cobrança" }, 400);

  const externalReference = `${tipo}:${referenciaId}`;
  const origin = req.headers.get("origin") || "https://www.casamenteiro.com.br";
  const retorno =
    tipo === "cancelamento"
      ? "/minhas-reservas"
      : tipo === "reserva"
        ? "/fornecedor/painel?tab=reservas"
        : "/fornecedor/planos";

  // Em SANDBOX: vincula a cobrança a um comprador de teste e exclui saldo em conta
  // (as contas de teste normalmente não têm saldo), permitindo pagar com cartão de teste
  // sem precisar logar na conta real do Mercado Pago.
  const testBuyerEmail = ambiente === "sandbox" ? (Deno.env.get("MP_TEST_BUYER_EMAIL") ?? null) : null;

  const prefRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      // Corretagem: collector = fornecedor (token dele). Demais fluxos: conta da plataforma.
      Authorization: `Bearer ${collectorToken ?? accessToken}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": `${tipo}-${referenciaId}-${Date.now()}`,
    },
    body: JSON.stringify({
      items: [{ id: referenciaId, title: titulo, quantity: 1, currency_id: "BRL", unit_price: valor }],
      ...(comissao > 0 ? { marketplace_fee: comissao } : {}),
      ...(testBuyerEmail ? { payer: { email: testBuyerEmail } } : {}),
      // Obs.: o Mercado Pago não permite excluir "account_money" (erro
      // "account_money cannot be excluded"), então não filtramos meios de pagamento.

      external_reference: externalReference,
      back_urls: (() => {
        const sep = retorno.includes("?") ? "&" : "?";
        return {
          success: `${origin}${retorno}${sep}pagamento=sucesso`,
          pending: `${origin}${retorno}${sep}pagamento=pendente`,
          failure: `${origin}${retorno}${sep}pagamento=falha`,
        };
      })(),
      auto_return: "approved",
      // Carimba o ambiente na URL: o webhook lê ?env= para escolher o token certo (test x prod).
      notification_url: `${SUPABASE_URL}/functions/v1/mp-webhook?env=${ambiente}`,
    }),
  });

  const pref = await prefRes.json().catch(() => ({}));
  if (!prefRes.ok) {
    console.error("Erro MP preference:", prefRes.status, pref);
    return json({ error: "Falha ao criar checkout no Mercado Pago", detalhe: pref?.message ?? null, ambiente }, 502);
  }

  // O domínio sandbox.mercadopago.com.br entra em loop de login (ERR_TOO_MANY_REDIRECTS)
  // quando o navegador tem cookies de outra conta. Por isso o link principal é sempre
  // o init_point (com credenciais de teste ele já abre em ambiente de teste) e o
  // sandbox_init_point fica como alternativa opcional na tela de pagamento.
  const checkoutUrl = pref.init_point || pref.sandbox_init_point || null;
  const checkoutUrlSandbox = ambiente === "sandbox" ? pref.sandbox_init_point || null : null;
  const linkUsado = pref.init_point ? "init_point" : pref.sandbox_init_point ? "sandbox_init_point" : null;


  await admin.from("payment_intents").insert({
    tipo,
    referencia_id: referenciaId,
    user_id: userId,
    supplier_id: supplierId,
    couple_id: coupleId,
    valor,
    comissao,
    metodo: "checkout_pro",
    status: "pendente",
    ambiente,
    detalhes: {
      preference_id: pref.id,
      link_usado: linkUsado,
    },
  });

  if (tipo === "reserva" && comissao > 0) {
    await admin
      .from("idle_date_reservations")
      .update({ mp_split_payment_id: String(pref.id), mp_status: "pendente", ambiente })
      .eq("id", referenciaId);
  }

  return json({
    ambiente,
    tipo,
    valor,
    comissao,
    titulo,
    preference_id: pref.id,
    checkout_url: checkoutUrl,
    checkout_url_sandbox: checkoutUrlSandbox,

    public_key: publicKey ?? null,
    mp_account: mpAccount,
  });
});