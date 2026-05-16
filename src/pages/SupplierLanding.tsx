import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import SEO from "@/components/SEO";
import VendorNavbar from "@/components/supplier/landing/VendorNavbar";
import VendorHero from "@/components/supplier/landing/VendorHero";
import HowItWorksSection from "@/components/supplier/landing/HowItWorksSection";
import WhyTimeline from "@/components/supplier/WhyTimeline";
import TestimonialsSection from "@/components/supplier/landing/TestimonialsSection";
import VendorCTASection from "@/components/supplier/landing/VendorCTASection";
import { DEFAULT_LANDING, SupplierLandingConfig } from "@/lib/supplierLandingConfig";

export default function SupplierLanding() {
  const [cfg, setCfg] = useState<SupplierLandingConfig>(DEFAULT_LANDING);

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
      />

      <VendorNavbar cfg={cfg.navbar} />
      <main>
        <VendorHero cfg={cfg.hero} />
        <HowItWorksSection cfg={cfg.how} />
        <WhyTimeline cfg={cfg.why} />
        <TestimonialsSection cfg={cfg.testimonials} />
        <VendorCTASection cfg={cfg.cta} />
      </main>

      <footer className="py-8 px-4 border-t border-border">
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Heart className="h-3.5 w-3.5 text-primary fill-primary" />
            <span>© {new Date().getFullYear()} Casamenteiro</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/privacidade" className="hover:text-foreground">Política de privacidade</Link>
            <Link to="/termos" className="hover:text-foreground">Termos</Link>
          </div>
          <p className="flex items-center gap-1.5">
            Desenvolvido com carinho pela
            <a href="https://ncoisas.digital/" target="_blank" rel="noopener noreferrer" className="font-semibold text-foreground">N Coisas Digitais</a>
            <Heart className="h-3 w-3 text-primary fill-primary" />
          </p>
        </div>
      </footer>
    </div>
  );
}
