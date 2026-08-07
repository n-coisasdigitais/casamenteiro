import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { PlanFeatureKey, PlanLimites, PlanRecursos } from "@/lib/planFeatures";
import { temRecurso } from "@/lib/planFeatures";

export type AccessState = "trial" | "assinante" | "bloqueado";

export type PlanoAtivo = {
  planId: string | null;
  nome: string | null;
  recursos: PlanRecursos;
  limites: PlanLimites;
  ativo: boolean;
  estado: AccessState;
  trialEndsAt: string | null;
  periodEnd: string | null;
  cancelada: boolean;
};

/**
 * Carrega o estado de acesso do fornecedor. Três estados:
 * - "trial": dentro dos 2 meses grátis -> acesso TOTAL a tudo.
 * - "assinante": assinatura ativa (ou cancelada dentro do período pago) -> recursos do plano.
 * - "bloqueado": trial expirou e sem assinatura -> tudo bloqueado (blur).
 */
export function useSupplierPlan(supplierId: string | null | undefined) {
  const [plano, setPlano] = useState<PlanoAtivo | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let cancelado = false;
    if (!supplierId) {
      setCarregando(false);
      return;
    }
    (async () => {
      // 1) trial do fornecedor
      const { data: sup } = await (supabase
        .from("suppliers" as any)
        .select("trial_ends_at")
        .eq("id", supplierId)
        .maybeSingle() as any);
      const trialEndsAt: string | null = sup?.trial_ends_at ?? null;
      const emTrial = !!trialEndsAt && new Date(trialEndsAt) > new Date();

      // 2) assinatura (ativa ou cancelada mas ainda vigente)
      const { data: sub } = await (supabase
        .from("supplier_subscriptions" as any)
        .select("plan_id, status, current_period_end, cancelada_em")
        .in("status", ["ativa", "cancelada"])
        .eq("supplier_id", supplierId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle() as any);

      const periodEnd: string | null = sub?.current_period_end ?? null;
      const cancelada = sub?.status === "cancelada";
      const assinaturaVigente =
        sub?.status === "ativa" || (sub?.status === "cancelada" && periodEnd && new Date(periodEnd) > new Date());

      let recursos: PlanRecursos = {};
      let limites: PlanLimites = {};
      let nome: string | null = null;
      if (sub?.plan_id && assinaturaVigente) {
        const { data: p } = await (supabase
          .from("subscription_plans" as any)
          .select("nome, recursos, limites")
          .eq("id", sub.plan_id)
          .maybeSingle() as any);
        recursos = (p?.recursos as PlanRecursos) ?? {};
        limites = (p?.limites as PlanLimites) ?? {};
        nome = p?.nome ?? null;
      }

      const estado: AccessState = emTrial ? "trial" : assinaturaVigente ? "assinante" : "bloqueado";

      if (!cancelado) {
        setPlano({
          planId: sub?.plan_id ?? null,
          nome: emTrial ? "Período de teste" : nome,
          recursos,
          limites,
          ativo: !!assinaturaVigente || emTrial,
          estado,
          trialEndsAt,
          periodEnd,
          cancelada: !!cancelada,
        });
        setCarregando(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [supplierId]);

  return { plano, carregando };
}

/**
 * Verifica se um recurso está liberado.
 * Durante o TRIAL, tudo é liberado. Depois, depende do plano.
 */
export function usePlanFeature(supplierId: string | null | undefined, key: PlanFeatureKey) {
  const { plano, carregando } = useSupplierPlan(supplierId);
  const liberado = plano?.estado === "trial" ? true : temRecurso(plano?.recursos, key);
  return { liberado, carregando, plano, estado: plano?.estado ?? "bloqueado" };
}
