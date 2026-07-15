import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type FeatureFlagKey =
  | "simulador"
  | "explorar"
  | "categorias_publicas"
  | "datas_ociosas"
  | "painel_casal"
  | "pedido_orcamento"
  | "rsvp_convidados"
  | "painel_fornecedor"
  | "avaliacao_casal_fornecedor"
  | "casais_feed"
  | "perfil_social_casal"
  | "mensagens_casais"
  | "indicacoes"
  | "avaliacao_bidirecional";

// Defaults espelham o seed da migration — evita flicker enquanto carrega.
export const FEATURE_FLAG_DEFAULTS: Record<string, boolean> = {
  simulador: true,
  explorar: true,
  categorias_publicas: true,
  datas_ociosas: true,
  painel_casal: true,
  pedido_orcamento: true,
  rsvp_convidados: true,
  painel_fornecedor: true,
  avaliacao_casal_fornecedor: true,
  casais_feed: false,
  perfil_social_casal: false,
  mensagens_casais: false,
  indicacoes: false,
  avaliacao_bidirecional: false,
};

type Ctx = {
  flags: Record<string, boolean>;
  loading: boolean;
  reload: () => Promise<void>;
};

const FeatureFlagsContext = createContext<Ctx>({
  flags: FEATURE_FLAG_DEFAULTS,
  loading: true,
  reload: async () => {},
});

export function FeatureFlagsProvider({ children }: { children: ReactNode }) {
  const [flags, setFlags] = useState<Record<string, boolean>>(FEATURE_FLAG_DEFAULTS);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await (supabase.from("feature_flags" as any).select("key, enabled") as any);
    if (data && Array.isArray(data)) {
      const next = { ...FEATURE_FLAG_DEFAULTS };
      (data as any[]).forEach((row) => {
        next[row.key] = !!row.enabled;
      });
      setFlags(next);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <FeatureFlagsContext.Provider value={{ flags, loading, reload: load }}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

export function useFeatureFlags() {
  return useContext(FeatureFlagsContext).flags;
}

export function useFeatureFlag(key: string, defaultValue = true): boolean {
  const { flags } = useContext(FeatureFlagsContext);
  if (key in flags) return flags[key];
  return key in FEATURE_FLAG_DEFAULTS ? FEATURE_FLAG_DEFAULTS[key] : defaultValue;
}

export function useReloadFeatureFlags() {
  return useContext(FeatureFlagsContext).reload;
}