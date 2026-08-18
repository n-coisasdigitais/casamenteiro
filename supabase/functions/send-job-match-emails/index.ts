import { createClient } from "@supabase/supabase-js";
import { appUrl, logEmail, sendViaResend } from "../_shared/resend.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const norm = (s: string | null | undefined) =>
  (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { job_id } = await req.json();
    if (!job_id) {
      return new Response(JSON.stringify({ error: "job_id é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: job } = await supabase
      .from("staff_jobs")
      .select("id, funcao, cidade, local, data, hora_inicio, hora_fim, valor_turno, status, is_public")
      .eq("id", job_id)
      .maybeSingle();

    if (!job) {
      return new Response(JSON.stringify({ error: "Vaga não encontrada" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (job.status !== "aberta" || job.is_public !== true) {
      return new Response(JSON.stringify({ sent: 0, skipped: "vaga não pública" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Profissionais compatíveis por função + cidade
    const { data: staff } = await supabase
      .from("staff_profiles")
      .select("id, nome, email, cidade, funcoes, valor_min_turno, is_public, disponivel, notificar_vagas_email")
      .contains("funcoes", [job.funcao])
      .eq("is_public", true);

    const cidadeVaga = norm(job.cidade);
    const alvos = (staff || []).filter((s: any) =>
      s.email &&
      s.notificar_vagas_email !== false &&
      s.disponivel !== false &&
      (!cidadeVaga || !s.cidade || norm(s.cidade) === cidadeVaga) &&
      Number(s.valor_min_turno || 0) <= Number(job.valor_turno || 0)
    );

    const link = `${appUrl()}/vagas`;
    const dataLabel = job.data
      ? new Date(job.data + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
      : "";
    const valorLabel = job.valor_turno != null
      ? Number(job.valor_turno).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
      : null;

    let sent = 0;
    for (const s of alvos) {
      const subject = `Nova vaga de ${job.funcao}${job.cidade ? ` em ${job.cidade}` : ""}`;
      const html = `
        <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#222;background:#ffffff">
          <h1 style="font-size:22px;color:#222">Olá, ${s.nome?.split(" ")[0] || "profissional"}!</h1>
          <p style="color:#222">Uma nova vaga compatível com o seu perfil foi publicada:</p>
          <div style="border:1px solid #eee;border-radius:12px;padding:16px;margin:16px 0">
            <p style="margin:0 0 6px;font-size:18px;font-weight:600;color:#222">${job.funcao}</p>
            ${job.cidade ? `<p style="margin:0 0 4px;color:#555"><strong>Cidade:</strong> ${job.cidade}</p>` : ""}
            ${dataLabel ? `<p style="margin:0 0 4px;color:#555"><strong>Data:</strong> ${dataLabel}${job.hora_inicio ? ` • ${job.hora_inicio}${job.hora_fim ? ` às ${job.hora_fim}` : ""}` : ""}</p>` : ""}
            ${job.local ? `<p style="margin:0 0 4px;color:#555"><strong>Local:</strong> ${job.local}</p>` : ""}
            ${valorLabel ? `<p style="margin:0;color:#555"><strong>Valor do turno:</strong> ${valorLabel}</p>` : ""}
          </div>
          <p style="margin-top:24px">
            <a href="${link}" style="background:#c4654a;color:#ffffff;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:600">
              Ver vaga e candidatar-se
            </a>
          </p>
          <p style="font-size:12px;color:#888;margin-top:32px">
            Você recebe este aviso porque tem essa função e cidade no seu perfil no Casamenteiro.
            Para não receber mais, desative os avisos de vagas no seu perfil profissional.
          </p>
        </div>`;

      const messageId = crypto.randomUUID();
      const result = await sendViaResend({ to: s.email, subject, html });
      await logEmail(supabase, {
        message_id: result.id || messageId,
        template_name: "vaga-compativel",
        recipient_email: s.email,
        status: result.ok ? "sent" : "failed",
        error_message: result.ok ? null : `[${result.status}] ${result.error}`,
        metadata: { job_id: job.id, staff_id: s.id, provider: "resend" },
      });
      if (result.ok) sent++;
    }

    return new Response(JSON.stringify({ sent, candidatos: alvos.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-job-match-emails", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});