/**
 * Dados da página /fornecedor que vêm das tabelas (nada fixo no código):
 *  - planos: subscription_plans
 *  - destaques da Home: featured_packages (escopos home_*, menor preço de 30 dias, vagas)
 *  - taxa da reserva de data ociosa: platform_prices (chave reserva_data_ociosa)
 *  - carência de cancelamento, dias de teste e prazo de aprovação: system_settings
 *  - depoimentos de fornecedores: platform_reviews (autor_tipo = fornecedor)
 */
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/platformPricing";

export type PlanoPublico = {
  slug: string;
  nome: string;
  descricao: string | null;
  preco_mensal: number;
  preco_anual: number;
  beneficios: string[];
  destaque_busca: boolean;
};

export type DestaquePublico = { escopo: string; nome: string; descricao: string; valor: number; dias: number; vagas: number };

export type DepoimentoFornecedor = { id: string; nome: string; detalhe: string | null; texto: string; nota: number };

export type DadosFornecedor = {
  planos: PlanoPublico[];
  destaques: DestaquePublico[];
  taxaReserva: number | null;
  carenciaDias: number;
  testeDias: number;
  aprovacaoHoras: number;
  depoimentos: DepoimentoFornecedor[];
};

export const DADOS_PADRAO: DadosFornecedor = {
  planos: [],
  destaques: [],
  taxaReserva: null,
  carenciaDias: 7,
  testeDias: 60,
  aprovacaoHoras: 24,
  depoimentos: [],
};

const NOMES_DESTAQUE: Record<string, { nome: string; descricao: string; ordem: number }> = {
  home_hero: { nome: "Hero", descricao: "Foto em tela cheia na abertura", ordem: 1 },
  home: { nome: "Hero", descricao: "Foto em tela cheia na abertura", ordem: 1 },
  home_story: { nome: "Stories", descricao: "Story vertical com o seu nome", ordem: 2 },
  home_form: { nome: "Formulário", descricao: "Acima do simulador", ordem: 3 },
  home_categoria: { nome: "Categorias", descricao: "No bloco da sua categoria", ordem: 4 },
};

const numero = (v: any, campo: string, padrao: number) => {
  const n = Number(v?.[campo] ?? v);
  return Number.isFinite(n) && n > 0 ? n : padrao;
};

async function planos(): Promise<PlanoPublico[]> {
  const { data } = await (supabase
    .from("subscription_plans" as any)
    .select("slug, nome, descricao, preco_mensal, preco_anual, beneficios, destaque_busca, ordem")
    .eq("ativo", true)
    .order("ordem") as any);
  return ((data as any[]) ?? []).map((p) => ({
    slug: p.slug,
    nome: p.nome,
    descricao: p.descricao,
    preco_mensal: Number(p.preco_mensal) || 0,
    preco_anual: Number(p.preco_anual) || 0,
    beneficios: Array.isArray(p.beneficios) ? p.beneficios.map(String) : [],
    destaque_busca: !!p.destaque_busca,
  }));
}

async function destaques(): Promise<DestaquePublico[]> {
  let res: any = await (supabase.from("featured_packages" as any) as any)
    .select("escopo, dias, valor, max_vagas, exclusivo")
    .eq("ativo", true)
    .in("escopo", ["home_hero", "home_story", "home_form", "home_categoria"]);
  if (res.error) return [];
  const melhor: Record<string, DestaquePublico> = {};
  ((res.data as any[]) ?? [])
    .filter((p) => !p.exclusivo)
    .forEach((p) => {
      const info = NOMES_DESTAQUE[p.escopo];
      if (!info) return;
      const atual = melhor[p.escopo];
      // mostra o pacote de 30 dias; se não houver, o mais longo
      const melhorQue = !atual || (Number(p.dias) === 30 && atual.dias !== 30) || (atual.dias !== 30 && Number(p.dias) > atual.dias);
      if (melhorQue)
        melhor[p.escopo] = { escopo: p.escopo, nome: info.nome, descricao: info.descricao, valor: Number(p.valor), dias: Number(p.dias), vagas: Number(p.max_vagas) || 0 };
    });
  return Object.values(melhor).sort((a, b) => NOMES_DESTAQUE[a.escopo].ordem - NOMES_DESTAQUE[b.escopo].ordem);
}

async function taxaReserva(): Promise<number | null> {
  const { data } = await (supabase.from("platform_prices" as any) as any)
    .select("valor_fixo, ativo")
    .eq("chave", "reserva_data_ociosa")
    .maybeSingle();
  if (!data || data.ativo === false) return null;
  const v = Number(data.valor_fixo);
  return Number.isFinite(v) && v > 0 ? v : null;
}

async function settings() {
  const { data } = await (supabase.from("system_settings" as any) as any)
    .select("key, value")
    .in("key", ["cancelamento_carencia_dias", "fornecedor_teste_dias", "fornecedor_aprovacao_horas"]);
  const m: Record<string, any> = {};
  ((data as any[]) ?? []).forEach((r) => (m[r.key] = r.value));
  return {
    carenciaDias: numero(m.cancelamento_carencia_dias, "dias", DADOS_PADRAO.carenciaDias),
    testeDias: numero(m.fornecedor_teste_dias, "dias", DADOS_PADRAO.testeDias),
    aprovacaoHoras: numero(m.fornecedor_aprovacao_horas, "horas", DADOS_PADRAO.aprovacaoHoras),
  };
}

async function depoimentos(): Promise<DepoimentoFornecedor[]> {
  const { data, error } = await (supabase.from("platform_reviews" as any) as any)
    .select("id, autor_nome, autor_detalhe, comentario, rating")
    .eq("aprovado", true)
    .eq("autor_tipo", "fornecedor")
    .not("comentario", "is", null)
    .order("destaque", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) return [];
  return ((data as any[]) ?? []).map((r) => ({
    id: r.id,
    nome: r.autor_nome || "Fornecedor",
    detalhe: r.autor_detalhe ?? null,
    texto: r.comentario,
    nota: Number(r.rating) || 5,
  }));
}

export async function carregarDadosFornecedor(): Promise<DadosFornecedor> {
  const [p, d, t, s, dep] = await Promise.all([
    planos().catch(() => []),
    destaques().catch(() => []),
    taxaReserva().catch(() => null),
    settings().catch(() => ({ carenciaDias: 7, testeDias: 60, aprovacaoHoras: 24 })),
    depoimentos().catch(() => []),
  ]);
  return { planos: p, destaques: d, taxaReserva: t, depoimentos: dep, ...s };
}

/** Troca {taxa_reserva} {carencia_dias} {teste_dias} {aprovacao_horas} pelos valores das tabelas. */
export function preencher(texto: string, d: DadosFornecedor): string {
  return (texto || "")
    .split("{taxa_reserva}").join(d.taxaReserva != null ? formatBRL(d.taxaReserva) : "um valor fixo")
    .split("{carencia_dias}").join(String(d.carenciaDias))
    .split("{teste_dias}").join(String(d.testeDias))
    .split("{aprovacao_horas}").join(String(d.aprovacaoHoras));
}
