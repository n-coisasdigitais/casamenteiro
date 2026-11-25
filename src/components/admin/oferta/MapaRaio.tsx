import { useEffect, useRef, useState } from "react";
import type { FornecedorOferta, OfertaConfig, Ponto } from "@/lib/oferta";

/**
 * Mapa real (Leaflet + OpenStreetMap) com o raio de atendimento de cada fornecedor,
 * a região foco e as cidades sem cobertura.
 */
export default function MapaRaio({
  fornecedores,
  config,
  cidadesSemCobertura = [],
  mostrarRaios = true,
  corPorCategoria,
}: {
  fornecedores: FornecedorOferta[];
  config: OfertaConfig;
  cidadesSemCobertura?: (Ponto & { cidade: string })[];
  mostrarRaios?: boolean;
  corPorCategoria?: (categoriaId: string | null) => string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapa = useRef<any>(null);
  const camada = useRef<any>(null);
  const L = useRef<any>(null);
  const [pronto, setPronto] = useState(false);
  const [falhou, setFalhou] = useState(false);

  // cria o mapa uma vez
  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const lib = (await import("leaflet")).default;
        await import("leaflet/dist/leaflet.css");
        if (cancelado || !ref.current) return;
        L.current = lib;
        mapa.current = lib
          .map(ref.current, { scrollWheelZoom: false, zoomControl: true })
          .setView([config.foco_lat, config.foco_lng], 7);
        lib
          .tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; CARTO',
            subdomains: "abcd",
            maxZoom: 18,
          })
          .addTo(mapa.current);
        camada.current = lib.layerGroup().addTo(mapa.current);
        setPronto(true);
      } catch {
        setFalhou(true);
      }
    })();
    return () => {
      cancelado = true;
      try {
        mapa.current?.remove();
      } catch {
        /* noop */
      }
      mapa.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // redesenha camadas
  useEffect(() => {
    const lib = L.current;
    if (!pronto || !lib || !camada.current) return;
    camada.current.clearLayers();

    lib
      .circle([config.foco_lat, config.foco_lng], {
        radius: config.foco_raio_km * 1000,
        color: "#1f1d1b",
        weight: 1.5,
        dashArray: "6 6",
        fill: false,
      })
      .bindTooltip(`Região foco: ${config.foco_nome} (${config.foco_raio_km} km)`)
      .addTo(camada.current);

    for (const c of cidadesSemCobertura) {
      lib
        .circleMarker([c.lat, c.lng], { radius: 2.5, color: "#b4412d", weight: 0, fillOpacity: 0.55 })
        .bindTooltip(`${c.cidade}: sem fornecedor que atenda`)
        .addTo(camada.current);
    }

    for (const f of fornecedores) {
      if (f.lat == null || f.lng == null) continue;
      const cor = corPorCategoria?.(f.categoria_id) ?? "#4a7c6a";
      if (mostrarRaios && f.modo !== "nacional" && (f.raio_km ?? 0) > 0) {
        lib
          .circle([f.lat, f.lng], {
            radius: (f.raio_km ?? 0) * 1000,
            color: cor,
            weight: 0.6,
            opacity: 0.5,
            fillColor: cor,
            fillOpacity: 0.06,
          })
          .addTo(camada.current);
      }
      lib
        .circleMarker([f.lat, f.lng], { radius: 5, color: "#fff", weight: 1.5, fillColor: cor, fillOpacity: 1 })
        .bindTooltip(
          `<b>${escapar(f.nome)}</b><br>${escapar(f.cidade ?? "")}${f.uf ? "/" + f.uf : ""}<br>${
            f.modo === "nacional" ? "Atende todo o Brasil" : `Raio de ${f.raio_km ?? 0} km`
          }`,
        )
        .addTo(camada.current);
    }
  }, [pronto, fornecedores, config, cidadesSemCobertura, mostrarRaios, corPorCategoria]);

  if (falhou) return <div className="of-vazio">Não foi possível carregar o mapa.</div>;
  return (
    <div ref={ref} className="of-mapa-leaflet" role="region" aria-label="Mapa de fornecedores e raio de atendimento" />
  );
}

function escapar(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
