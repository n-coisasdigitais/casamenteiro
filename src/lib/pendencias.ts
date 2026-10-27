import { supabase } from "@/integrations/supabase/client";

/** Itens mínimos para o cadastro ir para aprovação. Os códigos batem com a função fornecedor_pendencias do banco. */
export const MINIMO_FOTOS = 4;
export const MINIMO_DESCRICAO = 80;

export type Pendencia = "foto_perfil" | "fotos_trabalho" | "contato" | "descricao" | "cidade" | "obrigatorios" | "categoria";

export const PENDENCIAS: { codigo: Pendencia; label: string }[] = [
  { codigo: "foto_perfil", label: "Foto de perfil" },
  { codigo: "fotos_trabalho", label: `Pelo menos ${MINIMO_FOTOS} fotos do seu trabalho` },
  { codigo: "contato", label: "WhatsApp ou telefone" },
  { codigo: "descricao", label: `Descrição com ${MINIMO_DESCRICAO} caracteres ou mais` },
  { codigo: "cidade", label: "Cidade e estado" },
  { codigo: "obrigatorios", label: "Perguntas obrigatórias da categoria" },
];

/**
 * Itens que o admin pode pedir em "Pedir ajustes". Os que têm `pendencia` são marcados
 * sozinhos no painel do fornecedor quando ele corrige; os outros dependem da revisão do admin.
 */
export const AJUSTES: { codigo: string; label: string; pendencia?: Pendencia; aba?: string }[] = [
  { codigo: "fotos_trabalho", label: `Adicionar pelo menos ${MINIMO_FOTOS} fotos do trabalho`, pendencia: "fotos_trabalho", aba: "fotos" },
  { codigo: "foto_perfil", label: "Adicionar foto de perfil", pendencia: "foto_perfil", aba: "fotos" },
  { codigo: "contato", label: "Adicionar telefone ou WhatsApp", pendencia: "contato", aba: "perfil" },
  { codigo: "descricao", label: "Escrever uma descrição mais completa", pendencia: "descricao", aba: "perfil" },
  { codigo: "obrigatorios", label: "Responder as perguntas obrigatórias", pendencia: "obrigatorios", aba: "perfil" },
  { codigo: "preco", label: "Revisar a faixa de preço", aba: "perfil" },
  { codigo: "respostas", label: "Revisar as respostas da categoria", aba: "perfil" },
  { codigo: "foto_qualidade", label: "Trocar fotos com baixa qualidade", aba: "fotos" },
];

export const labelAjuste = (codigo: string) => AJUSTES.find((a) => a.codigo === codigo)?.label || codigo;

export async function buscarPendencias(supplierId: string): Promise<Pendencia[]> {
  const { data, error } = await (supabase.rpc as any)("fornecedor_pendencias", { _supplier_id: supplierId });
  if (error) return [];
  return ((data as string[]) || []) as Pendencia[];
}

/** Mensagem amigável para o erro que o banco devolve quando o cadastro está incompleto. */
export function mensagemCadastroIncompleto(err: any): string | null {
  const msg = String(err?.message || err || "");
  const m = msg.match(/Cadastro incompleto: (.*)$/);
  if (!m) return null;
  const itens = m[1].split(",").map((s) => s.trim());
  const nomes = itens.map((c) => PENDENCIAS.find((p) => p.codigo === c)?.label || c);
  return `Ainda falta: ${nomes.join("; ")}.`;
}
