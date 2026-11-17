export type TipoCadastro = "couple" | "supplier" | "profissional" | "generico";

const ALIASES: Record<string, TipoCadastro> = {
  couple: "couple", casal: "couple",
  supplier: "supplier", fornecedor: "supplier",
  profissional: "profissional", staff: "profissional",
  generico: "generico",
};

/** Tipo explícito vindo de ?tipo= (aceita nomes em português), ou null. */
export function tipoDaUrl(tipo: string | null | undefined): TipoCadastro | null {
  return tipo ? ALIASES[tipo.toLowerCase()] ?? null : null;
}

/** Tipo inicial do cadastro: ?tipo= vence; senão o contexto da página; senão casal. */
export function tipoInicial(tipo: string | null | undefined, path: string): TipoCadastro {
  const t = tipoDaUrl(tipo);
  if (t) return t;
  if (path.startsWith("/fornecedor")) return "supplier";
  if (path.startsWith("/profissional")) return "profissional";
  return "couple";
}

/**
 * Deve voltar para casal porque Profissional não está disponível?
 * Só depois que os recursos terminarem de carregar — antes disso o recurso
 * aparece como desligado e a escolha do usuário seria perdida.
 */
export function deveResetarProfissional(tipo: TipoCadastro, vagasLigado: boolean, flagsCarregando: boolean) {
  return tipo === "profissional" && !flagsCarregando && !vagasLigado;
}
