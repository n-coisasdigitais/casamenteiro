import { supabase } from "@/integrations/supabase/client";
import { calcularTaxa } from "@/lib/platformPricing";

const DEFAULT_ANTECEDENCIA = 15;
const DEFAULT_CARENCIA = 7;

async function lerSetting(key: string, fallback: number): Promise<number> {
  const { data } = await (supabase.from("system_settings" as any)
    .select("value").eq("key", key).maybeSingle() as any);
  const v = (data as any)?.value;
  const n = Number(v?.dias ?? v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Antecedência mínima padrão da plataforma (dias). */
export const antecedenciaPadrao = () => lerSetting("reserva_antecedencia_min_dias", DEFAULT_ANTECEDENCIA);

/** Prazo de carência para cancelar sem custo (dias). */
export const carenciaCancelamentoDias = () => lerSetting("cancelamento_carencia_dias", DEFAULT_CARENCIA);

/** Valor atual da taxa de cancelamento configurada pelo admin. */
export async function taxaCancelamento(categoriaSlug?: string | null): Promise<number> {
  const { valor } = await calcularTaxa("cancelamento_data_ociosa", { categoriaSlug: categoriaSlug ?? null });
  return Number(valor) || 0;
}

/** Antecedência mínima configurada por um fornecedor. */
export async function antecedenciaDoFornecedor(supplierId: string): Promise<number> {
  const { data } = await (supabase.from("suppliers" as any)
    .select("reserva_antecedencia_min_dias").eq("id", supplierId).maybeSingle() as any);
  const n = Number((data as any)?.reserva_antecedencia_min_dias);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_ANTECEDENCIA;
}

/** true se a data respeita a antecedência mínima. */
export function dataDentroDaAntecedencia(promoDate: string, minDias: number): boolean {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const alvo = new Date(promoDate + "T00:00:00");
  const dias = Math.round((alvo.getTime() - hoje.getTime()) / 86400000);
  return dias >= minDias;
}

export async function cancelarReserva(reservationId: string, motivo?: string) {
  const { data, error } = await (supabase.rpc as any)("cancelar_reserva_casal", {
    _reservation_id: reservationId,
    _motivo: motivo ?? null,
  });
  if (error) return { erro: error.message, resultado: null as any };
  return { erro: null as string | null, resultado: data as { com_custo: boolean; taxa: number; carencia_dias: number } };
}