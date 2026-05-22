/**
 * Validação automática rodada antes do build:
 *  - sitemap.xml existe, é XML válido, tem URLs e usa o domínio canônico
 *  - todas as rotas estáticas declaradas em src/App.tsx aparecem no sitemap
 *  - index.html tem title, description, canonical e JSON-LD válido
 *  - JSON-LD do index.html parseia e tem @context/@type
 *  - robots.txt referencia o sitemap
 *
 * Falha o build (exit 1) em problemas críticos; emite warnings (exit 0) no resto.
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const SITE_URL = "https://www.casamenteiro.com.br";

const errors: string[] = [];
const warnings: string[] = [];

function fail(msg: string) { errors.push(msg); }
function warn(msg: string) { warnings.push(msg); }

// ---------- sitemap.xml ----------
const sitemapPath = resolve("public/sitemap.xml");
let sitemapUrls: string[] = [];
if (!existsSync(sitemapPath)) {
  fail("public/sitemap.xml não existe — rode generate-sitemap antes do build.");
} else {
  const xml = readFileSync(sitemapPath, "utf-8");
  if (!xml.includes("<urlset")) fail("sitemap.xml não tem <urlset>.");
  const locMatches = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  sitemapUrls = locMatches;
  if (locMatches.length === 0) fail("sitemap.xml não tem nenhuma <loc>.");
  const wrongDomain = locMatches.filter((u) => !u.startsWith(SITE_URL));
  if (wrongDomain.length) fail(`sitemap.xml tem ${wrongDomain.length} URL(s) fora do domínio canônico (${SITE_URL}). Ex.: ${wrongDomain[0]}`);
  // tags abertas/fechadas (checagem simples)
  const open = (xml.match(/<url>/g) || []).length;
  const close = (xml.match(/<\/url>/g) || []).length;
  if (open !== close) fail(`sitemap.xml tem <url> desbalanceado (${open} vs ${close}).`);
}

// ---------- rotas vs sitemap ----------
const appTsxPath = resolve("src/App.tsx");
if (existsSync(appTsxPath)) {
  const app = readFileSync(appTsxPath, "utf-8");
  const routeMatches = [...app.matchAll(/<Route\s+path=\"([^\"]+)\"/g)].map((m) => m[1]);
  const publicStaticRoutes = routeMatches.filter((p) => {
    if (p === "*" || p.startsWith("/admin") || p.includes(":")) return false;
    const privateRoots = [
      "/dashboard", "/tarefas", "/orcamento", "/convidados", "/meus-fornecedores",
      "/favoritos", "/perfil", "/meu-plano", "/meu-casamento", "/fornecedor/painel",
      "/convite", "/simulador/resultado", "/onboarding", "/confirmado",
      "/login", "/cadastro", "/esqueci-senha", "/redefinir-senha", "/fornecedor/login", "/fornecedor/cadastro",
    ];
    return !privateRoots.some((r) => p === r || p.startsWith(r + "/"));
  });
  const missing = publicStaticRoutes.filter(
    (p) => !sitemapUrls.some((u) => u === SITE_URL + p)
  );
  if (missing.length) warn(`Rotas públicas ausentes no sitemap: ${missing.join(", ")}`);
}

// ---------- index.html ----------
const indexPath = resolve("index.html");
if (!existsSync(indexPath)) {
  fail("index.html não encontrado.");
} else {
  const html = readFileSync(indexPath, "utf-8");
  if (!/<title>[^<]+<\/title>/i.test(html)) fail("index.html sem <title>.");
  if (!/<meta\s+name=\"description\"\s+content=\"[^\"]+\"/i.test(html))
    fail("index.html sem <meta name=\"description\">.");
  if (!/<link\s+rel=\"canonical\"\s+href=\"[^\"]+\"/i.test(html))
    fail("index.html sem <link rel=\"canonical\">.");

  // JSON-LD inline
  const jsonLdBlocks = [...html.matchAll(/<script\s+type=\"application\/ld\+json\"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  if (jsonLdBlocks.length === 0) {
    warn("index.html sem nenhum bloco JSON-LD.");
  } else {
    jsonLdBlocks.forEach((block, i) => {
      try {
        const parsed = JSON.parse(block);
        const items = Array.isArray(parsed) ? parsed : [parsed];
        items.forEach((obj: any, idx: number) => {
          if (!obj["@context"]) fail(`JSON-LD #${i + 1}.${idx + 1} sem @context.`);
          if (!obj["@type"]) fail(`JSON-LD #${i + 1}.${idx + 1} sem @type.`);
        });
      } catch (e) {
        fail(`JSON-LD #${i + 1} em index.html é inválido: ${(e as Error).message}`);
      }
    });
  }

  // BreadcrumbList structural check em qualquer bloco
  jsonLdBlocks.forEach((block, i) => {
    let parsed: any;
    try { parsed = JSON.parse(block); } catch { return; }
    const items = Array.isArray(parsed) ? parsed : [parsed];
    items.forEach((obj: any, idx: number) => {
      if (obj["@type"] === "BreadcrumbList") {
        if (!Array.isArray(obj.itemListElement) || obj.itemListElement.length === 0) {
          fail(`BreadcrumbList #${i + 1}.${idx + 1} sem itemListElement.`);
        } else {
          obj.itemListElement.forEach((el: any, j: number) => {
            if (el["@type"] !== "ListItem") fail(`BreadcrumbList item ${j + 1} não é ListItem.`);
            if (typeof el.position !== "number") fail(`BreadcrumbList item ${j + 1} sem position numérica.`);
            if (!el.name) fail(`BreadcrumbList item ${j + 1} sem name.`);
          });
        }
      }
    });
  });
}

// ---------- robots.txt ----------
const robotsPath = resolve("public/robots.txt");
if (!existsSync(robotsPath)) {
  warn("public/robots.txt não existe.");
} else {
  const robots = readFileSync(robotsPath, "utf-8");
  if (!/Sitemap:\s*https?:\/\//i.test(robots)) warn("robots.txt não declara Sitemap.");
  else if (!robots.includes(SITE_URL + "/sitemap.xml")) warn(`robots.txt: Sitemap não aponta para ${SITE_URL}/sitemap.xml.`);
}

// ---------- Resultado ----------
if (warnings.length) {
  console.warn(`[validate-seo] ${warnings.length} aviso(s):`);
  warnings.forEach((w) => console.warn("  • " + w));
}
if (errors.length) {
  console.error(`[validate-seo] ${errors.length} erro(s) crítico(s):`);
  errors.forEach((e) => console.error("  ✗ " + e));
  process.exit(1);
}
console.log(`[validate-seo] OK — ${sitemapUrls.length} URLs no sitemap, JSON-LD válido, canonical/description presentes.`);