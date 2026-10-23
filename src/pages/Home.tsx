import { useCallback, useEffect, useRef, useState } from "react";
import SEO from "@/components/SEO";
import { absoluteUrl, SITE_URL } from "@/lib/seo";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import { useRotacao } from "@/hooks/useRotacao";
import { carregarHome, PADRAO_FORM, PADRAO_HERO, PADRAO_STORIES, type HomeData } from "@/lib/homeDestaques";
import HomeNavV3 from "@/components/home/v3/HomeNavV3";
import HeroCarousel from "@/components/home/v3/HeroCarousel";
import StoriesSection from "@/components/home/v3/StoriesSection";
import StepsTrail from "@/components/home/v3/StepsTrail";
import SimulatorSection from "@/components/home/v3/SimulatorSection";
import CompareSection from "@/components/home/v3/CompareSection";
import CelebrateSection from "@/components/home/v3/CelebrateSection";
import ReviewsSection from "@/components/home/v3/ReviewsSection";
import { FinalCTA, HomeFooterV3 } from "@/components/home/v3/FinalAndFooter";
import { Thread } from "@/components/home/v3/parts";
import "@/components/home/v3/home-v3.css";

/**
 * Home em capítulos (storytelling):
 *  01 O sonho (hero) → 02 A virada (stories) → 03 O caminho (3 passos)
 *  → Passo 1 Simulem → Passo 2 Comparem → Passo 3 Celebrem
 *  → depoimentos (se houver) → Bora casar?
 *
 * Espaços monetizáveis: Hero, Stories, Formulário e Categorias. Sem compra
 * ativa, cada espaço mostra o conteúdo padrão (admin ou embutido).
 */
const INICIAL: HomeData = {
  hero: PADRAO_HERO,
  stories: PADRAO_STORIES,
  form: PADRAO_FORM,
  categorias: [],
  depoimentos: [],
  datasDesconto: [],
};

export default function Home() {
  const datasOciosas = useFeatureFlag("datas_ociosas", true);
  const [dados, setDados] = useState<HomeData>(INICIAL);
  const tick = useRotacao(6000);
  const simRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let vivo = true;
    carregarHome({ datasDesconto: datasOciosas }).then((d) => vivo && setDados(d));
    return () => {
      vivo = false;
    };
  }, [datasOciosas]);

  const irPara = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);
  const simular = useCallback(() => irPara("simular"), [irPara]);

  return (
    <div className="home-v3 min-h-screen scroll-smooth">
      <SEO
        title="Casamenteiro — Planeje seu casamento dos sonhos"
        description="Simule o custo do seu casamento, compare fornecedores avaliados e organize tudo num lugar só. Casamentos em BH e região."
        canonical={absoluteUrl("/")}
        jsonLd={[
          { "@context": "https://schema.org", "@type": "Organization", name: "Casamenteiro", url: SITE_URL, logo: `${SITE_URL}/favicon.ico` },
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

      <HomeNavV3 onSimular={simular} />

      <main>
        <HeroCarousel slides={dados.hero} tick={tick} onSimular={simular} />
        <StoriesSection stories={dados.stories} />
        <Thread />
        <StepsTrail onPasso={(n) => irPara(n === 1 ? "simular" : n === 2 ? "comparar" : "celebrar")} />
        <Thread color="var(--hv-clay)" />
        <SimulatorSection ref={simRef} slides={dados.form} tick={tick} />
        <Thread color="var(--hv-sage)" />
        <CompareSection categorias={dados.categorias} datas={datasOciosas ? dados.datasDesconto : []} tick={tick} />
        <CelebrateSection />
        <ReviewsSection depoimentos={dados.depoimentos} />
        <FinalCTA onSimular={simular} />
      </main>

      <HomeFooterV3 />
    </div>
  );
}
