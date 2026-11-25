export type Nivel = "essencial" | "recomendada" | "complementar";
export type StatusMeta = "vazia" | "abaixo" | "ok";
export type Ponto = { lat: number | null; lng: number | null };
export type OfertaConfig = {
  foco_nome: string; foco_cidade: string; foco_uf: string;
  foco_lat: number; foco_lng: number; foco_raio_km: number;
  meta: Record<Nivel, number>;
};
export const CONFIG_PADRAO: OfertaConfig = {
  foco_nome: "BH e região", foco_cidade: "Belo Horizonte", foco_uf: "MG",
  foco_lat: -19.9167, foco_lng: -43.9345, foco_raio_km: 60,
  meta: { essencial: 5, recomendada: 3, complementar: 1 },
};
export const NIVEIS: { id: Nivel; nome: string }[] = [
  { id: "essencial", nome: "Essencial" },
  { id: "recomendada", nome: "Recomendada" },
  { id: "complementar", nome: "Complementar" },
];
export type FornecedorOferta = Ponto & {
  id: string; nome: string; slug: string | null; categoria_id: string | null;
  cidade: string | null; uf: string | null; raio_km: number | null;
  modo: string; cidades_atendidas: unknown; criado_em: string;
};
type CategoriaOferta = {
  id: string; nome: string; slug: string; ativa: boolean; nivel: Nivel | null;
  meta: number | null; rascunho: boolean; ordem: number | null;
  aprovados: number; pendentes: number; cidades: number;
};
type CategoriaPadrao = { slug: string; nome: string; nivel: Nivel; ordem: number; aliases: string[] };
type ProfissionalOferta = Ponto & {
  funcoes: string[]; cidade: string | null; uf: string | null;
  raio_km: number | null; disponivel: boolean; verificado: boolean;
};
type VagaOferta = {
  id: string; funcao: string; cidade: string | null; uf: string | null;
  data: string; status: string; vagas: number; candidatos: number;
};
export type PainelOferta = {
  gerado_em: string; config: OfertaConfig; categorias: CategoriaOferta[];
  padrao: CategoriaPadrao[]; fornecedores: FornecedorOferta[];
  profissionais: ProfissionalOferta[]; vagas: VagaOferta[];
  funil: { cadastrados: number; aprovados: number; perfil_completo: number; receberam_orcamento: number; fecharam: number };
  saude: { orcamentos_30d: number; resposta_mediana_horas: number | null; pct_respondidos_48h: number | null; contratados_30d: number; pct_fornecedores_ativos_30d: number | null };
};
export type LinhaCategoria = CategoriaOferta & { naRegiao: number; metaEfetiva: number; status: StatusMeta; faltam: number };

