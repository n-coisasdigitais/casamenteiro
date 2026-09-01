import { useRef, useState } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
  useMotionValueEvent,
  MotionValue,
} from "framer-motion";

/**
 * Ponte MotionValue -> style inline.
 *
 * O framer-motion v12 renderiza MotionValues de opacidade via WAAPI
 * (element.animate()), que nesta versão NÃO sincroniza com useScroll de
 * alvo (bug: a opacidade fica presa num estado antigo enquanto o scroll
 * anda — as imagens acompanham porque scale/transform usam style inline).
 * Convertendo o MotionValue em número via state, a opacidade vira style
 * inline e acompanha o scroll no mesmo ritmo do scale.
 */
function useInlineOpacity(value: MotionValue<number>) {
  const [v, setV] = useState(() => value.get());
  useMotionValueEvent(value, "change", (nv) => setV(nv));
  return v;
}

export type Bloco = {
  foto_url: string;
  frase: string;
  subtexto?: string | null;
  supplier_id?: string | null;
  supplier_name?: string | null;
  supplier_category?: string | null;
};

/**
 * Scroll-story: foto que troca + texto que entra pela lateral, dirigido pelo scroll.
 *
 * Correção do bug "beat some / beats se misturam": as janelas de cada beat são
 * MONOTÔNICAS e só vizinhos se cruzam (crossfade limpo). Imagem e texto trocam
 * no MESMO limite, cobrindo 0 -> 1 sem buracos e sem keyframes duplicados.
 *
 * IMPORTANTE: este componente só funciona com UMA instância no DOM. Se o
 * hero aparecer duplicado (prerender estático + React), conserte a duplicação
 * primeiro — senão duas cópias vão se sobrepor por mais correta que a lógica seja.
 */
