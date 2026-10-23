import { useEffect, useState } from "react";
import SEO from "@/components/SEO";
import { absoluteUrl, SITE_URL } from "@/lib/seo";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_LANDING, type SupplierLandingConfig } from "@/lib/supplierLandingConfig";
import { carregarDadosFornecedor, DADOS_PADRAO, type DadosFornecedor } from "@/lib/fornecedorLanding";
import {
  ComoFunciona,
  CtaFornecedor,
  DepoimentosFornecedor,
  DuvidasFornecedor,
  HeroFornecedor,
  PainelFornecedor,
  PedidoCerto,
  PlanosFornecedor,
} from "@/components/supplier/landing/v2/FornecedorSecoes";
import { Thread } from "@/components/home/v3/parts";
import { HomeFooterV3 } from "@/components/home/v3/FinalAndFooter";
import "@/components/home/v3/home-v3.css";
import "@/components/supplier/landing/v2/fornecedor-v2.css";

/**
 * /fornecedor — página de aquisição de fornecedores, em capítulos:
 * Hero → 01 O pedido certo → 02 Como funciona → 03 Painel → 04 Quanto custa
 * → depoimentos (> 3) → dúvidas → CTA (abre o cadastro na aba Fornecedor com o e-mail).
 *
 * Textos: Admin › Landing Fornecedor (fornecedor_landing_config).
 * Valores e funcionalidades: tabelas (planos, pacotes, preços, settings, feature flags).
 */
export default function SupplierLanding() {
  const [cfg, setCfg] = useState<SupplierLandingConfig>(DEFAULT_LANDING);
  const [dados, setDados] = useState<DadosFornecedor>(DADOS_PADRAO);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const { data } = await (supabase
        .from("fornecedor_landing_config" as any)
        .select("config")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle() as any);
      if (vivo && data?.config) {
        const salvo = data.config as Partial<SupplierLandingConfig>;
        // seções novas que ainda não foram salvas no admin usam o padrão
        setCfg({
          ...DEFAULT_LANDING,
          ...salvo,
          lead: { ...DEFAULT_LANDING.lead, ...(salvo.lead ?? {}) },
          painel: { ...DEFAULT_LANDING.painel, ...(salvo.painel ?? {}) },
          planos: { ...DEFAULT_LANDING.planos, ...(salvo.planos ?? {}) },
          faq: { ...DEFAULT_LANDING.faq, ...(salvo.faq ?? {}) },
        });
      }
    })();
    carregarDadosFornecedor().then((d) => vivo && setDados(d));
    return () => {
      vivo = false;
    };
  }, []);

  return (
    <div className="home-v3 min-h-screen">
      <SEO
        title="Casamenteiro — Para fornecedores de casamento"
        description="Receba pedidos de orçamento de casais com data, cidade, convidados e orçamento definidos. Plano gratuito para sempre, sem comissão sobre seus contratos."
        canonical={absoluteUrl("/fornecedor")}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Service",
          serviceType: "Plataforma para fornecedores de casamento",
          provider: { "@type": "Organization", name: "Casamenteiro", url: SITE_URL },
          areaServed: "BR",
          description: "Cadastro gratuito de fornecedores: receba pedidos de orçamento de casais com data marcada e orçamento definido.",
        }}
      />
      <main>
        <HeroFornecedor cfg={cfg} dados={dados} />
        <PedidoCerto cfg={cfg} />
        <Thread />
        <ComoFunciona cfg={cfg} dados={dados} />
        <PainelFornecedor cfg={cfg} />
        <PlanosFornecedor cfg={cfg} dados={dados} />
        <DepoimentosFornecedor cfg={cfg} dados={dados} />
        <DuvidasFornecedor cfg={cfg} dados={dados} />
        <CtaFornecedor cfg={cfg} dados={dados} />
      </main>
      <HomeFooterV3 />
    </div>
  );
}
