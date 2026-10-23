import { supabase } from "@/integrations/supabase/client";
import type { PlanLimites, PlanRecursos } from "@/lib/planFeatures";

export type Plano = {
  id: string;
  slug: string;
  nome: string;
  descricao: string | null;
  preco_mensal: number;
  preco_anual: number;
  beneficios: string[];
  limites: PlanLimites;
  recursos: PlanRecursos;
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
  mp_preapproval_id?: string | null;
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

export type PacoteDestaque = {
  id: string;
  label: string;
  dias: number;
  valor: number;
  ativo: boolean;
  ordem: number;
  /** categoria | cidade | home (legado) | home_hero | home_story | home_form | home_categoria */
  escopo?: string;
  max_vagas?: number;
  formato_imagem?: string | null;
  exclusivo?: boolean;
};

/** Espaços pagos da Home (exigem imagem aprovada). */
export const ESPACOS_HOME: Record<string, { nome: string; descricao: string }> = {
  home_hero: { nome: "Home — Destaque Hero", descricao: "Sua foto em tela cheia na abertura da Home, com legenda e link para o seu perfil." },
  home_story: { nome: "Home — Destaque dos Stories", descricao: "Um story vertical com o seu nome, selo Patrocinado e botão para o seu perfil." },
  home_form: { nome: "Home — Destaque do Formulário", descricao: "Sua foto acima do simulador, onde os casais começam o planejamento." },
  home_categoria: { nome: "Home — Destaque das Categorias", descricao: "Sua foto no bloco da sua categoria na Home, com selo Destaque." },
};

export const ehEspacoHome = (escopo?: string | null) => !!escopo && (escopo in ESPACOS_HOME || escopo === "home");

/** Fallback usado apenas se o admin ainda não cadastrou pacotes. */
export const PACOTES_DESTAQUE = [
  { dias: 7, valor: 89, label: "7 dias" },
  { dias: 15, valor: 159, label: "15 dias" },
  { dias: 30, valor: 279, label: "30 dias" },
];

export async function listarPacotesDestaque(incluirInativos = false): Promise<PacoteDestaque[]> {
  const montar = (cols: string) => {
    let q = supabase.from("featured_packages" as any).select(cols).order("ordem", { ascending: true }) as any;
    if (!incluirInativos) q = q.eq("ativo", true);
    return q;
  };
  // colunas novas (migração home_destaques); se ainda não existirem, cai para as antigas
  let { data, error } = await montar("id, label, dias, valor, ativo, ordem, escopo, max_vagas, formato_imagem, exclusivo");
  if (error) ({ data } = await montar("id, label, dias, valor, ativo, ordem"));
  return ((data as any[]) ?? []).map((p) => ({
    ...p,
    valor: Number(p.valor),
    dias: Number(p.dias),
  })) as PacoteDestaque[];
}

export async function listarPlanos(): Promise<Plano[]> {
  const { data } = await (supabase
    .from("subscription_plans" as any)
    .select(
      "id, slug, nome, descricao, preco_mensal, preco_anual, beneficios, limites, recursos, destaque_busca, ordem",
    )
    .eq("ativo", true)
    .order("ordem", { ascending: true }) as any);
  return ((data as any[]) ?? []).map((p) => ({
    ...p,
    beneficios: Array.isArray(p.beneficios) ? p.beneficios : [],
    limites: p.limites ?? {},
    recursos: p.recursos ?? {},
  })) as Plano[];
}

export async function assinaturaAtual(supplierId: string) {
  const { data } = await (supabase
    .from("supplier_subscriptions" as any)
    .select("id, supplier_id, plan_id, ciclo, status, valor, current_period_end, mp_preapproval_id")
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
}): Promise<{ id: string | null; erro?: string; ativadaDireto?: boolean; trocaDireta?: boolean }> {
  const valor = opts.ciclo === "anual" ? opts.plano.preco_anual : opts.plano.preco_mensal;
  const gratis = Number(valor) <= 0;
  const existente = await assinaturaAtual(opts.supplierId);

  // (1) PLANO GRÁTIS: ativa direto, sem pagamento.
  if (gratis) {
    const agora = new Date();
    const fim = new Date(agora);
    fim.setMonth(fim.getMonth() + 1);
    // Se tinha preapproval (assinatura paga), cancela no MP ao virar grátis.
    if (existente?.mp_preapproval_id) {
      try {
        await supabase.functions.invoke("mp-cancel-subscription", { body: { supplier_id: opts.supplierId } });
      } catch {
        /* segue */
      }
    }
    if (existente) {
      const { error } = await (supabase.from("supplier_subscriptions" as any) as any)
        .update({
          plan_id: opts.plano.id,
          ciclo: opts.ciclo,
          valor: 0,
          status: "ativa",
          current_period_start: agora.toISOString(),
          current_period_end: fim.toISOString(),
          cancelada_em: null,
          mp_preapproval_id: null,
        })
        .eq("id", existente.id);
      if (error) return { id: null, erro: error.message };
      return { id: existente.id, ativadaDireto: true };
    }
    const { data, error } = await (supabase.from("supplier_subscriptions" as any) as any)
      .insert({
        supplier_id: opts.supplierId,
        plan_id: opts.plano.id,
        ciclo: opts.ciclo,
        valor: 0,
        status: "ativa",
        current_period_start: agora.toISOString(),
        current_period_end: fim.toISOString(),
      })
      .select("id")
      .maybeSingle();
    if (error) return { id: null, erro: error.message };
    return { id: data?.id ?? null, ativadaDireto: true };
  }

  // (2) TROCA INTELIGENTE: já existe assinatura ATIVA com preapproval (débito recorrente já configurado).
  // Não gera novo pagamento: ajusta o valor no Mercado Pago e troca o plano mantendo ATIVA.
  if (existente && existente.status === "ativa" && existente.mp_preapproval_id) {
    const { data, error } = await supabase.functions.invoke("mp-change-plan", {
      body: { supplier_id: opts.supplierId, plan_id: opts.plano.id, ciclo: opts.ciclo, valor },
    });
    if (error) {
      let detalhe = error.message;
      try {
        const ctx = (error as any)?.context;
        if (ctx?.json) {
          const j = await ctx.json();
          if (j?.error) detalhe = j.error;
        }
      } catch {
        /* ignora */
      }
      return { id: null, erro: detalhe };
    }
    return { id: existente.id, trocaDireta: true };
  }

  // (3) TROCA sem preapproval ainda (ex.: assinatura pendente, ou ativa gratuita virando paga):
  // reusa a linha existente e leva ao pagamento (brick) para criar o preapproval.
  if (existente) {
    const { error } = await (supabase.from("supplier_subscriptions" as any) as any)
      .update({ plan_id: opts.plano.id, ciclo: opts.ciclo, valor, status: "pendente", cancelada_em: null })
      .eq("id", existente.id);
    if (error) return { id: null, erro: error.message };
    return { id: existente.id };
  }

  // (4) PRIMEIRA assinatura paga: cria pendente e leva ao pagamento.
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
  /** Campos dos destaques da Home (opcionais para os pacotes antigos). */
  escopo?: string;
  packageId?: string;
  exclusivo?: boolean;
  imagemUrl?: string | null;
  legenda?: string | null;
  linkDestino?: string | null;
  categoriaId?: string | null;
}): Promise<{ id: string | null; erro?: string }> {
  const row: Record<string, unknown> = { supplier_id: opts.supplierId, dias: opts.dias, valor: opts.valor, status: "pendente" };
  if (opts.escopo) row.escopo = opts.escopo;
  if (opts.packageId) row.package_id = opts.packageId;
  if (opts.exclusivo) row.exclusivo = true;
  if (opts.imagemUrl) row.imagem_url = opts.imagemUrl;
  if (opts.legenda) row.legenda = opts.legenda;
  if (opts.linkDestino) row.link_destino = opts.linkDestino;
  if (opts.categoriaId) row.escopo_categoria_id = opts.categoriaId;
  const { data, error } = await (supabase.from("featured_purchases" as any) as any)
    .insert(row)
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
  checkout_url_sandbox?: string | null;

  public_key: string | null;
  aviso?: string | null;
  mp_account?: { id?: string | number | null; nickname?: string | null; is_test?: boolean } | null;
};

