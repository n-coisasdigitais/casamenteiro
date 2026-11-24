import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { BadgeCheck, Briefcase, Search, ShieldCheck, Users } from "lucide-react";
import SEO from "@/components/SEO";
import CityAutocomplete from "@/components/CityAutocomplete";
import { RodapeVitrine, TopoVitrine } from "@/components/vitrine/VitrineLayout";
import CardProfissional from "@/components/profissionais/CardProfissional";
import { useAuth } from "@/contexts/AuthContext";
import { absoluteUrl, breadcrumbJsonLd, itemListJsonLd } from "@/lib/seo";
import { FUNCOES_STAFF, funcaoDoSlug, pluralFuncao, slugFuncao } from "@/lib/funcoesStaff";
import { buscarProfissionais, POR_PAGINA, type ProfissionalPublico } from "@/lib/profissionais";

/**
 * /profissionais e /profissionais/:funcao — busca pública de profissionais de eventos
 * (garçons, cozinha, bar, limpeza...). Qualquer pessoa vê o perfil público;
 * valor por turno e convite ficam para fornecedor logado.
 */
export default function Profissionais() {
  const { funcao: funcaoSlug } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, perfis } = useAuth();
  const ehFornecedor = !!perfis?.fornecedor;

  const funcao = funcaoDoSlug(funcaoSlug);
  const cidade = params.get("cidade") || "";
  const verificados = params.get("verificados") === "1";

  const [itens, setItens] = useState<ProfissionalPublico[]>([]);
  const [total, setTotal] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [buscaFuncao, setBuscaFuncao] = useState(funcaoSlug || "");
  const [buscaCidade, setBuscaCidade] = useState(cidade);

  useEffect(() => {
    setBuscaFuncao(funcaoSlug || "");
    setBuscaCidade(cidade);
  }, [funcaoSlug, cidade]);

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    buscarProfissionais({ funcao, cidade, verificados, offset: 0 }).then((r) => {
      if (!vivo) return;
      setItens(r.itens);
      setTotal(r.total);
      setCarregando(false);
    });
    return () => {
      vivo = false;
    };
    // user: o valor por turno muda quando o fornecedor entra
  }, [funcao, cidade, verificados, user?.id]);

  const carregarMais = async () => {
    setCarregandoMais(true);
    const r = await buscarProfissionais({ funcao, cidade, verificados, offset: itens.length });
    setItens((l) => [...l, ...r.itens.filter((x) => !l.some((y) => y.id === x.id))]);
    setCarregandoMais(false);
  };

  const qs = (extra: Record<string, string | null>) => {
    const n = new URLSearchParams(params);
    Object.entries(extra).forEach(([k, v]) => (v ? n.set(k, v) : n.delete(k)));
    const s = n.toString();
    return s ? `?${s}` : "";
  };

  const buscar = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/profissionais${buscaFuncao ? `/${buscaFuncao}` : ""}${qs({ cidade: buscaCidade.trim() || null })}`);
  };

  const titulo = funcao ? pluralFuncao(funcao) : "Profissionais";
  const ondeTxt = cidade ? ` em ${cidade}` : "";
  const seoTitulo = `${titulo} para eventos${ondeTxt} — verificados e avaliados | Casamenteiro`;
  const seoDesc = `Encontre ${(funcao ? pluralFuncao(funcao) : "garçons, cozinheiros, barmen, recepcionistas e equipe de limpeza").toLowerCase()} para casamentos e eventos${ondeTxt}. Perfis com avaliações de fornecedores, histórico de eventos e verificação de documentos.`;
  const path = `/profissionais${funcaoSlug && funcao ? `/${funcaoSlug}` : ""}`;
  const jsonLd = useMemo(
    () => [
      breadcrumbJsonLd([
        { name: "Início", path: "/" },
        { name: "Profissionais", path: "/profissionais" },
        ...(funcao ? [{ name: pluralFuncao(funcao), path }] : []),
      ]),
      ...(itens.length
        ? [itemListJsonLd(itens.slice(0, 20).map((p) => ({ name: p.nome, path: `/profissional/${p.slug}` })))]
        : []),
    ],
    [itens, funcao, path],
  );

  if (funcaoSlug && !funcao) return <Navigate to={`/profissionais${qs({})}`} replace />;

  return (
    <div className="vt">
      <SEO
        title={seoTitulo}
        description={seoDesc}
        canonical={absoluteUrl(path + (cidade ? `?cidade=${encodeURIComponent(cidade)}` : ""))}
        jsonLd={jsonLd}
      />
      <TopoVitrine ativo="profissionais" />

      <section className="border-b border-[var(--vt-line)] bg-white/60">
        <div className="vt-wrap py-8 md:py-12">
          <nav className="mb-3 text-[13px] text-[var(--vt-muted)]">
            <Link to="/">Início</Link> › <Link to="/profissionais">Profissionais</Link>
            {funcao && <> › {pluralFuncao(funcao)}</>}
          </nav>
          <h1 className="vt-serif max-w-[22ch] text-[clamp(30px,4.4vw,48px)] leading-[1.08]">
            {titulo} para eventos
            {cidade ? (
              <>
                {" "}
                em <em>{cidade}</em>
              </>
            ) : (
              <>
                {" "}
                <em>de confiança</em>
              </>
            )}
          </h1>
          <p className="mt-3 max-w-[58ch] text-[16px] text-[var(--vt-body)]">
            Garçons, cozinha, bar, recepção e limpeza avaliados por fornecedores de verdade. Veja histórico de eventos,
            notas e quem tem documentos verificados.
          </p>

          <form
            onSubmit={buscar}
            className="mt-6 grid gap-2 rounded-[20px] border border-[var(--vt-line)] bg-white p-2 shadow-[var(--vt-shadow)] md:grid-cols-[1fr_1.2fr_auto]"
          >
            <label className="flex flex-col gap-0.5 rounded-[14px] px-3.5 py-2 text-[11.5px] font-bold text-[var(--vt-muted)]">
              Função
              <select
                value={buscaFuncao}
                onChange={(e) => setBuscaFuncao(e.target.value)}
                className="border-0 bg-transparent p-0 text-[16px] font-semibold text-[var(--vt-ink)] outline-none"
              >
                <option value="">Todas as funções</option>
                {FUNCOES_STAFF.map((f) => (
                  <option key={f} value={slugFuncao(f)}>
                    {f}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-col gap-0.5 rounded-[14px] px-3.5 py-2 text-[11.5px] font-bold text-[var(--vt-muted)] md:border-l md:border-[var(--vt-line)]">
              Cidade do evento
              <CityAutocomplete
                fonte="brasil"
                mostrarContinuarMesmoAssim={false}
                value={buscaCidade}
                placeholder="Digite e selecione"
                onChange={(c) => setBuscaCidade(c)}
                onSelect={(c, uf) => setBuscaCidade(uf ? `${c}, ${uf}` : c)}
              />
            </div>
            <button type="submit" className="vt-pill pri h-[52px] rounded-[14px] px-6">
              <Search className="h-[18px] w-[18px]" /> Buscar
            </button>
          </form>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              to={`${path}${qs({ verificados: verificados ? null : "1" })}`}
              className={`vt-fb ${verificados ? "on" : ""}`}
            >
              <ShieldCheck className="h-4 w-4" /> Só verificados
            </Link>
            {cidade && (
              <Link to={`${path}${qs({ cidade: null })}`} className="vt-fb on">
                {cidade} ✕
              </Link>
            )}
          </div>
        </div>
      </section>

      <main className="vt-wrap">
        <div className="vt-sec flex flex-wrap gap-2">
          {FUNCOES_STAFF.map((f) => {
            const s = slugFuncao(f);
            const ativo = s === funcaoSlug;
            return (
              <Link
                key={f}
                to={`/profissionais${ativo ? "" : `/${s}`}${qs({})}`}
                className={`vt-chip ${ativo ? "!border-[var(--vt-clay)] !text-[var(--vt-clay)]" : ""}`}
              >
                {f}
              </Link>
            );
          })}
        </div>

        <section className="vt-sec">
          <p className="mb-4 text-sm text-[var(--vt-muted)]">
            {carregando
              ? "Buscando…"
              : `${total} ${total === 1 ? "profissional encontrado" : "profissionais encontrados"}${cidade ? " que atendem essa cidade" : ""}`}
          </p>

          {carregando ? (
            <div className="vt-grade">
              {Array.from({ length: 6 }).map((_, k) => (
                <div key={k} className="h-[150px] animate-pulse rounded-[22px] bg-[#efe7dd]" />
              ))}
            </div>
          ) : itens.length ? (
            <>
              <div className="vt-grade">
                {itens.map((p) => (
                  <CardProfissional key={p.id} p={p} />
                ))}
              </div>
              {itens.length < total && (
                <div className="mt-8 flex justify-center">
                  <button type="button" className="vt-pill" onClick={carregarMais} disabled={carregandoMais}>
                    {carregandoMais ? "Carregando…" : `Ver mais (${total - itens.length})`}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="vt-caixa">
              <h2 className="vt-serif text-[21px]">
                Ainda não há {titulo.toLowerCase()}
                {ondeTxt} por aqui
              </h2>
              <p className="mt-1 text-sm text-[var(--vt-body)]">
                Tente outra função, tire o filtro de cidade ou publique uma vaga: os profissionais da região recebem o
                aviso.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link to="/profissionais" className="vt-pill">
                  Ver todos
                </Link>
                <Link
                  to={ehFornecedor ? "/fornecedor/painel?tab=vagas" : "/fornecedor/cadastro"}
                  className="vt-pill pri"
                >
                  Publicar uma vaga
                </Link>
              </div>
            </div>
          )}
        </section>

        <section className="vt-sec grid gap-4 md:grid-cols-2">
          {!ehFornecedor && (
            <div className="vt-caixa">
              <Briefcase className="h-6 w-6 text-[var(--vt-clay)]" />
              <h2 className="vt-serif mt-2 text-[21px]">Precisa de equipe para um evento?</h2>
              <p className="mt-1 text-sm text-[var(--vt-body)]">
                Crie sua conta de fornecedor para ver o valor por turno, salvar sua equipe de confiança e convidar para
                as suas vagas.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link to="/fornecedor/cadastro" className="vt-pill pri">
                  Criar conta de fornecedor
                </Link>
                <Link to="/fornecedor/login" className="vt-pill">
                  Já tenho conta
                </Link>
              </div>
            </div>
          )}
          <div className="vt-caixa">
            <Users className="h-6 w-6 text-[var(--vt-clay)]" />
            <h2 className="vt-serif mt-2 text-[21px]">É profissional de eventos?</h2>
            <p className="mt-1 text-sm text-[var(--vt-body)]">
              Crie seu perfil grátis, receba vagas da sua cidade e use a página como seu cartão de visitas para ser
              contratado.
            </p>
            <Link to="/profissional" className="vt-pill mt-4">
              <BadgeCheck className="h-4 w-4" /> Criar meu perfil grátis
            </Link>
          </div>
        </section>
      </main>
      <RodapeVitrine />
    </div>
  );
}
