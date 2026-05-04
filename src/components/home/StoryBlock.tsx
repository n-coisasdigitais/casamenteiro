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

  // Section is 220vh and pins via sticky.
  // Phase 1 (0 → 0.45): text rises and fully disappears.
  // Phase 2 (0.45 → 1): centered square photo expands until it fills the viewport.
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  const textY = useTransform(scrollYProgress, [0, 0.45], [0, -260]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.18, 0.36], [1, 1, 0]);

  const animatedSize = useTransform(scrollYProgress, [0, 0.45, 1], ["38vmin", "42vmin", "120vmax"]);
  const mediaSize = reduce ? "38vmin" : animatedSize;
  const radius = useTransform(scrollYProgress, [0.45, 0.95, 1], [18, 4, 0]);

  const tagOpacity = useTransform(scrollYProgress, [0.82, 0.95], [0, 1]);

  return (
    <section ref={ref} className="relative h-[220vh]">
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-background flex items-end md:items-center justify-center">
        {/* Text — sits above the photo and rises out of view before the photo expands */}
        <motion.div
          style={{ opacity: textOpacity, y: textY }}
          className="absolute left-0 right-0 top-[10vh] md:top-[12vh] z-30 text-center px-6 pointer-events-none"
        >
          <p className="label-ui mb-4">{`Capítulo ${num}`}</p>
          <h2 className="font-serif text-3xl md:text-5xl lg:text-6xl leading-[1.12] max-w-3xl mx-auto mb-4" style={{ color: 'hsl(var(--color-dark))' }}>
            {frase}
          </h2>
          {subtexto && (
            <p className="text-base md:text-lg max-w-xl mx-auto" style={{ color: 'hsl(var(--color-text-muted))' }}>
              {subtexto}
            </p>
          )}
        </motion.div>

        {/* Centered square photo */}
        <motion.div
          style={{ width: mediaSize, height: mediaSize, borderRadius: radius }}
          className="relative z-10 origin-center overflow-hidden will-change-[width,height] shadow-2xl mb-[14vh] md:mb-0"
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
                className="inline-flex items-center gap-3 bg-background/95 backdrop-blur px-5 py-2.5 rounded-full hover:bg-background transition shadow-xl"
              >
                {supplierCategory && <span className="label-ui" style={{ color: 'hsl(var(--color-primary))' }}>{supplierCategory}</span>}
                {supplierName && <span className="font-serif text-sm md:text-base" style={{ color: 'hsl(var(--color-dark))' }}>{supplierName}</span>}
              </Link>
            ) : (
              <div className="inline-flex items-center gap-3 bg-background/95 backdrop-blur px-5 py-2.5 rounded-full shadow-xl">
                {supplierCategory && <span className="label-ui" style={{ color: 'hsl(var(--color-primary))' }}>{supplierCategory}</span>}
                {supplierName && <span className="font-serif text-sm md:text-base" style={{ color: 'hsl(var(--color-dark))' }}>{supplierName}</span>}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </section>
  );
}