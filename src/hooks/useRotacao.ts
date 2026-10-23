import { useEffect, useState } from "react";

/**
 * Relógio único de rotação dos destaques da Home.
 * Avança a cada `ms` e pausa quando a aba está em segundo plano
 * (assim nenhum patrocinador "gasta" tempo de tela sem ninguém ver).
 */
export function useRotacao(ms = 6000) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduz = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let id: number | undefined;
    const start = () => {
      if (id === undefined) id = window.setInterval(() => setTick((t) => t + 1), reduz ? ms * 2 : ms);
    };
    const stop = () => {
      if (id !== undefined) {
        window.clearInterval(id);
        id = undefined;
      }
    };
    const onVis = () => (document.hidden ? stop() : start());
    start();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [ms]);

  return tick;
}

/** Índice atual dentro de uma lista de `n` itens, com deslocamento opcional. */
export const indiceRotacao = (tick: number, n: number, offset = 0) => (n > 0 ? (tick + offset) % n : 0);
