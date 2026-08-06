import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import SEO from "@/components/SEO";
import { absoluteUrl, SITE_URL } from "@/lib/seo";
import VendorNavbar from "@/components/supplier/landing/VendorNavbar";
import VendorHero from "@/components/supplier/landing/VendorHero";
import HowItWorksSection from "@/components/supplier/landing/HowItWorksSection";
import WhyTimeline from "@/components/supplier/WhyTimeline";
import TestimonialsSection from "@/components/supplier/landing/TestimonialsSection";
import TrustSection from "@/components/supplier/landing/TrustSection";
import VendorCTASection from "@/components/supplier/landing/VendorCTASection";
import PlatformFeatures from "@/components/shared/PlatformFeatures";
import { DEFAULT_LANDING, SupplierLandingConfig } from "@/lib/supplierLandingConfig";

export default function SupplierLanding() {
  const [cfg, setCfg] = useState<SupplierLandingConfig>(DEFAULT_LANDING);
  const [planos, setPlanos] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase
        .from("subscription_plans" as any)
        .select("slug, nome, descricao, preco_mensal, beneficios, destaque_busca, ordem")
        .order("ordem") as any);
      if (data && data.length) setPlanos(data as any[]);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase
        .from("fornecedor_landing_config" as any)
        .select("config")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle() as any);
      if (data?.config) {
        setCfg({ ...DEFAULT_LANDING, ...(data.config as any) });
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO
        title="Casamenteiro — Para fornecedores de casamento"
        description="Conecte seu serviço a casais com orçamento definido e data marcada. Cadastro gratuito, leads qualificados e visibilidade real."
        canonical={absoluteUrl("/fornecedor")}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Service",
          serviceType: "Plataforma para fornecedores de casamento",
          provider: { "@type": "Organization", name: "Casamenteiro", url: SITE_URL },
          areaServed: "BR",
          description:
            "Cadastro gratuito de fornecedores: receba pedidos de orçamento de casais com data marcada e orçamento definido.",
        }}
      />

      <VendorNavbar cfg={cfg.navbar} />
      <main>
        <VendorHero cfg={cfg.hero} />
        <HowItWorksSection cfg={cfg.how} />
        <WhyTimeline cfg={cfg.why} />
        <PlatformFeatures variant="supplier" />
        <TrustSection cfg={cfg.trust} />
        <TestimonialsSection cfg={cfg.testimonials} />

        {planos.length > 0 && (
          <section className="py-20 px-4 bg-muted/40" id="planos">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Planos</p>
                <h2 className="text-3xl md:text-4xl font-bold mb-3">Comece grátis, cresça quando quiser</h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Cadastro sem custo para receber pedidos. Evolua para mais visibilidade e ferramentas conforme fecha
                  casamentos.
                </p>
              </div>
              <div className="grid md:grid-cols-3 gap-5">
                {planos.map((p) => {
                  const destaque = p.destaque_busca;
                  const beneficios: string[] = Array.isArray(p.beneficios) ? p.beneficios : [];
                  const gratis = Number(p.preco_mensal) === 0;
                  return (
                    <div
                      key={p.slug}
                      className={`rounded-2xl p-6 border flex flex-col bg-background ${destaque ? "border-primary border-2 shadow-lg" : "border-border"}`}
                    >
                      {destaque && (
                        <span className="self-start mb-3 text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full bg-primary text-primary-foreground">
                          Mais completo
                        </span>
                      )}
                      <h3 className="text-xl font-bold">{p.nome}</h3>
                      <p className="text-sm text-muted-foreground mt-1 mb-4">{p.descricao}</p>
                      <div className="mb-5">
                        {gratis ? (
                          <span className="text-3xl font-bold">Grátis</span>
                        ) : (
                          <>
                            <span className="text-3xl font-bold">
                              R$ {Number(p.preco_mensal).toLocaleString("pt-BR")}
                            </span>
                            <span className="text-sm text-muted-foreground">/mês</span>
                          </>
                        )}
                      </div>
                      <ul className="space-y-2 mb-6 flex-1">
                        {beneficios.map((b, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <Check className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                      <Link
                        to="/fornecedor/cadastro"
                        className={`rounded-full py-2.5 text-center font-medium text-sm transition hover:opacity-90 ${destaque ? "bg-primary text-primary-foreground" : "border border-border text-foreground"}`}
                      >
                        {gratis ? "Começar grátis" : `Assinar ${p.nome}`}
                      </Link>
                    </div>
                  );
                })}
              </div>
              <p className="text-center text-sm text-muted-foreground mt-8">
                Quer aparecer no topo da vitrine? Combine seu plano com os pacotes de{" "}
                <strong>destaque na busca e na home</strong>.
              </p>
            </div>
          </section>
        )}

        <VendorCTASection cfg={cfg.cta} />
      </main>

      <footer className="py-8 px-4 border-t border-border">
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Heart className="h-3.5 w-3.5 text-primary fill-primary" />
            <span>© {new Date().getFullYear()} Casamenteiro</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/privacidade" className="hover:text-foreground">
              Política de privacidade
            </Link>
            <Link to="/termos" className="hover:text-foreground">
              Termos
            </Link>
          </div>
          <p className="flex items-center gap-1.5">
            Desenvolvido com carinho pela
            <a
              href="https://ncoisas.digital/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-foreground"
            >
              N Coisas Digitais
            </a>
            <Heart className="h-3 w-3 text-primary fill-primary" />
          </p>
        </div>
      </footer>
    </div>
  );
}
