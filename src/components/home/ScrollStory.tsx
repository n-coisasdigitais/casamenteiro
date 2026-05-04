import { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion, MotionValue } from "framer-motion";
import { Link } from "react-router-dom";

export type Bloco = {
  foto_url: string;
  frase: string;
  subtexto?: string | null;
  supplier_id?: string | null;
  supplier_name?: string | null;
  supplier_category?: string | null;
};

// Warm palette per chapter (HSL strings)
const CHAPTER_BG = [
  "hsl(48, 27%, 98%)",   // cream
  "hsl(36, 30%, 90%)",   // sand
  "hsl(23, 35%, 82%)",   // peach
  "hsl(156, 18%, 80%)",  // sage
  "hsl(30, 12%, 18%)",   // dark cocoa
];

export default function ScrollStory({ blocos, onCTA }: { blocos: Bloco[]; onCTA: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const n = blocos.length;
  // Mais respiro por capítulo: ~1.6 viewport cada — assim o texto tem tempo de aparecer e ser lido antes da imagem trocar
  const sectionVh = Math.round((n + 0.6) * 160);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  // Título fixo aparece apenas no primeiro capítulo (0..1/n)
  const firstChapterEnd = 1 / n;
  const introOpacity = useTransform(
    scrollYProgress,
    [0, firstChapterEnd * 0.5, firstChapterEnd * 0.85],
    [1, 0.7, 0]
  );
  const introY = useTransform(scrollYProgress, [0, firstChapterEnd * 0.85], [0, -40]);

  return (
    <div ref={ref} style={{ height: `${sectionVh}vh`, position: "relative" }}>
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-black">
        {/* Full-bleed image stack — each chapter fills the screen */}
        {blocos.map((b, i) => (
          <ImageLayer key={i} index={i} total={n} src={b.foto_url} alt={b.frase} progress={scrollYProgress} />
        ))}

        {/* Dark gradient overlay for text legibility */}
        <div
          className="absolute inset-0 z-10 pointer-events-none"
          style={{
            background:
              "linear-gradient(180deg, hsl(0 0% 0% / 0.55) 0%, hsl(0 0% 0% / 0.25) 35%, hsl(0 0% 0% / 0.25) 65%, hsl(0 0% 0% / 0.7) 100%)",
          }}
        />

        {/* Fixed curiosity headline (visible only on first chapter) */}
        <motion.div
          style={{ opacity: reduce ? 1 : introOpacity, y: reduce ? 0 : introY }}
          className="absolute top-0 left-0 right-0 z-30 pt-28 md:pt-32 px-6 md:px-16 flex flex-col items-center text-center pointer-events-none"
        >
          <p className="label-ui mb-3" style={{ color: "hsl(48, 27%, 96% / 0.85)" }}>
            uma história em 5 capítulos
          </p>
          <h1
            className="text-white max-w-3xl"
            style={{ fontSize: "clamp(2rem, 5vw, 3.75rem)", lineHeight: 1.05, fontWeight: 700, letterSpacing: "-0.02em" }}
          >
            E se planejar o casamento fosse a parte boa?
          </h1>
        </motion.div>

        {/* Texts per chapter — slide in from alternating sides */}
        {blocos.map((b, i) => (
          <TextLayer
            key={i}
            index={i}
            total={n}
            bloco={b}
            progress={scrollYProgress}
            onCTA={i === n - 1 ? onCTA : undefined}
            isLast={i === n - 1}
          />
        ))}

        <ScrollHint progress={scrollYProgress} />
      </div>
    </div>
  );
}

function ImageLayer({ index, total, src, alt, progress }: {
  index: number; total: number; src: string; alt: string; progress: MotionValue<number>;
}) {
  // Cada capítulo ocupa 1/total. A imagem fica visível na maior parte do capítulo
  // e só faz crossfade nos ~12% finais, depois que o texto já saiu.
  const span = 1 / total;
  const start = index / total;
  const end = (index + 1) / total;
  const fadeInEnd = start + span * 0.12;
  const fadeOutStart = end - span * 0.12;

  const isFirst = index === 0;
  const isLast = index === total - 1;

  const opacity = useTransform(
    progress,
    [Math.max(0, start - 0.001), fadeInEnd, fadeOutStart, end],
    [isFirst ? 1 : 0, 1, 1, isLast ? 1 : 0]
  );
  const scale = useTransform(progress, [start, end], [1.06, 0.98]);

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

function TextLayer({ index, total, bloco, progress, onCTA, isLast }: {
  index: number; total: number; bloco: Bloco; progress: MotionValue<number>;
  onCTA?: () => void; isLast?: boolean;
}) {
  const span = 1 / total;
  const start = index / total;
  const end = (index + 1) / total;
  const mid = (start + end) / 2;
  // Texto entra cedo e sai cedo — fica legível durante a maior parte do capítulo
  const inStart = start + span * 0.08;
  const inEnd = start + span * 0.22;
  const outStart = end - span * 0.25;
  const outEnd = end - span * 0.10;

  // Alternate sides; intro chapter is centered-bottom so it doesn't fight the fixed headline
  const sideRight = index % 2 === 1;
  const isIntro = index === 0;
  const fromX = isIntro ? 0 : sideRight ? 80 : -80;

  const opacity = useTransform(progress, [start, inStart, inEnd, outStart, outEnd], [0, 0, 1, 1, 0]);
  const x = useTransform(progress, [inStart, mid, outEnd], [fromX, 0, -fromX / 3]);

  const num = String(index + 1).padStart(2, "0");
  // All chapters show light text over the full-bleed photo
  const textCol = "hsl(48, 27%, 97%)";
  const mutedCol = "hsl(48, 27%, 97% / 0.82)";

  return (
    <motion.div
      style={{ opacity }}
      className={`absolute inset-0 z-20 flex px-6 md:px-16 pb-20 md:pb-24 pointer-events-none ${
        isIntro ? "items-end justify-center text-center" : sideRight ? "items-center justify-end" : "items-center justify-start"
      }`}
    >
      <motion.div
        style={{ x }}
        className="max-w-md md:max-w-lg pointer-events-auto"
      >
        {!isIntro && (
          <p className="label-ui mb-4" style={{ color: "hsl(var(--color-primary))" }}>
            Capítulo {num}
          </p>
        )}
        <h2
          className="text-3xl md:text-5xl lg:text-6xl mb-5"
          style={{ color: textCol, lineHeight: 1.1, fontWeight: 700, letterSpacing: "-0.02em" }}
        >
          {bloco.frase}
        </h2>
        {bloco.subtexto && (
          <p className="text-base md:text-lg mb-6" style={{ color: mutedCol, lineHeight: 1.6 }}>
            {bloco.subtexto}
          </p>
        )}

        {bloco.supplier_name && bloco.supplier_id && (
          <Link
            to={`/fornecedor/${bloco.supplier_id}`}
            className="inline-flex items-center gap-3 px-4 py-2 rounded-full transition hover:opacity-90"
            style={{
              background: "hsl(48, 27%, 96% / 0.14)",
              backdropFilter: "blur(8px)",
              border: "1px solid hsl(48, 27%, 96% / 0.25)",
            }}
          >
            {bloco.supplier_category && (
              <span className="label-ui" style={{ color: "hsl(var(--color-primary))" }}>{bloco.supplier_category}</span>
            )}
            <span className="text-sm font-medium" style={{ color: textCol }}>{bloco.supplier_name}</span>
          </Link>
        )}

        {isLast && onCTA && (
          <div className="mt-7">
            <button
              onClick={onCTA}
              className="rounded-full px-7 py-3.5 font-semibold text-sm transition hover:opacity-90"
              style={{ background: "hsl(var(--color-primary))", color: "hsl(48, 27%, 98%)" }}
            >
              Quero simular agora →
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function ScrollHint({ progress }: { progress: MotionValue<number> }) {
  const opacity = useTransform(progress, [0, 0.04], [1, 0]);
  return (
    <motion.div
      style={{ opacity }}
      className="absolute bottom-8 left-0 right-0 z-30 flex flex-col items-center gap-2 pointer-events-none"
    >
      <span className="label-ui" style={{ color: "hsl(48, 27%, 97% / 0.8)" }}>role para descobrir</span>
      <div className="w-[1px] h-10 bg-white/60" />
    </motion.div>
  );
}
