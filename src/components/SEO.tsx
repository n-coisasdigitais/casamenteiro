import { useEffect } from "react";

type Props = {
  title: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  noIndex?: boolean;
  jsonLd?: Record<string, any> | Record<string, any>[];
};

function setMeta(attr: "name" | "property", key: string, value: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", value);
}

function setLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

const JSONLD_ID = "lovable-seo-jsonld";

function setJsonLd(data?: Record<string, any> | Record<string, any>[]) {
  const existing = document.getElementById(JSONLD_ID);
  if (existing) existing.remove();
  if (!data) return;
  const script = document.createElement("script");
  script.id = JSONLD_ID;
  script.type = "application/ld+json";
  script.text = JSON.stringify(data);
  document.head.appendChild(script);
}

/**
 * Lightweight SEO helper — sets <title>, description, OG/Twitter and canonical.
 * Use one per page near the top of the JSX tree.
 */
export default function SEO({ title, description, canonical, ogImage, noIndex, jsonLd }: Props) {
  useEffect(() => {
    document.title = title;
    if (description) {
      setMeta("name", "description", description);
      setMeta("property", "og:description", description);
      setMeta("name", "twitter:description", description);
    }
    setMeta("property", "og:title", title);
    setMeta("name", "twitter:title", title);
    if (ogImage) {
      setMeta("property", "og:image", ogImage);
      setMeta("name", "twitter:image", ogImage);
    }
    setMeta("name", "robots", noIndex ? "noindex,nofollow" : "index,follow");
    const url = canonical ?? (typeof window !== "undefined" ? window.location.href : undefined);
    if (url) setLink("canonical", url);
    setJsonLd(jsonLd);
    return () => {
      // limpa JSON-LD ao desmontar para não vazar entre rotas
      const el = document.getElementById(JSONLD_ID);
      if (el) el.remove();
    };
  }, [title, description, canonical, ogImage, noIndex, jsonLd]);

  return null;
}