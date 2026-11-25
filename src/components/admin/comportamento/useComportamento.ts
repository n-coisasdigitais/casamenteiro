import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Segmento = "todos" | "visitante" | "couple" | "supplier" | "profissional";

export type PainelComportamento = {
  kpis: Record<string, number>[];
  sessoes_resumo: {
    sessoes: number;
    duracao_mediana_s: number | null;
    paginas_por_sessao: number | null;
    pct_rejeicao: number | null;
  }[];
  diario: { dia: string; visitantes: number; sessoes: number; pageviews: number; buscas: number; orcamentos: number }[];
  paginas: {
    pagina: string;
    visualizacoes: number;
    visitantes: number;
    tempo_medio_s: number | null;
    pct_saida: number | null;
  }[];
  caminhos: { de: string; para: string; vezes: number }[];
  buscas: { cidade: string; procura: string; buscas: number; sem_resultado: number; media_resultados: number | null }[];
  sessoes_recentes: {
    session_id: string;
    distinct_id: string;
    tipo_conta: string;
    inicio: string;
    duracao_s: number;
    paginas: number;
    entrada: string;
    saida: string;
    buscas: number;
    orcamentos: number;
    whatsapp: number;
    rage_clicks: number;
    dispositivo: string | null;
    cidade: string | null;
  }[];
  erros: string[];
  replay_base: string;
  gerado_em: string;
};

async function chamar<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("admin-analytics", { body });
  if (error) {
    let msg = error.message;
    try {
      const ctx = (error as any).context;
      if (ctx?.json) msg = (await ctx.json())?.error ?? msg;
    } catch {
      /* mantém a mensagem */
    }
    throw new Error(msg);
  }
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as T;
}

export function useComportamento(dias: number, segmento: Segmento) {
  const [dados, setDados] = useState<PainelComportamento | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      setDados(await chamar<PainelComportamento>({ acao: "painel", dias, segmento }));
    } catch (e) {
      const m = (e as Error).message || "Erro ao ler o PostHog";
      setErro(
        /Failed to send|not found|404/i.test(m)
          ? "A função admin-analytics ainda não foi publicada no Supabase (passo 3 do guia)."
          : m,
      );
    }
    setCarregando(false);
  }, [dias, segmento]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return { dados, erro, carregando, recarregar };
}

export type TipoHeatmap = "click" | "rageclick" | "scrolldepth";

export type RespostaHeatmap = {
  pontos: Array<{
    count?: number;
    pointer_y?: number;
    pointer_relative_x?: number;
    pointer_target_fixed?: boolean;
    scroll_depth_bucket?: number;
    bucket_count?: number;
    cumulative_count?: number;
  }>;
  dobra: unknown;
  mais: boolean;
};

export function buscarHeatmap(p: {
  tipo: TipoHeatmap;
  url: string;
  dias: number;
  largura_min?: number;
  largura_max?: number;
}) {
  return chamar<RespostaHeatmap>({ acao: "heatmap", ...p });
}
