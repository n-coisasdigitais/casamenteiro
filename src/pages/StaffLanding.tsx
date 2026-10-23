import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import SEO from "@/components/SEO";
import { absoluteUrl, SITE_URL } from "@/lib/seo";
import { supabase } from "@/integrations/supabase/client";
import { useFeatureFlagsLoading, useFeatureStatus } from "@/contexts/FeatureFlagsContext";
import { DEFAULT_PROFISSIONAL, mesclarProfissional, type ProfissionalLandingConfig } from "@/lib/profissionalLandingConfig";
import {
  ComoProfissional,
  CombinadoProfissional,
  CtaProfissional,
  DuvidasProfissional,
  FuncoesProfissional,
  HeroProfissional,
  RecursosProfissional,
  VagasProfissional,
  type VagaPublica,
} from "@/components/staff/landing/ProfissionalSecoes";
import { Thread } from "@/components/home/v3/parts";
import { HomeFooterV3 } from "@/components/home/v3/FinalAndFooter";
import "@/components/home/v3/home-v3.css";
import "@/components/supplier/landing/v2/fornecedor-v2.css";

/**
 * /profissional — página de aquisição de equipe de eventos (garçom, bar, cozinha...).
 * Hero → 01 Como funciona → 02 Funções → 03 Painel → 04 Vagas abertas (se houver)
 * → Combinado → Dúvidas → CTA.
 *
 * Recurso "vagas" (Admin › Feature flags):
 *  - ligado: CTA leva ao cadastro com o e-mail preenchido;
 *  - desligado com "Em breve": página aparece com selo e lista de espera;
 *  - desligado sem "Em breve": volta para a Home.
 * Textos: Admin › Landing Profissional (profissional_landing_config).
 */
export default function StaffLanding() {
  const status = useFeatureStatus()("vagas");
  const carregandoFlags = useFeatureFlagsLoading();
  const [cfg, setCfg] = useState<ProfissionalLandingConfig>(DEFAULT_PROFISSIONAL);
  const [vagas, setVagas] = useState<VagaPublica[]>([]);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const { data } = await (supabase
        .from("profissional_landing_config" as any)
        .select("config")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle() as any);
      if (vivo && data?.config) setCfg(mesclarProfissional(data.config));
    })();
    (async () => {
      const { data } = await (supabase.from("staff_jobs" as any) as any)
        .select("id, funcao, data, hora_inicio, hora_fim, cidade, vagas, valor_turno, supplier:suppliers(company_name)")
        .eq("is_public", true)
        .eq("status", "aberta")
        .gte("data", new Date().toISOString().slice(0, 10))
        .order("data", { ascending: true })
        .limit(12);
      if (vivo) setVagas(((data as VagaPublica[]) ?? []).filter(Boolean));
    })();
    return () => {
      vivo = false;
    };
  }, []);

  if (!carregandoFlags && status === "oculto") return <Navigate to="/" replace />;

  return (
    <div className="home-v3 min-h-screen">
      <SEO
        title="Casamenteiro — Trabalhe em festas e eventos"
        description="Garçom, barman, cozinha, recepção, som, limpeza em casamentos, aniversários, formaturas e eventos corporativos: crie seu perfil grátis e receba convites de buffets, espaços e cerimoniais da sua cidade."
        canonical={absoluteUrl("/profissional")}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "Casamenteiro para profissionais de eventos",
          url: absoluteUrl("/profissional"),
          publisher: { "@type": "Organization", name: "Casamenteiro", url: SITE_URL },
        }}
      />
      <main>
        <HeroProfissional cfg={cfg} status={status} vagas={vagas} />
        <ComoProfissional cfg={cfg} />
        <FuncoesProfissional cfg={cfg} vagas={status === "ativo" ? vagas : []} />
        <Thread />
        <RecursosProfissional cfg={cfg} />
        <VagasProfissional cfg={cfg} vagas={vagas} status={status} />
        <CombinadoProfissional cfg={cfg} />
        <DuvidasProfissional cfg={cfg} />
        <CtaProfissional cfg={cfg} status={status} />
      </main>
      <HomeFooterV3 />
    </div>
  );
}
