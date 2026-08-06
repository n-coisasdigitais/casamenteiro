import { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion, MotionValue } from "framer-motion";

export type Bloco = {
  foto_url: string;
  frase: string;
  subtexto?: string | null;
  supplier_id?: string | null;
  supplier_name?: string | null;
  supplier_category?: string | null;
};

/**
 * Narrativa curta de dor -> solução (estilo MindMarket): poucos beats, imagem
 * que troca e texto que entra pela lateral. Enxuto de propósito — a pessoa
 * precisa LER; o resto da home (tabs de funcionalidades) é estático.
 * Cada beat dura ~120vh (bem menos que os 200vh antigos).
 */
export default function ScrollStory({ blocos }: { blocos: Bloco[]; onCTA?: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const beats = blocos.length;
  const sectionVh = beats * 120;

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

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
                  <p className="text-lg" style={{ color: "hsl(48 30% 96%)" }}>
                    {b.subtexto}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div ref={ref} style={{ height: `${sectionVh}vh`, position: "relative" }}>
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-black">
        {blocos.map((b, i) => (
          <ImageLayer key={i} index={i} total={beats} src={b.foto_url} alt={b.frase} progress={scrollYProgress} />
        ))}

        <div
          className="absolute inset-0 z-10 pointer-events-none"
          style={{
            background:
              "linear-gradient(180deg, hsl(0 0% 0% / 0.55) 0%, hsl(0 0% 0% / 0.3) 40%, hsl(0 0% 0% / 0.6) 100%)",
          }}
        />

        {blocos.map((b, i) => (
          <TextLayer key={i} index={i} total={beats} bloco={b} progress={scrollYProgress} />
        ))}
      </div>
    </div>
  );
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
  const span = 1 / total;
  const start = index / total;
  const swapStart = start + span * 0.7;
  const swapEnd = start + span * 0.95;

  const isFirst = index === 0;
  const isLast = index === total - 1;

  const opacity = useTransform(
    progress,
    [Math.max(0, start - span * 0.05), start, swapStart, swapEnd],
    [isFirst ? 1 : 0, 1, 1, isLast ? 1 : 0],
  );
  const scale = useTransform(progress, [start, start + span], [1.06, 1.0]);

  return (
    <motion.img
      src={src}
      alt={alt}
      loading={index < 2 ? "eager" : "lazy"}
      style={{ opacity, scale }}
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
  const span = 1 / total;
  const start = index / total;
  const inEnd = start + span * 0.22;
  const outStart = start + span * 0.62;
  const outEnd = start + span * 0.95;
  const mid = start + span * 0.4;

  const sideRight = index % 2 === 1;
  const fromX = sideRight ? 80 : -80;

  const opacity = useTransform(progress, [start, start, inEnd, outStart, outEnd], [0, 0, 1, 1, 0]);
  const x = useTransform(progress, [start, mid, outEnd], [fromX, 0, sideRight ? -24 : 24]);

  const num = String(index + 1).padStart(2, "0");
  const textCol = "hsl(48, 27%, 98%)";
  const mutedCol = "hsl(48, 30%, 96%)";
  const textShadow = "0 2px 14px hsl(0 0% 0% / 0.55), 0 1px 3px hsl(0 0% 0% / 0.4)";

  return (
    <motion.div
      style={{ opacity }}
      className={`absolute inset-0 z-20 flex px-6 md:px-16 pointer-events-none items-center ${
        sideRight ? "justify-end" : "justify-start"
      }`}
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
