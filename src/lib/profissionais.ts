/** Busca de profissionais de eventos (página pública /profissionais e painel do fornecedor). */
import { supabase } from "@/integrations/supabase/client";
import { separarCidadeUf } from "@/lib/atendimento";

export type ProfissionalPublico = {
  id: string;
  nome: string;
  slug: string | null;
  foto_url: string | null;
  funcoes: string[] | null;
  cidade: string | null;
  estado: string | null;
  raio_km: number | null;
  bio: string | null;
  rating: number | null;
  review_count: number | null;
  eventos_concluidos: number | null;
  eventos_aceitos: number | null;
  verificacao_status: string | null;
  /** Só vem preenchido para fornecedor logado ou admin. */
  valor_min_turno: number | null;
  distancia_km: number | null;
};

export type FiltrosProfissionais = {
  funcao?: string | null;
  /** "Belo Horizonte, MG" ou só "Belo Horizonte" */
  cidade?: string | null;
  verificados?: boolean;
  limite?: number;
  offset?: number;
};

export const POR_PAGINA = 24;

export async function buscarProfissionais(
  f: FiltrosProfissionais,
): Promise<{ itens: ProfissionalPublico[]; total: number; erro?: string }> {
  const { cidade, uf } = separarCidadeUf(f.cidade || "");
  const { data, error } = await (supabase.rpc as any)("buscar_profissionais", {
    _funcao: f.funcao || null,
    _cidade: cidade || null,
    _uf: uf,
    _verificados: !!f.verificados,
    _limite: f.limite ?? POR_PAGINA,
    _offset: f.offset ?? 0,
  });
  if (error) return { itens: [], total: 0, erro: error.message };
  const linhas = (data || []) as (ProfissionalPublico & { total: number })[];
  return { itens: linhas, total: Number(linhas[0]?.total || 0) };
}

export const ehVerificado = (p: { verificacao_status?: string | null }) => p.verificacao_status === "verificado";

export const localDe = (p: { cidade?: string | null; estado?: string | null }) =>
  [p.cidade, p.estado].filter(Boolean).join(", ");

export const primeiroNome = (nome: string) => (nome || "").trim().split(/\s+/)[0] || nome;

export const reaisTurno = (v: number | null | undefined) =>
  v ? `R$ ${Number(v).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}` : null;
