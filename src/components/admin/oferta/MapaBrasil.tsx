import { useEffect, useMemo, useState } from "react";
import { ESCALA, faixaCor, num } from "@/lib/oferta";
import { Legenda } from "./ui";

type Geo = { w: number; h: number; paths: Record<string, string>; cent: Record<string, [number, number]> };

let cache: Promise<Geo> | null = null;
function carregarGeo() {
  cache ??= fetch("/geo/br-estados.json").then((r) => r.json());
  return cache;
}

const PEQUENOS = new Set(["DF", "SE", "AL", "PB", "RN", "ES", "RJ"]);

/** Mapa do Brasil por estado (estilo Google Analytics). Clique escolhe a UF. */
export default function MapaBrasil({
  valores,
  selecionada,
  onSelecionar,
  rotuloValor = "fornecedores",
}: {
  valores: Map<string, number>;
  selecionada?: string | null;
  onSelecionar?: (uf: string | null) => void;
  rotuloValor?: string;
}) {
  const [geo, setGeo] = useState<Geo | null>(null);
  const [hover, setHover] = useState<string | null>(null);

  useEffect(() => {
    carregarGeo()
      .then(setGeo)
      .catch(() => setGeo(null));
  }, []);

  const max = useMemo(() => Math.max(0, ...valores.values()), [valores]);

  if (!geo) return <div className="of-vazio">Carregando mapa…</div>;

  const foco = hover ?? selecionada ?? null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <svg
        className="of-mapa-br"
        viewBox={`0 0 ${geo.w} ${geo.h}`}
        role="img"
        aria-label={`Mapa do Brasil: ${rotuloValor} por estado`}
      >
        {Object.entries(geo.paths).map(([uf, d]) => {
          const v = valores.get(uf) ?? 0;
          const sel = uf === selecionada;
          return (
            <path
              key={uf}
              d={d}
              fill={faixaCor(v, max)}
              stroke={sel ? "#1f1d1b" : "#ffffff"}
              strokeWidth={sel ? 2 : 0.8}
              style={{ cursor: onSelecionar ? "pointer" : "default" }}
              onMouseEnter={() => setHover(uf)}
              onMouseLeave={() => setHover(null)}
              onClick={() => onSelecionar?.(sel ? null : uf)}
            >
              <title>{`${uf}: ${num(v)} ${rotuloValor}`}</title>
            </path>
          );
        })}
        {Object.entries(geo.cent)
          .filter(([uf]) => !PEQUENOS.has(uf))
          .map(([uf, [x, y]]) => (
            <text
              key={uf}
              x={x}
              y={y}
              textAnchor="middle"
              fontSize={10}
              fontWeight={700}
              fill={
                faixaCor(valores.get(uf) ?? 0, max) === ESCALA[4] || faixaCor(valores.get(uf) ?? 0, max) === ESCALA[3]
                  ? "#fff"
                  : "#5e564e"
              }
              style={{ pointerEvents: "none" }}
            >
              {uf}
            </text>
          ))}
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <Legenda
          itens={[
            { cor: ESCALA[0], rotulo: "nenhum", borda: "#e0d6ca" },
            { cor: ESCALA[1], rotulo: "poucos" },
            { cor: ESCALA[4], rotulo: `mais (${num(max)})` },
          ]}
        />
        <span style={{ fontSize: 13, color: "var(--ad-body)" }}>
          {foco ? (
            <>
              <b style={{ color: "var(--ad-ink)" }}>{foco}</b>: {num(valores.get(foco) ?? 0)} {rotuloValor}
            </>
          ) : (
            "Passe o mouse ou clique num estado"
          )}
        </span>
      </div>
    </div>
  );
}
