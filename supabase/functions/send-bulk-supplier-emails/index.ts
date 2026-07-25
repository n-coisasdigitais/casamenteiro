import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Msg = {
  supplier_id: string;
  couple_supplier_id?: string | null;
  to_name: string;
  to_email: string;
  subject: string;
  body: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { couple_id, messages } = (await req.json()) as { couple_id: string; messages: Msg[] };
    if (!couple_id || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "couple_id e messages obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: couple } = await supabase
      .from("couples").select("partner_name, wedding_date, wedding_city, user_id")
      .eq("id", couple_id).maybeSingle();
    const { data: profile } = couple?.user_id
      ? await supabase.from("profiles").select("full_name").eq("user_id", couple.user_id).maybeSingle()
      : { data: null };
    const coupleNames = [profile?.full_name, couple?.partner_name].filter(Boolean).join(" & ") || "Casal";

    let queued = 0;
    for (const m of messages) {
      if (!m.to_email) continue;
      const html = `
        <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#222">
          <h2 style="font-size:20px;margin:0 0 8px">Pedido de orçamento — ${coupleNames}</h2>
          <p style="white-space:pre-line;line-height:1.5">${m.body.replace(/</g, "&lt;")}</p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0" />
          <p style="font-size:12px;color:#888">Enviado pelo Casamenteiro em nome de ${coupleNames}. Responda diretamente para este e-mail.</p>
        </div>`;

      await supabase.rpc("enqueue_email", {
        queue_name: "transactional_emails",
        payload: {
          to: m.to_email,
          subject: m.subject,
          html,
          from: "Casamenteiro <orcamentos@avisos.www.casamenteiro.com.br>",
          sender_domain: "avisos.www.casamenteiro.com.br",
          purpose: "transactional",
          label: "bulk-supplier-quote",
          idempotency_key: `bulk-quote-${couple_id}-${m.supplier_id}-${Date.now()}`,
          message_id: crypto.randomUUID(),
          queued_at: new Date().toISOString(),
        },
      });

      if (m.couple_supplier_id) {
        await supabase.from("couple_supplier_events").insert({
          couple_supplier_id: m.couple_supplier_id,
          type: "quote_sent",
          payload: { channel: "email", subject: m.subject },
        });
      }
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