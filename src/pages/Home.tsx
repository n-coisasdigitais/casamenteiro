import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import HomeNavbar from "@/components/home/HomeNavbar";
import HomeHero from "@/components/home/HomeHero";
import ScrollStory from "@/components/home/ScrollStory";
import SimulatorCTA from "@/components/home/SimulatorCTA";
import PlatformFeatures from "@/components/shared/PlatformFeatures";
import SEO from "@/components/SEO";
import { absoluteUrl, SITE_URL } from "@/lib/seo";

const FALLBACK_BLOCOS = [
  { foto_url: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1600&q=80", frase: "Casar é o melhor dia da vida. Organizar é a parte que ninguém te conta.", subtexto: "A gente existe pra simplificar. Role pra entender.", supplier_id: null, supplier_name: null, supplier_category: null },
  { foto_url: "https://images.unsplash.com/photo-1519741497674-611481863552?w=1600&q=80", frase: "Cada detalhe importa. Cada escolha conta.", subtexto: "Da decoração ao buffet, a gente te ajuda a montar tudo.", supplier_id: null, supplier_name: "Ateliê Florescer", supplier_category: "Decoração" },
  { foto_url: "https://images.unsplash.com/photo-1529636798458-92182e662485?w=1600&q=80", frase: "Seu orçamento, seu jeito, seu dia.", subtexto: "Comece pelo quanto você tem. A gente faz o resto encaixar.", supplier_id: null, supplier_name: "Buffet Casa Plena", supplier_category: "Buffet" },
  { foto_url: "https://images.unsplash.com/photo-1520854221256-17451cc331bf?w=1600&q=80&auto=format&fit=crop", frase: "Datas que ninguém disputou. Preços que fazem sentido.", subtexto: "Casamentos em dias úteis com até 35% de economia real.", supplier_id: null, supplier_name: "Espaço Vila Real", supplier_category: "Espaço" },
  { foto_url: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=1600&q=80", frase: "Você não precisa resolver tudo sozinho.", subtexto: "Fotógrafo, buffet, espaço, banda. Tudo num lugar só.", supplier_id: null, supplier_name: "Estúdio Lume", supplier_category: "Fotografia" },
];

export default function Home() {
  const [blocos, setBlocos] = useState(FALLBACK_BLOCOS);
  const [heroImage, setHeroImage] = useState<string | null>(null);
  const ctaRef = useRef<HTMLElement>(null);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase
        .from("secoes_home" as any)
        .select("foto_url,frase,subtexto,supplier_id,ordem")
        .eq("ativo", true)
        .order("ordem") as any);
      if (!data || !data.length) return;
      // Bloco com ordem === 0 é reservado para a imagem da primeira dobra (herói).
      // Blocos com ordem >= 1 alimentam o storytelling.
      const rows = data as any[];
      const heroRow = rows.find((r) => r.ordem === 0);
      if (heroRow?.foto_url) setHeroImage(heroRow.foto_url);
      const storyData = rows.filter((r) => r.ordem !== 0);
      if (!storyData.length) return;
      const ids = storyData.map(d => d.supplier_id).filter(Boolean);
      let supMap: Record<string, { name: string; category: string | null }> = {};
      if (ids.length) {
        const { data: sups } = await supabase
          .from("suppliers")
          .select("id, company_name, categories(name)")
          .in("id", ids);
        (sups || []).forEach((s: any) => {
          supMap[s.id] = { name: s.company_name, category: s.categories?.name ?? null };
        });
      }
      setBlocos(storyData.map(d => ({
        foto_url: d.foto_url,
        frase: d.frase,
        subtexto: d.subtexto,
        supplier_id: d.supplier_id,
        supplier_name: d.supplier_id ? supMap[d.supplier_id]?.name ?? null : null,
        supplier_category: d.supplier_id ? supMap[d.supplier_id]?.category ?? null : null,
      })));
    })();
  }, []);

  const scrollToCTA = () => ctaRef.current?.scrollIntoView({ behavior: "smooth" });

  return (
    <div className="bg-cream text-ink min-h-screen scroll-smooth">
      <SEO
        title="Casamenteiro — Planeje seu casamento dos sonhos"
        description="Simule o custo do seu casamento e economize casando em datas com desconto. Fornecedores avaliados em BH e região."
        canonical={absoluteUrl("/")}
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "Casamenteiro",
            url: SITE_URL,
            logo: `${SITE_URL}/favicon.ico`,
          },
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "Casamenteiro",
            url: SITE_URL,
            potentialAction: {
              "@type": "SearchAction",
              target: `${SITE_URL}/buscar?q={search_term_string}`,
              "query-input": "required name=search_term_string",
            },
          },
        ]}
      />
      <HomeNavbar onSimularClick={scrollToCTA} />

      <main>
        <HomeHero heroImage={heroImage} />
        <ScrollStory blocos={blocos as any} onCTA={scrollToCTA} />
        <PlatformFeatures variant="couple" />
        <SimulatorCTA ref={ctaRef} />
      </main>

      <footer className="py-10" style={{ background: "hsl(var(--color-dark))", color: "hsl(var(--color-bg) / 0.8)" }}>
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4" style={{ color: "hsl(var(--color-primary))", fill: "hsl(var(--color-primary))" }} />
            <span className="font-serif text-base">Casamenteiro</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/explorar" className="hover:opacity-100 opacity-80">Explorar fornecedores</Link>
            <Link to="/login" className="hover:opacity-100 opacity-80">Entrar</Link>
            <Link to="/termos" className="hover:opacity-100 opacity-80">Termos</Link>
            <Link to="/privacidade" className="hover:opacity-100 opacity-80">Privacidade</Link>
          </div>
          <p className="text-xs flex items-center gap-1.5" style={{ opacity: 0.6 }}>
            Desenvolvido com carinho pela
            <a href="https://ncoisas.digital/" target="_blank" rel="noopener noreferrer" className="font-semibold">N Coisas Digitais</a>
            <Heart className="h-3 w-3" style={{ color: "hsl(var(--color-primary))", fill: "hsl(var(--color-primary))" }} />
          </p>
        </div>
      </footer>
    </div>
  );
}