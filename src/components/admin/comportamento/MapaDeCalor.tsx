import { useEffect, useRef, useState } from "react";
import { buscarHeatmap, type RespostaHeatmap, type TipoHeatmap } from "./useComportamento";
import { Chips, Erro, Vazio } from "@/components/admin/oferta/ui";
import { num } from "@/lib/oferta";

const SITE = "https://www.casamenteiro.com.br";
const TELAS = {
  desktop: { largura: 1280, min: 1024, max: 4000, nome: "Computador" },
  celular: { largura: 390, min: 0, max: 767, nome: "Celular" },
} as const;
type Tela = keyof typeof TELAS;

/**
 * Mapa de calor de uma página: a própria página do site num iframe (sem medir, ver posthog.ts)
 * com os cliques do PostHog desenhados por cima num canvas.
 */
export default function MapaDeCalor({ paginas, dias }: { paginas: string[]; dias: number }) {
  const [caminho, setCaminho] = useState("/");
  const [digitado, setDigitado] = useState("/");
  const [tipo, setTipo] = useState<TipoHeatmap>("click");
  const [tela, setTela] = useState<Tela>("desktop");
  const [dados, setDados] = useState<RespostaHeatmap | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [alturaPagina, setAlturaPagina] = useState(2400);
  const [escala, setEscala] = useState(1);

  const caixa = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const iframe = useRef<HTMLIFrameElement>(null);
  const largura = TELAS[tela].largura;

  // busca os pontos
  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    setErro(null);
    buscarHeatmap({ tipo, url: SITE + caminho, dias, largura_min: TELAS[tela].min, largura_max: TELAS[tela].max })
      .then((d) => vivo && setDados(d))
      .catch((e) => vivo && setErro((e as Error).message))
      .finally(() => vivo && setCarregando(false));
    return () => {
      vivo = false;
    };
  }, [caminho, tipo, tela, dias]);

  // escala para caber na largura disponível
  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const medir = () => setEscala(Math.min(1, (el.clientWidth - 2) / largura));
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, [largura]);

  // altura real da página (mesmo domínio)
  const aoCarregar = () => {
    try {
      const doc = iframe.current?.contentDocument;
      const h = Math.max(doc?.documentElement.scrollHeight ?? 0, doc?.body?.scrollHeight ?? 0);
      if (h > 200) setAlturaPagina(Math.min(h, 12000));
    } catch {
      /* outro domínio: mantém a altura padrão */
    }
  };

  // desenha
  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    c.width = largura;
    c.height = alturaPagina;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    const pts = dados?.pontos ?? [];
    if (!pts.length) return;

    if (tipo === "scrolldepth") {
      const total = Math.max(1, ...pts.map((p) => p.cumulative_count ?? 0));
      const ordenados = [...pts].sort((a, b) => (a.scroll_depth_bucket ?? 0) - (b.scroll_depth_bucket ?? 0));
      let y0 = 0;
      for (const p of ordenados) {
        const y1 = Math.min(alturaPagina, p.scroll_depth_bucket ?? 0);
        const t = (p.cumulative_count ?? 0) / total;
        ctx.fillStyle = corQuente(t, 0.35);
        ctx.fillRect(0, y0, largura, Math.max(1, y1 - y0));
        y0 = y1;
      }
      return;
    }

    const max = Math.max(1, ...pts.map((p) => p.count ?? 1));
    const raio = tela === "celular" ? 22 : 30;
    // camada de intensidade em escala de cinza
    const off = document.createElement("canvas");
    off.width = largura;
    off.height = alturaPagina;
    const o = off.getContext("2d")!;
    for (const p of pts) {
      const x = (p.pointer_relative_x ?? 0) * largura;
      const y = p.pointer_y ?? 0;
      const a = Math.max(0.08, (p.count ?? 1) / max);
      const g = o.createRadialGradient(x, y, 0, x, y, raio);
      g.addColorStop(0, `rgba(0,0,0,${a})`);
      g.addColorStop(1, "rgba(0,0,0,0)");
      o.fillStyle = g;
      o.fillRect(x - raio, y - raio, raio * 2, raio * 2);
    }
    // colore pela intensidade
    const img = o.getImageData(0, 0, largura, alturaPagina);
    const d = img.data;
    for (let i = 3; i < d.length; i += 4) {
      const t = d[i] / 255;
      if (t < 0.02) continue;
      const [r, g, b] = rgbQuente(t);
      d[i - 3] = r;
      d[i - 2] = g;
      d[i - 1] = b;
      d[i] = Math.round(70 + 150 * t);
    }
    ctx.putImageData(img, 0, 0);
  }, [dados, tipo, largura, alturaPagina, tela]);

  const total = (dados?.pontos ?? []).reduce((s, p) => s + (p.count ?? p.bucket_count ?? 0), 0);
  const abriveis = paginas.filter((p) => !p.includes(":id")).slice(0, 15);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const v = digitado.trim();
            setCaminho(v.startsWith("/") ? v.replace(/\/+$/, "") || "/" : "/" + v);
          }}
          style={{ display: "flex", gap: 6 }}
        >
          <input
            className="of-input"
            list="of-paginas"
            value={digitado}
            onChange={(e) => setDigitado(e.target.value)}
            aria-label="Página"
            style={{ width: 240 }}
          />
          <datalist id="of-paginas">
            {abriveis.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
          <button className="cz-btn" type="submit">
            Ver
          </button>
        </form>
        <Chips
          rotulo="Tipo de mapa"
          valor={tipo}
          onChange={setTipo}
          opcoes={[
            { id: "click", nome: "Cliques" },
            { id: "rageclick", nome: "Cliques de raiva" },
            { id: "scrolldepth", nome: "Rolagem" },
          ]}
        />
        <Chips
          rotulo="Tela"
          valor={tela}
          onChange={setTela}
          opcoes={(Object.keys(TELAS) as Tela[]).map((t) => ({ id: t, nome: TELAS[t].nome }))}
        />
        <span style={{ fontSize: 12.5, color: "var(--ad-muted)" }}>
          {carregando
            ? "Carregando…"
            : `${num(total)} ${tipo === "scrolldepth" ? "visitas medidas" : "cliques"} em ${caminho}`}
        </span>
      </div>

      {erro && <Erro texto={erro} />}
      {!erro && !carregando && total === 0 && (
        <Vazio>
          Ainda sem dados para esta página. O PostHog só grava depois que a pessoa escolhe no banner de cookies; os
          primeiros pontos aparecem em algumas horas.
        </Vazio>
      )}

      <div ref={caixa} className="of-heat" style={{ height: Math.min(720, alturaPagina * escala + 2) }}>
        <div style={{ width: largura * escala, height: alturaPagina * escala, position: "relative" }}>
          <div
            style={{
              width: largura,
              height: alturaPagina,
              transform: `scale(${escala})`,
              transformOrigin: "0 0",
              position: "absolute",
              left: 0,
              top: 0,
            }}
          >
            <iframe
              ref={iframe}
              key={caminho + tela}
              src={caminho}
              title={`Página ${caminho}`}
              width={largura}
              height={alturaPagina}
              onLoad={aoCarregar}
              sandbox="allow-same-origin allow-scripts"
              tabIndex={-1}
            />
            <canvas ref={canvas} style={{ width: largura, height: alturaPagina }} />
          </div>
        </div>
      </div>
      <p style={{ margin: 0, fontSize: 12, color: "var(--ad-muted)" }}>
        A página aparece como está hoje; cliques antigos podem cair em lugares que mudaram. Elementos fixos (menu, botão
        do WhatsApp) somam cliques na posição em que estavam na tela.
      </p>
    </div>
  );
}

function rgbQuente(t: number): [number, number, number] {
  // azul-esverdeado → amarelo → laranja → argila
  const stops: [number, [number, number, number]][] = [
    [0, [74, 124, 106]],
    [0.35, [242, 201, 76]],
    [0.65, [217, 144, 90]],
    [1, [180, 65, 45]],
  ];
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0]) {
      const [t0, c0] = stops[i - 1];
      const [t1, c1] = stops[i];
      const k = (t - t0) / (t1 - t0);
      return [0, 1, 2].map((j) => Math.round(c0[j] + (c1[j] - c0[j]) * k)) as [number, number, number];
    }
  }
  return stops[stops.length - 1][1];
}

function corQuente(t: number, alfa: number) {
  const [r, g, b] = rgbQuente(t);
  return `rgba(${r},${g},${b},${alfa})`;
}
