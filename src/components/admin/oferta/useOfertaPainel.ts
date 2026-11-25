import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isDemoSession } from "@/lib/demoScope";
import { CONFIG_PADRAO, type PainelOferta } from "@/lib/oferta";

/** Lê o painel de oferta (RPC admin_oferta_painel). Respeita o seletor Dados reais / demo. */
export function useOfertaPainel() {
  const [dados, setDados] = useState<PainelOferta | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    const { data, error } = await (supabase.rpc as any)("admin_oferta_painel", { p_demo: isDemoSession() });
    if (error) {
      setErro(
        error.message?.includes("admin_oferta_painel")
          ? "A função admin_oferta_painel ainda não existe no banco. Rode o SQL do pacote (passo 1 do guia)."
          : error.message,
      );
      setDados(null);
    } else {
      const d = data as PainelOferta;
      setDados({
        ...d,
        config: { ...CONFIG_PADRAO, ...(d.config ?? {}), meta: { ...CONFIG_PADRAO.meta, ...(d.config?.meta ?? {}) } },
      });
    }
    setCarregando(false);
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return { dados, erro, carregando, recarregar };
}

/** Coordenadas de todas as cidades de uma UF (tabela cidades_coordenadas). */
export function useCidadesUf(uf: string) {
  const [cidades, setCidades] = useState<{ cidade: string; lat: number; lng: number }[]>([]);
  useEffect(() => {
    let vivo = true;
    (async () => {
      const todas: { cidade: string; lat: number; lng: number }[] = [];
      for (let de = 0; de < 6000; de += 1000) {
        const { data, error } = await (supabase.from("cidades_coordenadas") as any)
          .select("cidade, lat, lng")
          .eq("estado", uf)
          .range(de, de + 999);
        if (error || !data?.length) break;
        todas.push(...data);
        if (data.length < 1000) break;
      }
      if (vivo) setCidades(todas.filter((c) => c.lat != null && c.lng != null));
    })();
    return () => {
      vivo = false;
    };
  }, [uf]);
  return cidades;
}
