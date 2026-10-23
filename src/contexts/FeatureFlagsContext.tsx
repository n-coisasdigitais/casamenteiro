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
  | "avaliacao_bidirecional"
  | "vagas"
  | "reserva_datas_ociosas"
  | "tabela_precos"
  | "corretagem_datas_ociosas"
  | "crm_fornecedor"
  | "avaliacoes_plataforma"
  | "assinatura_fornecedor"
  | "destaque_pago"
  | "checkout_transparente"
  | "agenda_integracao";

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
  vagas: false,
  reserva_datas_ociosas: true,
  tabela_precos: false,
  corretagem_datas_ociosas: true,
  crm_fornecedor: true,
  avaliacoes_plataforma: false,
  assinatura_fornecedor: false,
  destaque_pago: false,
  checkout_transparente: true,
  agenda_integracao: false,
};

type Ctx = {
  flags: Record<string, boolean>;
  loading: boolean;
  reload: () => Promise<void>;
  /** key -> mostrar como "Em breve" quando desligada (padrão true) */
  emBreve: Record<string, boolean>;
};

const FeatureFlagsContext = createContext<Ctx>({
  flags: FEATURE_FLAG_DEFAULTS,
  loading: true,
  reload: async () => {},
  emBreve: {},
});

export function FeatureFlagsProvider({ children }: { children: ReactNode }) {
  const [flags, setFlags] = useState<Record<string, boolean>>(FEATURE_FLAG_DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [emBreve, setEmBreve] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    // em_breve vem da migração fornecedor_landing; se a coluna ainda não existir, cai para a consulta antiga
    let res: any = await (supabase.from("feature_flags" as any).select("key, enabled, em_breve") as any);
    if (res.error) res = await (supabase.from("feature_flags" as any).select("key, enabled") as any);
    const data = res.data;
    if (data && Array.isArray(data)) {
      const next = { ...FEATURE_FLAG_DEFAULTS };
      const eb: Record<string, boolean> = {};
      (data as any[]).forEach((row) => {
        next[row.key] = !!row.enabled;
        eb[row.key] = row.em_breve !== false;
      });
      setFlags(next);
      setEmBreve(eb);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <FeatureFlagsContext.Provider value={{ flags, loading, reload: load, emBreve }}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

export function useFeatureFlags() {
  return useContext(FeatureFlagsContext).flags;
}

export function useFeatureFlagsLoading() {
  return useContext(FeatureFlagsContext).loading;
}

export function useFeatureFlag(key: string, defaultValue = true): boolean {
  const { flags } = useContext(FeatureFlagsContext);
  if (key in flags) return flags[key];
  return key in FEATURE_FLAG_DEFAULTS ? FEATURE_FLAG_DEFAULTS[key] : defaultValue;
}

export function useReloadFeatureFlags() {
  return useContext(FeatureFlagsContext).reload;
}
export type FeatureStatus = "ativo" | "em_breve" | "oculto";

/**
 * Estado público de uma funcionalidade para páginas de divulgação:
 * ligada = "ativo"; desligada com em_breve (padrão) = "em_breve"; desligada sem em_breve = "oculto".
 * Sem chave = sempre "ativo".
 */
export function useFeatureStatus() {
  const { flags, emBreve } = useContext(FeatureFlagsContext);
  return useCallback(
    (key?: string | null): FeatureStatus => {
      if (!key) return "ativo";
      const on = key in flags ? flags[key] : (FEATURE_FLAG_DEFAULTS[key] ?? true);
      if (on) return "ativo";
      return emBreve[key] === false ? "oculto" : "em_breve";
    },
    [flags, emBreve],
  );
}
