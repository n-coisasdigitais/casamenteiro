import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useInView } from "framer-motion";

export default function VendorCTASection() {
  const [email, setEmail] = useState("");
  const navigate = useNavigate();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-15%" });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = email.trim();
    if (!v) return;
    navigate(`/fornecedor/cadastro?email=${encodeURIComponent(v)}`);
  };

  return (
    <section className="py-24 px-4 bg-[hsl(var(--color-dark))] text-white">
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 24 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        className="max-w-2xl mx-auto text-center"
      >
        <span className="text-xs uppercase tracking-wider text-white/50">Comece agora</span>
        <h2 className="font-serif text-3xl md:text-5xl mt-3 mb-4 text-white">
          Anuncie por 3 meses grátis. Sem cartão, sem risco.
        </h2>
        <p className="text-base text-white/65 mb-10">
          Preencha seu e-mail para garantir seu acesso e receber o link do cadastro completo.
        </p>

        <form onSubmit={submit} className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            className="flex-1 rounded-full px-6 py-3.5 text-sm bg-white/10 text-white placeholder:text-white/35 border border-white/15 focus:outline-none focus:border-primary transition"
          />
          <button
            type="submit"
            className="rounded-full px-7 py-3.5 text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 hover:-translate-y-0.5 transition shadow-xl shadow-primary/35"
          >
            Garantir meu acesso →
          </button>
        </form>

        <p className="mt-6 text-xs text-white/35">
          ✓ Gratuito para começar  ·  ✓ Aprovação em 24h  ·  ✓ Sem surpresas
        </p>
      </motion.div>
    </section>
  );
}