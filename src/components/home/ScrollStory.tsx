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
  // Each chapter ~ 1 viewport tall + 1 viewport for the final reveal
  const sectionVh = (n + 1) * 100;

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  // Background color crossfade across chapters
  const bgStops = blocos.map((_, i) => i / n);
  const bgColor = useTransform(scrollYProgress, [...bgStops, 1], [...CHAPTER_BG.slice(0, n), CHAPTER_BG[Math.min(n, CHAPTER_BG.length - 1)]]);

  return (
    <div ref={ref} style={{ height: `${sectionVh}vh`, position: "relative" }}>
      <motion.div
        className="sticky top-0 h-screen w-full overflow-hidden"
        style={{ background: reduce ? CHAPTER_BG[0] : bgColor }}
      >
        {/* Fixed center image stack — each chapter has its own image, crossfading */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className="relative overflow-hidden shadow-2xl rounded-3xl"
            style={{ width: "min(46vmin, 520px)", height: "min(60vmin, 640px)" }}
          >
            {blocos.map((b, i) => (
              <ImageLayer key={i} index={i} total={n} src={b.foto_url} alt={b.frase} progress={scrollYProgress} />
            ))}
          </div>
        </div>

        {/* Texts — each chapter slides in from a side */}
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

        {/* Scroll hint on first chapter only */}
        <ScrollHint progress={scrollYProgress} />
      </motion.div>
    </div>
  );
}

function ImageLayer({ index, total, src, alt, progress }: {
  index: number; total: number; src: string; alt: string; progress: MotionValue<number>;
}) {
  // Each chapter occupies 1/total of total scroll
  const start = index / total;
  const end = (index + 1) / total;
  const fadeIn = start - 0.04;
  const fadeOut = end - 0.04;
  const lastFadeOut = end + 0.05; // last chapter stays visible

  const isFirst = index === 0;
  const isLast = index === total - 1;

  const opacity = useTransform(
    progress,
    [Math.max(0, fadeIn), Math.max(0, fadeIn + 0.04), Math.max(0, fadeOut), Math.min(1, lastFadeOut)],
    [isFirst ? 1 : 0, 1, isLast ? 1 : 0, isLast ? 1 : 0]
  );
  const scale = useTransform(progress, [start, (start + end) / 2, end], [1.08, 1, 0.96]);

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
  const start = index / total;
  const end = (index + 1) / total;
  const mid = (start + end) / 2;

  // Alternate sides
  const sideRight = index % 2 === 1;
  const fromX = sideRight ? 80 : -80;

  const opacity = useTransform(progress, [start, start + 0.04, end - 0.04, end], [0, 1, 1, 0]);
  const x = useTransform(progress, [start, mid, end], [fromX, 0, -fromX / 2]);

  const num = String(index + 1).padStart(2, "0");
  const isIntro = index === 0;
  // Dark chapters get light text
  const isDark = index === total - 1;
  const textCol = isDark ? "hsl(48, 27%, 96%)" : "hsl(var(--color-dark))";
  const mutedCol = isDark ? "hsl(48, 27%, 96% / 0.75)" : "hsl(var(--color-text-muted))";

  return (
    <motion.div
      style={{ opacity }}
      className={`absolute inset-0 z-20 flex items-center px-6 md:px-16 pointer-events-none ${
        sideRight ? "justify-end" : "justify-start"
      }`}
    >
      <motion.div
        style={{ x }}
        className="max-w-md md:max-w-lg pointer-events-auto"
      >
        <p className="label-ui mb-4" style={{ color: isDark ? "hsl(var(--color-primary))" : "hsl(var(--color-primary))" }}>
          {isIntro ? "Bem-vindo" : `Capítulo ${num}`}
        </p>
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
              background: isDark ? "hsl(48, 27%, 96% / 0.12)" : "hsl(0 0% 100% / 0.7)",
              backdropFilter: "blur(8px)",
              border: `1px solid ${isDark ? "hsl(48, 27%, 96% / 0.2)" : "hsl(var(--color-border))"}`,
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
      <span className="label-ui" style={{ color: "hsl(var(--color-text-muted))" }}>role para descobrir</span>
      <div className="w-[1px] h-10 bg-current opacity-40" style={{ color: "hsl(var(--color-dark))" }} />
    </motion.div>
  );
}
