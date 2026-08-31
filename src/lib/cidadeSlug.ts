/** Utilitários de slug para as páginas de conteúdo "quanto custa casar em [cidade]". */

export function slugify(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** "São Paulo" + "SP" -> "sao-paulo-sp" */
export function cidadeSlug(cidade: string, estado?: string | null): string {
  return slugify([cidade, estado || ""].filter(Boolean).join(" "));
}

export function formatarBRL(valor: number): string {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}
