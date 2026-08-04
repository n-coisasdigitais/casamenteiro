import { supabase } from "@/integrations/supabase/client";

export type Plano = {
  id: string;
  slug: string;
  nome: string;
  descricao: string | null;
  preco_mensal: number;
  preco_anual: number;
  beneficios: string[];
  limites: Record<string, unknown>;
  destaque_busca: boolean;
  ordem: number;
};

export type Assinatura = {
  id: string;
  supplier_id: string;
  plan_id: string;
  ciclo: "mensal" | "anual";
  status: string;
  valor: number;
  current_period_end: string | null;
};

export const ASSINATURA_STATUS_LABEL: Record<string, string> = {
  pendente: "Aguardando pagamento",
  ativa: "Ativa",
  expirada: "Expirada",
  cancelada: "Cancelada",
};

export const DESTAQUE_STATUS_LABEL: Record<string, string> = {
  pendente: "Aguardando pagamento",
  ativo: "Ativo",
  expirado: "Expirado",
  cancelado: "Cancelado",
};

export const PACOTES_DESTAQUE = [
  { dias: 7, valor: 89, label: "7 dias" },
  { dias: 15, valor: 159, label: "15 dias" },
  { dias: 30, valor: 279, label: "30 dias" },
];

export async function listarPlanos(): Promise<Plano[]> {
  const { data } = await (supabase.from("subscription_plans" as any)
    .select("id, slug, nome, descricao, preco_mensal, preco_anual, beneficios, limites, destaque_busca, ordem")
    .eq("ativo", true)
    .order("ordem", { ascending: true }) as any);
  return ((data as any[]) ?? []).map((p) => ({
    ...p,
    beneficios: Array.isArray(p.beneficios) ? p.beneficios : [],
    limites: p.limites ?? {},
  })) as Plano[];
}

export async function assinaturaAtual(supplierId: string) {
  const { data } = await (supabase.from("supplier_subscriptions" as any)
    .select("id, supplier_id, plan_id, ciclo, status, valor, current_period_end")
    .eq("supplier_id", supplierId)
    .in("status", ["ativa", "pendente"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle() as any);
  return (data as Assinatura | null) ?? null;
}

/** Cria (ou reaproveita) a assinatura pendente e devolve o id para o checkout. */
export async function criarAssinatura(opts: {
  supplierId: string;
  plano: Plano;
  ciclo: "mensal" | "anual";
}): Promise<{ id: string | null; erro?: string }> {
  const valor = opts.ciclo === "anual" ? opts.plano.preco_anual : opts.plano.preco_mensal;
  const existente = await assinaturaAtual(opts.supplierId);
  if (existente && existente.status === "pendente") {
    const { error } = await (supabase.from("supplier_subscriptions" as any) as any)
      .update({ plan_id: opts.plano.id, ciclo: opts.ciclo, valor })
      .eq("id", existente.id);
    if (error) return { id: null, erro: error.message };
    return { id: existente.id };
  }
  const { data, error } = await (supabase.from("supplier_subscriptions" as any) as any)
    .insert({ supplier_id: opts.supplierId, plan_id: opts.plano.id, ciclo: opts.ciclo, valor, status: "pendente" })
    .select("id")
    .maybeSingle();
  if (error) return { id: null, erro: error.message };
  return { id: data?.id ?? null };
}

export async function criarCompraDestaque(opts: {
  supplierId: string;
  dias: number;
  valor: number;
}): Promise<{ id: string | null; erro?: string }> {
  const { data, error } = await (supabase.from("featured_purchases" as any) as any)
    .insert({ supplier_id: opts.supplierId, dias: opts.dias, valor: opts.valor, status: "pendente" })
    .select("id")
    .maybeSingle();
  if (error) return { id: null, erro: error.message };
  return { id: data?.id ?? null };
}

export type CheckoutResposta = {
  ambiente: "sandbox" | "live";
  tipo: string;
  valor: number;
  titulo: string;
  preference_id: string;
  checkout_url: string;
  public_key: string | null;
};

export async function iniciarCheckout(tipo: "reserva" | "assinatura" | "destaque", referenciaId: string) {
  const { data, error } = await supabase.functions.invoke("mp-checkout", {
    body: { tipo, referencia_id: referenciaId },
  });
  if (error) {
    let detalhe = error.message;
    try {
      const ctx = (error as any)?.context;
      if (ctx?.text) detalhe = await ctx.text();
    } catch { /* ignora */ }
    return { data: null as CheckoutResposta | null, erro: detalhe };
  }
  return { data: data as CheckoutResposta, erro: null as string | null };
}