import { motion, useInView } from "framer-motion";
import { useRef } from "react";

interface TimelineItemProps {
  index: number;
  total: number;
  label: string;
  title: string;
  description: string;
  imageSrc: string;
  imageAlt: string;
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
  const lineVariants = {
    hidden: { scaleY: 0 },
    visible: { scaleY: 1, transition: { duration: 0.5, ease: "easeOut" as const } },
  };
  const dotVariants = {
    hidden: { scale: 0 },
    visible: { scale: 1, transition: { type: "spring" as const, stiffness: 400, damping: 15, delay: 0.2 } },
  };

  const TextBlock = (
    <motion.div
      className={`p-6 md:p-8 ${isEven ? "md:order-1" : "md:order-3 md:text-right"}`}
      variants={textVariants}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
    >
      <p className="text-xs uppercase tracking-wider opacity-50 mb-2">{label}</p>
      <h3 className="font-serif text-xl md:text-2xl mb-3">{title}</h3>
      <p className="text-sm md:text-base text-muted-foreground leading-relaxed">{description}</p>
    </motion.div>
  );

  const ImageBlock = (
    <motion.div
      className={`m-2 md:m-4 rounded-2xl overflow-hidden aspect-[4/3] bg-muted/40 ${isEven ? "md:order-3" : "md:order-1"}`}
      variants={imageVariants}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
    >
      <img src={imageSrc} alt={imageAlt} className="w-full h-full object-cover" loading="lazy" />
    </motion.div>
  );

  return (
    <div
      ref={ref}
      className="grid items-center gap-0 md:min-h-[260px] grid-cols-1 md:[grid-template-columns:1fr_60px_1fr]"
    >
      {/* Mobile: image then text. Desktop: ordered via classes above */}
      <div className="md:contents">
        {ImageBlock}
      </div>

      {/* Linha central + Dot — só no desktop */}
      <div className="hidden md:flex flex-col items-center h-full md:order-2">
        {index > 0 ? (
          <motion.div
            className="w-px flex-1 bg-border origin-top"
            variants={lineVariants}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
          />
        ) : (
          <div className="flex-1" />
        )}
        <motion.div
          className="w-10 h-10 rounded-full border-2 border-primary bg-background flex items-center justify-center flex-shrink-0 z-10"
          variants={dotVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
          <div className="w-3 h-3 rounded-full bg-primary" />
        </motion.div>
        {index < total - 1 ? (
          <motion.div
            className="w-px flex-1 bg-border origin-top"
            variants={lineVariants}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
          />
        ) : (
          <div className="flex-1" />
        )}
      </div>

      <div className="md:contents">
        {TextBlock}
      </div>
    </div>
  );
}

const ITEMS = [
  {
    label: "01",
    title: "Leads qualificados",
    description: "Casais que já simularam o orçamento e estão prontos para contratar.",
    imageSrc: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=900&q=80",
    imageAlt: "Tela de leads qualificados",
  },
  {
    label: "02",
    title: "Datas ociosas = mais receita",
    description: "Preencha sua agenda em dias úteis com descontos que você define.",
    imageSrc: "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=900&q=80",
    imageAlt: "Agenda de datas",
  },
  {
    label: "03",
    title: "Zero risco para começar",
    description: "Seu cadastro é gratuito. Você só investe quando ver resultado.",
    imageSrc: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=900&q=80",
    imageAlt: "Planos e investimento",
  },
  {
    label: "04",
    title: "Visibilidade real",
    description: "Apareça para casais da sua cidade, na sua categoria, no seu preço.",
    imageSrc: "https://images.unsplash.com/photo-1521295121783-8a321d551ad2?w=900&q=80",
    imageAlt: "Busca por cidade",
  },
];

export default function WhyTimeline() {
  return (
    <section className="py-24 px-[5vw] bg-background">
      <div className="max-w-[1000px] mx-auto">
        <div className="mb-14">
          <span className="text-xs uppercase tracking-wider opacity-50">Por que anunciar</span>
          <h2 className="font-serif text-3xl md:text-4xl mt-3 mb-4">
            Resultados reais,<br />sem jogo de azar
          </h2>
          <p className="text-base md:text-lg text-muted-foreground max-w-md">
            Cada funcionalidade foi pensada para você fechar mais contratos com menos esforço.
          </p>
        </div>

        <div className="flex flex-col">
          {ITEMS.map((item, i) => (
            <TimelineItem key={i} index={i} total={ITEMS.length} {...item} />
          ))}
        </div>
      </div>
    </section>
  );
}