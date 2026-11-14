// Edge function: admin-mensagem-pessoa
// O admin envia uma mensagem para UMA pessoa (casal, fornecedor ou profissional)
// pelo sininho do site (notificação) e/ou por e-mail. Registra no histórico de comunicação.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { sendViaResend, appUrl } from "../_shared/resend.ts";
import { adminClient, getUserId, isAdmin } from "../_shared/auth.ts";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const adminId = await getUserId(req);
  if (!adminId) return json({ error: "Não autenticado" }, 401);
  if (!(await isAdmin(adminId))) return json({ error: "Acesso negado" }, 403);

  let body: {
    user_id?: string;
    titulo?: string;
    mensagem?: string;
    link?: string | null;
    push?: boolean;
    email?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }

  const userId = (body.user_id ?? "").trim();
  const titulo = (body.titulo ?? "").trim();
  const mensagem = (body.mensagem ?? "").trim();
  const link = (body.link ?? "").trim() || null;
  const querPush = body.push !== false;
  const querEmail = body.email === true;

  if (!UUID.test(userId)) return json({ error: "Destinatário inválido" }, 400);
  if (!titulo || titulo.length > 120) return json({ error: "Título obrigatório (máx. 120 caracteres)" }, 400);
  if (mensagem.length > 3000) return json({ error: "Mensagem muito longa (máx. 3000 caracteres)" }, 400);
  if (!querPush && !querEmail) return json({ error: "Escolha pelo menos um canal" }, 400);
  if (link && !link.startsWith("/") && !/^https:\/\//i.test(link)) {
    return json({ error: "O link deve começar com / ou https://" }, 400);
  }

  const supabase = adminClient();

  const { data: u, error: uErr } = await supabase.auth.admin.getUserById(userId);
  if (uErr || !u?.user) return json({ error: "Usuário não encontrado" }, 404);
  const email = u.user.email ?? null;

  const { data: perfil } = await supabase.from("profiles").select("full_name").eq("user_id", userId).maybeSingle();
  const primeiroNome = (perfil?.full_name ?? "").trim().split(/\s+/)[0] || "";

  const resultado = { push: false, email: false, emailErro: null as string | null };

  // 1) Notificação no sininho
  if (querPush) {
    const { error } = await supabase.from("notifications").insert({
      user_id: userId,
      type: "admin_mensagem",
      title: titulo,
      body: mensagem || null,
      link,
    });
    resultado.push = !error;
  }

  // 2) E-mail
  if (querEmail) {
    if (!email) {
      resultado.emailErro = "Usuário sem e-mail";
    } else {
      const base = appUrl();
      const linkAbs = link ? (link.startsWith("/") ? `${base}${link}` : link) : `${base}/`;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1f1d1b;">
          <p style="font-size: 20px; font-weight: 800; margin: 0 0 24px;">casamenteiro<span style="color: #D9905A;">.</span></p>
          ${primeiroNome ? `<p style="margin: 0 0 12px;">Olá, ${escapeHtml(primeiroNome)}!</p>` : ""}
          <h2 style="font-size: 20px; margin: 0 0 12px;">${escapeHtml(titulo)}</h2>
          ${mensagem ? `<div style="white-space: pre-wrap; line-height: 1.55; color: #3d3833;">${escapeHtml(mensagem)}</div>` : ""}
          <p style="margin: 28px 0;">
            <a href="${escapeHtml(linkAbs)}" style="background: #a9551f; color: #fff; text-decoration: none; padding: 12px 22px; border-radius: 999px; font-weight: 700; display: inline-block;">
              ${link ? "Ver no Casamenteiro" : "Abrir o Casamenteiro"}
            </a>
          </p>
          <p style="color: #8a8079; font-size: 12px; margin-top: 32px;">Você recebeu esta mensagem da equipe do Casamenteiro. É só responder este e-mail para falar com a gente.</p>
        </div>
      `;
      const envio = await sendViaResend({
        to: email,
        subject: titulo,
        html,
        text: `${titulo}\n\n${mensagem}\n\n${linkAbs}`,
      });
      resultado.email = envio.ok;
      if (!envio.ok) resultado.emailErro = envio.error ?? "Falha no envio";
    }
  }

  // 3) Histórico (Admin › Comunicação › Histórico)
  const canais = [resultado.push ? "in_app" : null, resultado.email ? "email" : null].filter(Boolean).join("+");
  if (canais) {
    await supabase.from("broadcast_history").insert({
      admin_id: adminId,
      segment: "individual",
      filters: { user_id: userId, email },
      title: titulo,
      body: mensagem,
      link,
      recipients_count: 1,
      channel: canais,
    });
  }

  if (!resultado.push && !resultado.email) {
    return json({ error: resultado.emailErro ?? "Não foi possível enviar", ...resultado }, 500);
  }
  return json({ ok: true, ...resultado });
});
