export type ReservaStatus =
  | "solicitada"
  | "pre_reservada"
  | "confirmada"
  | "recusada"
  | "expirada"
  | "cancelada";

export type TaxaStatus = "pendente" | "faturada" | "paga" | "estornada";

export const RESERVA_STATUS_LABEL: Record<ReservaStatus, string> = {
  solicitada: "Solicitada",
  pre_reservada: "Aguardando pagamento",
  confirmada: "Confirmada",
  recusada: "Recusada",
  expirada: "Expirada",
  cancelada: "Cancelada",
};

export const TAXA_STATUS_LABEL: Record<TaxaStatus, string> = {
  pendente: "Pendente",
  faturada: "Faturada",
  paga: "Paga",
  estornada: "Estornada",
};

export const TAXA_CANCEL_STATUS_LABEL: Record<string, string> = {
  nao_aplicavel: "—",
  isenta: "Sem custo",
  pendente: "Pendente",
  paga: "Paga",
  cancelada: "Cancelada",
};

export function formatarDataHora(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export const RESERVA_STATUS_TONE: Record<ReservaStatus, string> = {
  solicitada: "bg-amber-100 text-amber-800",
  pre_reservada: "bg-blue-100 text-blue-800",
  confirmada: "bg-emerald-100 text-emerald-800",
  recusada: "bg-rose-100 text-rose-800",
  expirada: "bg-gray-200 text-gray-700",
  cancelada: "bg-gray-200 text-gray-700",
};

// Prazo de resposta: 24h ou 48h antes do evento (o que for menor)
export function calcularExpiraEm(promoDate: string): string {
  const agoraMais24 = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const evento = new Date(promoDate + "T00:00:00");
  const evento48Antes = new Date(evento.getTime() - 48 * 60 * 60 * 1000);
  const menor = agoraMais24 < evento48Antes ? agoraMais24 : evento48Antes;
  return menor.toISOString();
}

export function formatarData(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR");
}