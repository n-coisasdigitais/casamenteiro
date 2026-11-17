import { supabase } from "@/integrations/supabase/client";
import { carregarDadosFornecedor } from "@/lib/fornecedorLanding";
import { mesclarConteudo, type ConteudoAjuda, type FaqItem, type ValoresAjuda } from "@/lib/ajudaTexto";

export type DadosAjuda = {
  itens: FaqItem[];
  conteudo: ConteudoAjuda;
  valores: ValoresAjuda;
  planos: { slug: string; nome: string; descricao: string | null; preco_mensal: number; preco_anual: number; beneficios: string[]; destaque_busca: boolean }[];
  suporteEmail: string | null;
};

export async function carregarConteudoAjuda(): Promise<ConteudoAjuda> {
  const { data } = await (supabase.from("system_settings" as any) as any).select("value").eq("key", "ajuda_conteudo").maybeSingle();
  return mesclarConteudo(data?.value);
}

export async function carregarAjuda(): Promise<DadosAjuda> {
  const [faq, conteudo, forn, sup] = await Promise.all([
    (supabase.from("faq_itens" as any) as any).select("*").eq("ativo", true).order("ordem"),
    carregarConteudoAjuda(),
    carregarDadosFornecedor(),
    (supabase.from("system_settings" as any) as any).select("value").eq("key", "suporte_email").maybeSingle(),
  ]);
  return {
    itens: (faq.data as FaqItem[]) ?? [],
    conteudo,
    planos: forn.planos,
    valores: {
      taxaReserva: forn.taxaReserva,
      carenciaDias: forn.carenciaDias,
      testeDias: forn.testeDias,
      aprovacaoHoras: forn.aprovacaoHoras,
      planos: forn.planos,
    },
    suporteEmail: sup.data?.value?.email ?? null,
  };
}
