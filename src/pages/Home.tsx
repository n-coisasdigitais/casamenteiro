import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Heart,
  Calculator,
  Search,
  Calendar,
  MessageCircle,
  Star,
  Tag,
  TrendingUp,
  Inbox,
  MapPin,
  ShieldCheck,
  Users,
  Briefcase,
} from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import HomeNavbar from "@/components/home/HomeNavbar";
import HomeHero from "@/components/home/HomeHero";
import ScrollStory from "@/components/home/ScrollStory";
import SimulatorCTA from "@/components/home/SimulatorCTA";
import PlatformReviews from "@/components/PlatformReviews";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SEO from "@/components/SEO";
import { absoluteUrl, SITE_URL } from "@/lib/seo";

/**
 * Narrativa curta de DOR -> SOLUÇÃO (3 beats). Enxuta de propósito: a home
 * cinematográfica é só esta seção; o resto (funcionalidades) é legível/estático.
 * A imagem do herói (ordem=0 em secoes_home) é o destaque monetizável.
 */
const FALLBACK_BLOCOS = [
  {
    foto_url: "https://images.unsplash.com/photo-1511578314322-379afb476865?w=1600&q=80",
    frase: "Planejar casamento virou caos.",
    subtexto: "15 fornecedores, 8 grupos de WhatsApp e uma planilha que ninguém entende.",
    supplier_id: null,
    supplier_name: null,
    supplier_category: null,
  },
  {
    foto_url: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1600&q=80",
    frase: "E se fosse tudo num lugar só?",
    subtexto: "Orçamento, fornecedores, pagamentos e datas — organizados, do seu jeito.",
    supplier_id: null,
    supplier_name: null,
    supplier_category: null,
  },
  {
    foto_url: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=1600&q=80",
    frase: "Comece pelo quanto você tem.",
    subtexto: "Simule em 1 minuto e receba fornecedores avaliados dentro do seu orçamento.",
    supplier_id: null,
    supplier_name: null,
    supplier_category: null,
  },
];

const COUPLE_FEATURES = [
  {
    icon: Calculator,
    title: "Simulador inteligente",
    desc: "Descubra em 1 minuto quanto custa o seu casamento e veja fornecedores compatíveis.",
  },
  {
    icon: Search,
    title: "Busca estilo Airbnb",
    desc: "Mapa + lista com filtros por cidade, categoria, preço e avaliação.",
  },
  {
    icon: Calendar,
    title: "Planejamento completo",
    desc: "Tarefas, lista de convidados com RSVP, orçamento com gráficos e PDF.",
  },
  {
    icon: MessageCircle,
    title: "Orçamentos com chat",
    desc: "Negocie com fornecedores, com propostas e anexos — e controle os pagamentos.",
  },
  { icon: Tag, title: "Datas com desconto", desc: "Economize casando em datas ociosas." },
  { icon: Star, title: "Avaliações reais", desc: "Notas de outros casais e respostas dos fornecedores." },
];

const SUPPLIER_FEATURES = [
  {
    icon: TrendingUp,
    title: "Leads qualificados",
    desc: "Casais já passaram pelo simulador — chegam com orçamento e data.",
  },
  { icon: Inbox, title: "Kanban de orçamentos", desc: "Organize pedidos, propostas, anexos e o chat por estágio." },
  {
    icon: Calendar,
    title: "Agenda e datas promocionais",
    desc: "Bloqueie dias indisponíveis e ofereça descontos em datas ociosas.",
  },
  { icon: Users, title: "Equipe e vagas", desc: "Monte sua equipe de confiança e publique vagas para profissionais." },
  { icon: MapPin, title: "Áreas de atendimento", desc: "Apareça nas cidades certas, com mapa integrado." },
  { icon: ShieldCheck, title: "Reputação ativa", desc: "Avaliações bidirecionais e métricas do seu perfil." },
];

const PRO_FEATURES = [
  {
    icon: Briefcase,
    title: "Vagas de eventos",
    desc: "Veja vagas abertas de garçom, cerimonial, apoio e mais — perto de você.",
  },
  {
    icon: Calendar,
    title: "Sua agenda no controle",
    desc: "Bloqueie datas, aceite convites e evite conflito de horário.",
  },
  {
    icon: Star,
    title: "Reputação que rende",
    desc: "Cada trabalho concluído vira histórico e avaliação para as próximas vagas.",
  },
  { icon: MessageCircle, title: "Converse com o fornecedor", desc: "Combine detalhes com segurança antes de fechar." },
];

function FeatureGrid({ items }: { items: { icon: any; title: string; desc: string }[] }) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
      {items.map((f, i) => (
        <motion.div
          key={f.title}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10%" }}
          transition={{ duration: 0.4, delay: i * 0.04 }}
          className="rounded-2xl p-5 border transition-shadow hover:shadow-md"
          style={{ background: "hsl(var(--color-bg))", borderColor: "hsl(var(--color-border))" }}
        >
          <f.icon className="h-6 w-6 mb-3" style={{ color: "hsl(var(--color-primary))" }} />
          <h3 className="font-medium mb-1.5" style={{ color: "hsl(var(--color-dark))" }}>
            {f.title}
          </h3>
          <p className="text-sm" style={{ color: "hsl(var(--color-text-body))", lineHeight: 1.55 }}>
            {f.desc}
          </p>
        </motion.div>
      ))}
    </div>
  );
}

