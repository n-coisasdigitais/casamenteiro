// Slugs de categorias que representam locação de espaços de evento.
const ESPACO_SLUGS = new Set(["espaco", "espacos", "espacos-buffet", "recepcao", "local"]);

export function isEspacoCategory(slug?: string | null, name?: string | null): boolean {
  if (slug && ESPACO_SLUGS.has(slug)) return true;
  if (!name) return false;
  const n = name.toLowerCase();
  return n.includes("espaç") || n.includes("espac") || n.includes("local") || n.includes("recepç");
}