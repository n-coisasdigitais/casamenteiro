/**
 * Área de atendimento do fornecedor — regra única usada pela vitrine,
 * pela busca, pelo simulador e pelo perfil público.
 *
 * Dois modos:
 *  - "local":    cidade principal + cidades específicas + raio em km.
 *  - "nacional": atende todo o Brasil, de uma ou mais formas:
 *       online → serviço 100% digital (convite digital, site, consultoria)
 *       viagem → vai até o evento (fotógrafo, celebrante, banda)
 *       envio  → manda o produto pelo correio (convite impresso, lembrancinha)
 */
import { supabase } from "@/integrations/supabase/client";

export type FormaNacional = "online" | "viagem" | "envio";
export type ModoAtendimento = "local" | "nacional";
export type TaxaDeslocamento = "inclusa" | "a_combinar" | "a_partir";

export const FORMAS_NACIONAL: { valor: FormaNacional; titulo: string; descricao: string; selo: string }[] = [
  {
    valor: "online",
    titulo: "Online / digital",
    descricao: "Todo o serviço é feito à distância (ex.: convite digital, site do casamento).",
    selo: "Online",
  },
  {
    valor: "viagem",
    titulo: "Vou até o evento",
    descricao: "Viajo para qualquer cidade (ex.: fotografia, celebrante, banda).",
    selo: "Viaja até você",
  },
  {
    valor: "envio",
    titulo: "Envio pelo correio",
    descricao: "Mando o produto para qualquer endereço (ex.: convite impresso, lembrancinhas).",
    selo: "Envia para todo o Brasil",
  },
];

/** Categorias em que o casal vai até o fornecedor ou que dependem de estrutura local. */
const SO_LOCAL = /^(espaco|buffet)/;
export const categoriaPermiteNacional = (slug?: string | null) => !SO_LOCAL.test(slug || "");

export type DadosAtendimento = {
  city?: string | null;
  state?: string | null;
  cidades_atendidas?: unknown;
  raio_atendimento_km?: number | null;
  lat?: number | string | null;
  lng?: number | string | null;
  atendimento_modo?: string | null;
  atendimento_formas?: unknown;
  atende_exterior?: boolean | null;
};

export const COLS_ATENDIMENTO =
  "cidades_atendidas, raio_atendimento_km, lat, lng, atendimento_modo, atendimento_formas, atende_exterior, taxa_deslocamento, taxa_deslocamento_valor";

export const norm = (s: string | null | undefined) =>
  (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

export const ehNacional = (f: DadosAtendimento) => f.atendimento_modo === "nacional";

export function formasDe(f: DadosAtendimento): FormaNacional[] {
  const l = Array.isArray(f.atendimento_formas) ? (f.atendimento_formas as string[]) : [];
  return FORMAS_NACIONAL.map((x) => x.valor).filter((v) => l.includes(v));
}

/** Texto curto para card e perfil: "Todo o Brasil · Online". */
export function seloAtendimento(f: DadosAtendimento): string | null {
  if (!ehNacional(f)) return null;
  const formas = formasDe(f);
  if (formas.length === 1) return `Todo o Brasil · ${FORMAS_NACIONAL.find((x) => x.valor === formas[0])!.selo}`;
  return "Atende todo o Brasil";
}

// ---------- coordenadas (busca uma cidade por vez, com cache da sessão) ----------
export type Coord = { lat: number; lng: number; estado: string };

/** "Rio de Janeiro, RJ" / "Rio de Janeiro - RJ" / "Rio de Janeiro" → { cidade, uf } */
export function separarCidadeUf(texto: string): { cidade: string; uf: string | null } {
  const m = (texto || "").trim().match(/^(.*?)\s*(?:,|-|—|\/)\s*([A-Za-z]{2})$/);
  if (m) return { cidade: m[1].trim(), uf: m[2].toUpperCase() };
  return { cidade: (texto || "").trim(), uf: null };
}

const _coords = new Map<string, Promise<Coord | null>>();
/**
 * Coordenada de uma cidade (tabela cidades_coordenadas, todos os municípios).
 * Se o nome existe em mais de um estado e a UF não veio, usa o primeiro (o raio é aproximado).
 */
export function coordenadaDe(texto: string, ufPadrao?: string | null): Promise<Coord | null> {
  const { cidade, uf: ufTexto } = separarCidadeUf(texto);
  const uf = ufTexto || (ufPadrao ? ufPadrao.toUpperCase() : null);
  if (!cidade) return Promise.resolve(null);
  const chave = `${norm(cidade)}|${uf || ""}`;
  if (!_coords.has(chave)) {
    _coords.set(
      chave,
      (async () => {
        let q = supabase.from("cidades_coordenadas").select("estado, lat, lng").ilike("cidade", cidade);
        if (uf) q = q.eq("estado", uf);
        const { data } = await q.limit(1);
        const r = (data || [])[0] as { estado: string; lat: number; lng: number } | undefined;
        return r ? { lat: Number(r.lat), lng: Number(r.lng), estado: r.estado } : null;
      })(),
    );
  }
  return _coords.get(chave)!;
}

export function distanciaKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const r = (x: number) => (x * Math.PI) / 180;
  const a =
    Math.sin(r(lat2 - lat1) / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lng2 - lng1) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Como o fornecedor atende a cidade buscada:
 *  "local"  → é da cidade, listou a cidade ou o raio cobre.
 *  "remoto" → não é local, mas atende todo o Brasil.
 *  null     → não atende.
 * Sem cidade na busca, todo mundo conta como "local".
 */
export function comoAtende(f: DadosAtendimento, cidade: string, coord?: Coord | null): "local" | "remoto" | null {
  const c = norm(cidade);
  if (!c) return "local";
  // a busca pode vir como "Rio de Janeiro" ou "Rio de Janeiro, RJ"
  const soCidade = norm(separarCidadeUf(cidade).cidade);
  const bate = (x: string | null | undefined) => {
    const n = norm(x);
    return !!n && (n === soCidade || n.includes(soCidade) || c.includes(n));
  };
  if (bate(f.city) || norm(f.state) === c) return "local";
  const atendidas = Array.isArray(f.cidades_atendidas) ? (f.cidades_atendidas as string[]) : [];
  if (atendidas.some(bate)) return "local";
  const raio = Number(f.raio_atendimento_km || 0);
  if (coord && raio > 0 && f.lat != null && f.lng != null) {
    if (distanciaKm(coord.lat, coord.lng, Number(f.lat), Number(f.lng)) <= raio) return "local";
  }
  if (ehNacional(f)) return "remoto";
  return null;
}