/** Reconciliação manual: procura o pagamento no Mercado Pago e ativa a assinatura/destaque. */
export async function sincronizarAssinatura(
  referenciaId: string,
  tipo: "assinatura" | "destaque" = "assinatura",
) {
  const { data, error } = await supabase.functions.invoke("mp-sync-assinatura", {
    body: { referencia_id: referenciaId, tipo },
  });
  if (error) return { ok: false, encontrado: false, erro: error.message };
  return { ok: !!(data as any)?.ok, encontrado: !!(data as any)?.encontrado, erro: null as string | null };
}

/** Atalho para destaques pendentes. */
export const sincronizarDestaque = (referenciaId: string) => sincronizarAssinatura(referenciaId, "destaque");



export async function iniciarCheckout(
  tipo: "reserva" | "assinatura" | "destaque" | "cancelamento",
  referenciaId: string,
) {
  const { data, error } = await supabase.functions.invoke("mp-checkout", {
    body: { tipo, referencia_id: referenciaId },
  });
  if (error) {
    let detalhe = error.message;
    try {
      const ctx = (error as any)?.context;
      if (ctx?.text) {
        const bruto = await ctx.text();
        try {
          const j = JSON.parse(bruto);
          detalhe = [j?.error, j?.detalhe].filter(Boolean).join(" — ") || bruto;
        } catch {
          detalhe = bruto;
        }
      }
    } catch {
      /* ignora */
    }
    return { data: null as CheckoutResposta | null, erro: detalhe };
  }
  return { data: data as CheckoutResposta, erro: null as string | null };
}


/** Vagas livres agora num espaço da Home (RPC da migração home_destaques). */
export async function vagasDestaque(escopo: string, categoriaId?: string | null): Promise<number | null> {
  const { data, error } = await (supabase.rpc as any)("vagas_destaque_disponiveis", {
    p_escopo: escopo,
    p_categoria: categoriaId ?? null,
  });
  if (error) return null;
  return Number(data);
}

/** Envia a imagem do destaque para o bucket `destaques/<user_id>/...` e devolve a URL pública. */
export async function enviarImagemDestaque(userId: string, file: File): Promise<{ url: string | null; erro?: string }> {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("destaques").upload(path, file, { upsert: false, contentType: file.type });
  if (error) return { url: null, erro: error.message };
  return { url: supabase.storage.from("destaques").getPublicUrl(path).data.publicUrl };
}
