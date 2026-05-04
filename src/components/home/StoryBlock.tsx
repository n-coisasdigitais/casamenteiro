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

  // The section is 200vh tall and sticky-pins for the duration of scroll.
  // Progress 0 → 1 maps roughly: 0–0.5 = text + small media, 0.5–1 = media expands fullscreen.
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  const scale = useTransform(scrollYProgress, [0, 0.55, 1], reduce ? [1, 1, 1] : [0.45, 0.55, 1]);
  const radius = useTransform(scrollYProgress, [0, 0.55, 1], [24, 20, 0]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.25, 0.45], [1, 1, 0]);
  const textY = useTransform(scrollYProgress, [0, 0.45], [0, -40]);
  const tagOpacity = useTransform(scrollYProgress, [0.6, 0.8], [0, 1]);
  const tagY = useTransform(scrollYProgress, [0.6, 0.8], [20, 0]);

  return (
    <section ref={ref} className="relative h-[200vh]">
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-cream">
        {/* Text overlay */}
        <motion.div
          style={{ opacity: textOpacity, y: textY }}
          className="absolute inset-0 z-10 flex items-center pointer-events-none"
        >
          <div className="container grid md:grid-cols-2 gap-8 items-center">
            <div className={index % 2 === 1 ? "md:order-2" : ""}>
              <p className="font-serif italic text-olive text-base md:text-lg mb-3">({num})</p>
              <h2 className="font-serif text-3xl md:text-5xl lg:text-6xl text-ink leading-[1.05] mb-4">
                {frase}
              </h2>
              {subtexto && (
                <p className="text-ink/60 text-base md:text-lg max-w-md leading-relaxed">{subtexto}</p>
              )}
            </div>
            {/* Empty spacer where media will live visually */}
            <div className={index % 2 === 1 ? "md:order-1" : ""} />
          </div>
        </motion.div>

        {/* Scaling media — centered, grows to fill screen */}
        <motion.div
          style={{
            scale,
            borderRadius: radius,
          }}
          className="absolute inset-0 m-auto h-full w-full origin-center overflow-hidden will-change-transform"
        >
          <img
            src={foto}
            alt={frase}
            loading="lazy"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

          {/* Supplier tag — appears as media takes over */}
          {(supplierName || supplierCategory) && (
            <motion.div
              style={{ opacity: tagOpacity, y: tagY }}
              className="absolute bottom-6 left-6 md:bottom-10 md:left-10"
            >
              {supplierId ? (
                <Link
                  to={`/fornecedor/${supplierId}`}
                  className="inline-flex items-center gap-3 bg-white/90 backdrop-blur px-4 py-2.5 rounded-full text-ink hover:bg-white transition shadow-lg"
                >
                  {supplierCategory && (
                    <span className="text-xs uppercase tracking-wider text-rose-gold font-medium">
                      {supplierCategory}
                    </span>
                  )}
                  {supplierName && (
                    <span className="font-serif text-sm md:text-base">{supplierName}</span>
                  )}
                </Link>
              ) : (
                <div className="inline-flex items-center gap-3 bg-white/90 backdrop-blur px-4 py-2.5 rounded-full text-ink shadow-lg">
                  {supplierCategory && (
                    <span className="text-xs uppercase tracking-wider text-rose-gold font-medium">
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

          {/* When fullscreen, also show the phrase as caption */}
          <motion.div
            style={{ opacity: tagOpacity }}
            className="absolute bottom-6 right-6 md:bottom-10 md:right-10 max-w-md text-right"
          >
            <p className="font-serif text-white text-xl md:text-3xl leading-tight drop-shadow">
              {frase}
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}