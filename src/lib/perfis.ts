export type Perfis = { casal: boolean; fornecedor: boolean; profissional: boolean };
export type TipoTrabalho = "supplier" | "profissional";

export const PAINEL_POR_PERFIL: Record<TipoTrabalho, string> = {
  supplier: "/fornecedor/painel",
  profissional: "/profissional/painel",
};
export const ONBOARDING_POR_PERFIL: Record<TipoTrabalho, string> = {
  supplier: "/fornecedor/cadastro",
  profissional: "/profissional/onboarding",
};
export const NOME_PERFIL: Record<string, string> = {
  supplier: "Fornecedor",
  profissional: "Profissional",
  couple: "Casal",
  generico: "Sonhos",
};

export function possui(perfis: Perfis | null, tipo: string): boolean {
  if (!perfis) return false;
  if (tipo === "supplier") return perfis.fornecedor;
  if (tipo === "profissional") return perfis.profissional;
  if (tipo === "couple") return perfis.casal;
  return false;
}

export function contarPerfis(p: Perfis | null): number {
  return p ? [p.casal, p.fornecedor, p.profissional].filter(Boolean).length : 0;
}

/** Qual perfil de trabalho a conta ainda pode adicionar (casal nunca pode). */
export function perfilQuePodeAdicionar(p: Perfis | null, ativo?: string | null): TipoTrabalho | null {
  if (!p || p.casal || ativo === "couple" || ativo === "generico") return null;
  if (p.fornecedor && !p.profissional) return "profissional";
  if (p.profissional && !p.fornecedor) return "supplier";
  return null;
}
