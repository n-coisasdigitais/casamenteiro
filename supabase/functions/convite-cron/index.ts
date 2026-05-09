// Edge function: convite-cron
// Disparada por pg_cron diariamente. Envia lembretes para convidados que ainda não responderam:
//  - 30 dias antes do casamento → tipo "lembrete_30d"
//  -  7 dias antes do casamento → tipo "lembrete_7d"
//  -  1 dia  antes do casamento → tipo "lembrete_1d"
// Cada lembrete é registrado em convite_lembretes para evitar duplicidade.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LembreteJanela {
  tipo: string;
  diasRestantes: number;
}

const JANELAS: LembreteJanela[] = [
  { tipo: "lembrete_30d", diasRestantes: 30 },
  { tipo: "lembrete_7d", diasRestantes: 7 },
  { tipo: "lembrete_1d", diasRestantes: 1 },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const stats = { processados: 0, lembretes_enviados: 0, erros: [] as string[] };

  try {
    for (const janela of JANELAS) {
      const alvo = new Date();
      alvo.setDate(alvo.getDate() + janela.diasRestantes);
      const dataAlvo = alvo.toISOString().slice(0, 10);

      // Casais com casamento exatamente nessa data
      const { data: couples, error: cErr } = await supabase
        .from("couples")
        .select("id, user_id, partner_name, wedding_date")
        .eq("wedding_date", dataAlvo);

      if (cErr) {
        stats.erros.push(`Couples (${janela.tipo}): ${cErr.message}`);
        continue;
      }
      if (!couples?.length) continue;

      for (const couple of couples) {
        // Convites pendentes desse casal
        const { data: invites } = await supabase
          .from("guest_invites")
          .select("id, guest_id")
          .eq("couple_id", couple.id)
          .is("rsvp_response", null);

        if (!invites?.length) continue;

        for (const invite of invites) {
          // Já enviado antes para esta janela?
          const { data: existente } = await supabase
            .from("convite_lembretes")
            .select("id")
            .eq("invite_id", invite.id)
            .eq("tipo", janela.tipo)
            .maybeSingle();

          if (existente) continue;

          // Notifica o casal (dono do convite) sobre pendentes — broadcast leve
          await supabase.from("notifications").insert({
            user_id: couple.user_id,
            type: "rsvp_reminder",
            title: `Faltam ${janela.diasRestantes} dia${janela.diasRestantes > 1 ? "s" : ""} — convidados pendentes`,
            body: `Você ainda tem convidados sem confirmação. Que tal mandar um lembrete?`,
            link: "/convidados",
          });

          // Registra lembrete para evitar duplicidade
          await supabase.from("convite_lembretes").insert({
            couple_id: couple.id,
            invite_id: invite.id,
            tipo: janela.tipo,
            canal: "platform_notification",
            status: "enviado",
          });
          stats.lembretes_enviados++;
        }
        stats.processados++;
      }
    }

    return new Response(JSON.stringify({ ok: true, ...stats }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ ok: false, error: msg, stats }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});