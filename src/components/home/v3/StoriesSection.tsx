import { useCallback, useEffect, useRef, useState } from "react";
import { estiloFoco, type StoryBeat } from "@/lib/homeDestaques";
import { SponsorLink, useImpressao } from "./parts";

const DURACAO = 5000;

/**
 * Capítulo 02 — A virada, em formato de stories (9:16).
 * Troca sozinho a cada 5 s, toque à direita avança e à esquerda volta.
 * Stories 2 e 3 podem ser patrocinados (Home — Destaque dos Stories).
 */
export default function StoriesSection({ stories }: { stories: StoryBeat[] }) {
  const [atual, setAtual] = useState(0);
  const [visivel, setVisivel] = useState(false);
  const secRef = useRef<HTMLElement | null>(null);
  const n = stories.length;
  const s = stories[atual];
  const impRef = useImpressao(s, visivel);

  // só roda enquanto a seção está na tela
  useEffect(() => {
    const el = secRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisivel(true);
      return;
    }
    const io = new IntersectionObserver((es) => setVisivel(es.some((e) => e.isIntersecting)), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visivel || n < 2) return;
    const id = window.setTimeout(() => setAtual((a) => (a + 1) % n), DURACAO);
    return () => window.clearTimeout(id);
  }, [atual, visivel, n]);

  const ir = useCallback((i: number) => setAtual(((i % n) + n) % n), [n]);

  if (!n) return null;
  const patrocinado = !!s.purchaseId;

  return (
    <section ref={secRef} aria-labelledby="story-title" className="px-6 py-28" style={{ background: "var(--hv-sand)" }}>
      <div className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-center gap-x-20 gap-y-14">
        {/* Card 9:16 */}
        <div
          ref={impRef as any}
          className="relative w-[340px] max-w-full shrink-0 overflow-hidden rounded-[28px] text-white"
          style={{ aspectRatio: "9 / 16", background: "var(--hv-ink)", boxShadow: "0 40px 80px rgba(110,60,25,.28)" }}
        >
          {stories.map((b, i) => (
            <img
              key={b.key}
              src={b.imagem}
              alt={i === atual ? b.alt : ""}
              aria-hidden={i !== atual}
              loading="lazy"
              className="hv-foco absolute inset-0 h-full w-full object-cover"
              style={{ ...estiloFoco(b), opacity: i === atual ? 1 : 0, transform: i === atual ? "scale(1)" : "scale(1.06)", transition: "opacity .7s ease, transform 1.2s cubic-bezier(.2,.7,.2,1)" }}
            />
          ))}
          <div aria-hidden="true" className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(0,0,0,.45) 0%, transparent 22%, transparent 45%, rgba(0,0,0,.82) 100%)" }} />

          {/* barras de progresso */}
          <div aria-hidden="true" className="absolute left-3 right-3 top-3 grid gap-1" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
            {stories.map((b, i) => (
              <span key={b.key} className="block h-[3px] overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,.35)" }}>
                <span
                  key={i === atual ? `on-${atual}-${visivel}` : `off-${i}`}
                  className={`block h-full rounded-full bg-white ${i === atual && visivel ? "hv-story-bar" : ""}`}
                  style={{ width: i < atual ? "100%" : 0, animationDuration: `${DURACAO}ms` }}
                />
              </span>
            ))}
          </div>

          {/* cabeçalho */}
          <div className="absolute left-3.5 right-3.5 top-[26px] flex items-center gap-2.5 text-sm">
            <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full border-2 border-white font-extrabold" style={{ background: "var(--hv-terracota)", color: "var(--hv-ink)" }}>
              {patrocinado ? "★" : "c."}
            </span>
            <span className="flex flex-col leading-tight">
              <span className="font-bold">{patrocinado ? s.supplierNome : "casamenteiro"}</span>
              <span className="text-xs" style={{ color: "rgba(255,255,255,.8)" }}>
                {patrocinado ? "Patrocinado" : `${String(atual + 1).padStart(2, "0")} / ${String(n).padStart(2, "0")}`}
              </span>
            </span>
          </div>

          {/* áreas de toque */}
          <button type="button" aria-label="Story anterior" onClick={() => ir(atual - 1)} className="absolute bottom-40 left-0 top-20 w-[35%] cursor-pointer bg-transparent" />
          <button type="button" aria-label="Próximo story" onClick={() => ir(atual + 1)} className="absolute bottom-40 right-0 top-20 w-[65%] cursor-pointer bg-transparent" />

          {/* texto */}
          <div key={s.key} className="hv-in absolute bottom-7 left-5 right-5 flex flex-col gap-2.5" aria-live="polite">
            <span className="self-start rounded-full px-2.5 py-1 text-xs font-extrabold uppercase" style={{ letterSpacing: ".08em", background: "var(--hv-peach)", color: "var(--hv-ink)" }}>
              {s.tag}
            </span>
            <span className="text-[28px] font-extrabold leading-[1.05]" style={{ letterSpacing: "-0.035em" }}>
              {s.titulo}
            </span>
            <span className="text-[15px] leading-snug" style={{ color: "#f4e7dc" }}>
              {s.subtexto}
            </span>
            {patrocinado && (
              <SponsorLink slide={s} className="hv-btn relative z-[2] mt-1 inline-flex min-h-[40px] items-center self-start rounded-full bg-white px-4 text-sm font-bold" style={{ color: "var(--hv-ink)" }}>
                Ver {s.supplierNome} ›
              </SponsorLink>
            )}
          </div>
        </div>

        {/* texto + destaques */}
        <div className="flex min-w-0 max-w-[520px] flex-1 basis-[420px] flex-col gap-5">
          <p className="hv-eyebrow m-0" style={{ color: "var(--hv-clay)" }}>
            Capítulo 02 · A virada
          </p>
          <h2 id="story-title" className="hv-display m-0" style={{ fontSize: "clamp(40px, 5vw, 60px)" }}>
            Casar não precisa
            <br />
            ser um <span className="hv-serif" style={{ color: "var(--hv-clay)" }}>caos.</span>
          </h2>
          <p className="m-0 text-[19px] leading-normal" style={{ color: "var(--hv-body)" }}>
            Toque nos destaques ou no story para ver como o Casamenteiro muda o jogo.
          </p>
          <div role="tablist" aria-label="Destaques" className="mt-2 flex flex-wrap gap-4">
            {stories.map((b, i) => {
              const on = i === atual;
              return (
                <button key={b.key} type="button" role="tab" aria-selected={on} onClick={() => ir(i)} className="flex w-[84px] flex-col items-center gap-2 bg-transparent p-0">
                  <span
                    className="block h-[76px] w-[76px] rounded-full p-[3px] transition-all duration-300"
                    style={{ background: on ? "conic-gradient(#a9551f, #f2b98a, #4a7c6a, #a9551f)" : "#d9c9b8", transform: on ? "scale(1.08)" : "none" }}
                  >
                    <img src={b.imagem} alt="" loading="lazy" className="hv-foco block h-full w-full rounded-full object-cover" style={{ ...estiloFoco(b), border: "3px solid var(--hv-sand)" }} />
                  </span>
                  <span className="text-[13px]" style={{ color: on ? "var(--hv-ink)" : "var(--hv-body)", fontWeight: on ? 700 : 500 }}>
                    {b.curto}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
