import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { Loader2, Mail, Search, X } from "lucide-react";
import BrandLogo from "@/components/shared/BrandLogo";
import SEO from "@/components/SEO";
import UserMenu from "@/components/UserMenu";
import FormFeedback from "@/components/feedback/FormFeedback";
import { HomeFooterV3 } from "@/components/home/v3/FinalAndFooter";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import MarkdownSimples from "@/components/ajuda/MarkdownSimples";
import IconeAjuda from "@/components/ajuda/IconeAjuda";
import { useAuth } from "@/contexts/AuthContext";
import { useFeatureFlags, useFeatureFlagsLoading } from "@/contexts/FeatureFlagsContext";
import { carregarAjuda, type DadosAjuda } from "@/lib/ajuda";
import {
  PUBLICOS, abaInicial, brl, economiaAnual, perguntasVisiveis, preencherAjuda, statusCard, flagLigada, type Publico,
} from "@/lib/ajudaTexto";
import { absoluteUrl } from "@/lib/seo";
import { useFeatureEmBreve } from "@/contexts/FeatureFlagsContext";
import "@/components/home/v3/home-v3.css";
import "@/components/ajuda/ajuda.css";

export default function Ajuda() {
  const [params, setParams] = useSearchParams();
  const { hash } = useLocation();
  const { user, profile } = useAuth();
  const flags = useFeatureFlags();
  const emBreve = useFeatureEmBreve();
  const flagsCarregando = useFeatureFlagsLoading();
  const [dados, setDados] = useState<DadosAjuda | null>(null);
  const [busca, setBusca] = useState("");
  const [aba, setAba] = useState<Publico>(() => abaInicial(params.get("para"), null));
  const [abertas, setAbertas] = useState<string[]>([]);

  useEffect(() => {
    carregarAjuda().then(setDados).catch(() => setDados(null));
  }, []);

  // sem ?para=, abre pela aba do perfil ativo assim que o perfil carregar
  useEffect(() => {
    if (!params.get("para") && profile?.account_type) setAba(abaInicial(null, profile.account_type));
  }, [profile?.account_type, params]);

  const trocarAba = (p: Publico) => {
    setAba(p);
    const n = new URLSearchParams(params);
    n.set("para", p);
    setParams(n, { replace: true });
  };

  const itensTodos = dados?.itens ?? [];
  const lista = useMemo(() => perguntasVisiveis(itensTodos, aba, flags, busca), [itensTodos, aba, flags, busca]);

  // âncora #slug: troca para a aba certa, abre e rola até a pergunta
  useEffect(() => {
    const slug = decodeURIComponent((hash || "").replace(/^#/, ""));
    if (!slug || !dados || flagsCarregando) return;
    const item = dados.itens.find((i) => i.slug === slug);
    if (!item) return;
    if (item.publico !== "todos" && item.publico !== aba) setAba(item.publico);
    setAbertas((a) => (a.includes(slug) ? a : [...a, slug]));
    setTimeout(() => document.getElementById(slug)?.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hash, dados, flagsCarregando]);

  const porCategoria = useMemo(() => {
    const m = new Map<string, typeof lista>();
    lista.forEach((i) => m.set(i.categoria, [...(m.get(i.categoria) || []), i]));
    return [...m.entries()];
  }, [lista]);

  const jsonLd = useMemo(() => {
    if (!dados) return undefined;
    const vistos = new Set<string>();
    const ent = dados.itens
      .filter((i) => i.ativo && flagLigada(flags, i.feature_flag) && !vistos.has(i.slug) && vistos.add(i.slug))
      .map((i) => ({
        "@type": "Question",
        name: i.pergunta,
        acceptedAnswer: { "@type": "Answer", text: preencherAjuda(i.resposta, dados.valores).replace(/\*\*|\[|\]\([^)]*\)/g, "") },
      }));
    return ent.length ? { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: ent } : undefined;
  }, [dados, flags]);

  const conteudo = dados?.conteudo;
  const cards = (conteudo?.funcionalidades[aba] ?? []).slice(0, 8).map((c) => ({ ...c, st: statusCard(flags, emBreve, c.flag) })).filter((c) => c.st !== "oculto");
  const linkComecar = user ? "/fornecedor/planos" : "/cadastro?tipo=supplier";

  return (
    <div className="ajuda min-h-screen">
      <SEO
        title="Central de Ajuda | Casamenteiro"
        description="Tire suas dúvidas sobre o Casamenteiro: como funciona para casais, fornecedores e profissionais, planos, datas ociosas, confirmação de presença e mais."
        canonical={absoluteUrl("/ajuda")}
        jsonLd={jsonLd}
      />

      <header className="sticky top-0 z-30 border-b bg-white/95 backdrop-blur" style={{ borderColor: "var(--aj-line)" }}>
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-5 py-3">
          <Link to="/" aria-label="Página inicial" className="text-[18px] font-extrabold" style={{ letterSpacing: "-0.03em" }}>
            <BrandLogo />
          </Link>
          {user ? <UserMenu /> : (
            <Link to="/login" className="aj-btn px-5 py-2 text-sm">Entrar</Link>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-16">
        {/* 1. Hero */}
        <section className="pt-10 text-center sm:pt-14">
          <p className="mb-2 text-sm font-bold uppercase tracking-wider" style={{ color: "var(--aj-clay)" }}>Central de Ajuda</p>
          <h1 className="text-[32px] font-extrabold leading-tight sm:text-[44px]" style={{ letterSpacing: "-0.03em" }}>
            {conteudo?.hero.titulo ?? "O que é o Casamenteiro"}
          </h1>
          <p className="aj-muted mx-auto mt-3 max-w-2xl text-[17px] leading-relaxed">{conteudo?.hero.texto}</p>

          {/* 2. Busca */}
          <label className="aj-card mx-auto mt-7 flex max-w-xl items-center gap-2 px-4 py-3">
            <Search className="h-5 w-5 shrink-0 aj-muted" aria-hidden="true" />
            <span className="sr-only">Buscar nas perguntas</span>
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Busque sua dúvida (ex.: RSVP, planos, data ociosa)"
              className="min-w-0 flex-1 bg-transparent text-[16px] outline-none"
            />
            {busca && (
              <button type="button" onClick={() => setBusca("")} aria-label="Limpar busca"><X className="h-4 w-4" /></button>
            )}
          </label>
        </section>

        {/* 3. Abas */}
        <div role="tablist" aria-label="Público" className="aj-tablist mx-auto mt-8 flex max-w-full justify-start gap-1 overflow-x-auto rounded-full border bg-white p-1 sm:w-fit sm:justify-center" style={{ borderColor: "var(--aj-line)" }}>
          {PUBLICOS.map((p) => (
            <button key={p.valor} role="tab" type="button" aria-selected={aba === p.valor} onClick={() => trocarAba(p.valor)} className="aj-tab flex-1 sm:flex-none">
              {p.rotulo}
            </button>
          ))}
        </div>

        {!dados ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <>
            {!busca && (
              <>
                {/* 4. Como funciona */}
                <section className="mt-12">
                  <h2 className="mb-5 text-[24px] font-extrabold">Como funciona</h2>
                  <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {conteudo!.passos[aba].map((p, i) => (
                      <li key={i} className="aj-card p-5">
                        <div className="mb-3 flex items-center gap-3">
                          <span className="aj-icone inline-flex h-11 w-11 items-center justify-center"><IconeAjuda nome={p.icone} className="h-5 w-5" /></span>
                          <span className="text-sm font-bold aj-muted">Passo {i + 1}</span>
                        </div>
                        <h3 className="text-[17px] font-bold">{p.titulo}</h3>
                        <p className="aj-muted mt-1 text-[15px]">{p.texto}</p>
                      </li>
                    ))}
                  </ol>
                </section>

                {/* 5. Funcionalidades */}
                {cards.length > 0 && (
                  <section className="mt-12">
                    <h2 className="mb-5 text-[24px] font-extrabold">Funcionalidades</h2>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      {cards.map((c, i) => (
                        <div key={i} className="aj-card p-5" style={c.st === "em_breve" ? { opacity: 0.85 } : undefined}>
                          <div className="mb-3 flex items-center justify-between gap-2">
                            <span className="aj-icone inline-flex h-11 w-11 items-center justify-center"><IconeAjuda nome={c.icone} className="h-5 w-5" /></span>
                            {c.st === "em_breve" && <span className="aj-selo">Em breve</span>}
                          </div>
                          <h3 className="text-[17px] font-bold">{c.titulo}</h3>
                          <p className="aj-muted mt-1 text-[15px]">{c.texto}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* 6. Planos */}
                {aba === "fornecedor" && dados.planos.length > 0 && (
                  <section className="mt-12" aria-labelledby="aj-planos">
                    <h2 id="aj-planos" className="text-[24px] font-extrabold">Planos para fornecedores</h2>
                    <p className="aj-muted mb-5 mt-1">
                      Teste completo por {dados.valores.testeDias} dias, sem cobrança automática.
                      {dados.valores.taxaReserva != null && <> Reserva de data ociosa: taxa fixa de {brl(dados.valores.taxaReserva)} por reserva confirmada.</>}
                    </p>
                    <div className="grid gap-4 md:grid-cols-3">
                      {dados.planos.map((p) => {
                        const eco = economiaAnual(p.preco_mensal, p.preco_anual);
                        return (
                          <div key={p.slug} className={`aj-card flex flex-col p-6 ${p.destaque_busca ? "aj-destaque" : ""}`}>
                            <h3 className="text-[20px] font-extrabold">{p.nome}</h3>
                            {p.descricao && <p className="aj-muted mt-1 text-sm">{p.descricao}</p>}
                            <p className="mt-4 text-[30px] font-extrabold">
                              {p.preco_mensal > 0 ? <>{brl(p.preco_mensal)}<span className="text-base font-semibold aj-muted">/mês</span></> : "Grátis"}
                            </p>
                            {p.preco_anual > 0 && (
                              <p className="aj-muted text-sm">ou {brl(p.preco_anual)}/ano{eco > 0 && <> — economize {eco}%</>}</p>
                            )}
                            <ul className="mt-4 flex-1 space-y-1.5 text-[15px]">
                              {p.beneficios.map((b, i) => <li key={i} className="flex gap-2"><span style={{ color: "var(--aj-sage)" }}>✓</span>{b}</li>)}
                            </ul>
                            <Link to={linkComecar} className="aj-btn mt-5 py-3 text-center">Começar</Link>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}
              </>
            )}

            {/* 7. Perguntas frequentes */}
            <section className="mt-12" aria-labelledby="aj-faq">
              <h2 id="aj-faq" className="mb-5 text-[24px] font-extrabold">{busca ? `Resultados para “${busca}”` : "Perguntas frequentes"}</h2>
              {porCategoria.length === 0 && <p className="aj-muted">Nenhuma pergunta encontrada. Tente outra palavra ou fale com a gente abaixo.</p>}
              <div className="space-y-8">
                {porCategoria.map(([cat, itens]) => (
                  <div key={cat}>
                    <h3 className="mb-2 text-[15px] font-bold uppercase tracking-wider" style={{ color: "var(--aj-clay)" }}>{cat}</h3>
                    <Accordion type="multiple" value={abertas} onValueChange={setAbertas} className="aj-card px-4">
                      {itens.map((i) => (
                        <AccordionItem key={i.id} value={i.slug} id={i.slug} className="scroll-mt-24 last:border-b-0">
                          <AccordionTrigger className="text-left text-[16px] font-bold hover:no-underline">{i.pergunta}</AccordionTrigger>
                          <AccordionContent className="aj-muted text-[15px] leading-relaxed">
                            <MarkdownSimples texto={preencherAjuda(i.resposta, dados.valores)} />
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                ))}
              </div>
            </section>

            {/* 8. Fale com a gente */}
            <section className="aj-card mt-12 p-6 sm:p-8">
              <h2 className="text-[22px] font-extrabold">Não achou? Fale com a gente</h2>
              {user ? (
                <div className="mt-4">
                  <FormFeedback origem={aba === "casal" ? "casal" : aba} tipoInicial="sugestao" />
                </div>
              ) : (
                <div className="mt-3">
                  <p className="aj-muted">Mande sua dúvida por e-mail que respondemos rapidinho.</p>
                  {dados.suporteEmail && (
                    <a href={`mailto:${dados.suporteEmail}`} className="aj-btn mt-4 inline-flex items-center gap-2 px-6 py-3">
                      <Mail className="h-4 w-4" /> {dados.suporteEmail}
                    </a>
                  )}
                </div>
              )}
            </section>
          </>
        )}
      </main>
      <div className="home-v3"><HomeFooterV3 /></div>
    </div>
  );
}