export default function Home() {
  const [blocos, setBlocos] = useState(FALLBACK_BLOCOS);
  const [heroImage, setHeroImage] = useState<string | null>(null);
  const [planos, setPlanos] = useState<any[]>([]);
  const ctaRef = useRef<HTMLElement>(null);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase
        .from("subscription_plans" as any)
        .select("slug, nome, descricao, preco_mensal, preco_anual, beneficios, destaque_busca, ordem")
        .eq("ativo", true)
        .order("ordem") as any);
      if (data && data.length) setPlanos(data as any[]);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase
        .from("secoes_home" as any)
        .select("foto_url,frase,subtexto,supplier_id,ordem")
        .eq("ativo", true)
        .order("ordem") as any);
      if (!data || !data.length) return;
      const rows = data as any[];
      const heroRow = rows.find((r) => r.ordem === 0);
      if (heroRow?.foto_url) setHeroImage(heroRow.foto_url);
      const storyData = rows.filter((r) => r.ordem !== 0);
      if (!storyData.length) return;
      const ids = storyData.map((d) => d.supplier_id).filter(Boolean);
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
      setBlocos(
        storyData.map((d) => ({
          foto_url: d.foto_url,
          frase: d.frase,
          subtexto: d.subtexto,
          supplier_id: d.supplier_id,
          supplier_name: d.supplier_id ? (supMap[d.supplier_id]?.name ?? null) : null,
          supplier_category: d.supplier_id ? (supMap[d.supplier_id]?.category ?? null) : null,
        })),
      );
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
        {/* Dobra 1 — Hero full-bleed (imagem monetizável) */}
        <HomeHero heroImage={heroImage} />

