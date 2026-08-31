/**
 * Prerender (SSG) das rotas prioritárias — roda no `postbuild`.
 *
 * O Lovable hospeda o app como site estático com fallback para index.html.
 * Este script gera `dist/<rota>/index.html` com <title>, meta description,
 * OG/Twitter, canonical, JSON-LD e um bloco de conteúdo textual dentro de
 * #root. Crawlers e scrapers de link (WhatsApp, Facebook, LinkedIn) leem
 * esse HTML; o React substitui o conteúdo normalmente ao montar.
 *
 * Limites: nunca ultrapassar os tetos abaixo (o publish falha acima de
 * 50.000 arquivos). O restante das rotas continua como SPA.
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, join } from "path";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = "https://www.casamenteiro.com.br";
const DIST = resolve("dist");
const OG_PADRAO = `${BASE_URL}/og-image.jpg`;

const MAX_FORNECEDORES = Number(process.env.PRERENDER_MAX_FORNECEDORES ?? 800);
const MAX_CASAIS = Number(process.env.PRERENDER_MAX_CASAIS ?? 300);
const MAX_CIDADES = Number(process.env.PRERENDER_MAX_CIDADES ?? 200);
const MAX_TOTAL = 3000;

type Rota = {
  path: string;
  title: string;
  description: string;
  image?: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  /** HTML simples injetado no #root para crawlers sem JS. */
  body: string;
};

/* --------------------------------- utils -------------------------------- */

const esc = (s: string) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const corta = (s: string | null | undefined, max = 155) => {
  const t = (s || "").replace(/\s+/g, " ").trim();
  return t.length <= max ? t : t.slice(0, max - 1).trimEnd() + "…";
};

const slugify = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

/* ------------------------------ transformação ---------------------------- */

function aplicar(template: string, rota: Rota): string {
  const url = BASE_URL + rota.path;
  const img = rota.image || OG_PADRAO;
  let html = template;

  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(rota.title)}</title>`);
  html = html.replace(
    /<meta\s+name="description"[\s\S]*?\/>/,
    `<meta name="description" content="${esc(rota.description)}" />`,
  );
  html = html.replace(
    /<link rel="canonical"[^>]*>/,
    `<link rel="canonical" href="${esc(url)}" />`,
  );

  const metas = [
    `<meta property="og:title" content="${esc(rota.title)}" />`,
    `<meta property="og:description" content="${esc(rota.description)}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    `<meta property="og:image" content="${esc(img)}" />`,
    `<meta name="twitter:title" content="${esc(rota.title)}" />`,
    `<meta name="twitter:description" content="${esc(rota.description)}" />`,
    `<meta name="twitter:image" content="${esc(img)}" />`,
    rota.jsonLd
      ? `<script type="application/ld+json">${JSON.stringify(rota.jsonLd).replace(/</g, "\\u003c")}</script>`
      : "",
  ].join("\n    ");

  // remove OG/Twitter duplicados vindos do template estático
  html = html
    .replace(/\s*<meta property="og:(?:title|description|url|image)"[^>]*>/g, "")
    .replace(/\s*<meta name="twitter:(?:title|description|image)"[^>]*>/g, "");

  html = html.replace("</head>", `  ${metas}\n  </head>`);
  html = html.replace(
    /<div id="root"><\/div>/,
    `<div id="root">${rota.body}</div>`,
  );
  return html;
}

function escrever(rota: Rota, template: string) {
  const dir = rota.path === "/" ? DIST : join(DIST, rota.path.replace(/^\//, ""));
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), aplicar(template, rota));
}

/* --------------------------------- dados --------------------------------- */

