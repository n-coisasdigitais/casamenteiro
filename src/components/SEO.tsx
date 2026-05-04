import { useEffect } from "react";

type Props = {
  title: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  noIndex?: boolean;
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

/**
 * Lightweight SEO helper — sets <title>, description, OG/Twitter and canonical.
 * Use one per page near the top of the JSX tree.
 */
export default function SEO({ title, description, canonical, ogImage, noIndex }: Props) {
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
  }, [title, description, canonical, ogImage, noIndex]);

  return null;
}