{/* Dobra 2 — Narrativa curta dor -> solução
            key={blocos.length}: o framer-motion v12 assa os keyframes das
            animações (WAAPI) na MONTAGEM. Se os blocos trocarem de 3 (fallback)
            para 4 (banco) sem remontar, os beats 0–2 mantêm janelas de 3 beats
            e o beat 3 entra por cima no fim do hero (texto/imagem duplicados).
            Remontar garante que todas as animações nascem com o mesmo total. */}
        <ScrollStory key={blocos.length} blocos={blocos as any} />

        {/* Dobra 3 — Funcionalidades em tabs por público (legível, estático) */}
        <section className="py-24 px-4" style={{ background: "hsl(var(--color-bg))" }} id="recursos">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10">
              <span className="label-ui" style={{ color: "hsl(var(--color-text-muted))" }}>
                Recursos da plataforma
              </span>
              <h2 className="font-serif text-3xl md:text-4xl mt-3 mb-4" style={{ color: "hsl(var(--color-dark))" }}>
                Feito para cada lado do casamento
              </h2>
              <p className="text-base max-w-2xl mx-auto" style={{ color: "hsl(var(--color-text-body))" }}>
                Escolha o seu lado e veja o que o Casamenteiro faz por você.
              </p>
            </div>

            <Tabs defaultValue="casal" className="w-full">
              <TabsList className="mx-auto flex w-fit">
                <TabsTrigger value="casal">Para o casal</TabsTrigger>
                <TabsTrigger value="fornecedor">Para o fornecedor</TabsTrigger>
                <TabsTrigger value="profissional">Para o profissional</TabsTrigger>
              </TabsList>

              <TabsContent value="casal">
                <FeatureGrid items={COUPLE_FEATURES} />
                <div className="text-center mt-8">
                  <Link
                    to="/simulador"
                    className="inline-flex items-center justify-center rounded-full font-medium h-12 px-7"
                    style={{ background: "hsl(var(--color-primary))", color: "hsl(var(--color-bg))" }}
                  >
                    Simular meu casamento
                  </Link>
                </div>
              </TabsContent>

              <TabsContent value="fornecedor">
                <FeatureGrid items={SUPPLIER_FEATURES} />
                <div className="text-center mt-8">
                  <Link
                    to="/fornecedor/painel"
                    className="inline-flex items-center justify-center rounded-full font-medium h-12 px-7"
                    style={{ background: "hsl(var(--color-primary))", color: "hsl(var(--color-bg))" }}
                  >
                    Quero divulgar meu serviço
                  </Link>
                </div>
              </TabsContent>

              <TabsContent value="profissional">
                <FeatureGrid items={PRO_FEATURES} />
                <div className="text-center mt-8">
                  <Link
                    to="/vagas"
                    className="inline-flex items-center justify-center rounded-full font-medium h-12 px-7"
                    style={{ background: "hsl(var(--color-primary))", color: "hsl(var(--color-bg))" }}
                  >
                    Ver vagas abertas
                  </Link>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </section>

        {/* Dobra 4 — Planos para o fornecedor */}
        {planos.length > 0 && (
          <section className="py-24 px-4" style={{ background: "hsl(var(--color-secondary) / 0.4)" }} id="planos">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <span className="label-ui" style={{ color: "hsl(var(--color-text-muted))" }}>
                  Para fornecedores
                </span>
                <h2 className="font-serif text-3xl md:text-4xl mt-3 mb-4" style={{ color: "hsl(var(--color-dark))" }}>
                  Planos que crescem com o seu negócio
                </h2>
                <p className="text-base max-w-2xl mx-auto" style={{ color: "hsl(var(--color-text-body))" }}>
                  Comece de graça e evolua conforme fecha mais casamentos.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-5">
                {planos.map((p) => {
                  const destaque = p.destaque_busca;
                  const beneficios: string[] = Array.isArray(p.beneficios) ? p.beneficios : [];
                  return (
                    <div
                      key={p.slug}
                      className="rounded-2xl p-6 border flex flex-col"
                      style={{
                        background: "hsl(var(--color-bg))",
                        borderColor: destaque ? "hsl(var(--color-primary))" : "hsl(var(--color-border))",
                        borderWidth: destaque ? 2 : 1,
                        boxShadow: destaque ? "0 8px 30px hsl(var(--color-primary) / 0.12)" : undefined,
                      }}
                    >
                      {destaque && (
                        <span
                          className="self-start mb-3 text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full"
                          style={{ background: "hsl(var(--color-primary))", color: "hsl(var(--color-bg))" }}
                        >
                          Mais completo
                        </span>
                      )}
                      <h3 className="font-serif text-xl" style={{ color: "hsl(var(--color-dark))" }}>
                        {p.nome}
                      </h3>
                      <p className="text-sm mt-1 mb-4" style={{ color: "hsl(var(--color-text-muted))" }}>
                        {p.descricao}
                      </p>
                      <div className="mb-5">
                        {Number(p.preco_mensal) === 0 ? (
                          <span className="text-3xl font-bold" style={{ color: "hsl(var(--color-dark))" }}>
                            Grátis
                          </span>
                        ) : (
                          <>
                            <span className="text-3xl font-bold" style={{ color: "hsl(var(--color-dark))" }}>
                              R$ {Number(p.preco_mensal).toLocaleString("pt-BR")}
                            </span>
                            <span className="text-sm" style={{ color: "hsl(var(--color-text-muted))" }}>
                              /mês
                            </span>
                          </>
                        )}
                      </div>
                      <ul className="space-y-2 mb-6 flex-1">
                        {beneficios.map((b, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2 text-sm"
                            style={{ color: "hsl(var(--color-text-body))" }}
                          >
                            <Star
                              className="h-4 w-4 mt-0.5 shrink-0"
                              style={{ color: "hsl(var(--color-primary))", fill: "hsl(var(--color-primary))" }}
                            />
                            {b}
                          </li>
                        ))}
                      </ul>
                      <Link
                        to="/fornecedor"
                        className="rounded-full py-2.5 text-center font-medium text-sm transition hover:opacity-90"
                        style={
                          destaque
                            ? { background: "hsl(var(--color-primary))", color: "hsl(var(--color-bg))" }
                            : { border: "1px solid hsl(var(--color-border))", color: "hsl(var(--color-dark))" }
                        }
                      >
                        {Number(p.preco_mensal) === 0 ? "Começar grátis" : "Assinar " + p.nome}
                      </Link>
                    </div>
                  );
                })}
              </div>
              <p className="text-center text-sm mt-8" style={{ color: "hsl(var(--color-text-muted))" }}>
                Ou destaque seu perfil na busca e na home com os pacotes de destaque.
              </p>
            </div>
          </section>
        )}

        {/* Dobra 5 — Prova social */}
        <PlatformReviews />

        {/* Dobra 5 — Simulador (CTA principal do casal) */}
        <SimulatorCTA ref={ctaRef} />
      </main>

      <footer className="py-10" style={{ background: "hsl(var(--color-dark))", color: "hsl(var(--color-bg) / 0.8)" }}>
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Heart
              className="h-4 w-4"
              style={{ color: "hsl(var(--color-primary))", fill: "hsl(var(--color-primary))" }}
            />
            <span className="font-serif text-base">Casamenteiro</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/explorar" className="hover:opacity-100 opacity-80">
              Explorar fornecedores
            </Link>
            <Link to="/vagas" className="hover:opacity-100 opacity-80">
              Vagas
            </Link>
            <Link to="/login" className="hover:opacity-100 opacity-80">
              Entrar
            </Link>
            <Link to="/termos" className="hover:opacity-100 opacity-80">
              Termos
            </Link>
            <Link to="/privacidade" className="hover:opacity-100 opacity-80">
              Privacidade
            </Link>
          </div>
          <p className="text-xs flex items-center gap-1.5" style={{ opacity: 0.6 }}>
            Desenvolvido com carinho pela
            <a href="https://ncoisas.digital/" target="_blank" rel="noopener noreferrer" className="font-semibold">
              N Coisas Digitais
            </a>
            <Heart
              className="h-3 w-3"
              style={{ color: "hsl(var(--color-primary))", fill: "hsl(var(--color-primary))" }}
            />
          </p>
        </div>
      </footer>
    </div>
  );
}
