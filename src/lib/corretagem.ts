import { supabase } from "@/integrations/supabase/client";
import { calcularTaxa } from "@/lib/platformPricing";

export type OfertaCorretagem = {
  piso: number;
  markupPct: number;
  valorOfertado: number;
  comissao: number;
  memoria: Record<string, unknown>;
};

/**
 * Motor de preço da corretagem.
 * - Se `markupPct` for informado, usa direto.
 * - Caso contrário, resolve o percentual em `platform_prices` (chave `corretagem_data_ociosa`),
 *   respeitando overrides por categoria de fornecedor.
 */
export async function calcularOferta(opts: {
  piso: number;
  categoriaSlug?: string | null;
  markupPct?: number | null;
}): Promise<OfertaCorretagem> {
  const piso = Number(opts.piso) || 0;
  let markupPct = opts.markupPct != null ? Number(opts.markupPct) : NaN;
  let memoria: Record<string, unknown> = { origem: "input" };

  if (!Number.isFinite(markupPct)) {
    // resolve via platform_prices sobre o piso
    const res = await calcularTaxa("corretagem_data_ociosa", {
      categoriaSlug: opts.categoriaSlug ?? null,
      valorBase: piso,
    });
    // res.valor é o valor calculado (percentual sobre piso). Derivamos o pct efetivo.
    const valor = Number(res.valor) || 0;
    markupPct = piso > 0 ? (valor / piso) * 100 : 0;
    memoria = { origem: "platform_prices", raw: res.memoria };
  }

  const { data } = await (supabase.rpc as any)("calc_oferta_corretagem", {
    _piso: piso,
    _markup_pct: markupPct,
  });
  const parsed = (data ?? {}) as Record<string, number>;
  return {
    piso,
    markupPct: Number(parsed.markup_pct ?? markupPct) || 0,
    valorOfertado: Number(parsed.valor_ofertado ?? 0),
    comissao: Number(parsed.comissao ?? 0),
    memoria,
  };
}

export const CORRETAGEM_FLAG = "corretagem_datas_ociosas";

export const CORRETAGEM_STATUS_LEDGER: Record<string, string> = {
  pendente: "Aguardando pagamento",
  pago: "Pago",
  estornado: "Estornado",
  cancelado: "Cancelado",
};