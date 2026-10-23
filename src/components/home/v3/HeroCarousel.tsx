import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { estiloFoco, type Slide } from "@/lib/homeDestaques";
import { indiceRotacao } from "@/hooks/useRotacao";
import { Dots, SponsorLink, useImpressao } from "./parts";

/**
 * Capítulo 01 — O sonho.
 * Hero em carrossel: destaques pagos (Home — Destaque Hero) com legenda
 * "Patrocinado"; sem pagante, mostra as fotos padrão.
 */
export default function HeroCarousel({ slides, tick, onSimular }: { slides: Slide[]; tick: number; onSimular: () => void }) {
  const atual = indiceRotacao(tick, slides.length);
  const s = slides[atual];
  const refImp = useImpressao(s, true);

  return (
    <section ref={refImp as any} className="relative overflow-hidden text-white" style={{ height: "max(640px, 100svh)", maxHeight: 900 }}>
      {slides.map((sl, i) => (
        <img
          key={sl.key}
          src={sl.imagem}
          alt={i === atual ? sl.alt : ""}
          aria-hidden={i !== atual}
          loading={i === 0 ? "eager" : "lazy"}
          fetchPriority={i === 0 ? "high" : undefined}
          className={`hv-foco absolute inset-0 h-full w-full object-cover ${i === 0 ? "hv-kb" : ""}`}
          style={{ ...estiloFoco(sl), opacity: i === atual ? 1 : 0, transition: "opacity 1.2s ease" }}
        />
      ))}
      <div aria-hidden="true" className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(20,14,10,.55) 0%, rgba(20,14,10,.1) 38%, rgba(20,14,10,.78) 100%)" }} />

      <div className="relative mx-auto flex h-full max-w-[1200px] flex-col justify-end gap-5 px-6 pb-24">
        <p className="hv-up m-0 inline-flex items-center gap-2.5 self-start rounded-full px-3.5 py-2 text-sm font-semibold" style={{ letterSpacing: ".04em", background: "rgba(255,255,255,.14)", border: "1px solid rgba(255,255,255,.3)" }}>
          <span className="hv-pulse h-2 w-2 rounded-full" style={{ background: "var(--hv-peach)" }} />
          Belo Horizonte e região
        </p>
        <h1 className="hv-up hv-d1 m-0 max-w-[900px]" style={{ fontSize: "clamp(46px, 7.4vw, 104px)", lineHeight: 0.98, fontWeight: 800, letterSpacing: "-0.045em", textShadow: "0 4px 40px rgba(0,0,0,.35)" }}>
          O dia mais feliz
          <br />
          começa <span className="hv-serif" style={{ color: "#f7c9a1" }}>leve.</span>
        </h1>
        <p className="hv-up hv-d2 m-0 max-w-[560px]" style={{ fontSize: "clamp(18px, 1.8vw, 22px)", lineHeight: 1.45, color: "#fbefe5" }}>
          Descubra em 1 minuto quanto custa o seu casamento, encontre fornecedores avaliados e organize tudo num lugar só.
        </p>
        <div className="hv-up hv-d3 mt-2 flex flex-wrap items-center gap-3">
          <button type="button" onClick={onSimular} className="hv-btn inline-flex min-h-[58px] items-center gap-2.5 rounded-full bg-white px-8 text-[17px] font-bold" style={{ color: "var(--hv-ink)" }}>
            Simular meu casamento <ArrowRight className="h-[18px] w-[18px]" />
          </button>
          <Link to="/explorar" className="hv-btn inline-flex min-h-[58px] items-center rounded-full px-7 text-[17px] font-semibold text-white" style={{ background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.55)" }}>
            Explorar fornecedores
          </Link>
        </div>
      </div>

      {s?.purchaseId && (
        <SponsorLink
          slide={s}
          className="absolute left-6 top-[92px] z-[3] inline-flex md:bottom-7 md:left-auto md:right-6 md:top-auto min-h-[44px] items-center gap-2.5 rounded-full py-0 pl-[7px] pr-4 text-sm text-white"
          style={{ background: "rgba(20,14,10,.45)", border: "1px solid rgba(255,255,255,.3)", backdropFilter: "blur(8px)" }}
        >
          <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full text-xs font-extrabold" style={{ background: "var(--hv-peach)", color: "var(--hv-ink)" }}>
            ★
          </span>
          <span>
            Foto: <strong>{s.supplierNome}</strong>
            {s.categoriaNome ? ` · ${s.categoriaNome}` : ""}
          </span>
          <span className="text-[11px] font-extrabold uppercase" style={{ letterSpacing: ".06em", color: "var(--hv-peach)" }}>
            Patrocinado
          </span>
        </SponsorLink>
      )}

      <div className="absolute bottom-5 left-1/2 z-[3] -translate-x-1/2">
        <Dots n={slides.length} atual={atual} />
      </div>
    </section>
  );
}
