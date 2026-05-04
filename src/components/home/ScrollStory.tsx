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
  const chapters = blocos.length;
  // Cada capítulo dura ~200vh — entrada lateral → centro (hold) → saída + troca de foto
  const sectionVh = chapters * 200;

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  // Título fixo de abertura — visível só dentro do capítulo 1, some antes do 2 entrar
  const firstEnd = 1 / chapters;
  const introOpacity = useTransform(
    scrollYProgress,
    [0, firstEnd * 0.5, firstEnd * 0.7, 1],
    [1, 1, 0, 0]
  );
  const introY = useTransform(scrollYProgress, [0, firstEnd * 0.7], [0, -80]);

  return (
    <div ref={ref} style={{ height: `${sectionVh}vh`, position: "relative" }}>
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-black">
        {/* Full-bleed image stack — each chapter fills the screen */}
        {blocos.map((b, i) => (
          <ImageLayer key={i} index={i} total={chapters} src={b.foto_url} alt={b.frase} progress={scrollYProgress} />
        ))}

        {/* Dark gradient overlay for text legibility */}
        <div
          className="absolute inset-0 z-10 pointer-events-none"
          style={{
            background:
              "linear-gradient(180deg, hsl(0 0% 0% / 0.65) 0%, hsl(0 0% 0% / 0.35) 30%, hsl(0 0% 0% / 0.45) 70%, hsl(0 0% 0% / 0.85) 100%)",
          }}
        />

        {/* Fixed curiosity headline (visible only on first chapter) */}
        <motion.div
          style={{ opacity: reduce ? 1 : introOpacity, y: reduce ? 0 : introY }}
          className="absolute top-0 left-0 right-0 z-30 pt-28 md:pt-32 px-6 md:px-16 flex flex-col items-center text-center pointer-events-none"
        >
          <p
            className="label-ui mb-3"
            style={{ color: "hsl(48, 27%, 98%)", textShadow: "0 2px 10px hsl(0 0% 0% / 0.6)" }}
          >
            uma história em 5 capítulos
          </p>
          <h1
            className="text-white max-w-3xl"
            style={{
              fontSize: "clamp(2rem, 5vw, 3.75rem)",
              lineHeight: 1.05,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              textShadow: "0 2px 16px hsl(0 0% 0% / 0.55), 0 1px 3px hsl(0 0% 0% / 0.4)",
            }}
          >
            E se planejar o casamento fosse a parte boa?
          </h1>
        </motion.div>

        {/* Texts per chapter — capítulo 0 já é coberto pelo título fixo, então pulamos */}
        {blocos.map((b, i) =>
          i === 0 ? null : (
            <TextLayer
              key={i}
              index={i}
              total={chapters}
              bloco={b}
              progress={scrollYProgress}
              onCTA={i === chapters - 1 ? onCTA : undefined}
              isLast={i === chapters - 1}
            />
          )
        )}

        <ScrollHint progress={scrollYProgress} />
      </div>
    </div>
  );
}

function ImageLayer({ index, total, src, alt, progress }: {
  index: number; total: number; src: string; alt: string; progress: MotionValue<number>;
}) {
  // Imagem firme enquanto o texto está no centro; troca apenas quando o texto começa a sair (65–95%)
  const span = 1 / total;
  const start = index / total;
  const end = (index + 1) / total;
  const swapStart = start + span * 0.65;
  const swapEnd = start + span * 0.95;

  const isFirst = index === 0;
  const isLast = index === total - 1;

  const opacity = useTransform(
    progress,
    [Math.max(0, start - span * 0.05), start, swapStart, swapEnd],
    [isFirst ? 1 : 0, 1, 1, isLast ? 1 : 0]
  );
  const scale = useTransform(progress, [start, end], [1.04, 1.0]);

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
  // Cadência: entra (0–20%) → CENTRO firme (20–60%) → sai junto com a troca da foto (60–95%)
  const inStart = start + span * 0.0;
  const inEnd = start + span * 0.20;
  const outStart = start + span * 0.60;
  const outEnd = start + span * 0.95;
  const mid = start + span * 0.40;

  const sideRight = index % 2 === 1;
  const fromX = sideRight ? 90 : -90;

  const opacity = useTransform(progress, [start, inStart, inEnd, outStart, outEnd], [0, 0, 1, 1, 0]);
  const x = useTransform(progress, [inStart, mid, outEnd], [fromX, 0, sideRight ? -30 : 30]);

  const num = String(index + 1).padStart(2, "0");
  const isIntro = false; // capítulo 0 não passa por aqui
  // Texto claro com leve warmth — alta opacidade pra leitura sobre foto
  const textCol = "hsl(48, 27%, 98%)";
  const mutedCol = "hsl(48, 30%, 96%)";
  const textShadow = "0 2px 14px hsl(0 0% 0% / 0.55), 0 1px 3px hsl(0 0% 0% / 0.4)";

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
          style={{ color: textCol, lineHeight: 1.1, fontWeight: 700, letterSpacing: "-0.02em", textShadow }}
        >
          {bloco.frase}
        </h2>
        {bloco.subtexto && (
          <p
            className="text-base md:text-lg mb-6"
            style={{ color: mutedCol, lineHeight: 1.6, textShadow, fontWeight: 500 }}
          >
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
