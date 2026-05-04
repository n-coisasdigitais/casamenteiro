import { motion } from "framer-motion";

export default function StoryBlock({ index, frase, subtexto, foto }: {
  index: number; frase: string; subtexto?: string | null; foto: string;
}) {
  const num = String(index + 1).padStart(2, "0");
  return (
    <section className="min-h-screen flex items-center py-16 md:py-24">
      <div className="container grid md:grid-cols-2 gap-10 md:gap-16 items-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-15%" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className={index % 2 === 1 ? "md:order-2" : ""}
        >
          <p className="font-serif italic text-olive text-lg mb-4">({num})</p>
          <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl text-ink leading-[1.1] mb-6">
            {frase}
          </h2>
          {subtexto && (
            <p className="text-ink/60 text-base md:text-lg max-w-md leading-relaxed">{subtexto}</p>
          )}
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-15%" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className={index % 2 === 1 ? "md:order-1" : ""}
        >
          <div className="aspect-square rounded-xl overflow-hidden shadow-2xl">
            <img src={foto} alt={frase} loading="lazy" className="w-full h-full object-cover" />
          </div>
        </motion.div>
      </div>
    </section>
  );
}