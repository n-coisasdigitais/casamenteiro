import { useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Link, useSearchParams } from "react-router-dom";
import { Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Preloader from "@/components/home/Preloader";
import HomeNavbar from "@/components/home/HomeNavbar";
import StoryBlock from "@/components/home/StoryBlock";
import SimulatorCTA from "@/components/home/SimulatorCTA";

const FALLBACK_BLOCOS = [
  { foto_url: "https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&q=80", frase: "Cada detalhe importa. Cada escolha conta.", subtexto: "Da decoração ao buffet, a gente te ajuda a montar tudo." },
  { foto_url: "https://images.unsplash.com/photo-1529636798458-92182e662485?w=1200&q=80", frase: "Seu orçamento, seu jeito, seu dia.", subtexto: "Comece pelo quanto você tem. A gente faz o resto encaixar." },
  { foto_url: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=1200&q=80", frase: "Datas que ninguém disputou. Preços que fazem sentido.", subtexto: "Casamentos em dias úteis com até 35% de economia real." },
  { foto_url: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=1200&q=80", frase: "Você não precisa resolver tudo sozinho.", subtexto: "Fotógrafo, buffet, espaço, banda. Tudo num lugar só." },
];

export default function Home() {
  const [params] = useSearchParams();
  const skip = params.get("preview") === "1" ? false : sessionStorage.getItem("home_preloader_done") === "1";
  const [showPreloader, setShowPreloader] = useState(!skip);
  const [blocos, setBlocos] = useState(FALLBACK_BLOCOS);
  const ctaRef = useRef<HTMLElement>(null);

  useEffect(() => {
    document.title = "Casamenteiro — planeje seu casamento com leveza";
    (supabase.from("secoes_home" as any).select("foto_url,frase,subtexto").eq("ativo", true).order("ordem") as any)
      .then(({ data }: any) => { if (data && data.length) setBlocos(data); });
  }, []);

  const finishPreloader = () => {
    sessionStorage.setItem("home_preloader_done", "1");
    setShowPreloader(false);
  };

  const scrollToCTA = () => ctaRef.current?.scrollIntoView({ behavior: "smooth" });

  return (
    <div className="bg-cream text-ink min-h-screen scroll-smooth">
      <AnimatePresence>
        {showPreloader && <Preloader onDone={finishPreloader} />}
      </AnimatePresence>

      {!showPreloader && <HomeNavbar onSimularClick={scrollToCTA} />}

      <main className="pt-14">
        {/* Hero opening */}
        <section className="min-h-[70vh] flex items-center container">
          <div className="max-w-2xl">
            <p className="font-serif italic text-olive mb-4">(intro)</p>
            <h1 className="font-serif text-5xl md:text-7xl leading-[1.05] text-ink mb-6">
              Casar é o melhor dia da vida.<br />
              <span className="text-rose-gold italic">Organizar</span> é a parte que ninguém te conta.
            </h1>
            <p className="text-ink/60 text-lg max-w-lg leading-relaxed mb-8">
              A gente existe pra simplificar. Role pra entender — ou comece pelo simulador.
            </p>
            <button onClick={scrollToCTA} className="bg-rose-gold text-white px-6 py-3 rounded-md hover:opacity-90 transition">
              Quero simular agora →
            </button>
          </div>
        </section>

        {blocos.map((b, i) => (
          <StoryBlock key={i} index={i} frase={b.frase} subtexto={b.subtexto} foto={b.foto_url} />
        ))}

        <SimulatorCTA ref={ctaRef} />
      </main>

      <footer className="py-10 bg-ink text-cream/80">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 fill-rose-gold text-rose-gold" />
            <span className="font-serif text-base">Casamenteiro</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/explorar" className="hover:text-cream">Explorar fornecedores</Link>
            <Link to="/login" className="hover:text-cream">Entrar</Link>
          </div>
          <p className="text-xs text-cream/50 flex items-center gap-1.5">
            Desenvolvido com carinho pela
            <a href="https://ncoisas.digital/" target="_blank" rel="noopener noreferrer" className="font-semibold hover:text-cream">N Coisas Digitais</a>
            <Heart className="h-3 w-3 fill-rose-gold text-rose-gold" />
          </p>
        </div>
      </footer>
    </div>
  );
}