import { supabase } from "@/integrations/supabase/client";
import { buildWhatsAppLink } from "@/lib/phone";

export const FUNCOES_STAFF = [
  "Garçom",
  "Garçonete",
  "Copeiro",
  "Barman",
  "Cozinheiro(a)",
  "Auxiliar de cozinha",
  "Recepcionista",
  "Segurança",
  "Manobrista",
  "Chapeleiro(a)",
  "Iluminador(a)",
  "Operador(a) de som",
  "Roadie",
  "Auxiliar de palco",
  "Assistente de decoração",
  "Assistente de foto/vídeo",
  "Cerimonialista assistente",
  "Limpeza pós-evento",
];

export function jobStatusLabel(s: string) {
  return { aberta: "Aberta", preenchida: "Preenchida", concluida: "Concluída", cancelada: "Cancelada" }[s] || s;
}

export function appStatusLabel(s: string) {
  return {
    convidado: "Convite enviado",
    candidato: "Candidatura recebida",
    aceito: "Aceito",
    recusado: "Recusado",
    expirado: "Expirado",
    concluido: "Concluído",
    no_show: "Não compareceu",
  }[s] || s;
}

export function maskPhone(v?: string | null) {
  if (!v) return "•••• ••••";
  const d = v.replace(/\D/g, "");
  if (d.length < 4) return "•••• ••••";
  return `(${d.slice(0,2)}) •••••-${d.slice(-2)}`;
}

export function slugify(s: string) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function fetchStaffContact(jobId: string, staffId: string) {
  const { data, error } = await (supabase.rpc as any)("get_staff_contact", { _job_id: jobId, _staff_id: staffId });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return { telefone: row?.telefone as string | null, email: row?.email as string | null };
}

export function buildJobWhatsAppLink(phone: string, params: {
  funcao: string; data: string; horaInicio?: string | null; horaFim?: string | null;
  local?: string | null; valor?: number | null; empresa?: string;
}) {
  const linhas = [
    `Olá! Sou da ${params.empresa || "equipe"} e estamos com a vaga confirmada:`,
    `• Função: ${params.funcao}`,
    `• Data: ${new Date(params.data + "T00:00:00").toLocaleDateString("pt-BR")}`,
  ];
  if (params.horaInicio) linhas.push(`• Horário: ${params.horaInicio}${params.horaFim ? " às " + params.horaFim : ""}`);
  if (params.local) linhas.push(`• Local: ${params.local}`);
  if (params.valor) linhas.push(`• Valor combinado: R$ ${Number(params.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);
  linhas.push("", "O pagamento é combinado diretamente entre nós; a plataforma apenas registra o valor.");
  return buildWhatsAppLink(phone, linhas.join("\n"));
}