export default function ScrollStory({ blocos, onCTA }: { blocos: Bloco[]; onCTA?: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const beats = blocos.length;
  const sectionVh = beats * 120;

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  if (beats === 0) return null;

  const Cta = (
    <div className="pointer-events-auto flex flex-wrap items-center gap-3">
      {onCTA ? (
        <button
          onClick={onCTA}
          className="rounded-full px-7 py-3.5 text-base font-semibold transition-transform hover:scale-[1.03]"
          style={{ background: "hsl(var(--color-primary))", color: "hsl(48 27% 98%)" }}
        >
          Simular meu casamento
        </button>
      ) : (
        <a
          href="/simulador"
          className="rounded-full px-7 py-3.5 text-base font-semibold transition-transform hover:scale-[1.03]"
          style={{ background: "hsl(var(--color-primary))", color: "hsl(48 27% 98%)" }}
        >
          Simular meu casamento
        </a>
      )}
      <a
        href="/explorar"
        className="rounded-full px-7 py-3.5 text-base font-semibold"
        style={{ border: "1px solid hsl(48 27% 98% / 0.6)", color: "hsl(48 27% 98%)" }}
      >
        Ver fornecedores
      </a>
    </div>
  );

  if (reduce) {
    // Sem animação: empilha os beats de forma legível (acessibilidade)
    return (
      <div className="bg-black">
        {blocos.map((b, i) => (
          <div key={i} className="relative h-[70vh] w-full overflow-hidden">
            <img src={b.foto_url} alt={b.frase} className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0" style={{ background: "hsl(0 0% 0% / 0.5)" }} />
            <div className="relative z-10 h-full container flex items-center">
              <div className="max-w-lg">
                <h2
                  className="text-3xl md:text-5xl text-white mb-4"
                  style={{ fontWeight: 700, letterSpacing: "-0.02em" }}
                >
                  {b.frase}
                </h2>
                {b.subtexto && (
                  <p className="text-lg mb-6" style={{ color: "hsl(48 30% 96%)" }}>
                    {b.subtexto}
                  </p>
                )}
                {i === 0 && Cta}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
<div ref={ref} style={{ height: `${sectionVh}vh`, position: "relative" }}>
      <div className="sticky top-0 h-screen w-full bg-black">
        <div className="absolute inset-0 overflow-hidden">
          {blocos.map((b, i) => (
            <ImageLayer key={i} index={i} total={beats} src={b.foto_url} alt={b.frase} progress={scrollYProgress} />
          ))}

          <div
            className="absolute inset-0 z-10 pointer-events-none"
            style={{
              background:
                "linear-gradient(180deg, hsl(0 0% 0% / 0.55) 0%, hsl(0 0% 0% / 0.3) 40%, hsl(0 0% 0% / 0.65) 100%)",
            }}
          />

          {blocos.map((b, i) => (
            <TextLayer key={i} index={i} total={beats} bloco={b} progress={scrollYProgress} />
          ))}

          {/* CTA fixo: sempre visível durante todo o hero, não depende do scroll */}
          <div className="absolute inset-x-0 bottom-8 md:bottom-12 z-30 px-6 md:px-16 pointer-events-none">{Cta}</div>
        </div>
      </div>
    </div>
  );
}

/** Janela do beat `index` como keyframes estritamente crescentes em [0,1]. */
function beatWindow(index: number, total: number) {
  const w = 1 / total;
  const half = (w * 0.5) / 2; // crossfade = 50% de uma janela
  const left = index * w;
  const right = (index + 1) * w;
  return {
    inStart: left - half,
    inEnd: left + half,
    outStart: right - half,
    outEnd: right + half,
    center: left + w / 2,
    left,
    right,
  };
}

function opacityKeyframes(index: number, total: number) {
  const w = beatWindow(index, total);
  const isFirst = index === 0;
  const isLast = index === total - 1;
  if (isFirst && isLast) return { range: [0, 1], out: [1, 1] };
  if (isFirst) return { range: [0, w.outStart, w.outEnd], out: [1, 1, 0] };
  if (isLast) return { range: [w.inStart, w.inEnd, 1], out: [0, 1, 1] };
  return { range: [w.inStart, w.inEnd, w.outStart, w.outEnd], out: [0, 1, 1, 0] };
}

function ImageLayer({
  index,
  total,
  src,
  alt,
  progress,
}: {
  index: number;
  total: number;
  src: string;
  alt: string;
  progress: MotionValue<number>;
}) {
const w = beatWindow(index, total);
  const { range, out } = opacityKeyframes(index, total);
  const opacity = useTransform(progress, range, out);
  const scale = useTransform(progress, [w.left, w.right], [1.06, 1.0]);
  const opacityInline = useInlineOpacity(opacity);
  return (
    <motion.img
      src={src}
      alt={alt}
      loading={index < 2 ? "eager" : "lazy"}
      style={{ opacity: opacityInline, scale }}
      className="absolute inset-0 w-full h-full object-cover"
    />
  );
}

function TextLayer({
  index,
  total,
  bloco,
  progress,
}: {
  index: number;
  total: number;
  bloco: Bloco;
  progress: MotionValue<number>;
}) {
  const w = beatWindow(index, total);
  const isFirst = index === 0;
  const isLast = index === total - 1;
const { range, out } = opacityKeyframes(index, total);
  const opacity = useTransform(progress, range, out);
  const opacityInline = useInlineOpacity(opacity);

  const sideRight = index % 2 === 1;
  const fromX = isFirst ? 0 : sideRight ? 80 : -80;
  const driftX = isFirst ? 0 : sideRight ? -24 : 24;
  const x = useTransform(progress, [isFirst ? 0 : w.inStart, w.center, isLast ? 1 : w.outEnd], [fromX, 0, driftX]);

  const num = String(index + 1).padStart(2, "0");
  const textCol = "hsl(48, 27%, 98%)";
  const mutedCol = "hsl(48, 30%, 96%)";
  const textShadow = "0 2px 14px hsl(0 0% 0% / 0.55), 0 1px 3px hsl(0 0% 0% / 0.4)";

  return (
<motion.div
      style={{ opacity: opacityInline }}
      className={`absolute inset-0 z-20 flex px-6 md:px-16 pointer-events-none items-center ${sideRight ? "justify-end" : "justify-start"}`}
    >
      <motion.div style={{ x }} className="max-w-md md:max-w-lg">
        <p className="label-ui mb-4" style={{ color: "hsl(var(--color-primary))" }}>
          {num} / {String(total).padStart(2, "0")}
        </p>
        <h2
          className="text-3xl md:text-5xl lg:text-6xl mb-5"
          style={{ color: textCol, lineHeight: 1.1, fontWeight: 700, letterSpacing: "-0.02em", textShadow }}
        >
          {bloco.frase}
        </h2>
        {bloco.subtexto && (
          <p className="text-base md:text-lg" style={{ color: mutedCol, lineHeight: 1.6, textShadow, fontWeight: 500 }}>
            {bloco.subtexto}
          </p>
        )}
      </motion.div>
    </motion.div>
  );
}
