import { supabase } from "@/integrations/supabase/client";

export type PriceCategoria = "reservas" | "assinaturas" | "destaques" | "outros";
export type PriceModo = "fixo" | "percentual" | "hibrido";

export type PlatformPrice = {
  id: string;
  chave: string;
  categoria: PriceCategoria | string;
  label: string;
  descricao: string | null;
  modo: PriceModo;
  valor_fixo: number;
  percentual: number;
  valor_min: number | null;
  valor_max: number | null;
  moeda: string;
  ativo: boolean;
  overrides: Record<string, Partial<Pick<PlatformPrice, "modo" | "valor_fixo" | "percentual" | "valor_min" | "valor_max">>>;
  updated_at: string;
};

export type CalcTaxaResultado = {
  valor: number;
  memoria: Record<string, unknown>;
};

export async function calcularTaxa(
  chave: string,
  opts: { categoriaSlug?: string | null; valorBase?: number | null } = {}
): Promise<CalcTaxaResultado> {
  const { data, error } = await (supabase.rpc as any)("calc_platform_fee", {
    _chave: chave,
    _categoria_slug: opts.categoriaSlug ?? null,
    _valor_base: opts.valorBase ?? null,
  });
  if (error || !data) return { valor: 0, memoria: { erro: error?.message ?? "sem_retorno" } };
  return data as CalcTaxaResultado;
}

export function formatBRL(v: number | null | undefined): string {
  const n = Number(v ?? 0);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export const CATEGORIAS_PRECO: { key: PriceCategoria; label: string }[] = [
  { key: "reservas", label: "Reservas" },
  { key: "assinaturas", label: "Assinaturas" },
  { key: "destaques", label: "Destaques" },
  { key: "outros", label: "Outros" },
];

export const MODO_LABEL: Record<PriceModo, string> = {
  fixo: "Valor fixo",
  percentual: "Percentual",
  hibrido: "Fixo + percentual",
};