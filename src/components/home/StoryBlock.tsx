import { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";

export default function StoryBlock({ index, frase, subtexto, foto, supplierName, supplierCategory, supplierId }: {
  index: number;
  frase: string;
  subtexto?: string | null;
  foto: string;
  supplierName?: string | null;
  supplierCategory?: string | null;
  supplierId?: string | null;
}) {
  const num = String(index + 1).padStart(2, "0");
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();

  // Section is 200vh, sticky pins for the duration.
  // Progress 0 → 1: small centered square photo grows until it fills the viewport.
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  // We compute scale relative to a base size of 40vmin (the small square).
  // To cover viewport we need ~ (max(100vw, 100vh) / 40vmin). Using 2.8 is safe on most ratios.
  const scale = useTransform(scrollYProgress, [0, 1], reduce ? [1, 1] : [1, 2.8]);
  const radius = useTransform(scrollYProgress, [0, 0.85, 1], [24, 8, 0]);

  const textOpacity = useTransform(scrollYProgress, [0, 0.15, 0.35], [1, 1, 0]);
  const textY = useTransform(scrollYProgress, [0, 0.35], [0, -30]);

  const tagOpacity = useTransform(scrollYProgress, [0.7, 0.9], [0, 1]);
  const captionOpacity = useTransform(scrollYProgress, [0.75, 0.95], [0, 1]);
  const overlayOpacity = useTransform(scrollYProgress, [0.5, 1], [0, 0.45]);

  return (
    <section ref={ref} className="relative h-[200vh]">
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-cream flex flex-col items-center justify-center">
        {/* Centered text above the square */}
        <motion.div
          style={{ opacity: textOpacity, y: textY }}
          className="absolute top-[8vh] md:top-[10vh] left-0 right-0 z-20 text-center px-6 pointer-events-none"
        >
          <p className="font-serif italic text-olive text-sm md:text-base mb-3">({num})</p>
          <h2 className="font-serif text-3xl md:text-5xl lg:text-6xl text-ink leading-[1.1] max-w-3xl mx-auto mb-4">
            {frase}
          </h2>
          {subtexto && (
            <p className="text-ink/60 text-base md:text-lg max-w-xl mx-auto leading-relaxed">{subtexto}</p>
          )}
        </motion.div>

        {/* Centered square photo that scales up to fill the screen */}
        <motion.div
          style={{ scale, borderRadius: radius }}
          className="relative z-10 origin-center overflow-hidden will-change-transform shadow-2xl"
        >
          <div className="relative w-[40vmin] h-[40vmin]">
            <img
              src={foto}
              alt={frase}
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>
        </motion.div>

        {/* Dark overlay + caption + supplier tag — appear when photo is fullscreen */}
        <motion.div
          style={{ opacity: overlayOpacity }}
          className="absolute inset-0 z-20 bg-black pointer-events-none"
        />

        <motion.div
          style={{ opacity: captionOpacity }}
          className="absolute bottom-24 md:bottom-28 left-0 right-0 z-30 text-center px-6 pointer-events-none"
        >
          <p className="font-serif text-white text-2xl md:text-4xl leading-tight max-w-3xl mx-auto drop-shadow-lg">
            {frase}
          </p>
        </motion.div>

        {(supplierName || supplierCategory) && (
          <motion.div
            style={{ opacity: tagOpacity }}
            className="absolute bottom-8 md:bottom-10 left-0 right-0 z-30 flex justify-center px-6"
          >
            {supplierId ? (
              <Link
                to={`/fornecedor/${supplierId}`}
                className="inline-flex items-center gap-3 bg-white/95 backdrop-blur px-5 py-2.5 rounded-full text-ink hover:bg-white transition shadow-xl"
              >
                {supplierCategory && (
                  <span className="text-[10px] md:text-xs uppercase tracking-wider text-rose-gold font-semibold">
                    {supplierCategory}
                  </span>
                )}
                {supplierName && (
                  <span className="font-serif text-sm md:text-base">{supplierName}</span>
                )}
              </Link>
            ) : (
              <div className="inline-flex items-center gap-3 bg-white/95 backdrop-blur px-5 py-2.5 rounded-full text-ink shadow-xl">
                {supplierCategory && (
                  <span className="text-[10px] md:text-xs uppercase tracking-wider text-rose-gold font-semibold">
                    {supplierCategory}
                  </span>
                )}
                {supplierName && (
                  <span className="font-serif text-sm md:text-base">{supplierName}</span>
                )}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </section>
  );
}