import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { PlanFeatureKey, PlanLimites, PlanRecursos } from "@/lib/planFeatures";
import { temRecurso } from "@/lib/planFeatures";

export type PlanoAtivo = {
  planId: string | null;
  nome: string | null;
  recursos: PlanRecursos;
  limites: PlanLimites;
  ativo: boolean;
};

/** Carrega o plano ativo do fornecedor e os recursos liberados pelo admin. */
export function useSupplierPlan(supplierId: string | null | undefined) {
  const [plano, setPlano] = useState<PlanoAtivo | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let cancelado = false;
    if (!supplierId) { setCarregando(false); return; }
    (async () => {
      const { data: sub } = await (supabase.from("supplier_subscriptions" as any)
        .select("plan_id, status")
        .eq("supplier_id", supplierId)
        .eq("status", "ativa")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle() as any);
      let recursos: PlanRecursos = {};
      let limites: PlanLimites = {};
      let nome: string | null = null;
      if (sub?.plan_id) {
        const { data: p } = await (supabase.from("subscription_plans" as any)
          .select("nome, recursos, limites")
          .eq("id", sub.plan_id)
          .maybeSingle() as any);
        recursos = (p?.recursos as PlanRecursos) ?? {};
        limites = (p?.limites as PlanLimites) ?? {};
        nome = p?.nome ?? null;
      }
      if (!cancelado) {
        setPlano({ planId: sub?.plan_id ?? null, nome, recursos, limites, ativo: !!sub });
        setCarregando(false);
      }
    })();
    return () => { cancelado = true; };
  }, [supplierId]);

  return { plano, carregando };
}

export function usePlanFeature(supplierId: string | null | undefined, key: PlanFeatureKey) {
  const { plano, carregando } = useSupplierPlan(supplierId);
  return { liberado: temRecurso(plano?.recursos, key), carregando, plano };
}
