import { Link } from "react-router-dom";
import { motion } from "framer-motion";

interface VendorHeroProps {
  videoSrc?: string;
}

export default function VendorHero({ videoSrc }: VendorHeroProps) {
  const item = (delay: number) => ({
    initial: { opacity: 0, y: 28 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.7, delay, ease: [0.4, 0, 0.2, 1] as const },
  });

  const scrollToHow = (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById("como-funciona")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden bg-[hsl(var(--color-dark))]">
      {videoSrc ? (
        <video
          src={videoSrc}
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1920&q=80')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: 0.35,
          }}
        />
      )}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(20,16,14,0.55) 0%, rgba(20,16,14,0.85) 70%, rgba(20,16,14,0.95) 100%)",
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 100%, hsl(var(--primary) / 0.25) 0%, transparent 60%)",
        }}
      />

      <div className="relative z-10 max-w-3xl mx-auto text-center text-white">
        <motion.div {...item(0.1)}>
          <span className="inline-block rounded-full px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] border border-white/25 text-white/70">
            Para fornecedores
          </span>
        </motion.div>

        <motion.h1
          {...item(0.25)}
          className="font-serif mt-6 mb-6 text-white"
          style={{ fontSize: "clamp(2.5rem, 6vw, 4.25rem)", lineHeight: 1.05, letterSpacing: "-0.02em" }}
        >
          Leve seu negócio para quem quer{" "}
          <em className="italic font-normal" style={{ color: "hsl(23 70% 80%)" }}>
            casar.
          </em>
        </motion.h1>

        <motion.p
          {...item(0.4)}
          className="text-base md:text-lg text-white/65 max-w-[520px] mx-auto leading-relaxed mb-10"
        >
          Conecte seu serviço a casais que já simularam o orçamento e estão prontos para contratar.
        </motion.p>

        <motion.div {...item(0.55)} className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/fornecedor/cadastro"
            className="rounded-full px-8 py-3.5 text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition shadow-xl shadow-primary/35"
          >
            Quero me cadastrar →
          </Link>
          <a
            href="#como-funciona"
            onClick={scrollToHow}
            className="rounded-full px-8 py-3.5 text-sm font-semibold border border-white/35 text-white hover:border-white/80 hover:bg-white/5 transition"
          >
            Como funciona
          </a>
        </motion.div>

        <motion.div {...item(0.7)} className="mt-6">
          <Link
            to="/fornecedor/login"
            className="text-sm text-white/40 hover:text-white/80 transition"
          >
            Já tenho cadastro
          </Link>
        </motion.div>
      </div>

      <div
        aria-hidden="true"
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce"
      >
        <span className="text-[10px] uppercase tracking-[0.25em] text-white/40">role para ver</span>
        <span
          className="block w-px h-10"
          style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.6), transparent)" }}
        />
      </div>
    </section>
  );
}