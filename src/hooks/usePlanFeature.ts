import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { PlanFeatureKey, PlanLimites, PlanRecursos } from "@/lib/planFeatures";
import { temRecurso } from "@/lib/planFeatures";

export type AccessState = "trial" | "assinante" | "bloqueado";

export type PlanoAtivo = {
  planId: string | null;
  nome: string | null; // nome do plano assinado (se houver), independente do trial
  recursos: PlanRecursos;
  limites: PlanLimites;
  ativo: boolean; // tem acesso premium agora (trial OU assinatura)
  estado: AccessState; // trial | assinante | bloqueado
  trialEndsAt: string | null;
  emTrial: boolean; // está dentro do trial?
  temAssinatura: boolean; // tem assinatura vigente por baixo?
  periodEnd: string | null;
  cancelada: boolean;
  cobrancaComecaEm: string | null; // quando a 1ª cobrança começa (fim do trial, se assinou no trial)
};

/**
 * Estado de acesso do fornecedor. Trial e assinatura são INDEPENDENTES e podem coexistir:
 * - Em trial + assinou: acesso total, selo do plano aparece, cobrança começa no fim do trial.
 * - Em trial sem assinar: acesso total, sem selo de plano.
 * - Fora do trial + assina vigente: recursos do plano.
 * - Fora do trial sem assinatura: bloqueado (blur).
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
      const { data: sup } = await (supabase
        .from("suppliers" as any)
        .select("trial_ends_at")
        .eq("id", supplierId)
        .maybeSingle() as any);
      const trialEndsAt: string | null = sup?.trial_ends_at ?? null;
      const emTrial = !!trialEndsAt && new Date(trialEndsAt) > new Date();

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
      const temAssinatura = !!assinaturaVigente;

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

      // Estado principal: trial tem prioridade de EXIBIÇÃO, mas a assinatura coexiste.
      const estado: AccessState = emTrial ? "trial" : temAssinatura ? "assinante" : "bloqueado";

      // Se assinou durante o trial, a cobrança começa no fim do trial.
      const cobrancaComecaEm = emTrial && temAssinatura ? trialEndsAt : null;

      if (!cancelado) {
        setPlano({
          planId: sub?.plan_id ?? null,
          nome, // selo do plano aparece mesmo em trial
          recursos,
          limites,
          ativo: emTrial || temAssinatura,
          estado,
          trialEndsAt,
          emTrial,
          temAssinatura,
          periodEnd,
          cancelada: !!cancelada,
          cobrancaComecaEm,
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
 * Durante o TRIAL, tudo é liberado. Depois, depende do plano assinado.
 */
export function usePlanFeature(supplierId: string | null | undefined, key: PlanFeatureKey) {
  const { plano, carregando } = useSupplierPlan(supplierId);
  const liberado = plano?.emTrial ? true : temRecurso(plano?.recursos, key);
  return { liberado, carregando, plano, estado: plano?.estado ?? "bloqueado" };
}
