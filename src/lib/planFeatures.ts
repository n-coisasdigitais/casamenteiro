/** Catálogo de recursos que o admin pode liberar por plano. */
export type PlanFeatureKey =
  | "destaque_busca"
  | "orcamentos_ilimitados"
  | "crm_leads"
  | "arquivos"
  | "agenda_sync"
  | "reservas_datas_ociosas"
  | "vagas_equipe"
  | "relatorios";

export type PlanLimitKey = "max_fotos" | "max_orcamentos_mes" | "max_destaques_mes";

export const PLAN_FEATURES: { key: PlanFeatureKey; label: string; descricao: string }[] = [
  { key: "destaque_busca", label: "Prioridade na busca", descricao: "Perfil aparece acima dos demais nos resultados." },
  { key: "orcamentos_ilimitados", label: "Orçamentos ilimitados", descricao: "Sem limite mensal de pedidos recebidos." },
  { key: "crm_leads", label: "CRM de leads", descricao: "Funil de leads com histórico e anotações." },
  { key: "arquivos", label: "Arquivos e contratos", descricao: "Envio de anexos e materiais para os casais." },
  { key: "agenda_sync", label: "Sincronização de agenda", descricao: "Integração com Google/Outlook Calendar." },
  { key: "reservas_datas_ociosas", label: "Reservas de datas ociosas", descricao: "Receber solicitações de datas promocionais." },
  { key: "vagas_equipe", label: "Equipe e vagas", descricao: "Publicar vagas e gerenciar profissionais." },
  { key: "relatorios", label: "Relatórios avançados", descricao: "Métricas detalhadas de desempenho." },
];

export const PLAN_LIMITS: { key: PlanLimitKey; label: string; ajuda: string }[] = [
  { key: "max_fotos", label: "Máximo de fotos", ajuda: "0 = ilimitado" },
  { key: "max_orcamentos_mes", label: "Orçamentos por mês", ajuda: "0 = ilimitado" },
  { key: "max_destaques_mes", label: "Destaques por mês", ajuda: "0 = ilimitado" },
];

export type PlanRecursos = Partial<Record<PlanFeatureKey, boolean>>;
export type PlanLimites = Partial<Record<PlanLimitKey, number>>;

export function temRecurso(recursos: PlanRecursos | null | undefined, key: PlanFeatureKey): boolean {
  return Boolean(recursos?.[key]);
}

export function limiteDoPlano(limites: PlanLimites | null | undefined, key: PlanLimitKey): number | null {
  const v = limites?.[key];
  if (v == null || Number(v) <= 0) return null; // ilimitado
  return Number(v);
}
