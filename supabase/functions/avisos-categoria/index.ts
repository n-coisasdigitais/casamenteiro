// Edge function: avisos-categoria
// Roda de hora em hora (cron). Para cada pedido "Me avise quando chegar" ainda não atendido,
// verifica se já existe fornecedor aprovado (com foto) na categoria — e na cidade, quando informada.
// Se existir: cria notificação no site (quem tem conta) e envia e-mail; marca avisado_em.
import { createClient } from "npm:@supabase/supabase-js@2";
import { appUrl, logEmail, sendViaResend } from "../_shared/resend.ts";
import { getUserId, isAdmin, isServiceRole } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const norm = (s: string | null | undefined) =>
  (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] ?? c));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (!isServiceRole(req)) {
    const userId = await getUserId(req);
    if (!userId || !(await isAdmin(userId))) return json({ error: "Não autorizado" }, userId ? 403 : 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "Configuração indisponível" }, 500);
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const stats = { pendentes: 0, avisados: 0, emails: 0, notificacoes: 0, erros: [] as string[] };

  try {
    const { data: pedidos, error } = await supabase
      .from("avisos_categoria")
      .select("id, category_id, user_id, email, cidade, created_at")
      .is("avisado_em", null)
      .order("created_at")
      .limit(500);
    if (error) throw error;
    stats.pendentes = pedidos?.length || 0;
    if (!pedidos?.length) return json(stats);

    const catIds = [...new Set(pedidos.map((p) => p.category_id))];
    const [{ data: cats }, { data: forns }] = await Promise.all([
      supabase.from("categories").select("id, name, slug").in("id", catIds),
      supabase
        .from("suppliers")
        .select("id, company_name, city, state, cidades_atendidas, category_id, created_at, supplier_photos(id)")
        .eq("status", "approved")
        .eq("is_demo", false)
        .in("category_id", catIds),
    ]);
    const catPorId = new Map((cats || []).map((c: any) => [c.id, c]));
    const visiveis = (forns || []).filter((f: any) => (f.supplier_photos || []).length > 0);

    for (const p of pedidos) {
      try {
        const cat: any = catPorId.get(p.category_id);
        if (!cat) continue;
        const cidade = norm(p.cidade);
        const achados = visiveis.filter((f: any) => {
          if (f.category_id !== p.category_id) return false;
          if (!cidade) return true;
          const onde = [f.city, f.state, ...((f.cidades_atendidas as string[]) || [])].map(norm).join(" | ");
          return onde.includes(cidade) || (!!norm(f.city) && cidade.includes(norm(f.city)));
        });
        if (!achados.length) continue;

        const link = `${appUrl()}/categoria/${cat.slug}${p.cidade ? `?cidade=${encodeURIComponent(p.cidade)}` : ""}`;
        const qtd = achados.length;
        const titulo = qtd === 1 ? `Chegou ${cat.name.toLowerCase()} no Casamenteiro` : `Chegaram ${qtd} opções de ${cat.name.toLowerCase()}`;
        const corpo = `Você pediu para ser avisado. ${qtd === 1 ? `${achados[0].company_name} já está` : `${qtd} fornecedores já estão`} no Casamenteiro${p.cidade ? ` para ${p.cidade}` : ""}. Veja fotos e peça orçamento grátis.`;

        if (p.user_id) {
          const { error: eNot } = await supabase
            .from("notifications")
            .insert({ user_id: p.user_id, type: "aviso_categoria", title: titulo, body: corpo, link: link.replace(appUrl(), ""), read: false });
          if (!eNot) stats.notificacoes++;
        }

        let email = p.email as string | null;
        if (!email && p.user_id) {
          const { data: u } = await supabase.auth.admin.getUserById(p.user_id);
          email = u?.user?.email ?? null;
        }
        if (email) {
          const lista = achados
            .slice(0, 3)
            .map((f: any) => `<li style="margin:0 0 6px">${esc(f.company_name)}${f.city ? ` <span style="color:#8c8279">· ${esc(f.city)}</span>` : ""}</li>`)
            .join("");
          const html = `
            <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:28px;color:#221d19;background:#fbf7f2">
              <p style="font-family:Georgia,serif;font-size:22px;margin:0 0 18px">casamenteiro<span style="color:#a9551f">.</span></p>
              <h1 style="font-family:Georgia,serif;font-size:24px;line-height:1.2;margin:0 0 10px">${esc(titulo)}</h1>
              <p style="color:#5c534b;margin:0 0 16px">${esc(corpo)}</p>
              <ul style="padding-left:18px;margin:0 0 22px;color:#221d19">${lista}</ul>
              <a href="${link}" style="display:inline-block;background:#a9551f;color:#ffffff;padding:13px 24px;border-radius:999px;text-decoration:none;font-weight:700">Ver ${esc(cat.name.toLowerCase())}</a>
              <p style="font-size:12px;color:#8c8279;margin-top:30px">Você recebeu este e-mail porque pediu para ser avisado quando ${esc(cat.name.toLowerCase())} chegasse ao Casamenteiro. É um aviso único.</p>
            </div>`;
          const r = await sendViaResend({ to: email, subject: titulo, html });
          await logEmail(supabase, {
            message_id: r.id || crypto.randomUUID(),
            template_name: "aviso-categoria",
            recipient_email: email,
            status: r.ok ? "sent" : "failed",
            error_message: r.ok ? null : `[${r.status}] ${r.error}`,
            metadata: { aviso_id: p.id, category_id: p.category_id, provider: "resend" },
          });
          if (r.ok) stats.emails++;
          else stats.erros.push(`email ${p.id}: ${r.error}`);
        }

        await supabase.from("avisos_categoria").update({ avisado_em: new Date().toISOString() }).eq("id", p.id);
        stats.avisados++;
      } catch (e) {
        stats.erros.push(`${p.id}: ${(e as Error).message}`);
      }
    }
    return json(stats);
  } catch (e) {
    console.error("avisos-categoria", e);
    return json({ error: (e as Error).message, ...stats }, 500);
  }
});