// Edge function: admin-analytics
// Painel de comportamento do admin. Lê o PostHog com a chave pessoal (que nunca vai ao navegador).
//
// Secrets (Supabase → Edge Functions → Secrets):
//   POSTHOG_PERSONAL_API_KEY  chave pessoal com escopos endpoint:read, heatmap:read, query:read
//   POSTHOG_PROJECT_ID        765085
//   POSTHOG_HOST              https://us.posthog.com
//
// Corpo (POST JSON):
//   { "acao": "painel", "dias": 30, "segmento": "todos" }
//       → roda os 7 endpoints do PostHog em sequência (limite: 3 consultas ao mesmo tempo)
//   { "acao": "heatmap", "tipo": "click" | "rageclick" | "scrolldepth", "dias": 30,
//     "url": "https://www.casamenteiro.com.br/", "largura_min": 1024, "largura_max": 1920 }
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { getUserId, isAdmin } from "../_shared/auth.ts";

const KEY = Deno.env.get("POSTHOG_PERSONAL_API_KEY") ?? "";
const PROJECT = Deno.env.get("POSTHOG_PROJECT_ID") ?? "765085";
const HOST = (Deno.env.get("POSTHOG_HOST") ?? "https://us.posthog.com").replace(/\/$/, "");

// Versões fixas: se alguém mudar a consulta no PostHog, o painel não muda sem querer.
const ENDPOINTS: Record<string, number> = {
  comportamento_kpis: 1,
  comportamento_sessoes_resumo: 1,
  comportamento_diario: 1,
  comportamento_paginas: 1,
  comportamento_caminhos: 1,
  comportamento_buscas: 1,
  comportamento_sessoes_recentes: 1,
};

const SEGMENTOS = new Set(["todos", "visitante", "couple", "supplier", "profissional"]);
const TIPOS_HEATMAP = new Set(["click", "rageclick", "mousemove", "scrolldepth"]);
const SITES = ["https://www.casamenteiro.com.br", "https://casamenteiro.com.br"];

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Converte {columns, results} do PostHog em lista de objetos. */
function linhas(r: { columns?: string[]; results?: unknown[][] }) {
  const cols = r.columns ?? [];
  return (r.results ?? []).map((row) => Object.fromEntries(cols.map((c, i) => [c, row[i]])));
}

async function rodarEndpoint(nome: string, dias: number, segmento: string) {
  const url = `${HOST}/api/projects/${PROJECT}/endpoints/${nome}/run?version=${ENDPOINTS[nome]}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ variables: { lookback_days: dias, segmento }, limit: 100 }),
  });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`${nome}: PostHog ${resp.status} ${txt.slice(0, 200)}`);
  }
  return linhas(await resp.json());
}

async function painel(dias: number, segmento: string) {
  const nomes = Object.keys(ENDPOINTS);
  const saida: Record<string, unknown> = {};
  const erros: string[] = [];
  // 3 de cada vez (limite de concorrência do PostHog)
  for (let i = 0; i < nomes.length; i += 3) {
    const lote = nomes.slice(i, i + 3);
    const res = await Promise.allSettled(lote.map((n) => rodarEndpoint(n, dias, segmento)));
    res.forEach((r, j) => {
      const chave = lote[j].replace("comportamento_", "");
      if (r.status === "fulfilled") saida[chave] = r.value;
      else {
        saida[chave] = [];
        erros.push(String(r.reason?.message ?? r.reason));
      }
    });
  }
  return {
    ...saida,
    erros,
    replay_base: `${HOST}/project/${PROJECT}/replay/`,
    gerado_em: new Date().toISOString(),
  };
}

async function heatmap(body: Record<string, unknown>) {
  const tipo = String(body.tipo ?? "click");
  if (!TIPOS_HEATMAP.has(tipo)) throw new Error("Tipo de mapa inválido");
  const url = String(body.url ?? "");
  if (!SITES.some((s) => url === s || url.startsWith(s + "/"))) throw new Error("URL fora do site");
  const dias = Math.min(Math.max(Number(body.dias) || 30, 1), 90);

  const p = new URLSearchParams({
    type: tipo,
    date_from: `-${dias}d`,
    aggregation: "total_count",
  });
  // Mesma página com e sem barra final, e nos dois domínios.
  const caminho = new URL(url).pathname.replace(/\/$/, "");
  const re = `^https://(www\\.)?casamenteiro\\.com\\.br${caminho.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/?(\\?.*)?$`;
  p.set("url_pattern", re);
  if (body.largura_min) p.set("viewport_width_min", String(Number(body.largura_min)));
  if (body.largura_max) p.set("viewport_width_max", String(Number(body.largura_max)));

  const resp = await fetch(`${HOST}/api/projects/${PROJECT}/heatmaps/?${p}`, {
    headers: { Authorization: `Bearer ${KEY}` },
  });
  if (!resp.ok) throw new Error(`Heatmap: PostHog ${resp.status} ${(await resp.text()).slice(0, 200)}`);
  const d = await resp.json();
  return { pontos: d.results ?? [], dobra: d.fold ?? null, mais: !!d.has_more };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);

  const userId = await getUserId(req);
  if (!userId) return json({ error: "Não autenticado" }, 401);
  if (!(await isAdmin(userId))) return json({ error: "Acesso negado" }, 403);
  if (!KEY) return json({ error: "Falta o secret POSTHOG_PERSONAL_API_KEY no Supabase." }, 500);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }

  try {
    if (body.acao === "heatmap") return json(await heatmap(body));
    if (body.acao === "painel") {
      const dias = Math.min(Math.max(Math.round(Number(body.dias) || 30), 1), 90);
      const segmento = SEGMENTOS.has(String(body.segmento)) ? String(body.segmento) : "todos";
      return json(await painel(dias, segmento));
    }
    return json({ error: "Ação desconhecida" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 502);
  }
});
