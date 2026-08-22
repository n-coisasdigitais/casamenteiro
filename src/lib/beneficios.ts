import { supabase } from "@/integrations/supabase/client";
import { publicBaseUrl } from "@/lib/appUrl";

/** Benefícios (cupom, indicação ou presente do admin) aplicados na assinatura do fornecedor. */
export type BeneficioTipo = "percentual" | "valor" | "meses_gratis";
export type BeneficioOrigem = "cupom" | "indicacao" | "presente";
export type BeneficioStatus = "pendente" | "aplicado" | "consumido" | "expirado" | "cancelado";

export type Beneficio = {
  id: string;
  supplier_id: string;
  origem: BeneficioOrigem;
  origem_id: string | null;
  tipo: BeneficioTipo;
  valor: number;
  ciclos_total: number;
  ciclos_restantes: number;
  status: BeneficioStatus;
  valor_original: number | null;
  valor_com_desconto: number | null;
  aplicado_em: string | null;
  encerrado_em: string | null;
  expira_em: string | null;
  motivo: string | null;
  created_at: string;
};

export type Cupom = {
  id: string;
  codigo: string;
  descricao: string | null;
  tipo: BeneficioTipo;
  valor: number;
  ciclos: number;
  valido_de: string | null;
  valido_ate: string | null;
  max_usos: number | null;
  usos: number;
  max_usos_por_fornecedor: number;
  planos_elegiveis: string[];
  ativo: boolean;
  created_at: string;
};

export const BENEFICIO_STATUS_LABEL: Record<string, string> = {
  pendente: "Aguardando o próximo ciclo",
  aplicado: "Aplicado agora",
  consumido: "Já utilizado",
  expirado: "Expirado",
  cancelado: "Cancelado",
};

export const BENEFICIO_ORIGEM_LABEL: Record<string, string> = {
  cupom: "Cupom",
  indicacao: "Indicação",
  presente: "Presente da equipe",
};

export const INDICACAO_STATUS_LABEL: Record<string, string> = {
  convidado: "Convidado",
  cadastro_incompleto: "Cadastro incompleto",
  cadastro_completo: "Cadastro completo",
  assinou: "Assinou um plano",
};

export function descreverBeneficio(b: Pick<Beneficio, "tipo" | "valor" | "ciclos_total">): string {
  const ciclos = b.ciclos_total > 1 ? ` por ${b.ciclos_total} ciclos` : "";
  if (b.tipo === "percentual") return `${Number(b.valor)}% de desconto${ciclos}`;
  if (b.tipo === "valor") return `R$ ${Number(b.valor).toFixed(2).replace(".", ",")} de desconto${ciclos}`;
  const m = Math.max(1, Number(b.valor) || 1);
  return `${m} ${m === 1 ? "mês grátis" : "meses grátis"}`;
}

/** Preço final considerando os benefícios pendentes (teto de 100% em um único ciclo). */
export function precoComBeneficios(valorCheio: number, beneficios: Pick<Beneficio, "tipo" | "valor">[]) {
  let pct = 0;
  let fixo = 0;
  let mesGratis = false;
  for (const b of beneficios) {
    if (b.tipo === "percentual") pct += Number(b.valor) || 0;
    else if (b.tipo === "valor") fixo += Number(b.valor) || 0;
    else if (b.tipo === "meses_gratis") mesGratis = true;
  }
  const pctAplicado = Math.min(pct, 100); // teto de 100% num único ciclo
  const excedente = Math.max(0, pct - 100);
  let valor = valorCheio * (1 - pctAplicado / 100) - fixo;
  if (mesGratis) valor = 0;
  valor = Math.max(0, Math.round(valor * 100) / 100);
  return { valor, pctAplicado, excedentePct: excedente, mesGratis };
}

export async function listarBeneficios(supplierId: string): Promise<Beneficio[]> {
  const { data } = await (supabase
    .from("supplier_credits" as any)
    .select("*")
    .eq("supplier_id", supplierId)
    .order("created_at", { ascending: false }) as any);
  return ((data as any[]) ?? []).map((b) => ({ ...b, valor: Number(b.valor) })) as Beneficio[];
}

export async function beneficiosPendentes(supplierId: string): Promise<Beneficio[]> {
  const todos = await listarBeneficios(supplierId);
  return todos.filter((b) => b.status === "pendente" || (b.status === "aplicado" && b.ciclos_restantes > 0));
}

export async function resgatarCupom(supplierId: string, codigo: string, planId?: string | null) {
  const { data, error } = await (supabase.rpc as any)("resgatar_cupom", {
    _supplier_id: supplierId,
    _codigo: codigo,
    _plan_id: planId ?? null,
  });
  if (error) return { ok: false as const, erro: error.message };
  const r = data as { ok: boolean; erro?: string; tipo?: BeneficioTipo; valor?: number; ciclos?: number };
  if (!r?.ok) return { ok: false as const, erro: r?.erro ?? "Cupom inválido." };
  return { ok: true as const, tipo: r.tipo!, valor: Number(r.valor), ciclos: Number(r.ciclos ?? 1) };
}

// ---------------------------------------------------------------- CUPONS (admin)

