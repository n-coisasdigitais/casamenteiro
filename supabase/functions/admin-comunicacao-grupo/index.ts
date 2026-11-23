import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
import { adminClient, getUserId, isAdmin } from "../_shared/auth.ts";
import { appUrl, logEmail, sendViaResend } from "../_shared/resend.ts";

const schema = z.object({
  segment: z.enum(["couples", "suppliers", "profissionais", "genericos", "all"]),
  pendencia: z.enum(["todos", "dados", "documentos", "incompleto"]).default("todos"),
  titulo: z.string().trim().min(1).max(120),
  mensagem: z.string().trim().max(3000),
  link: z.string().trim().max(500).nullable().optional(),
  push: z.boolean(), email: z.boolean(), demo: z.boolean().default(false),
});
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const adminId = await getUserId(req);
  if (!adminId) return json({ error: "Não autenticado" }, 401);
  if (!(await isAdmin(adminId))) return json({ error: "Acesso negado" }, 403);
  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return json({ error: "Confira os filtros, o título e a mensagem." }, 400);
    const input = parsed.data;
    if (!input.push && !input.email) return json({ error: "Selecione pelo menos um canal." }, 400);
    if (input.demo && input.email) return json({ error: "Envio por e-mail indisponível para dados demo." }, 400);
    if (input.link && !input.link.startsWith("/") && !/^https:\/\//i.test(input.link)) return json({ error: "Link inválido." }, 400);
    if (input.link?.startsWith("//")) return json({ error: "Link inválido." }, 400);
    const db = adminClient();
    const { data: recipients, error } = await db.rpc("admin_destinatarios_comunicacao", { _segment: input.segment, _pendencia: input.pendencia, _demo: input.demo });
    if (error) return json({ error: error.message }, 400);
    const ids = [...new Set<string>((recipients || []).map((r: { user_id: string }) => r.user_id))];
    const result = { destinatarios: ids.length, plataforma: 0, emails: 0, falhas: 0 };
    const delivered = new Set<string>();
    for (let offset = 0; offset < ids.length; offset += 5) {
      await Promise.all(ids.slice(offset, offset + 5).map(async (userId) => {
        if (input.push) {
          const { error: notificationError } = await db.from("notifications").insert({ user_id: userId, type: "admin_broadcast", title: input.titulo, body: input.mensagem || null, link: input.link || null });
          if (notificationError) result.falhas++;
          else { result.plataforma++; delivered.add(userId); }
        }
        if (input.email) {
          const { data: user } = await db.auth.admin.getUserById(userId);
          const address = user?.user?.email;
          if (!address) { result.falhas++; return; }
          const url = input.link ? (input.link.startsWith("/") ? `${appUrl()}${input.link}` : input.link) : appUrl();
          const send = await sendViaResend({ to: address, subject: input.titulo, text: `${input.mensagem}\n\n${url}`, html: `<h2>${escape(input.titulo)}</h2><p style="white-space:pre-wrap">${escape(input.mensagem)}</p><p><a href="${escape(url)}">Abrir Casamenteiro</a></p>` }, 1);
          await logEmail(db, { message_id: send.id || crypto.randomUUID(), template_name: "admin-comunicacao-grupo", recipient_email: address, status: send.ok ? "sent" : "failed", error_message: send.ok ? null : send.error, metadata: { segment: input.segment, pendencia: input.pendencia, user_id: userId } });
          if (send.ok) { result.emails++; delivered.add(userId); } else result.falhas++;
        }
      }));
    }
    if (delivered.size) {
      await db.from("broadcast_history").insert({ admin_id: adminId, segment: input.segment, filters: { pendencia: input.pendencia, demo: input.demo, plataforma: result.plataforma, emails: result.emails, falhas: result.falhas }, title: input.titulo, body: input.mensagem, link: input.link || null, recipients_count: delivered.size, channel: [result.plataforma ? "in_app" : null, result.emails ? "email" : null].filter(Boolean).join("+") });
    }
    return json({ ok: true, ...result });
  } catch {
    return json({ error: "Não foi possível concluir o envio." }, 500);
  }
});