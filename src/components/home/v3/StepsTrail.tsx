import { useEffect, useMemo, useRef, useState } from "react";

const PATH = "M166 60 C 260 -10, 400 130, 500 60 S 740 -10, 834 60";
const CORES = ["#D9905A", "#4A7C6A", "#F2B98A", "#A9551F", "#9FD3BE", "#1F1D1B"];

/**
 * Capítulo 03 — O caminho. 3 passos ligados por uma trilha pontilhada:
 * a trilha se desenha, 01 → 02 → 03 acendem em ordem e o 03 solta confete.
 * Ciclo de 8 s; todos apagam juntos e recomeçam. Só anima com a seção na tela.
 */
export default function StepsTrail({ onPasso }: { onPasso: (n: 1 | 2 | 3) => void }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setOn(true);
      return;
    }
    const io = new IntersectionObserver((es) => setOn(es.some((e) => e.isIntersecting)), { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const confete = useMemo(
    () =>
      Array.from({ length: 18 }).map((_, k) => {
        const ang = (Math.PI * 2 * k) / 18 + (k % 2 ? 0.2 : -0.1);
        const dist = 90 + (k % 3) * 38;
        const bola = k % 3 === 0;
        return {
          k,
          style: {
            position: "absolute",
            left: -4,
            top: -6,
            width: bola ? 8 : 6,
            height: bola ? 8 : 14,
            borderRadius: bola ? 9999 : 2,
            background: CORES[k % CORES.length],
            animationDelay: `${(k % 4) * 0.03}s`,
            ["--x" as any]: `${Math.round(Math.cos(ang) * dist)}px`,
            ["--y" as any]: `${Math.round(Math.sin(ang) * dist - 30)}px`,
            ["--r" as any]: `${((k * 47) % 360) + 180}deg`,
          } as React.CSSProperties,
        };
      }),
    [],
  );

  const passos = [
    { n: 1 as const, titulo: "Simulem", texto: "Cinco perguntas e o orçamento do casamento aparece na tela.", sombra: "rgba(169,85,31,.25)" },
    { n: 2 as const, titulo: "Comparem", texto: "Fornecedores avaliados respondem pelo chat, com proposta e anexos.", sombra: "rgba(74,124,106,.25)" },
    { n: 3 as const, titulo: "Celebrem", texto: "Contratem, reservem a data e acompanhem tudo no planejador.", sombra: "rgba(31,29,27,.3)" },
  ];

  return (
    <section aria-labelledby="how-title" className="px-6 pb-24 pt-6">
      <div ref={ref} className={`hv-steps mx-auto flex max-w-[1152px] flex-col gap-16 ${on ? "hv-steps-on" : ""}`}>
        <div className="flex flex-col items-center gap-3.5 text-center">
          <p className="hv-eyebrow m-0" style={{ color: "var(--hv-clay)" }}>
            Capítulo 03 · O caminho
          </p>
          <h2 id="how-title" className="hv-display m-0" style={{ fontSize: "clamp(40px, 5vw, 64px)" }}>
            Três passos e
            <br />
            vocês só <span className="hv-serif" style={{ color: "var(--hv-clay)" }}>curtem.</span>
          </h2>
        </div>

        <div className="relative">
          <svg className="hv-track absolute left-0 top-0 h-[120px] w-full overflow-visible" aria-hidden="true" viewBox="0 0 1000 120" preserveAspectRatio="none">
            <defs>
              <mask id="hv-draw-mask" maskUnits="userSpaceOnUse" x="-20" y="-40" width="1040" height="200">
                <path className="hv-draw" d={PATH} fill="none" stroke="#fff" strokeWidth="24" pathLength={1} strokeDasharray="1" strokeDashoffset={1} />
              </mask>
            </defs>
            <path d={PATH} fill="none" stroke="#E6E1D9" strokeWidth="3" strokeLinecap="round" strokeDasharray="0 12" vectorEffect="non-scaling-stroke" />
            <path d={PATH} fill="none" stroke="#D9905A" strokeWidth="4" strokeLinecap="round" strokeDasharray="0 12" vectorEffect="non-scaling-stroke" mask="url(#hv-draw-mask)" />
            {on && (
              <circle r="7" fill="#D9905A">
                <animateMotion dur="8s" repeatCount="indefinite" keyPoints="0;0;1;1;0" keyTimes="0;0.06;0.45;0.95;1" calcMode="linear" path={PATH} />
              </circle>
            )}
          </svg>

          <ol className="relative m-0 grid list-none gap-x-6 gap-y-10 p-0" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
            {passos.map((p) => {
              const num = (
                <button
                  type="button"
                  onClick={() => onPasso(p.n)}
                  aria-label={`Ir para o passo ${p.n}: ${p.titulo}`}
                  className={`hv-n hv-n${p.n} flex h-24 w-24 items-center justify-center rounded-full text-[36px] font-extrabold ${p.n === 3 ? "absolute inset-0" : "mt-3"}`}
                  style={{ letterSpacing: "-0.04em", boxShadow: `0 14px 30px ${p.sombra}` }}
                >
                  0{p.n}
                </button>
              );
              return (
                <li key={p.n} className="flex flex-col items-center gap-[18px] text-center">
                  {p.n === 3 ? (
                    <span className="hv-wig relative mt-3 h-24 w-24">
                      <span className="hv-ring absolute inset-0 rounded-full" aria-hidden="true" style={{ border: "3px solid var(--hv-terracota)" }} />
                      <span className="absolute left-1/2 top-1/2 h-0 w-0" aria-hidden="true">
                        {confete.map((c) => (
                          <span key={c.k} className="hv-conf" style={c.style} />
                        ))}
                      </span>
                      {num}
                    </span>
                  ) : (
                    num
                  )}
                  <div className={`hv-t hv-t${p.n} flex max-w-[300px] flex-col gap-2`}>
                    <span className="text-[30px] font-extrabold" style={{ letterSpacing: "-0.03em" }}>
                      {p.titulo}
                    </span>
                    <span className="text-[17px] leading-normal" style={{ color: "var(--hv-body)" }}>
                      {p.texto}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
