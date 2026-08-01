export type PessoaConvite = { nome: string; tipo: "adult" | "child" | "baby" };

export const TIPO_PESSOA_LABEL: Record<PessoaConvite["tipo"], string> = {
  adult: "Adulto",
  child: "Criança",
  baby: "Bebê",
};

/** Aceita o formato antigo (array de strings) e o novo (array de objetos). */
export function normalizarPessoas(raw: unknown): PessoaConvite[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((p): PessoaConvite | null => {
      if (typeof p === "string") return p.trim() ? { nome: p.trim(), tipo: "adult" } : null;
      if (p && typeof p === "object") {
        const nome = String((p as any).nome ?? "").trim();
        const tipo = (p as any).tipo;
        if (!nome) return null;
        return { nome, tipo: tipo === "child" || tipo === "baby" ? tipo : "adult" };
      }
      return null;
    })
    .filter(Boolean) as PessoaConvite[];
}

export function contarPorTipo(pessoas: PessoaConvite[]) {
  return {
    adultos: pessoas.filter((p) => p.tipo === "adult").length,
    criancas: pessoas.filter((p) => p.tipo === "child").length,
    bebes: pessoas.filter((p) => p.tipo === "baby").length,
  };
}

export function resumoPessoas(pessoas: PessoaConvite[]): string {
  const { adultos, criancas, bebes } = contarPorTipo(pessoas);
  const partes: string[] = [];
  if (adultos) partes.push(`${adultos} adulto${adultos > 1 ? "s" : ""}`);
  if (criancas) partes.push(`${criancas} criança${criancas > 1 ? "s" : ""}`);
  if (bebes) partes.push(`${bebes} bebê${bebes > 1 ? "s" : ""}`);
  return partes.join(" · ");
}