export function distanciaKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const rad = (v: number) => v * Math.PI / 180;
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, a)));
}
export function naRegiaoFoco(f: Ponto & { modo?: string }, config: OfertaConfig) {
  return f.modo === "nacional" || (f.lat != null && f.lng != null && distanciaKm(f.lat, f.lng, config.foco_lat, config.foco_lng) <= config.foco_raio_km);
}
export function statusMeta(quantidade: number, meta: number): StatusMeta {
  return quantidade === 0 ? "vazia" : quantidade < meta ? "abaixo" : "ok";
}
export function linhasCategorias(p: PainelOferta): LinhaCategoria[] {
  return p.categorias.filter((c) => c.ativa).map((c) => {
    const naRegiao = p.fornecedores.filter((f) => f.categoria_id === c.id && naRegiaoFoco(f, p.config)).length;
    const metaEfetiva = c.meta ?? (c.nivel ? p.config.meta[c.nivel] : 0);
    return { ...c, naRegiao, metaEfetiva, status: statusMeta(naRegiao, metaEfetiva), faltam: Math.max(0, metaEfetiva - naRegiao) };
  });
}
export function resumoCategorias(linhas: LinhaCategoria[]) {
  return {
    total: linhas.length, vazias: linhas.filter((l) => l.status === "vazia").length,
    abaixo: linhas.filter((l) => l.status === "abaixo").length, ok: linhas.filter((l) => l.status === "ok").length,
    semNivel: linhas.filter((l) => !l.nivel).length,
    essenciaisTotal: linhas.filter((l) => l.nivel === "essencial").length,
    essenciaisOk: linhas.filter((l) => l.nivel === "essencial" && l.status === "ok").length,
  };
}
export function padraoFaltando(p: PainelOferta) {
  const slugs = new Set(p.categorias.map((c) => c.slug));
  return p.padrao.filter((c) => ![c.slug, ...(c.aliases ?? [])].some((s) => slugs.has(s)));
}
export function cobertura(cidades: Ponto[], fornecedores: (Ponto & { modo: string; raio_km: number | null })[]) {
  const cobertasIdx = new Set<number>();
  cidades.forEach((c, i) => {
    if (fornecedores.some((f) => f.modo === "nacional" || (c.lat != null && c.lng != null && f.lat != null && f.lng != null && distanciaKm(c.lat, c.lng, f.lat, f.lng) <= (f.raio_km ?? 0)))) cobertasIdx.add(i);
  });
  return { total: cidades.length, cobertas: cobertasIdx.size, pct: cidades.length ? cobertasIdx.size / cidades.length * 100 : 0, cobertasIdx };
}
export function contarPor<T>(lista: T[], chave: (item: T) => string | null | undefined | false) {
  const contagens = new Map<string, number>();
  for (const item of lista) { const k = chave(item); if (k) contagens.set(k, (contagens.get(k) ?? 0) + 1); }
  return contagens;
}
export function porUf(lista: { uf: string | null }[]) { return contarPor(lista, (f) => f.uf?.toUpperCase().slice(0, 2)); }
export function matrizProfissionais(lista: ProfissionalOferta[], somenteDisponiveis = false) {
  const totalFuncao = new Map<string, number>();
  const totalCidade = new Map<string, number>();
  const celulas = new Map<string, Map<string, number>>();
  for (const p of lista) {
    if (somenteDisponiveis && !p.disponivel) continue;
    const cidade = p.cidade ?? "Sem cidade";
    totalCidade.set(cidade, (totalCidade.get(cidade) ?? 0) + 1);
    for (const f of new Set(p.funcoes ?? [])) {
      totalFuncao.set(f, (totalFuncao.get(f) ?? 0) + 1);
      const linha = celulas.get(f) ?? new Map<string, number>();
      linha.set(cidade, (linha.get(cidade) ?? 0) + 1); celulas.set(f, linha);
    }
  }
  const ordenar = (mapa: Map<string, number>) => [...mapa.keys()].sort((a, b) => (mapa.get(b) ?? 0) - (mapa.get(a) ?? 0) || a.localeCompare(b, "pt-BR"));
  return { funcoes: ordenar(totalFuncao), cidades: ordenar(totalCidade), totalFuncao, totalCidade, valor: (f: string, c: string) => celulas.get(f)?.get(c) ?? 0 };
}
export function vagasPorFuncao(lista: VagaOferta[]) {
  const grupos = new Map<string, { funcao: string; vagas: number; abertas: number; candidatos: number }>();
  for (const v of lista) {
    const g = grupos.get(v.funcao) ?? { funcao: v.funcao, vagas: 0, abertas: 0, candidatos: 0 };
    g.vagas += v.vagas; g.candidatos += v.candidatos; if (v.status === "aberta") g.abertas += v.vagas;
    grupos.set(v.funcao, g);
  }
  return [...grupos.values()].map((g) => ({ ...g, candidatosPorVaga: g.vagas ? g.candidatos / g.vagas : 0 })).sort((a, b) => a.candidatosPorVaga - b.candidatosPorVaga);
}
export const num = (v: number | null | undefined) => v == null || !Number.isFinite(v) ? "—" : v.toLocaleString("pt-BR");
export const pct = (v: number | null | undefined, casas = 0) => v == null || !Number.isFinite(v) ? "—" : `${v.toLocaleString("pt-BR", { maximumFractionDigits: casas })}%`;
export const razao = (a: number, b: number) => b > 0 ? a / b * 100 : null;
export const horas = (v: number | null | undefined) => v == null ? "—" : `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} h`;
export function duracao(v: number | null | undefined) {
  if (v == null || !Number.isFinite(v)) return "—";
  const s = Math.max(0, Math.round(v));
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}min ${String(s % 60).padStart(2, "0")}s`;
}
// Palette consumed by the map and its legend as one shared scale.
export const ESCALA = ["#f3ede5", "#edcfb4", "#dfa573", "#c77c45", "#a9551f"] as const;
export function faixaCor(valor: number, max: number) {
  if (valor <= 0 || max <= 0) return ESCALA[0];
  return ESCALA[Math.min(4, Math.max(1, Math.ceil(valor / max * 4)))];
}
