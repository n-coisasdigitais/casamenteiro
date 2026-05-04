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
  // Progress 0 → 1: phrase scrolls up, then the centered square expands into full screen.
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  const animatedMediaSize = useTransform(scrollYProgress, [0, 0.32, 1], ["34vmin", "34vmin", "110vmax"]);
  const mediaSize = reduce ? "34vmin" : animatedMediaSize;
  const radius = useTransform(scrollYProgress, [0, 0.55, 1], [14, 14, 0]);

  const textOpacity = useTransform(scrollYProgress, [0, 0.22, 0.42], [1, 1, 0]);
  const textY = useTransform(scrollYProgress, [0, 0.42], [0, -170]);
  const mediaY = useTransform(scrollYProgress, [0, 0.25, 1], [80, 72, 0]);

  const tagOpacity = useTransform(scrollYProgress, [0.72, 0.9], [0, 1]);

  return (
    <section ref={ref} className="relative h-[200vh]">
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-cream flex items-center justify-center">
        {/* Phrase rises with the scroll and disappears before the photo fills the screen */}
        <motion.div
          style={{ opacity: textOpacity, y: textY }}
          className="absolute left-0 right-0 top-[16vh] md:top-[14vh] z-20 text-center px-6 pointer-events-none"
        >
          <p className="font-serif italic text-olive text-sm md:text-base mb-3">({num})</p>
          <h2 className="font-serif text-4xl md:text-6xl lg:text-7xl text-ink leading-[1.02] max-w-4xl mx-auto mb-4">
            {frase}
          </h2>
          {subtexto && (
            <p className="text-ink/60 text-base md:text-xl max-w-2xl mx-auto leading-relaxed">{subtexto}</p>
          )}
        </motion.div>

        {/* Centered square photo that expands until it covers the full viewport */}
        <motion.div
          style={{ width: mediaSize, height: mediaSize, borderRadius: radius, y: mediaY }}
          className="relative z-10 origin-center overflow-hidden will-change-[width,height,transform] shadow-2xl"
        >
          <img
            src={foto}
            alt={frase}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover"
          />
        </motion.div>

        {(supplierName || supplierCategory) && (
          <motion.div
            style={{ opacity: tagOpacity }}
            className="absolute bottom-8 md:bottom-10 left-0 right-0 z-30 flex justify-center px-6"
          >
            {supplierId ? (
              <Link
                to={`/fornecedor/${supplierId}`}
                className="inline-flex items-center gap-3 bg-cream/95 backdrop-blur px-5 py-2.5 rounded-full text-ink hover:bg-cream transition shadow-xl"
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
              <div className="inline-flex items-center gap-3 bg-cream/95 backdrop-blur px-5 py-2.5 rounded-full text-ink shadow-xl">
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