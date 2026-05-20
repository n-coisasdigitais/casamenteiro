// Runs before `vite dev` and `vite build` (predev/prebuild hooks); writes public/sitemap.xml.

import { writeFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = "https://www.casamenteiro.com.br";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

const staticEntries: SitemapEntry[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/explorar", changefreq: "daily", priority: "0.9" },
  { path: "/buscar", changefreq: "daily", priority: "0.8" },
  { path: "/fornecedor", changefreq: "weekly", priority: "0.7" },
  { path: "/simulador", changefreq: "monthly", priority: "0.6" },
  { path: "/termos", changefreq: "yearly", priority: "0.3" },
  { path: "/privacidade", changefreq: "yearly", priority: "0.3" },
];

async function loadDynamic(): Promise<SitemapEntry[]> {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    console.warn("[sitemap] VITE_SUPABASE_URL/KEY ausentes — pulando rotas dinâmicas.");
    return [];
  }
  const sb = createClient(url, key);
  const out: SitemapEntry[] = [];

  const { data: cats } = await sb.from("categories").select("slug").order("name");
  (cats || []).forEach((c: any) => {
    if (c.slug) out.push({ path: `/buscar?cat=${encodeURIComponent(c.slug)}`, changefreq: "weekly", priority: "0.7" });
  });

  const { data: sups } = await sb
    .from("suppliers")
    .select("id, updated_at")
    .eq("status", "approved");
  (sups || []).forEach((s: any) => {
    out.push({
      path: `/fornecedor/${s.id}`,
      lastmod: s.updated_at ? new Date(s.updated_at).toISOString().slice(0, 10) : undefined,
      changefreq: "weekly",
      priority: "0.8",
    });
  });

  return out;
}

function generateSitemap(entries: SitemapEntry[]) {
  const urls = entries.map((e) =>
    [
      `  <url>`,
      `    <loc>${BASE_URL}${e.path}</loc>`,
      e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      `  </url>`,
    ]
      .filter(Boolean)
      .join("\n"),
  );
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
  ].join("\n");
}

(async () => {
  let dynamic: SitemapEntry[] = [];
  try {
    dynamic = await loadDynamic();
  } catch (e) {
    console.warn("[sitemap] falha ao carregar rotas dinâmicas:", (e as Error).message);
  }
  const all = [...staticEntries, ...dynamic];
  writeFileSync(resolve("public/sitemap.xml"), generateSitemap(all));
  console.log(`sitemap.xml escrito (${all.length} entradas)`);
})();