export async function listarCupons(): Promise<Cupom[]> {
  const { data } = await (supabase
    .from("coupons" as any)
    .select("*")
    .order("created_at", { ascending: false }) as any);
  return ((data as any[]) ?? []).map((c) => ({
    ...c,
    valor: Number(c.valor),
    planos_elegiveis: c.planos_elegiveis ?? [],
  })) as Cupom[];
}

export async function salvarCupom(c: Partial<Cupom> & { codigo: string }) {
  const payload: any = {
    codigo: c.codigo.trim().toUpperCase(),
    descricao: c.descricao ?? null,
    tipo: c.tipo ?? "percentual",
    valor: Number(c.valor ?? 0),
    ciclos: Math.max(1, Number(c.ciclos ?? 1)),
    valido_de: c.valido_de || null,
    valido_ate: c.valido_ate || null,
    max_usos: c.max_usos != null && Number(c.max_usos) > 0 ? Number(c.max_usos) : null,
    max_usos_por_fornecedor: Math.max(1, Number(c.max_usos_por_fornecedor ?? 1)),
    planos_elegiveis: c.planos_elegiveis ?? [],
    ativo: c.ativo ?? true,
  };
  if (c.id) {
    const { error } = await (supabase.from("coupons" as any) as any).update(payload).eq("id", c.id);
    return error?.message ?? null;
  }
  const { error } = await (supabase.from("coupons" as any) as any).insert(payload);
  return error?.message ?? null;
}

export async function excluirCupom(id: string) {
  const { error } = await (supabase.from("coupons" as any) as any).delete().eq("id", id);
  return error?.message ?? null;
}

export async function concederBeneficioAdmin(opts: {
  supplierId: string;
  tipo: BeneficioTipo;
  valor: number;
  ciclos: number;
  motivo: string;
}) {
  const { error } = await (supabase.rpc as any)("admin_conceder_beneficio", {
    _supplier_id: opts.supplierId,
    _tipo: opts.tipo,
    _valor: opts.valor,
    _ciclos: opts.ciclos,
    _motivo: opts.motivo,
  });
  return error?.message ?? null;
}

// ---------------------------------------------------------------- INDICAÇÃO ENTRE FORNECEDORES

const REF_KEY = "casamenteiro_ref_fornecedor";
const REF_TTL = 60 * 24 * 60 * 60 * 1000; // 60 dias

export function guardarIndicacaoFornecedor(codigo: string) {
  try {
    localStorage.setItem(REF_KEY, JSON.stringify({ codigo: codigo.toUpperCase(), ts: Date.now() }));
  } catch {
    /* ignora */
  }
}

export function lerIndicacaoFornecedor(): string | null {
  try {
    const raw = localStorage.getItem(REF_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as { codigo: string; ts: number };
    if (Date.now() - p.ts > REF_TTL) {
      localStorage.removeItem(REF_KEY);
      return null;
    }
    return p.codigo;
  } catch {
    return null;
  }
}

export function limparIndicacaoFornecedor() {
  try {
    localStorage.removeItem(REF_KEY);
  } catch {
    /* ignora */
  }
}

/** Link de indicação — sempre no domínio próprio. */
export function linkIndicacaoFornecedor(codigo: string) {
  return `${publicBaseUrl()}/indica-fornecedor/${codigo}`;
}

export async function registrarCliqueIndicacaoFornecedor(codigo: string) {
  await (supabase.rpc as any)("registrar_clique_indicacao_fornecedor", { _codigo: codigo });
}

export type MinhaIndicacao = {
  id: string;
  codigo: string;
  cliques: number;
  ativo: boolean;
};

export async function meuCodigoIndicacao(supplierId: string): Promise<MinhaIndicacao | null> {
  const { data } = await (supabase.rpc as any)("get_or_create_supplier_referral", { _supplier_id: supplierId });
  const row = Array.isArray(data) ? data[0] : data;
  return (row as MinhaIndicacao) ?? null;
}

export type IndicadoRow = {
  id: string;
  indicado_nome: string | null;
  status: string;
  bonus_cadastro_credit_id: string | null;
  bonus_assinatura_credit_id: string | null;
  created_at: string;
};

export async function listarIndicados(referralId: string): Promise<IndicadoRow[]> {
  const { data } = await (supabase
    .from("supplier_referral_events" as any)
    .select("id, indicado_nome, status, bonus_cadastro_credit_id, bonus_assinatura_credit_id, created_at")
    .eq("referral_id", referralId)
    .order("created_at", { ascending: false }) as any);
  return ((data as any[]) ?? []) as IndicadoRow[];
}

/**
 * Registra (uma vez) que o fornecedor logado veio de uma indicação.
 * Chamado no painel do fornecedor; a função no banco decide o status e o bônus.
 */
export async function registrarMinhaIndicacaoSeHouver() {
  const codigo = lerIndicacaoFornecedor();
  if (!codigo) return;
  const { data, error } = await (supabase.rpc as any)("registrar_minha_indicacao_fornecedor", { _codigo: codigo });
  const r = data as { ok?: boolean; status?: string } | null;
  if (error) return;
  // Só limpa quando o cadastro já está completo (para poder evoluir o status depois).
  if (r?.ok && r.status === "cadastro_completo") limparIndicacaoFornecedor();
}
