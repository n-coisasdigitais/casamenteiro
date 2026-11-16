import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

/**
 * Busca músicas na iTunes Search API (Apple) pelo servidor.
 * O navegador às vezes não consegue chamar a Apple direto (bloqueio de CORS/script),
 * então o app chama esta função. Só leitura, sem chave, sem dados pessoais.
 */
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=600" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { termo } = await req.json().catch(() => ({ termo: "" }));
    const q = String(termo || "").trim().slice(0, 80);
    if (q.length < 2) return json({ results: [] });
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&media=music&entity=song&limit=8&country=BR`;
    const r = await fetch(url, { headers: { Accept: "application/json" } });
    if (!r.ok) return json({ error: "apple_indisponivel", results: [] }, 502);
    const dados = await r.json();
    const results = (dados.results || []).map((m: any) => ({
      trackId: m.trackId,
      trackName: m.trackName,
      artistName: m.artistName,
      artworkUrl100: m.artworkUrl100 || null,
      previewUrl: m.previewUrl || null,
      trackViewUrl: m.trackViewUrl || null,
    }));
    return json({ results });
  } catch (_e) {
    return json({ error: "falha", results: [] }, 500);
  }
});
