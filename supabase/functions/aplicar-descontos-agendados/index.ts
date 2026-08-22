// Rotina diária: aplica os descontos acumulados (cupom, indicação ou presente) na
// próxima cobrança da assinatura do fornecedor e devolve o preço cheio depois.
//
// Regras de negócio:
// - O benefício só vale a partir do 1º ciclo COBRADO (nunca durante o teste gratuito).
// - Teto de 100% em um único ciclo; o excedente fica pendente para os meses seguintes.
// - "Mês grátis" pausa a cobrança daquele ciclo (transaction_amount mínimo não é aceito pelo MP,
//   então usamos status "paused" e retomamos no ciclo seguinte).
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const token = (ambiente: string | null) =>
  ambiente === "sandbox" ? Deno.env.get("MP_ACCESS_TOKEN_TEST") : Deno.env.get("MP_ACCESS_TOKEN_PROD");

async function putPreapproval(ambiente: string | null, id: string, body: unknown) {
  const accessToken = token(ambiente);
  if (!accessToken) return { ok: false, detalhe: "credencial_ausente" };
  const res = await fetch(`https://api.mercadopago.com/preapproval/${id}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const txt = await res.text().catch(() => "");
  return { ok: res.ok, detalhe: txt.slice(0, 300) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const agora = new Date();
  const limite = new Date(agora.getTime() + 3 * 24 * 60 * 60 * 1000); // janela de 3 dias

  const { data: assinaturas, error } = await admin
    .from("supplier_subscriptions")
    .select("id, supplier_id, plan_id, ciclo, status, valor, ambiente, mp_preapproval_id, current_period_end")
    .eq("status", "ativa")
    .not("mp_preapproval_id", "is", null);

  if (error) return json({ error: error.message }, 500);

  const resultados: Record<string, unknown>[] = [];

  for (const sub of assinaturas ?? []) {
    try {
      // Preço cheio do plano (referência para aplicar/desfazer o desconto)
      const { data: plano } = await admin
        .from("subscription_plans")
        .select("preco_mensal, preco_anual")
        .eq("id", sub.plan_id)
        .maybeSingle();
      const valorCheio = Number(
        (sub.ciclo === "anual" ? plano?.preco_anual : plano?.preco_mensal) ?? sub.valor ?? 0,
      );
      if (!valorCheio) continue;

      // Fornecedor ainda em teste gratuito? Benefício só no 1º ciclo cobrado.
      const { data: sup } = await admin
        .from("suppliers")
        .select("trial_ends_at")
        .eq("id", sub.supplier_id)
        .maybeSingle();
      const emTrial = sup?.trial_ends_at ? new Date(sup.trial_ends_at) > agora : false;

      const fimCiclo = sub.current_period_end ? new Date(sub.current_period_end) : null;
      const vaiCobrarEmBreve = !fimCiclo || fimCiclo <= limite;

      const { data: pendentes } = await admin
        .from("supplier_credits")
        .select("id")
        .eq("supplier_id", sub.supplier_id)
        .eq("status", "pendente")
        .limit(1);
      const temPendente = (pendentes ?? []).length > 0;

      // 1) Aplicar desconto no ciclo que está por vir
      if (temPendente && !emTrial && vaiCobrarEmBreve) {
        const { data: res } = await admin.rpc("consumir_creditos_ciclo", {
          _supplier_id: sub.supplier_id,
          _valor_base: valorCheio,
        });
        const r = res as any;
        if (r?.aplicou) {
          const valorFinal = Number(r.valor_final ?? 0);
          const mp =
            valorFinal <= 0
              ? await putPreapproval(sub.ambiente, sub.mp_preapproval_id!, { status: "paused" })
              : await putPreapproval(sub.ambiente, sub.mp_preapproval_id!, {
                  auto_recurring: { transaction_amount: valorFinal },
                });
          await admin.from("supplier_subscriptions").update({ valor: valorFinal }).eq("id", sub.id);
          resultados.push({ supplier_id: sub.supplier_id, acao: "desconto_aplicado", valorFinal, mp_ok: mp.ok, detalhe: mp.detalhe });
          continue;
        }
      }

      // 2) Sem pendências: devolver o preço cheio e retomar a cobrança se estava pausada
      if (!temPendente && Number(sub.valor) !== valorCheio) {
        const mp = await putPreapproval(sub.ambiente, sub.mp_preapproval_id!, {
          status: "authorized",
          auto_recurring: { transaction_amount: valorCheio },
        });
        await admin.from("supplier_subscriptions").update({ valor: valorCheio }).eq("id", sub.id);
        resultados.push({ supplier_id: sub.supplier_id, acao: "preco_restaurado", valorCheio, mp_ok: mp.ok, detalhe: mp.detalhe });
      }
    } catch (e) {
      resultados.push({ supplier_id: sub.supplier_id, acao: "erro", detalhe: String(e) });
    }
  }

  // Expira benefícios vencidos
  await admin
    .from("supplier_credits")
    .update({ status: "expirado", encerrado_em: agora.toISOString() })
    .eq("status", "pendente")
    .not("expira_em", "is", null)
    .lt("expira_em", agora.toISOString());

  return json({ ok: true, processadas: (assinaturas ?? []).length, resultados });
});
