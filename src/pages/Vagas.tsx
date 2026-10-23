import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Search, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { traduzirErro } from "@/lib/errorMessages";
import SEO from "@/components/SEO";
import { absoluteUrl } from "@/lib/seo";
import { FUNCOES_STAFF } from "@/lib/staff";
import { guardarVagaPendente, lerVagaPendente, limparVagaPendente } from "@/lib/vagaPendente";
import VagaCard, { fmtDataVaga, situacaoDoStatus, type SituacaoVaga, type VagaListada } from "@/components/staff/vagas/VagaCard";
import { HomeFooterV3 } from "@/components/home/v3/FinalAndFooter";
import "@/components/home/v3/home-v3.css";
import "@/components/staff/vagas/vagas.css";

type PerfilStaff = { id: string; funcoes: string[]; cidade: string | null; completo: boolean };

const norm = (s?: string | null) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/**
 * /vagas — vitrine pública de vagas (simples: busca, filtros, lista).
 * Ligada ao profissional:
 *  - logado com perfil: candidata com um toque, vê "Para você" e o status de cada candidatura;
 *  - sem conta: a vaga fica guardada e ele volta para ela depois do cadastro/onboarding (?vaga=ID);
 *  - casal/fornecedor logado: aviso de que candidatura é para conta de profissional.
 */
