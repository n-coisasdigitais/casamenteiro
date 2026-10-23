/**
 * Dados da Home (storytelling):
 *  - destaques pagos ativos (Hero, Stories, Formulário, Categorias) via RPC `home_destaques_ativos`
 *  - conteúdo padrão (fallback) cadastrado em `secoes_home`
 *  - categorias com fornecedor aprovado
 *  - depoimentos aprovados (casal / fornecedor)
 *  - datas com desconto agrupadas por dia
 *
 * Tudo aqui é tolerante a falha: se uma tabela/coluna/RPC ainda não existir
 * (migração não aplicada), a Home cai no conteúdo padrão sem quebrar.
 */
import type React from "react";
import { supabase } from "@/integrations/supabase/client";
import { demoValues } from "@/lib/demoScope";
import heroWedding from "@/assets/hero-wedding.jpg";

export type EspacoHome = "home_hero" | "home_story" | "home_form" | "home_categoria";

/** Um slide exibível: pago (com fornecedor) ou padrão (sem fornecedor). */
export type Slide = {
  key: string;
  imagem: string;
  alt: string;
  /** id da compra quando é destaque pago (usado para métricas) */
  purchaseId?: string;
  supplierId?: string | null;
  supplierNome?: string | null;
  categoriaNome?: string | null;
  legenda?: string | null;
  link?: string | null;
  /** enquadramento (object-position) no desktop e no celular */
  focoD?: string | null;
  focoM?: string | null;
};

/** Estilo de enquadramento para usar com a classe `hv-foco` (troca no breakpoint md). */
export const estiloFoco = (s?: Pick<Slide, "focoD" | "focoM"> | null): React.CSSProperties =>
  ({
    ["--foco-d" as any]: s?.focoD || "50% 50%",
    ["--foco-m" as any]: s?.focoM || s?.focoD || "50% 50%",
  }) as React.CSSProperties;

export type StoryBeat = Slide & { tag: string; titulo: string; subtexto: string; curto: string };

export type CategoriaHome = {
  id: string;
  nome: string;
  slug: string;
  descricao: string | null;
  fornecedores: number;
  slides: Slide[]; // pagos primeiro; vazio = bloco colorido
  patrocinada: boolean;
};

export type Depoimento = {
  id: string;
  tipo: "casal" | "fornecedor";
  nome: string;
  detalhe: string | null;
  texto: string;
  nota: number;
};

export type DataDesconto = { data: string; descontoMax: number; fornecedores: number };

/* ------------------------------------------------------------------ */
/* Conteúdo padrão embutido (quando o admin ainda não cadastrou nada)  */
/* ------------------------------------------------------------------ */

const U = (id: string, w = 1600) => `https://images.unsplash.com/${id}?w=${w}&q=80&auto=format&fit=crop`;

export const PADRAO_HERO: Slide[] = [
  { key: "hero-padrao-1", imagem: heroWedding, alt: "Casal se abraçando ao pôr do sol num jardim de rosas", focoD: "50% 35%", focoM: "55% 30%" },
];

export const PADRAO_STORIES: StoryBeat[] = [
  {
    key: "story-1",
    imagem: U("photo-1511578314322-379afb476865", 1080),
    alt: "Mesa de casamento sendo montada",
    tag: "O problema",
    curto: "O caos",
    titulo: "Planejar casamento virou caos.",
    subtexto: "15 fornecedores, 8 grupos de WhatsApp e uma planilha que ninguém entende.",
  },
  {
    key: "story-2",
    imagem: U("photo-1519225421980-715cb0215aed", 1080),
    alt: "Decoração de casamento ao ar livre",
    tag: "A virada",
    curto: "A virada",
    titulo: "E se fosse tudo num lugar só?",
    subtexto: "Orçamento, fornecedores, convidados e datas, organizados do jeito de vocês.",
  },
  {
    key: "story-3",
    imagem: U("photo-1583939003579-730e3918a45a", 1080),
    alt: "Noiva sorrindo",
    tag: "O começo",
    curto: "O começo",
    titulo: "Comece pelo quanto vocês têm.",
    subtexto: "Simule em 1 minuto e receba fornecedores avaliados dentro do orçamento.",
  },
  {
    key: "story-4",
    imagem: heroWedding,
    alt: "Casal ao pôr do sol",
    tag: "O final feliz",
    curto: "O sim",
    titulo: "E curtam o grande dia.",
    subtexto: "Com tudo contratado e confirmado, sobra tempo pra viver a festa.",
  },
];

