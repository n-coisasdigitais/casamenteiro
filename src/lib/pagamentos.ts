import { supabase } from "@/integrations/supabase/client";

export type PagamentoTipo = "reserva" | "assinatura" | "destaque";

export type PaymentIntent = {
  id: string;
  tipo: PagamentoTipo | string;
  referencia_id: string | null;
  supplier_id: string | null;
  couple_id: string | null;
  valor: number;
  comissao: number;
  metodo: string | null;
  status: string;
  mp_payment_id: string | null;
  ambiente: "sandbox" | "live" | string;
  detalhes: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

/** Etapas simplificadas exibidas para o usuário. */
export type EtapaPagamento = "pendente" | "processando" | "concluido" | "recusado" | "expirado";

const PROCESSANDO = ["in_process", "in_mediation", "authorized", "processando", "pending_waiting_payment"];
const RECUSADO = ["rejected", "cancelled", "refunded", "charged_back", "recusado", "falha"];

export function etapaDoStatus(status: string | null | undefined): EtapaPagamento {
  const s = (status ?? "").toLowerCase();
  if (s === "pago" || s === "approved" || s === "accredited") return "concluido";
  if (s === "expirado" || s === "expired") return "expirado";
  if (RECUSADO.includes(s)) return "recusado";
  if (PROCESSANDO.includes(s) || s === "pending") return "processando";
  return "pendente";
}

export const ETAPA_LABEL: Record<EtapaPagamento, string> = {
  pendente: "Aguardando pagamento",
  processando: "Em processamento",
  concluido: "Concluído",
  recusado: "Recusado",
  expirado: "Expirado",
};

export const ETAPA_TONE: Record<EtapaPagamento, string> = {
  pendente: "bg-amber-100 text-amber-900",
  processando: "bg-blue-100 text-blue-900",
  concluido: "bg-emerald-100 text-emerald-900",
  recusado: "bg-rose-100 text-rose-900",
  expirado: "bg-gray-200 text-gray-700",
};

export const TIPO_LABEL: Record<string, string> = {
  reserva: "Reserva de data",
  assinatura: "Assinatura",
  destaque: "Destaque na busca",
};

export const AMBIENTE_LABEL: Record<string, string> = {
  sandbox: "Testes",
  live: "Produção",
};

/** Data estimada de liberação/compensação a partir do método usado. */
export function previsaoLiberacao(intent: Pick<PaymentIntent, "metodo" | "created_at" | "status">): string {
  const etapa = etapaDoStatus(intent.status);
  if (etapa === "concluido") return "Liberado";
  const base = new Date(intent.created_at);
  const horas = intent.metodo === "bricks" ? 24 : 72;
  const prev = new Date(base.getTime() + horas * 60 * 60 * 1000);
  return prev.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export async function buscarIntent(tipo: string, referenciaId: string): Promise<PaymentIntent | null> {
  const { data } = await (supabase.from("payment_intents" as any)
    .select("*")
    .eq("tipo", tipo)
    .eq("referencia_id", referenciaId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle() as any);
  return (data as PaymentIntent | null) ?? null;
}

export async function buscarIntentPorId(id: string): Promise<PaymentIntent | null> {
  const { data } = await (supabase.from("payment_intents" as any)
    .select("*").eq("id", id).maybeSingle() as any);
  return (data as PaymentIntent | null) ?? null;
}

export function formatarDataHora(v: string | null | undefined): string {
  if (!v) return "—";
  return new Date(v).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}
