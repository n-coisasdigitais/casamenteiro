import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CalendarCheck, Heart, Lock, MapPin, Pencil, Route, Share2, ShieldCheck, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { publicUrl } from "@/lib/appUrl";
import { compartilharPerfil, gerarArquivoCartao } from "@/lib/cartaoCompartilhar";
import SEO from "@/components/SEO";
import { RodapeVitrine, TopoVitrine } from "@/components/vitrine/VitrineLayout";
import CardProfissional, { AvatarProfissional } from "@/components/profissionais/CardProfissional";
import { absoluteUrl, breadcrumbJsonLd, truncate } from "@/lib/seo";
import { listaFuncoes, slugFuncao } from "@/lib/funcoesStaff";
import {
  buscarProfissionais,
  ehVerificado,
  localDe,
  primeiroNome,
  reaisTurno,
  type ProfissionalPublico,
} from "@/lib/profissionais";
import { traduzirErro } from "@/lib/errorMessages";

const COLS =
  "id, nome, slug, foto_url, funcoes, cidade, estado, raio_km, bio, rating, review_count, eventos_concluidos, created_at, verificacao_status";

const mesAno = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString("pt-BR", { month: "long", year: "numeric" }) : null;

export default function StaffPublicProfile() {
  const { slug } = useParams();
  const { user, perfis } = useAuth();
  const { toast } = useToast();
  const ehFornecedor = !!perfis?.fornecedor;

  const [staff, setStaff] = useState<any>(null);
  const [naoAchou, setNaoAchou] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [autores, setAutores] = useState<Record<string, string>>({});
  const [proximos, setProximos] = useState<ProfissionalPublico[]>([]);
  const [ehDono, setEhDono] = useState(false);

  // contratação (fornecedor logado)
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [valorTurno, setValorTurno] = useState<number | null>(null);
  const [naEquipe, setNaEquipe] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [compartilhando, setCompartilhando] = useState(false);
  const [arquivoCartao, setArquivoCartao] = useState<File | null>(null);

  useEffect(() => {
    if (!slug) return;
    let vivo = true;
    setStaff(null);
    setNaoAchou(false);
    (async () => {
      const { data } = await (supabase.from("staff_profiles" as any) as any)
        .select(COLS)
        .eq("slug", slug)
        .eq("is_public", true)
        .maybeSingle();
      if (!vivo) return;
      if (!data) {
        setNaoAchou(true);
        return;
      }
      setStaff(data);
      const { data: rv } = await (supabase.from("staff_reviews" as any) as any)
        .select("id, autor_id, estrelas, comentario, created_at")
        .eq("avaliado_id", data.id)
        .eq("autor_tipo", "fornecedor")
        .order("created_at", { ascending: false })
        .limit(20);
      if (!vivo) return;
      setReviews(rv || []);
      const ids = [...new Set((rv || []).map((r: any) => r.autor_id).filter(Boolean))];
      if (ids.length) {
        const { data: sups } = await supabase
          .from("suppliers")
          .select("id, company_name")
          .in("id", ids as string[]);
        if (vivo) setAutores(Object.fromEntries((sups || []).map((s: any) => [s.id, s.company_name])));
      }
      const r = await buscarProfissionais({ funcao: data.funcoes?.[0], cidade: localDe(data), limite: 7 });
      if (vivo) setProximos(r.itens.filter((p) => p.id !== data.id).slice(0, 6));
    })();
    return () => {
      vivo = false;
    };
  }, [slug]);

  // dono do perfil e dados de contratação para fornecedor
  useEffect(() => {
    if (!staff?.id || !user) {
      setEhDono(false);
      setSupplierId(null);
      setValorTurno(null);
      return;
    }
    let vivo = true;
    (async () => {
      const { data: meu } = await (supabase.from("staff_profiles" as any) as any)
        .select("id")
        .eq("id", staff.id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (vivo) setEhDono(!!meu);
      if (!ehFornecedor) return;
      const { data: sup } = await supabase.from("suppliers").select("id").eq("user_id", user.id).maybeSingle();
      if (!vivo || !sup) return;
      setSupplierId(sup.id);
      const [{ data: valor }, { data: fav }] = await Promise.all([
        (supabase.rpc as any)("valor_turno_profissional", { _staff_id: staff.id }),
        (supabase.from("supplier_staff_favorites" as any) as any)
          .select("staff_id")
          .eq("supplier_id", sup.id)
          .eq("staff_id", staff.id)
          .maybeSingle(),
      ]);
      if (!vivo) return;
      setValorTurno(valor != null ? Number(valor) : null);
      setNaEquipe(!!fav);
    })();
    return () => {
      vivo = false;
    };
  }, [staff?.id, user?.id, ehFornecedor]);

  const dadosCartao = useMemo(() => {
    if (!staff) return null;
    const nota = Number(staff.rating) || 0;
    return {
      titulo: staff.nome,
      texto: `Conheça ${staff.nome}, profissional de eventos no Casamenteiro:`,
      url: publicUrl(`/profissional/${slug}`),
      nome: staff.nome,
      fotoUrl: staff.foto_url,
      linha1: (staff.funcoes || []).slice(0, 3).join(" · ") || "Profissional de eventos",
      linha2: localDe(staff) || null,
      selo: ehVerificado(staff) ? "✓ Verificado" : nota >= 4 ? `★ ${nota.toFixed(1).replace(".", ",")}` : null,
    };
  }, [staff, slug]);

  // Gera a imagem com antecedência: no iPhone o share precisa sair logo após o toque.
  useEffect(() => {
    if (!dadosCartao) return;
    let vivo = true;
    gerarArquivoCartao(dadosCartao).then((f) => vivo && setArquivoCartao(f));
    return () => {
      vivo = false;
    };
  }, [dadosCartao]);

  const compartilhar = async () => {
    if (!dadosCartao) return;
    setCompartilhando(true);
    const resultado = await compartilharPerfil(dadosCartao, arquivoCartao);
    setCompartilhando(false);
    if (resultado === "imagem-baixada")
      toast({ title: "Imagem baixada e link copiado!", description: "É só colar o link junto da imagem." });
    else if (resultado === "link-copiado") toast({ title: "Link copiado!" });
  };

  const alternarEquipe = async () => {
    if (!supplierId || !staff) return;
    setSalvando(true);
    const tabela = supabase.from("supplier_staff_favorites" as any) as any;
    const { error } = naEquipe
      ? await tabela.delete().eq("supplier_id", supplierId).eq("staff_id", staff.id)
      : await tabela.insert({ supplier_id: supplierId, staff_id: staff.id });
    setSalvando(false);
    if (error) return toast({ title: "Erro", description: traduzirErro(error), variant: "destructive" });
    setNaEquipe(!naEquipe);
    toast({ title: naEquipe ? "Removido da sua equipe" : "Salvo na sua equipe!" });
  };

  if (naoAchou) {
    return (
      <div className="vt">
        <SEO title="Perfil não encontrado | Casamenteiro" noIndex />
        <TopoVitrine />
        <main className="vt-wrap py-16">
          <div className="vt-caixa mx-auto max-w-[520px] text-center">
            <h1 className="vt-serif text-[24px]">Este perfil não está disponível</h1>
            <p className="mt-2 text-sm text-[var(--vt-body)]">
              Ele pode ter sido desativado ou o endereço está incorreto.
            </p>
            <Link to="/profissionais" className="vt-pill pri mt-5">
              Ver profissionais de eventos
            </Link>
          </div>
        </main>
        <RodapeVitrine />
      </div>
    );
  }

  if (!staff) {
    return (
      <div className="vt">
        <TopoVitrine />
        <main className="vt-wrap py-10">
          <div className="h-[220px] animate-pulse rounded-[22px] bg-[#efe7dd]" />
        </main>
      </div>
    );
  }

  const local = localDe(staff);
  const funcoes: string[] = staff.funcoes || [];
  const nota = Number(staff.rating || 0);
  const nome1 = primeiroNome(staff.nome);
  const desde = mesAno(staff.created_at);
  const path = `/profissional/${staff.slug}`;
  const titulo = `${staff.nome} — ${listaFuncoes(funcoes, 2)}${local ? ` em ${local}` : ""} | Casamenteiro`;
  const descricao = truncate(
    staff.bio ||
      `${staff.nome}, ${listaFuncoes(funcoes).toLowerCase()} para casamentos e eventos${local ? ` em ${local}` : ""}.${
        nota && staff.review_count
          ? ` Nota ${nota.toFixed(1).replace(".", ",")} em ${staff.review_count} avaliações.`
          : ""
      } Veja o perfil e convide pelo Casamenteiro.`,
  );
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Person",
      name: staff.nome,
      jobTitle: funcoes.join(", ") || "Profissional de eventos",
      description: descricao,
      image: staff.foto_url || undefined,
      url: absoluteUrl(path),
      address: staff.cidade
        ? {
            "@type": "PostalAddress",
            addressLocality: staff.cidade,
            addressRegion: staff.estado || undefined,
            addressCountry: "BR",
          }
        : undefined,
      knowsAbout: funcoes.length ? funcoes : undefined,
    },
    breadcrumbJsonLd([
      { name: "Início", path: "/" },
      { name: "Profissionais", path: "/profissionais" },
      ...(funcoes[0] ? [{ name: funcoes[0], path: `/profissionais/${slugFuncao(funcoes[0])}` }] : []),
      { name: staff.nome, path },
    ]),
  ];

  return (
    <div className="vt">
      <SEO
        title={titulo}
        description={descricao}
        canonical={absoluteUrl(path)}
        ogImage={staff.foto_url || undefined}
        jsonLd={jsonLd}
      />
      <TopoVitrine />

      <main className="vt-wrap pb-6 pt-6">
        <nav className="mb-4 text-[13px] text-[var(--vt-muted)]">
          <Link to="/profissionais">Profissionais</Link>
          {funcoes[0] && (
            <>
              {" "}
              › <Link to={`/profissionais/${slugFuncao(funcoes[0])}`}>{funcoes[0]}</Link>
            </>
          )}{" "}
          › {staff.nome}
        </nav>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          {/* coluna principal */}
          <div className="space-y-5">
            <section className="vt-caixa">
              <div className="flex flex-wrap items-start gap-5">
                <AvatarProfissional nome={staff.nome} foto={staff.foto_url} tamanho={104} />
                <div className="min-w-0 flex-1">
                  <h1 className="vt-serif text-[clamp(26px,3.4vw,34px)] leading-tight">{staff.nome}</h1>
                  <p className="mt-1 text-[16px] text-[var(--vt-body)]">{listaFuncoes(funcoes, 4)} para eventos</p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13.5px] text-[var(--vt-muted)]">
                    {local && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-4 w-4" /> {local}
                      </span>
                    )}
                    {!!staff.raio_km && (
                      <span className="inline-flex items-center gap-1">
                        <Route className="h-4 w-4" /> Atende até {staff.raio_km} km
                      </span>
                    )}
                    {ehVerificado(staff) && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--vt-sage)] px-2.5 py-0.5 text-[12px] font-bold text-[var(--vt-ok)]">
                        <ShieldCheck className="h-3.5 w-3.5" /> Documentos verificados
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3 border-t border-[var(--vt-line)] pt-4 text-center">
                <div>
                  <b className="block text-[20px]">
                    {nota > 0 && staff.review_count ? nota.toFixed(1).replace(".", ",") : "—"}
                  </b>
                  <span className="text-[12.5px] text-[var(--vt-muted)]">
                    {staff.review_count
                      ? `${staff.review_count} ${staff.review_count === 1 ? "avaliação" : "avaliações"}`
                      : "sem avaliações"}
                  </span>
                </div>
                <div>
                  <b className="block text-[20px]">{staff.eventos_concluidos || 0}</b>
                  <span className="text-[12.5px] text-[var(--vt-muted)]">eventos pelo Casamenteiro</span>
                </div>
                <div>
                  <b className="block text-[15px] capitalize leading-[30px]">{desde || "—"}</b>
                  <span className="text-[12.5px] text-[var(--vt-muted)]">no Casamenteiro desde</span>
                </div>
              </div>

              {funcoes.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {funcoes.map((f) => (
                    <Link
                      key={f}
                      to={`/profissionais/${slugFuncao(f)}${staff.cidade ? `?cidade=${encodeURIComponent(local)}` : ""}`}
                      className="vt-chip"
                    >
                      {f}
                    </Link>
                  ))}
                </div>
              )}
            </section>

            {staff.bio && (
              <section className="vt-caixa">
                <h2 className="vt-h2 !text-[22px]">Sobre {nome1}</h2>
                <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-[var(--vt-body)]">
                  {staff.bio}
                </p>
              </section>
            )}

            <section className="vt-caixa">
              <h2 className="vt-h2 !text-[22px]">O que dizem os fornecedores</h2>
              {reviews.length === 0 ? (
                <p className="mt-3 text-sm text-[var(--vt-muted)]">
                  Ainda sem avaliações. As avaliações aparecem aqui depois de cada evento feito pelo Casamenteiro.
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-[var(--vt-line)]">
                  {reviews.map((r) => (
                    <li key={r.id} className="py-3">
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${i < r.estrelas ? "fill-[var(--vt-star)] text-[var(--vt-star)]" : "text-[var(--vt-line2)]"}`}
                          />
                        ))}
                      </div>
                      {r.comentario && <p className="mt-1.5 text-[14.5px]">{r.comentario}</p>}
                      <p className="mt-1 text-xs text-[var(--vt-muted)]">
                        {autores[r.autor_id] ? `${autores[r.autor_id]} · ` : ""}
                        {new Date(r.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* lateral: contratação */}
          <aside className="space-y-4 lg:sticky lg:top-[76px] lg:self-start">
            {ehDono ? (
              <div className="vt-caixa">
                <h2 className="vt-serif text-[20px]">Este é o seu perfil</h2>
                <p className="mt-1 text-sm text-[var(--vt-body)]">
                  Use este link como seu cartão de visitas: mande no WhatsApp, coloque na bio do Instagram e no
                  currículo.
                </p>
                <div className="mt-4 flex flex-col gap-2">
                  <button type="button" className="vt-pill pri" onClick={compartilhar} disabled={compartilhando}>
                    <Share2 className="h-4 w-4" /> {compartilhando ? "Gerando imagem…" : "Compartilhar meu perfil"}
                  </button>
                  <Link to="/profissional/onboarding" className="vt-pill">
                    <Pencil className="h-4 w-4" /> Editar perfil
                  </Link>
                  {!ehVerificado(staff) && (
                    <Link
                      to="/profissional/painel"
                      className="text-center text-[13px] font-semibold text-[var(--vt-clay)]"
                    >
                      Envie seus documentos para ganhar o selo de verificado
                    </Link>
                  )}
                </div>
              </div>
            ) : supplierId ? (
              <div className="vt-caixa">
                <h2 className="vt-serif text-[20px]">Contratar {nome1}</h2>
                <p className="mt-2 text-[15px]">
                  {valorTurno ? (
                    <>
                      a partir de <b>{reaisTurno(valorTurno)}</b> por turno
                    </>
                  ) : (
                    <span className="text-[var(--vt-muted)]">Valor por turno a combinar</span>
                  )}
                </p>
                <div className="mt-4 flex flex-col gap-2">
                  <Link to="/fornecedor/painel?tab=vagas" className="vt-pill pri">
                    <CalendarCheck className="h-4 w-4" /> Convidar para uma vaga
                  </Link>
                  <button type="button" className="vt-pill" onClick={alternarEquipe} disabled={salvando}>
                    <Heart className={`h-4 w-4 ${naEquipe ? "fill-current text-[var(--vt-clay)]" : ""}`} />
                    {naEquipe ? "Na sua equipe" : "Salvar na minha equipe"}
                  </button>
                </div>
                <p className="mt-3 text-[12.5px] text-[var(--vt-muted)]">
                  O telefone de {nome1} é liberado quando o convite para a vaga é aceito.
                </p>
              </div>
            ) : (
              <div className="vt-caixa">
                <h2 className="vt-serif text-[20px]">Contratar {nome1}</h2>
                <p className="mt-2 inline-flex items-center gap-1.5 text-[14px] text-[var(--vt-muted)]">
                  <Lock className="h-4 w-4" /> Valor por turno visível para fornecedores
                </p>
                <p className="mt-2 text-sm text-[var(--vt-body)]">
                  Crie sua conta grátis de fornecedor para ver o valor, salvar {nome1} na sua equipe e convidar para as
                  suas vagas.
                </p>
                <div className="mt-4 flex flex-col gap-2">
                  <Link to="/fornecedor/cadastro" className="vt-pill pri">
                    Criar conta de fornecedor
                  </Link>
                  <Link to="/fornecedor/login" className="vt-pill">
                    Já tenho conta
                  </Link>
                </div>
              </div>
            )}

            {!ehDono && (
              <button type="button" className="vt-pill w-full" onClick={compartilhar} disabled={compartilhando}>
                <Share2 className="h-4 w-4" /> {compartilhando ? "Gerando imagem…" : "Compartilhar perfil"}
              </button>
            )}
          </aside>
        </div>

        {proximos.length > 0 && (
          <section className="vt-sec">
            <h2 className="vt-h2 mb-4">
              Outros profissionais{" "}
              {local ? (
                <>
                  em <em>{staff.cidade}</em>
                </>
              ) : (
                "de eventos"
              )}
            </h2>
            <div className="vt-grade">
              {proximos.map((p) => (
                <CardProfissional key={p.id} p={p} />
              ))}
            </div>
            <Link
              to={`/profissionais${funcoes[0] ? `/${slugFuncao(funcoes[0])}` : ""}${local ? `?cidade=${encodeURIComponent(local)}` : ""}`}
              className="vt-pill mt-6"
            >
              Ver todos
            </Link>
          </section>
        )}
      </main>
      <RodapeVitrine />
    </div>
  );
}
