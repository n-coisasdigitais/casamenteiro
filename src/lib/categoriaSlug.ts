/**
 * Links antigos (tarefas salvas no banco, simulador, plano) usam nomes de categoria
 * que não batem com o slug atual. Este mapa traduz para o slug certo.
 */
const ALIASES: Record<string, string> = {
  musica: "musica-dj",
  dj: "musica-dj",
  banda: "musica-dj",
  beleza: "beleza-maquiagem",
  maquiagem: "beleza-maquiagem",
  recepcao: "espaco",
  local: "espaco",
  bolo: "bolos-doces",
  doces: "bolos-doces",
  confeitaria: "bolos-doces",
  vestido: "vestido-noiva",
  traje: "traje-noivo",
  foto: "fotografia",
  filmagem: "video",
  cerimonial: "cerimonialista",
};

/** Devolve o slug existente para o nome pedido, ou null se não houver categoria. */
export function resolverCategoriaSlug(pedido: string, categorias: { slug: string }[]): string | null {
  const s = (pedido || "").trim().toLowerCase();
  if (!s) return null;
  if (categorias.some((c) => c.slug === s)) return s;
  const alias = ALIASES[s];
  if (alias && categorias.some((c) => c.slug === alias)) return alias;
  const parcial = categorias.find((c) => c.slug.startsWith(s) || s.startsWith(c.slug));
  return parcial ? parcial.slug : null;
}