export const PADRAO_FORM: Slide[] = [
  { key: "form-padrao", imagem: U("photo-1464349153735-7db50ed83c84", 2400), alt: "Cerimônia de casamento ao ar livre" },
];

/** Foto padrão por slug de categoria (quando o admin não cadastrou). Sem foto = bloco colorido. */
const PADRAO_CATEGORIA: Record<string, string> = {
  espaco: U("photo-1519167758481-83f550bb49b3", 1400),
  espacos: U("photo-1519167758481-83f550bb49b3", 1400),
  fotografia: U("photo-1537633552985-df8429e8048b", 1200),
  fotografo: U("photo-1537633552985-df8429e8048b", 1200),
  decoracao: U("photo-1478146896981-b80fe463b330", 1200),
  buffet: U("photo-1555244162-803834f70033", 1200),
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

let sessaoId: string | null = null;
function sessao(): string {
  if (sessaoId) return sessaoId;
  try {
    const k = "cm_destaque_sessao";
    sessaoId = sessionStorage.getItem(k);
    if (!sessaoId) {
      sessaoId = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem(k, sessaoId);
    }
  } catch {
    sessaoId = Math.random().toString(36).slice(2);
  }
  return sessaoId;
}

const jaContado = new Set<string>();

/** Registra impressão (1x por sessão) ou clique de um destaque pago. Silencioso em erro. */
export function registrarEvento(purchaseId: string | undefined, tipo: "impressao" | "clique") {
  if (!purchaseId) return;
  const k = `${purchaseId}:${tipo}`;
  if (tipo === "impressao" && jaContado.has(k)) return;
  jaContado.add(k);
  (supabase.rpc as any)("registrar_evento_destaque", { p_purchase: purchaseId, p_tipo: tipo, p_sessao: sessao() }).then(
    () => {},
    () => {},
  );
}

/** Embaralha (Fisher–Yates) para que cada visita comece por um patrocinador diferente. */
export function embaralhar<T>(lista: T[]): T[] {
  const a = [...lista];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type DestaqueRow = {
  id: string;
  escopo: EspacoHome;
  supplier_id: string;
  supplier_nome: string | null;
  categoria_id: string | null;
  categoria_nome: string | null;
  categoria_slug: string | null;
  imagem_url: string;
  legenda: string | null;
  link_destino: string | null;
  exclusivo: boolean;
  foco_desktop?: string | null;
  foco_mobile?: string | null;
};

function rowToSlide(r: DestaqueRow): Slide {
  return {
    key: `pago-${r.id}`,
    imagem: r.imagem_url,
    alt: r.legenda || `Foto de ${r.supplier_nome ?? "fornecedor"}`,
    purchaseId: r.id,
    supplierId: r.supplier_id,
    supplierNome: r.supplier_nome,
    categoriaNome: r.categoria_nome,
    legenda: r.legenda,
    link: r.link_destino || `/fornecedor/${r.supplier_id}`,
    focoD: r.foco_desktop,
    focoM: r.foco_mobile,
  };
}

/** Exclusivo vence: se houver compra exclusiva ativa, só ela aparece. */
function aplicarExclusivo(rows: DestaqueRow[]): DestaqueRow[] {
  const exc = rows.find((r) => r.exclusivo);
  return exc ? [exc] : rows;
}

/* ------------------------------------------------------------------ */
/* Carregamento                                                        */
/* ------------------------------------------------------------------ */

export type HomeData = {
  hero: Slide[];
  stories: StoryBeat[];
  form: Slide[];
  categorias: CategoriaHome[];
  depoimentos: Depoimento[];
  datasDesconto: DataDesconto[];
};

async function carregarDestaques(): Promise<DestaqueRow[]> {
  try {
    const { data, error } = await (supabase.rpc as any)("home_destaques_ativos");
    if (error || !Array.isArray(data)) return [];
    return data as DestaqueRow[];
  } catch {
    return [];
  }
}

type SecaoRow = {
  foto_url: string;
  frase: string | null;
  subtexto: string | null;
  ordem: number;
  escopo: string | null;
  categoria_id?: string | null;
  supplier_id?: string | null;
  foco_desktop?: string | null;
  foco_mobile?: string | null;
};

const ESCOPOS_NOVOS = ["home_hero", "home_story", "home_form", "home_categoria"];

async function carregarSecoes(): Promise<SecaoRow[]> {
  // tenta com as colunas novas; se não existirem, cai para as antigas
  let res: any = await (supabase.from("secoes_home" as any) as any)
    .select("foto_url,frase,subtexto,ordem,escopo,categoria_id,supplier_id,foco_desktop,foco_mobile")
    .eq("ativo", true)
    .order("ordem");
  if (res.error) {
    res = await (supabase.from("secoes_home" as any) as any)
      .select("foto_url,frase,subtexto,ordem,escopo,supplier_id")
      .eq("ativo", true)
      .order("ordem");
  }
  return (res.data as SecaoRow[]) ?? [];
}

function ehLegado(s: SecaoRow) {
  return !s.escopo || (s.escopo !== "explore" && !ESCOPOS_NOVOS.includes(s.escopo));
}

async function carregarCategorias(): Promise<{ id: string; name: string; slug: string; description: string | null; n: number }[]> {
  const [cats, sups] = await Promise.all([
    supabase.from("categories").select("id,name,slug,description").eq("active", true),
    supabase.from("suppliers").select("category_id").eq("status", "approved").in("is_demo", demoValues()),
  ]);
  const cont: Record<string, number> = {};
  (sups.data ?? []).forEach((s: any) => {
    if (s.category_id) cont[s.category_id] = (cont[s.category_id] ?? 0) + 1;
  });
  return (cats.data ?? [])
    .map((c: any) => ({ ...c, n: cont[c.id] ?? 0 }))
    .filter((c) => c.n > 0);
}

async function carregarDepoimentos(): Promise<Depoimento[]> {
  let res: any = await (supabase.from("platform_reviews" as any) as any)
    .select("id, autor_nome, rating, comentario, autor_tipo, autor_detalhe")
    .eq("aprovado", true)
    .not("comentario", "is", null)
    .order("destaque", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(30);
  if (res.error) {
    res = await (supabase.from("platform_reviews" as any) as any)
      .select("id, autor_nome, rating, comentario")
      .eq("aprovado", true)
      .not("comentario", "is", null)
      .order("destaque", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(30);
  }
  return ((res.data as any[]) ?? [])
    .filter((r) => (r.comentario ?? "").trim().length > 0)
    .map((r) => ({
      id: r.id,
      tipo: r.autor_tipo === "fornecedor" ? "fornecedor" : "casal",
      nome: r.autor_nome || (r.autor_tipo === "fornecedor" ? "Fornecedor" : "Casal Casamenteiro"),
      detalhe: r.autor_detalhe ?? null,
      texto: r.comentario,
      nota: Number(r.rating) || 5,
    }));
}

async function carregarDatasDesconto(): Promise<DataDesconto[]> {
  const hoje = new Date().toISOString().slice(0, 10);
  const { data, error } = await (supabase.from("supplier_promo_dates" as any) as any)
    .select("promo_date, discount_pct, supplier_id")
    .gte("promo_date", hoje)
    .order("promo_date", { ascending: true })
    .limit(400);
  if (error || !data) return [];
  const porDia: Record<string, { max: number; sups: Set<string> }> = {};
  (data as any[]).forEach((r) => {
    const d = (porDia[r.promo_date] ??= { max: 0, sups: new Set() });
    d.max = Math.max(d.max, Number(r.discount_pct) || 0);
    d.sups.add(r.supplier_id);
  });
  return Object.entries(porDia)
    .map(([data, v]) => ({ data, descontoMax: v.max, fornecedores: v.sups.size }))
    .sort((a, b) => a.data.localeCompare(b.data));
}

export async function carregarHome(opts: { datasDesconto: boolean }): Promise<HomeData> {
  const [destaques, secoes, cats, depoimentos, datas] = await Promise.all([
    carregarDestaques(),
    carregarSecoes().catch(() => [] as SecaoRow[]),
    carregarCategorias().catch(() => []),
    carregarDepoimentos().catch(() => [] as Depoimento[]),
    opts.datasDesconto ? carregarDatasDesconto().catch(() => [] as DataDesconto[]) : Promise.resolve([]),
  ]);

  const pagos = (e: EspacoHome) => aplicarExclusivo(destaques.filter((d) => d.escopo === e));

  /* Hero: pagos (embaralhados) ou padrões do admin ou embutido */
  const heroPadrao: Slide[] = secoes
    .filter((s) => s.escopo === "home_hero" || (ehLegado(s) && s.ordem === 0))
    .map((s, i) => ({ key: `hero-admin-${i}`, imagem: s.foto_url, alt: s.frase || "Casamento", focoD: s.foco_desktop, focoM: s.foco_mobile }));
  const heroPagos = embaralhar(pagos("home_hero")).map(rowToSlide);
  const hero = heroPagos.length ? heroPagos : heroPadrao.length ? heroPadrao : PADRAO_HERO;

  /* Stories: textos da narrativa vêm do admin (ou embutidos); 2 vagas pagas trocam a foto dos stories 2 e 3 */
  const storyAdmin = secoes.filter((s) => s.escopo === "home_story" || (ehLegado(s) && s.ordem !== 0));
  const base: StoryBeat[] = storyAdmin.length
    ? storyAdmin.slice(0, 4).map((s, i) => ({
        ...(PADRAO_STORIES[i] ?? PADRAO_STORIES[0]),
        key: `story-admin-${i}`,
        imagem: s.foto_url,
        focoD: s.foco_desktop,
        focoM: s.foco_mobile,
        titulo: s.frase || PADRAO_STORIES[i]?.titulo || "",
        subtexto: s.subtexto || PADRAO_STORIES[i]?.subtexto || "",
      }))
    : PADRAO_STORIES;
  const storyPagos = embaralhar(pagos("home_story")).slice(0, 2).map(rowToSlide);
  const slotsPagos = [1, 2]; // 1º e último story são da narrativa
  const stories = base.map((b, i) => {
    const slot = slotsPagos.indexOf(i);
    const p = slot >= 0 ? storyPagos[slot] : undefined;
    return p ? { ...b, ...p, key: `${b.key}-${p.key}`, tag: b.tag, titulo: b.titulo, subtexto: b.subtexto, curto: b.curto } : b;
  });

  /* Formulário */
  const formPadrao: Slide[] = secoes
    .filter((s) => s.escopo === "home_form")
    .map((s, i) => ({ key: `form-admin-${i}`, imagem: s.foto_url, alt: s.frase || "Casamento", focoD: s.foco_desktop, focoM: s.foco_mobile }));
  const formPagos = embaralhar(pagos("home_form")).map(rowToSlide);
  const form = formPagos.length ? formPagos : formPadrao.length ? formPadrao : PADRAO_FORM;

  /* Categorias: só as que têm fornecedor; patrocinadas primeiro, depois por nº de fornecedores */
  const catPagos = destaques.filter((d) => d.escopo === "home_categoria");
  const categorias: CategoriaHome[] = cats
    .map((c) => {
      const pagosCat = aplicarExclusivo(catPagos.filter((d) => d.categoria_id === c.id));
      const linhaAdmin = secoes.find((s) => s.escopo === "home_categoria" && s.categoria_id === c.id);
      const padrao = linhaAdmin?.foto_url || PADRAO_CATEGORIA[c.slug];
      const slides = pagosCat.length
        ? embaralhar(pagosCat).map(rowToSlide)
        : padrao
          ? [{ key: `cat-${c.id}`, imagem: padrao, alt: c.name, focoD: linhaAdmin?.foco_desktop, focoM: linhaAdmin?.foco_mobile }]
          : [];
      return {
        id: c.id,
        nome: c.name,
        slug: c.slug,
        descricao: c.description,
        fornecedores: c.n,
        slides,
        patrocinada: pagosCat.length > 0,
      };
    })
    .sort((a, b) => Number(b.patrocinada) - Number(a.patrocinada) || b.fornecedores - a.fornecedores)
    .slice(0, 5);

  return { hero, stories, form, categorias, depoimentos, datasDesconto: datas };
}
