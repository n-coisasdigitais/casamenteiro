import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { couple_id, guest_ids } = await req.json();
    if (!couple_id || !Array.isArray(guest_ids) || guest_ids.length === 0) {
      return new Response(JSON.stringify({ error: "couple_id e guest_ids obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Carrega convidados + couple
    const { data: guests } = await supabase
      .from("wedding_guests")
      .select("id, name, email")
      .eq("couple_id", couple_id)
      .in("id", guest_ids);

    const { data: couple } = await supabase
      .from("couples")
      .select("partner_name, wedding_date, ceremony_address, user_id")
      .eq("id", couple_id)
      .maybeSingle();

    const { data: profile } = couple?.user_id
      ? await supabase.from("profiles").select("full_name").eq("user_id", couple.user_id).maybeSingle()
      : { data: null };

    const coupleNames = [profile?.full_name, couple?.partner_name].filter(Boolean).join(" & ");

    let queued = 0;
    for (const g of guests || []) {
      if (!g.email) continue;

      // Garante que existe um invite com token
      let token: string | null = null;
      const { data: existing } = await supabase
        .from("guest_invites").select("token").eq("guest_id", g.id).maybeSingle();
      if (existing?.token) {
        token = existing.token;
      } else {
        const { data: created } = await supabase
          .from("guest_invites").insert({ guest_id: g.id, couple_id }).select("token").maybeSingle();
        token = created?.token || null;
      }
      if (!token) continue;

      const link = `https://www.casamenteiro.com.br/convite/${token}`;
      const dateLabel = couple?.wedding_date
        ? new Date(couple.wedding_date + "T00:00:00").toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })
        : "";

      const subject = `${coupleNames || "Os noivos"} convidam você para o casamento`;
      const html = `
        <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#222">
          <h1 style="font-size:22px">Olá, ${g.name}! 💍</h1>
          <p>${coupleNames || "Os noivos"} convidam você para o casamento.</p>
          ${dateLabel ? `<p><strong>Data:</strong> ${dateLabel}</p>` : ""}
          ${couple?.ceremony_address ? `<p><strong>Local:</strong> ${couple.ceremony_address}</p>` : ""}
          <p style="margin-top:24px">
            <a href="${link}" style="background:#c4654a;color:#fff;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:600">
              Confirmar presença
            </a>
          </p>
          <p style="font-size:12px;color:#888;margin-top:32px">Convite enviado pelo Casamenteiro</p>
        </div>`;

      await supabase.rpc("enqueue_email", {
        queue_name: "transactional_email",
        payload: { to: g.email, subject, html, from: "Casamenteiro <convites@avisos.www.casamenteiro.com.br>" },
      });

      await supabase.from("guest_invites")
        .update({ sent_at: new Date().toISOString() })
        .eq("guest_id", g.id);

      queued++;
    }

    return new Response(JSON.stringify({ queued }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});