export default function Vagas() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [params, setParams] = useSearchParams();
  const vagaFoco = params.get("vaga");

  const [vagas, setVagas] = useState<VagaListada[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [perfil, setPerfil] = useState<PerfilStaff | null>(null);
  const [situacoes, setSituacoes] = useState<Record<string, SituacaoVaga>>({});

  const [busca, setBusca] = useState("");
  const [funcao, setFuncao] = useState("todas");
  const [cidade, setCidade] = useState("todas");
  const [ordem, setOrdem] = useState<"data" | "valor_desc">("data");

  const ehProfissional = profile?.account_type === "profissional";

  // vagas abertas (públicas)
  useEffect(() => {
    (async () => {
      const { data } = await (supabase.from("staff_jobs" as any) as any)
        .select("id, funcao, data, hora_inicio, hora_fim, cidade, local, vagas, valor_turno, supplier:suppliers(company_name)")
        .eq("is_public", true)
        .eq("status", "aberta")
        .gte("data", new Date().toISOString().slice(0, 10))
        .order("data", { ascending: true });
      setVagas((data as VagaListada[]) ?? []);
      setCarregando(false);
    })();
  }, []);

  // perfil do profissional + candidaturas dele
  useEffect(() => {
    if (!user || !ehProfissional) {
      setPerfil(null);
      setSituacoes({});
      return;
    }
    (async () => {
      const { data: sp } = await (supabase.from("staff_profiles" as any) as any)
        .select("id, funcoes, cidade, consentimento_lgpd")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!sp) return setPerfil(null);
      setPerfil({ id: sp.id, funcoes: sp.funcoes || [], cidade: sp.cidade, completo: !!sp.cidade && !!sp.consentimento_lgpd });
      const { data: apps } = await (supabase.from("staff_applications" as any) as any)
        .select("job_id, status")
        .eq("staff_id", sp.id);
      const m: Record<string, SituacaoVaga> = {};
      ((apps as any[]) ?? []).forEach((a) => (m[a.job_id] = situacaoDoStatus(a.status)));
      setSituacoes(m);
    })();
  }, [user, ehProfissional]);

  // rola até a vaga vinda do link (?vaga=ID)
  useEffect(() => {
    if (!vagaFoco || carregando) return;
    const t = setTimeout(() => document.getElementById(`vaga-${vagaFoco}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
    return () => clearTimeout(t);
  }, [vagaFoco, carregando]);

  const cidades = useMemo(() => Array.from(new Set(vagas.map((v) => v.cidade).filter(Boolean) as string[])).sort(), [vagas]);
  const funcoes = useMemo(() => {
    const comVaga = new Set(vagas.map((v) => v.funcao));
    return FUNCOES_STAFF.filter((f) => comVaga.has(f)).concat([...comVaga].filter((f) => !FUNCOES_STAFF.includes(f)));
  }, [vagas]);

  const filtradas = useMemo(() => {
    const q = norm(busca);
    let l = vagas.filter(
      (v) =>
        (!q || [v.funcao, v.cidade, v.local, v.supplier?.company_name].some((c) => norm(c).includes(q))) &&
        (funcao === "todas" || v.funcao === funcao) &&
        (cidade === "todas" || v.cidade === cidade),
    );
    if (ordem === "valor_desc") l = [...l].sort((a, b) => (b.valor_turno ?? 0) - (a.valor_turno ?? 0));
    return l;
  }, [vagas, busca, funcao, cidade, ordem]);

  const combina = (v: VagaListada) =>
    !!perfil && perfil.funcoes.includes(v.funcao) && (!perfil.cidade || !v.cidade || norm(v.cidade).includes(norm(perfil.cidade)) || norm(perfil.cidade).includes(norm(v.cidade)));
  const paraVoce = perfil ? filtradas.filter(combina) : [];
  const outras = perfil ? filtradas.filter((v) => !combina(v)) : filtradas;
  const temFiltro = !!busca || funcao !== "todas" || cidade !== "todas";

  const pendente = vagaFoco || lerVagaPendente();
  const vagaPendente = perfil?.completo && pendente ? vagas.find((v) => v.id === pendente && (situacoes[v.id] ?? "livre") === "livre") : undefined;

  const candidatar = async (v: VagaListada) => {
    if (!user) {
      guardarVagaPendente(v.id);
      return navigate("/profissional/cadastro");
    }
    if (!ehProfissional) {
      return toast({
        title: "Candidatura é para conta de profissional",
        description: "Sua conta é de casal ou fornecedor. Para trabalhar em eventos, crie uma conta de profissional com outro e-mail.",
      });
    }
    if (!perfil?.completo) {
      guardarVagaPendente(v.id);
      return navigate("/profissional/onboarding");
    }
    setSituacoes((s) => ({ ...s, [v.id]: "enviando" }));
    const { error } = await (supabase.from("staff_applications" as any) as any).upsert(
      { job_id: v.id, staff_id: perfil.id, origem: "candidatura", status: "candidato" },
      { onConflict: "job_id,staff_id", ignoreDuplicates: true },
    );
    if (error) {
      setSituacoes((s) => ({ ...s, [v.id]: "livre" }));
      return toast({ title: "Não deu para enviar", description: traduzirErro(error), variant: "destructive" });
    }
    setSituacoes((s) => ({ ...s, [v.id]: "candidato" }));
    limparVagaPendente();
    if (vagaFoco) setParams({}, { replace: true });
    toast({ title: "Candidatura enviada!", description: "O fornecedor vê seu perfil e responde pelo seu painel." });
  };

  const limparFiltros = () => {
    setBusca("");
    setFuncao("todas");
    setCidade("todas");
  };

  const lista = (itens: VagaListada[], pv = false) => (
    <div className="flex flex-col gap-3">
      {itens.map((v) => (
        <VagaCard key={v.id} vaga={v} paraVoce={pv} destaque={v.id === vagaFoco} situacao={situacoes[v.id] ?? "livre"} onCandidatar={candidatar} />
      ))}
    </div>
  );

  // visual enxuto: fundo branco, cinzas neutros, um único tom de destaque (terracota) só em links/foco
  const campo = "h-11 min-w-0 rounded-xl border bg-white px-3.5 text-[15px] outline-none focus:border-[color:var(--hv-clay)]";
  const borda = { borderColor: "var(--vg-linha)", color: "var(--hv-ink)" };
  const btnPrimario = "inline-flex min-h-[44px] items-center justify-center whitespace-nowrap rounded-full px-5 text-[15px] font-semibold text-white";

  return (
    <div className="home-v3 vg-page min-h-screen" style={{ background: "var(--vg-bg)" }}>
      <SEO
        title="Vagas em festas e eventos — Casamenteiro"
        description="Vagas de garçom, barman, cozinha, recepção, som e limpeza em casamentos, aniversários, formaturas e eventos corporativos. Veja data, horário e valor do turno e candidate-se."
        canonical={absoluteUrl("/vagas")}
      />

      <header className="sticky top-0 z-40 border-b backdrop-blur" style={{ borderColor: "var(--vg-linha)", background: "color-mix(in srgb, var(--vg-topo) 92%, transparent)" }}>
        <div className="mx-auto flex max-w-[880px] items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-baseline gap-2 text-[19px] font-extrabold" style={{ letterSpacing: "-0.03em", color: "var(--hv-ink)" }}>
            casamenteiro<span style={{ color: "var(--hv-terracota)", marginLeft: "-0.4em" }}>.</span>
            <span className="hidden text-[14px] font-medium sm:inline" style={{ letterSpacing: 0, color: "#8A8178" }}>vagas</span>
          </Link>
          <nav aria-label="Navegação" className="flex items-center gap-1 sm:gap-2">
            <Link to="/profissional" className="hidden min-h-[44px] items-center px-3 text-[15px] font-medium sm:inline-flex" style={{ color: "var(--hv-ink)" }}>Como funciona</Link>
            {user ? (
              <Link to={ehProfissional ? "/profissional/painel" : "/perfil"} className={btnPrimario} style={{ background: "var(--hv-ink)" }}>
                {ehProfissional ? "Meu painel" : "Minha conta"}
              </Link>
            ) : (
              <>
                <Link to="/profissional/login" className="inline-flex min-h-[44px] items-center px-3 text-[15px] font-medium" style={{ color: "var(--hv-ink)" }}>Entrar</Link>
                <Link to="/profissional/cadastro" className={btnPrimario} style={{ background: "var(--hv-ink)" }}>Criar perfil</Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main>
        {/* Topo + busca: faixa de cor suave que se dissolve no fundo da página */}
        <div className="px-4 pb-10 pt-10 sm:px-6 sm:pt-14" style={{ background: "linear-gradient(180deg, var(--vg-topo) 0%, var(--vg-topo) 60%, var(--vg-bg) 100%)" }}>
        <section className="mx-auto flex max-w-[832px] flex-col gap-5">
          <div className="flex flex-col gap-2">
            <h1 className="m-0 text-[clamp(28px,4vw,40px)] font-extrabold leading-[1.1]" style={{ letterSpacing: "-0.035em", color: "var(--hv-ink)" }}>
              Vagas em <span className="hv-serif" style={{ color: "var(--vg-acento)" }}>festas e eventos</span>
            </h1>
            <p className="m-0 max-w-[600px] text-[16px] leading-relaxed" style={{ color: "#6B635B" }}>
              Casamentos, aniversários, formaturas e corporativos. Veja data, horário e valor do turno antes de se candidatar.
            </p>
          </div>
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <label className="relative block flex-1">
              <span className="sr-only">Buscar vagas</span>
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2" style={{ color: "#8A8178" }} aria-hidden="true" />
              <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Função, cidade ou fornecedor" className={`${campo} w-full pl-10`} style={borda} />
            </label>
            <div className="grid grid-cols-3 gap-2.5 sm:flex">
              <select aria-label="Função" value={funcao} onChange={(e) => setFuncao(e.target.value)} className={campo} style={borda}>
                <option value="todas">Função</option>
                {funcoes.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
              <select aria-label="Cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} className={campo} style={borda}>
                <option value="todas">Cidade</option>
                {cidades.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select aria-label="Ordenar" value={ordem} onChange={(e) => setOrdem(e.target.value as any)} className={campo} style={borda}>
                <option value="data">Por data</option>
                <option value="valor_desc">Por valor</option>
              </select>
            </div>
          </div>
        </section>
        </div>

        <div className="mx-auto flex max-w-[880px] flex-col gap-8 px-4 pb-20 sm:px-6">
        {/* Continuação da vaga escolhida antes do cadastro */}
        {vagaPendente && (
          <div role="status" className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border px-5 py-4" style={{ borderColor: "var(--vg-linha)", background: "#fff" }}>
            <span className="flex flex-col gap-0.5">
              <strong className="text-[16px]" style={{ color: "var(--hv-ink)" }}>Falta só confirmar a sua candidatura</strong>
              <span className="text-[14px]" style={{ color: "#6B635B" }}>{vagaPendente.funcao} · {fmtDataVaga(vagaPendente.data)}{vagaPendente.cidade ? ` · ${vagaPendente.cidade}` : ""}</span>
            </span>
            <button type="button" onClick={() => candidatar(vagaPendente)} className={btnPrimario} style={{ background: "var(--hv-ink)" }}>
              Candidatar-se agora
            </button>
          </div>
        )}

        {/* Profissional com conta mas sem perfil completo */}
        {ehProfissional && perfil && !perfil.completo && (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-white px-5 py-4" style={{ borderColor: "var(--vg-linha)" }}>
            <span className="text-[15px]" style={{ color: "var(--hv-ink)" }}><strong>Complete seu perfil</strong> para se candidatar e ver as vagas que combinam com você.</span>
            <Link to="/profissional/onboarding" className="text-[15px] font-semibold" style={{ color: "var(--hv-clay)" }}>Completar perfil →</Link>
          </div>
        )}

        {carregando ? (
          <div className="flex flex-col gap-3" aria-busy="true">
            {[0, 1, 2].map((i) => <div key={i} className="h-[120px] animate-pulse rounded-2xl" style={{ background: "#F5F2EE" }} />)}
          </div>
        ) : vagas.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border bg-white px-6 py-14 text-center" style={{ borderColor: "var(--vg-linha)" }}>
            <h2 className="m-0 text-[22px] font-bold" style={{ letterSpacing: "-0.02em", color: "var(--hv-ink)" }}>As primeiras vagas estão chegando</h2>
            <p className="m-0 max-w-[480px] text-[15px] leading-relaxed" style={{ color: "#6B635B" }}>
              {perfil?.completo
                ? "Seu perfil está pronto. Quando abrir uma vaga na sua função e na sua região, você recebe um aviso por e-mail."
                : "Crie seu perfil e receba um aviso por e-mail quando abrir uma vaga na sua função e na sua região."}
            </p>
            {!perfil?.completo && (
              <Link to={user ? "/profissional/onboarding" : "/profissional/cadastro"} className={`${btnPrimario} mt-2`} style={{ background: "var(--hv-ink)" }}>
                Criar meu perfil grátis
              </Link>
            )}
          </div>
        ) : filtradas.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-14 text-center">
            <p className="m-0 text-[17px] font-semibold" style={{ color: "var(--hv-ink)" }}>Nenhuma vaga com esses filtros.</p>
            <button type="button" onClick={limparFiltros} className="text-[15px] font-semibold" style={{ color: "var(--hv-clay)" }}>Ver todas as {vagas.length} vagas</button>
          </div>
        ) : (
          <>
            {paraVoce.length > 0 && (
              <section aria-labelledby="pv-title" className="flex flex-col gap-3">
                <h2 id="pv-title" className="m-0 text-[17px] font-bold" style={{ color: "var(--hv-ink)" }}>Para você <span className="font-normal" style={{ color: "#8A8178" }}>· sua função e sua cidade</span></h2>
                {lista(paraVoce, true)}
              </section>
            )}
            {outras.length > 0 && (
              <section aria-labelledby="todas-title" className="flex flex-col gap-3">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <h2 id="todas-title" className="m-0 text-[17px] font-bold" style={{ color: "var(--hv-ink)" }}>
                    {paraVoce.length > 0 ? "Outras vagas" : `${filtradas.length} ${filtradas.length === 1 ? "vaga aberta" : "vagas abertas"}`}
                  </h2>
                  <span className="flex items-center gap-3 text-[14px]" style={{ color: "#8A8178" }}>
                    Valor por turno, combinado direto com o fornecedor
                    {temFiltro && (
                      <button type="button" onClick={limparFiltros} className="inline-flex items-center gap-1 font-semibold" style={{ color: "var(--hv-clay)" }}>
                        <X className="h-3.5 w-3.5" aria-hidden="true" />Limpar filtros
                      </button>
                    )}
                  </span>
                </div>
                {lista(outras)}
              </section>
            )}
          </>
        )}

        {/* Ligação com a página do profissional (só para quem ainda não tem perfil) */}
        {!perfil && (
          <p className="m-0 border-t pt-6 text-center text-[15px]" style={{ borderColor: "var(--vg-linha)", color: "#6B635B" }}>
            É profissional de eventos? Crie seu perfil e receba convites direto de buffets e espaços.{" "}
            <Link to="/profissional" className="font-semibold" style={{ color: "var(--vg-acento)" }}>Ver como funciona →</Link>
          </p>
        )}
        </div>
      </main>
      <HomeFooterV3 />
    </div>
  );
}