async function coletarRotas(): Promise<Rota[]> {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const rotas: Rota[] = [
    {
      path: "/",
      title: "Casamenteiro — Planeje seu casamento dos sonhos",
      description:
        "Simulador de orçamento, fornecedores avaliados, checklist de tarefas, lista de convidados e RSVP. Tudo em um só lugar, de graça.",
      body: `<h1>Casamenteiro — planeje seu casamento dos sonhos</h1>
      <p>Simulador de orçamento gratuito, fornecedores avaliados por região, checklist com tarefas por fase, lista de convidados com RSVP e controle de pagamentos.</p>
      <ul><li><a href="/explorar">Explorar fornecedores</a></li><li><a href="/simulador">Simulador de orçamento</a></li><li><a href="/quanto-custa-casar">Quanto custa casar por cidade</a></li><li><a href="/fornecedor">Sou fornecedor</a></li></ul>`,
    },
    {
      path: "/explorar",
      title: "Fornecedores de casamento avaliados | Casamenteiro",
      description:
        "Encontre buffet, espaço, fotografia, decoração e mais. Fornecedores verificados, com avaliações reais e orçamento sem compromisso.",
      body: `<h1>Fornecedores de casamento</h1><p>Busque por categoria e cidade, compare preços e peça orçamento gratuito.</p>`,
    },
    {
      path: "/fornecedor",
      title: "Divulgue seu negócio de casamento | Casamenteiro",
      description:
        "Receba pedidos de orçamento de casais reais da sua região, preencha datas ociosas e gerencie leads em um painel completo.",
      body: `<h1>Para fornecedores de casamento</h1><p>Cadastre-se, receba leads qualificados e preencha datas ociosas da sua agenda.</p>`,
    },
    {
      path: "/simulador",
      title: "Simulador de orçamento de casamento grátis | Casamenteiro",
      description:
        "Descubra quanto vai custar o seu casamento em minutos: informe cidade, convidados e prioridades e receba a estimativa por categoria.",
      body: `<h1>Simulador de orçamento de casamento</h1><p>Estimativa gratuita por categoria com base em preços reais de fornecedores.</p>`,
    },
    {
      path: "/vagas",
      title: "Vagas para profissionais de eventos e casamentos | Casamenteiro",
      description:
        "Garçons, recepcionistas, seguranças, DJs e assistentes: veja vagas abertas de fornecedores de casamento na sua cidade.",
      body: `<h1>Vagas para profissionais de casamento e eventos</h1><p>Vagas publicadas por fornecedores: candidate-se em poucos cliques.</p>`,
    },
    {
      path: "/casais",
      title: "Casais reais e seus casamentos | Casamenteiro",
      description:
        "Inspire-se com álbuns, fornecedores contratados e avaliações de casais reais que planejaram o casamento pela plataforma.",
      body: `<h1>Casais reais</h1><p>Álbuns, fornecedores contratados e avaliações de casamentos reais.</p>`,
    },
    {
      path: "/quanto-custa-casar",
      title: "Quanto custa casar? Preços por cidade | Casamenteiro",
      description:
        "Guias de custo de casamento por cidade, com faixas de preço por categoria calculadas a partir de fornecedores reais.",
      body: `<h1>Quanto custa casar no Brasil</h1><p>Escolha sua cidade e veja faixas de preço por categoria.</p>`,
    },
  ];

  if (!url || !key) {
    console.warn("[prerender] credenciais ausentes — só rotas estáticas.");
    return rotas;
  }

  const sb = createClient(url, key);

  /* categorias */
  const { data: cats } = await sb.from("categories").select("id, name, slug, description").order("name");
  (cats || []).forEach((c: any) => {
    if (!c.slug) return;
    rotas.push({
      path: `/categoria/${c.slug}`,
      title: `${c.name} para casamento — fornecedores e preços | Casamenteiro`,
      description: corta(
        c.description ||
          `Compare fornecedores de ${c.name} para casamento: preços, avaliações, fotos e orçamento gratuito na sua cidade.`,
      ),
      body: `<h1>${esc(c.name)} para casamento</h1><p>${esc(
        corta(c.description || `Fornecedores de ${c.name} avaliados, com preços e orçamento gratuito.`),
      )}</p><p><a href="/explorar">Ver todos os fornecedores</a></p>`,
    });
  });

  /* fornecedores aprovados */
  const { data: sups } = await sb
    .from("suppliers")
    .select("id, company_name, description, city, state, price_min, price_max, rating, review_count, profile_photo_url, cover_photo_url, category_id")
    .eq("status", "approved")
    .eq("is_demo", false)
    .order("updated_at", { ascending: false })
    .limit(MAX_FORNECEDORES);

  const catNome: Record<string, string> = {};
  (cats || []).forEach((c: any) => (catNome[c.id] = c.name));

  (sups || []).forEach((s: any) => {
    const local = [s.city, s.state].filter(Boolean).join(" - ");
    const cat = s.category_id ? catNome[s.category_id] : null;
    const titulo = `${s.company_name}${cat ? ` — ${cat}` : ""}${local ? ` em ${local}` : ""} | Casamenteiro`;
    const desc = corta(
      s.description || `${s.company_name}${cat ? `, ${cat} para casamento` : ""}${local ? ` em ${local}` : ""}. Veja fotos, avaliações e peça orçamento gratuito.`,
    );
    rotas.push({
      path: `/fornecedor/${s.id}`,
      title: titulo,
      description: desc,
      image: s.cover_photo_url || s.profile_photo_url || undefined,
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        name: s.company_name,
        description: desc,
        url: `${BASE_URL}/fornecedor/${s.id}`,
        image: s.cover_photo_url || s.profile_photo_url || OG_PADRAO,
        address: local
          ? { "@type": "PostalAddress", addressLocality: s.city, addressRegion: s.state, addressCountry: "BR" }
          : undefined,
        aggregateRating:
          s.rating && s.review_count
            ? { "@type": "AggregateRating", ratingValue: s.rating, reviewCount: s.review_count }
            : undefined,
        priceRange: s.price_min && s.price_max ? `${brl(s.price_min)} - ${brl(s.price_max)}` : undefined,
      },
      body: `<h1>${esc(s.company_name)}</h1>${cat ? `<p>${esc(cat)}</p>` : ""}${
        local ? `<p>${esc(local)}</p>` : ""
      }<p>${esc(desc)}</p><p><a href="/explorar">Outros fornecedores</a></p>`,
    });
  });

  /* perfis públicos de casais */
  const { data: casais } = await sb
    .from("couple_public_profiles")
    .select("slug, nome_casal, bio, foto_capa_url, publico")
    .eq("publico", true)
    .limit(MAX_CASAIS);

  (casais || []).forEach((c: any) => {
    if (!c.slug) return;
    const desc = corta(c.bio || `Acompanhe a história e o casamento de ${c.nome_casal} no Casamenteiro.`);
    rotas.push({
      path: `/casais/${c.slug}`,
      title: `${c.nome_casal} — casamento real | Casamenteiro`,
      description: desc,
      image: c.foto_capa_url || undefined,
      body: `<h1>${esc(c.nome_casal)}</h1><p>${esc(desc)}</p>`,
    });
  });

  /* páginas de conteúdo "quanto custa casar em [cidade]" */
  const cidades = new Map<string, { cidade: string; uf: string | null; qtd: number; min: number[]; max: number[] }>();
  (sups || []).forEach((s: any) => {
    if (!s.city) return;
    const slug = slugify([s.city, s.state || ""].join(" "));
    const atual = cidades.get(slug) || { cidade: s.city, uf: s.state, qtd: 0, min: [], max: [] };
    atual.qtd += 1;
    if (s.price_min) atual.min.push(s.price_min);
    if (s.price_max) atual.max.push(s.price_max);
    cidades.set(slug, atual);
  });

  [...cidades.entries()]
    .sort((a, b) => b[1].qtd - a[1].qtd)
    .slice(0, MAX_CIDADES)
    .forEach(([slug, c]) => {
      const rotulo = c.uf ? `${c.cidade} (${c.uf})` : c.cidade;
      const soma = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
      const faixa =
        c.min.length && c.max.length ? `${brl(soma(c.min))} a ${brl(soma(c.max))}` : null;
      const desc = corta(
        faixa
          ? `Casar em ${rotulo} custa entre ${faixa} segundo ${c.qtd} fornecedores cadastrados. Veja preços por categoria e simule seu orçamento.`
          : `Veja quanto custa casar em ${rotulo}: faixas de preço por categoria, fornecedores locais e simulador gratuito.`,
      );
      rotas.push({
        path: `/quanto-custa-casar-em/${slug}`,
        title: `Quanto custa casar em ${rotulo}? Preços 2026 | Casamenteiro`,
        description: desc,
        body: `<h1>Quanto custa casar em ${esc(rotulo)}?</h1><p>${esc(desc)}</p><p><a href="/simulador">Simular meu orçamento</a></p>`,
      });
    });

  return rotas;
}

/* ---------------------------------- main --------------------------------- */

(async () => {
  const templatePath = join(DIST, "index.html");
  if (!existsSync(templatePath)) {
    console.warn("[prerender] dist/index.html não encontrado — pulando.");
    return;
  }
  const template = readFileSync(templatePath, "utf8");

  let rotas: Rota[] = [];
  try {
    rotas = await coletarRotas();
  } catch (e) {
    console.warn("[prerender] falha ao coletar rotas:", (e as Error).message);
    return;
  }

  if (rotas.length > MAX_TOTAL) {
    console.warn(`[prerender] ${rotas.length} rotas > teto ${MAX_TOTAL}; truncando.`);
    rotas = rotas.slice(0, MAX_TOTAL);
  }

  rotas.forEach((r) => escrever(r, template));
  console.log(`[prerender] ${rotas.length} páginas HTML geradas em dist/.`);
})();
