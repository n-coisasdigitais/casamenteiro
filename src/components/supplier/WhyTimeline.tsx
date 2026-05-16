import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { DEFAULT_LANDING, WhyCfg } from "@/lib/supplierLandingConfig";

interface TimelineItemProps {
  index: number; total: number; label: string; title: string; description: string; imageSrc: string; imageAlt: string;
}

function TimelineItem({ index, total, label, title, description, imageSrc, imageAlt }: TimelineItemProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const isEven = index % 2 === 0;

  const textVariants = {
    hidden: { opacity: 0, x: isEven ? -32 : 32 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] as const } },
  };
  const imageVariants = {
    hidden: { opacity: 0, x: isEven ? 32 : -32 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] as const, delay: 0.1 } },
  };
  const lineVariants = { hidden: { scaleY: 0 }, visible: { scaleY: 1, transition: { duration: 0.5, ease: "easeOut" as const } } };
  const dotVariants = { hidden: { scale: 0 }, visible: { scale: 1, transition: { type: "spring" as const, stiffness: 400, damping: 15, delay: 0.2 } } };

  const TextBlock = (
    <motion.div className={`p-6 md:p-8 ${isEven ? "md:order-1" : "md:order-3 md:text-right"}`} variants={textVariants} initial="hidden" animate={isInView ? "visible" : "hidden"}>
      <p className="text-xs uppercase tracking-wider opacity-50 mb-2">{label}</p>
      <h3 className="font-serif text-xl md:text-2xl mb-3">{title}</h3>
      <p className="text-sm md:text-base text-muted-foreground leading-relaxed">{description}</p>
    </motion.div>
  );

  const ImageBlock = (
    <motion.div className={`m-2 md:m-4 rounded-2xl overflow-hidden aspect-[4/3] bg-muted/40 ${isEven ? "md:order-3" : "md:order-1"}`} variants={imageVariants} initial="hidden" animate={isInView ? "visible" : "hidden"}>
      <img src={imageSrc} alt={imageAlt} className="w-full h-full object-cover" loading="lazy" />
    </motion.div>
  );

  return (
    <div ref={ref} className="grid items-center gap-0 md:min-h-[260px] grid-cols-1 md:[grid-template-columns:1fr_60px_1fr]">
      <div className="md:contents">{ImageBlock}</div>
      <div className="hidden md:flex flex-col items-center h-full md:order-2">
        {index > 0 ? (
          <motion.div className="w-px flex-1 bg-border origin-top" variants={lineVariants} initial="hidden" animate={isInView ? "visible" : "hidden"} />
        ) : (<div className="flex-1" />)}
        <motion.div className="w-10 h-10 rounded-full border-2 border-primary bg-background flex items-center justify-center flex-shrink-0 z-10" variants={dotVariants} initial="hidden" animate={isInView ? "visible" : "hidden"}>
          <div className="w-3 h-3 rounded-full bg-primary" />
        </motion.div>
        {index < total - 1 ? (
          <motion.div className="w-px flex-1 bg-border origin-top" variants={lineVariants} initial="hidden" animate={isInView ? "visible" : "hidden"} />
        ) : (<div className="flex-1" />)}
      </div>
      <div className="md:contents">{TextBlock}</div>
    </div>
  );
}

export default function WhyTimeline({ cfg = DEFAULT_LANDING.why }: { cfg?: WhyCfg }) {
  return (
    <section className="py-24 px-[5vw] bg-background">
      <div className="max-w-[1000px] mx-auto">
        <div className="mb-14">
          <span className="text-xs uppercase tracking-wider opacity-50">{cfg.eyebrow}</span>
          <h2 className="font-serif text-3xl md:text-4xl mt-3 mb-4">
            {cfg.title_line1}<br />{cfg.title_line2}
          </h2>
          <p className="text-base md:text-lg text-muted-foreground max-w-md">{cfg.subtitle}</p>
        </div>
        <div className="flex flex-col">
          {cfg.items.map((item, i) => (
            <TimelineItem key={i} index={i} total={cfg.items.length} {...item} />
          ))}
        </div>
      </div>
    </section>
  );
}
