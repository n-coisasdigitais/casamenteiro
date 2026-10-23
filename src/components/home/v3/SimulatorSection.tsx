import { forwardRef } from "react";
import { estiloFoco, type Slide } from "@/lib/homeDestaques";
import { indiceRotacao } from "@/hooks/useRotacao";
import SimulatorCTA from "@/components/home/SimulatorCTA";
import { ChapterLabel, Dots, SponsorLink, useImpressao } from "./parts";

/**
 * Passo 1 · Simulem — foto em cima (Home — Destaque do Formulário) e o
 * formulário real do simulador já aberto na pergunta 1, sobreposto à foto.
 */
const SimulatorSection = forwardRef<HTMLElement, { slides: Slide[]; tick: number }>(({ slides, tick }, ref) => {
  const atual = indiceRotacao(tick, slides.length, 1);
  const s = slides[atual];
  const impRef = useImpressao(s, true);

  return (
    <section ref={ref} id="simular" aria-labelledby="sim-title" className="scroll-mt-20 px-6 pb-28 pt-6">
      <div className="mx-auto flex max-w-[1100px] flex-col items-center gap-7">
        <div className="flex flex-col items-center gap-3 text-center">
          <ChapterLabel n="01" text="Passo 1 · Simulem" color="var(--hv-clay)" />
          <h2 id="sim-title" className="hv-display m-0" style={{ fontSize: "clamp(34px, 4.4vw, 56px)", lineHeight: 1.05 }}>
            Vamos planejar o casamento
            <br />
            dos seus <span className="hv-serif" style={{ color: "var(--hv-clay)" }}>sonhos?</span>
          </h2>
        </div>

        <div className="relative w-full">
          <div ref={impRef as any} className="relative h-[260px] overflow-hidden rounded-[32px] md:h-[300px]" style={{ background: "var(--hv-ink)" }}>
            {slides.map((sl, i) => (
              <img
                key={sl.key}
                src={sl.imagem}
                alt={i === atual ? sl.alt : ""}
                aria-hidden={i !== atual}
                loading="lazy"
                className="hv-foco absolute inset-0 h-full w-full object-cover"
                style={{ ...estiloFoco(sl), opacity: i === atual ? 1 : 0, transition: "opacity 1.2s ease" }}
              />
            ))}
            {s?.purchaseId && (
              <SponsorLink
                slide={s}
                className="absolute right-5 top-5 inline-flex min-h-[40px] items-center gap-2 rounded-full px-3.5 text-[13px] text-white"
                style={{ background: "rgba(20,14,10,.5)", border: "1px solid rgba(255,255,255,.3)" }}
              >
                Foto: <strong>{s.supplierNome}</strong>
                <span className="text-[11px] font-extrabold uppercase" style={{ letterSpacing: ".06em", color: "var(--hv-peach)" }}>
                  Patrocinado
                </span>
              </SponsorLink>
            )}
            <div className="absolute left-5 top-6">
              <Dots n={slides.length} atual={atual} />
            </div>
          </div>

          <div className="relative mx-auto -mt-[120px] w-[min(720px,calc(100%-24px))]">
            <SimulatorCTA embedded initialStep={1} />
          </div>
        </div>
      </div>
    </section>
  );
});

SimulatorSection.displayName = "SimulatorSection";
export default SimulatorSection;
