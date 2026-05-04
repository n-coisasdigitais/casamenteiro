import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

const FALLBACK = [
  "Ninguém nunca te contou que seria difícil organizar um casamento, né?",
  "Centenas de decisões. Dezenas de fornecedores. Um orçamento pra dar conta de tudo.",
  "A gente sabe que parece impossível. Mas a gente existe pra provar que não é.",
  "Aqui é fácil. Aqui é leve. Aqui é o seu dia.",
];

export default function Preloader({ onDone }: { onDone: () => void }) {
  const [frases, setFrases] = useState<string[]>(FALLBACK);
  const [idx, setIdx] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    (supabase.from("frases_home" as any).select("texto").eq("grupo", "intro").eq("ativo", true).order("ordem") as any)
      .then(({ data }: any) => {
        if (data && data.length) setFrases(data.map((d: any) => d.texto));
      });
  }, []);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { onDone(); return; }
    document.body.style.overflow = "hidden";
    const total = 4000;
    const start = Date.now();
    const interval = setInterval(() => {
      const p = Math.min(100, ((Date.now() - start) / total) * 100);
      setProgress(p);
      if (p >= 100) {
        clearInterval(interval);
        setTimeout(() => { document.body.style.overflow = ""; onDone(); }, 500);
      }
    }, 50);
    return () => { clearInterval(interval); document.body.style.overflow = ""; };
  }, [onDone]);

  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % frases.length), 1800);
    return () => clearInterval(t);
  }, [frases.length]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-[100] bg-ink text-cream flex items-center justify-center px-6"
      style={{
        backgroundImage: "linear-gradient(rgba(10,10,10,0.78), rgba(10,10,10,0.85)), url(https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1920&q=70)",
        backgroundSize: "cover", backgroundPosition: "center",
      }}
    >
      <div className="max-w-3xl w-full text-center min-h-[8rem] flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={idx}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.5 }}
            className="font-serif text-2xl md:text-4xl leading-snug text-white"
          >
            {frases[idx]}
          </motion.p>
        </AnimatePresence>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/10">
        <div className="h-full bg-rose-gold transition-[width] duration-100" style={{ width: `${progress}%` }} />
      </div>
    </motion.div>
  );
}