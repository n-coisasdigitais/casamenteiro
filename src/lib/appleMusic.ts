import { supabase } from "@/integrations/supabase/client";

/**
 * Busca de músicas pela iTunes Search API (Apple): gratuita, sem chave.
 * Regra da Apple: a prévia de 30 s precisa aparecer perto do selo "Ouvir no Apple Music".
 * Usamos JSONP porque a API nem sempre libera CORS para o navegador.
 */

export type Musica = {
  trackId: number;
  titulo: string;
  artista: string;
  capa: string | null;
  previewUrl: string | null;
  appleUrl: string | null;
};

let contador = 0;

function jsonp<T>(url: string, timeoutMs = 8000): Promise<T> {
  return new Promise((resolve, reject) => {
    const nome = `__itunes_cb_${Date.now()}_${contador++}`;
    const script = document.createElement("script");
    const limpar = () => {
      delete (window as any)[nome];
      script.remove();
      clearTimeout(timer);
    };
    const timer = setTimeout(() => {
      limpar();
      reject(new Error("A busca demorou demais. Tente de novo."));
    }, timeoutMs);
    (window as any)[nome] = (dados: T) => {
      limpar();
      resolve(dados);
    };
    script.src = `${url}${url.includes("?") ? "&" : "?"}callback=${nome}`;
    script.onerror = () => {
      limpar();
      reject(new Error("Não foi possível buscar agora."));
    };
    document.body.appendChild(script);
  });
}

export async function buscarMusicas(termo: string): Promise<Musica[]> {
  const q = termo.trim();
  if (q.length < 2) return [];
  let resultados: any[] | null = null;
  // 1) pelo nosso servidor (mais confiável); 2) se falhar, direto na Apple (JSONP)
  try {
    const { data, error } = await supabase.functions.invoke("musica-busca", { body: { termo: q } });
    if (!error && data && Array.isArray(data.results)) resultados = data.results;
  } catch {
    /* tenta o caminho direto */
  }
  if (!resultados) {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&media=music&entity=song&limit=8&country=BR`;
    const dados = await jsonp<{ results: any[] }>(url);
    resultados = dados.results || [];
  }
  return resultados.map((r) => ({
    trackId: r.trackId,
    titulo: r.trackName,
    artista: r.artistName,
    capa: r.artworkUrl100 ? String(r.artworkUrl100).replace("100x100", "300x300") : null,
    previewUrl: r.previewUrl || null,
    appleUrl: r.trackViewUrl || null,
  }));
}

export function linkSpotify(m: Pick<Musica, "titulo" | "artista">) {
  return `https://open.spotify.com/search/${encodeURIComponent(`${m.titulo} ${m.artista}`)}`;
}
export function linkDeezer(m: Pick<Musica, "titulo" | "artista">) {
  return `https://www.deezer.com/search/${encodeURIComponent(`${m.titulo} ${m.artista}`)}`;
}
