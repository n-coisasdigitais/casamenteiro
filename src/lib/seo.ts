/**
 * Helpers de SEO compartilhados entre páginas.
 */

export const SITE_URL = "https://www.casamenteiro.com.br";

export function absoluteUrl(path: string = "/"): string {
  if (!path) return SITE_URL + "/";
  if (/^https?:\/\//i.test(path)) return path;
  return SITE_URL + (path.startsWith("/") ? path : "/" + path);
}

export function truncate(text: string | null | undefined, max = 155): string {
  const s = (text || "").replace(/\s+/g, " ").trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 80 ? cut.slice(0, lastSpace) : cut).trimEnd() + "…";
}

export type BreadcrumbItem = { name: string; path: string };

export function breadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: absoluteUrl(it.path),
    })),
  };
}

export function itemListJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: absoluteUrl(it.path),
      name: it.name,
    })),
  };
}

export function priceRangeLabel(min?: number | null, max?: number | null): string | undefined {
  const v = max ?? min;
  if (!v) return undefined;
  if (v < 2000) return "$";
  if (v < 8000) return "$$";
  if (v < 20000) return "$$$";
  return "$$$$";
}