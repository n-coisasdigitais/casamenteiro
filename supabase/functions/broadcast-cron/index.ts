// Edge function: broadcast-cron
// Disparada diariamente. Avalia todos os gatilhos ativos em `broadcast_gatilhos`
// e cria notificações para os usuários alvo, usando `broadcast_gatilho_execucoes`
// para evitar reenvio duplicado.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const stats = { gatilhos: 0, notificacoes: 0, erros: [] as string[] };

  try {
    const { data: gatilhos, error } = await supabase
      .from("broadcast_gatilhos")
      .select("*")
      .eq("ativo", true);
    if (error) throw error;
    if (!gatilhos?.length) {
      return new Response(JSON.stringify({ ok: true, ...stats, message: "Sem gatilhos ativos" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    for (const g of gatilhos) {
      stats.gatilhos++;
      const alvos = await calcularAlvos(supabase, g);
      for (const alvo of alvos) {
        const contextoStr = JSON.stringify(alvo.contexto || {});
        // Já enviado para esse user nesse contexto?
        const { data: existente } = await supabase
          .from("broadcast_gatilho_execucoes")
          .select("id")
          .eq("gatilho_id", g.id)
          .eq("user_id", alvo.user_id)
          .eq("contexto", alvo.contexto || {})
          .maybeSingle();
        if (existente) continue;

        // Cria notificação na plataforma
        if (g.canais?.includes("platform")) {
          await supabase.from("notifications").insert({
            user_id: alvo.user_id,
            type: "broadcast_trigger",
            title: g.titulo,
            body: g.corpo,
            link: g.link,
          });
        }
        // Email é tratado em outro fluxo (queue) — registramos para histórico
        await supabase.from("broadcast_gatilho_execucoes").insert({
          gatilho_id: g.id,
          user_id: alvo.user_id,
          contexto: alvo.contexto || {},
        });
        stats.notificacoes++;
      }
    }

    return new Response(JSON.stringify({ ok: true, ...stats }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ ok: false, error: msg, stats }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function calcularAlvos(
  supabase: ReturnType<typeof createClient>,
  g: any,
): Promise<Array<{ user_id: string; contexto?: Record<string, unknown> }>> {
  const dias: number = g.dias ?? 0;

  if (g.tipo === "dias_antes_casamento") {
    const alvo = new Date();
    alvo.setDate(alvo.getDate() + dias);
    const dataAlvo = alvo.toISOString().slice(0, 10);
    const { data } = await supabase
      .from("couples")
      .select("user_id, wedding_date")
      .eq("wedding_date", dataAlvo);
    return (data || []).map((c: any) => ({ user_id: c.user_id, contexto: { wedding_date: c.wedding_date } }));
  }

  if (g.tipo === "dias_antes_pagamento") {
    const alvo = new Date();
    alvo.setDate(alvo.getDate() + dias);
    const dataAlvo = alvo.toISOString().slice(0, 10);
    const { data: pays } = await supabase
      .from("budget_payments")
      .select("couple_id, due_date, id")
      .eq("status", "pending")
      .eq("due_date", dataAlvo);
    if (!pays?.length) return [];
    const coupleIds = Array.from(new Set(pays.map((p: any) => p.couple_id)));
    const { data: couples } = await supabase
      .from("couples").select("id, user_id").in("id", coupleIds);
    return (couples || []).map((c: any) => ({ user_id: c.user_id, contexto: { date: dataAlvo } }));
  }

  if (g.tipo === "dias_apos_pagamento_vencido") {
    const alvo = new Date();
    alvo.setDate(alvo.getDate() - dias);
    const dataAlvo = alvo.toISOString().slice(0, 10);
    const { data: pays } = await supabase
      .from("budget_payments")
      .select("couple_id, due_date, id")
      .eq("status", "pending")
      .lte("due_date", dataAlvo);
    if (!pays?.length) return [];
    const coupleIds = Array.from(new Set(pays.map((p: any) => p.couple_id)));
    const { data: couples } = await supabase
      .from("couples").select("id, user_id").in("id", coupleIds);
    return (couples || []).map((c: any) => ({ user_id: c.user_id, contexto: {} }));
  }

  if (g.tipo === "rsvp_pendente") {
    const alvo = new Date();
    alvo.setDate(alvo.getDate() + dias);
    const dataAlvo = alvo.toISOString().slice(0, 10);
    const { data: couples } = await supabase
      .from("couples")
      .select("id, user_id, wedding_date")
      .eq("wedding_date", dataAlvo);
    if (!couples?.length) return [];
    const targets: Array<{ user_id: string; contexto?: Record<string, unknown> }> = [];
    for (const c of couples as any[]) {
      const { count } = await supabase
        .from("guest_invites")
        .select("id", { count: "exact", head: true })
        .eq("couple_id", c.id)
        .is("rsvp_response", null);
      if ((count || 0) > 0) targets.push({ user_id: c.user_id, contexto: { dias } });
    }
    return targets;
  }

  if (g.tipo === "sem_atividade_dias") {
    const corte = new Date();
    corte.setDate(corte.getDate() - dias);
    const isoCorte = corte.toISOString();
    const { data } = await supabase
      .from("profiles")
      .select("user_id, account_type, updated_at")
      .lt("updated_at", isoCorte);
    return (data || [])
      .filter((p: any) =>
        g.publico_alvo === "all" ||
        (g.publico_alvo === "couples" && p.account_type === "couple") ||
        (g.publico_alvo === "suppliers" && p.account_type === "supplier")
      )
      .map((p: any) => ({ user_id: p.user_id, contexto: { semana: corte.toISOString().slice(0, 10) } }));
  }

  return [];
}