import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Check, Loader2, Share2, X } from "lucide-react";
import BrandLogo from "@/components/shared/BrandLogo";
import SEO from "@/components/SEO";
import UserMenu from "@/components/UserMenu";
import AparenciaCard, { type EscolhasCard } from "@/components/quiz/AparenciaCard";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { absoluteUrl } from "@/lib/seo";
import {
  RESULTADOS,
  TEXTOS_PADRAO,
  calcularEstilo,
  carregarFonteCaveat,
  carregarMadrinha,
  nomeNivelMadrinha,
  carregarQuiz,
  carregarTextos,
  contagemEstilo,
  guardarIndicacao,
  guardarPendente,
  lerPendente,
  marcarCompartilhou,
  novoId,
  registrarResultado,
  reivindicarPendente,
  type EstiloQuiz,
  type OpcaoQuiz,
  type PerguntaQuiz,
  type ResultadoQuiz,
  type TextosQuiz,
} from "@/lib/quiz";

type Etapa = "intro" | "pergunta" | "resultado" | "card";
const TERRA = "#A9582D";
const TINTA = "#2B211B";
const SUAVE = "#6E625A";

export default function Quiz() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [carregando, setCarregando] = useState(true);
  const [perguntas, setPerguntas] = useState<PerguntaQuiz[]>([]);
  const [textos, setTextos] = useState<TextosQuiz>(TEXTOS_PADRAO);
  const [etapa, setEtapa] = useState<Etapa>("intro");
  const [indice, setIndice] = useState(0);
  const [respostas, setRespostas] = useState<Record<string, OpcaoQuiz[]>>({});
  const [visual, setVisual] = useState<"noiva" | "noivo">("noiva");
  const [resultado, setResultado] = useState<ResultadoQuiz | null>(null);
  const [contagem, setContagem] = useState(0);
  const [fornecedores, setFornecedores] = useState<{ id: string; slug: string | null; company_name: string }[]>([]);
  const [codigo, setCodigo] = useState<string | null>(null);
  const [selo, setSelo] = useState<string | null>(null);
  const [madrinha, setMadrinha] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [mostrarPassos, setMostrarPassos] = useState(false);

  useEffect(() => {
    carregarFonteCaveat();
    guardarIndicacao(params.get("de"));
    Promise.all([carregarQuiz(), carregarTextos()])
      .then(([p, t]) => {
        setPerguntas(p);
        setTextos(t);
      })
      .catch(() => setPerguntas([]))
      .finally(() => setCarregando(false));
  }, [params]);

  // Link de compartilhamento com o código de quem compartilha (conta logada)
  useEffect(() => {
    if (!user) return;
    (supabase.from("sonho_perfis" as any) as any)
      .select("codigo, match_lista, mostrar_selo_match")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }: any) => {
        if (data?.codigo) setCodigo(data.codigo);
        setSelo(data?.match_lista && data?.mostrar_selo_match ? "Topo conhecer alguém" : null);
      });
    carregarMadrinha().then((m) => setMadrinha(nomeNivelMadrinha(m.nivel)));
  }, [user?.id, resultado?.id]);

  // Voltando do cadastro ou vindo do mural ("Criar meu card"): retoma o resultado
  useEffect(() => {
    if (carregando) return;
    const pendente = lerPendente();
    if (params.get("card") === "1" && pendente) {
      setResultado(pendente);
      setEtapa("card");
    }
  }, [carregando, params]);

  const pergunta = perguntas[indice];
  const selecionadas = pergunta ? respostas[pergunta.id] || [] : [];
  const temVisual = !!pergunta?.opcoes.some((o) => o.grupo);
  const opcoesVisiveis = pergunta ? pergunta.opcoes.filter((o) => !o.grupo || o.grupo === visual) : [];
  const info = resultado ? RESULTADOS[resultado.estilo] : null;
  const urlCompartilhar = absoluteUrl(`/quiz${codigo ? `?de=${codigo}` : ""}`);

  const fotosResultado = useMemo(() => resultado?.fotos.slice(0, 3) || [], [resultado]);

  const finalizar = async (todas: Record<string, OpcaoQuiz[]>) => {
    const escolhidas = perguntas.flatMap((p) => todas[p.id] || []);
    const estilo: EstiloQuiz = calcularEstilo(perguntas.map((p) => todas[p.id] || []));
    const r: ResultadoQuiz = {
      id: novoId(),
      estilo,
      opcoes: escolhidas.map((o) => o.id),
      fotos: escolhidas.map((o) => o.foto_url),
      titulo: textos.titulos[1] || textos.titulos[0],
      adesivo: textos.adesivos[0]?.texto ?? null,
      formato: "postit",
      usarFoto: false,
    };
    setResultado(r);
    guardarPendente(r);
    setEtapa("resultado");
    window.scrollTo({ top: 0 });
    registrarResultado(r, user?.id ?? null).catch(() => {});
    contagemEstilo(estilo).then(setContagem);
    const ids = [...new Set(escolhidas.map((o) => o.supplier_id).filter(Boolean))] as string[];
    if (ids.length) {
      const { data } = await (supabase.from("suppliers") as any)
        .select("id, slug, company_name")
        .in("id", ids)
        .eq("status", "approved");
      setFornecedores(data || []);
    }
  };

  const avancar = (novas: Record<string, OpcaoQuiz[]>) => {
    if (indice < perguntas.length - 1) setIndice((i) => i + 1);
    else finalizar(novas);
  };

  const escolher = (o: OpcaoQuiz) => {
    if (pergunta.multipla) {
      // várias escolhas: marca e desmarca; avança pelo botão "Continuar"
      const atuais = respostas[pergunta.id] || [];
      const lista = atuais.some((x) => x.id === o.id) ? atuais.filter((x) => x.id !== o.id) : [...atuais, o];
      setRespostas({ ...respostas, [pergunta.id]: lista });
      return;
    }
    const novas = { ...respostas, [pergunta.id]: [o] };
    setRespostas(novas);
    // avança sozinho depois de um instante, para a pessoa ver a marcação
    setTimeout(() => avancar(novas), 350);
  };

  const salvarNoMural = async () => {
    if (!resultado) return;
    guardarPendente(resultado);
    if (!user) {
      // explica antes de mandar para o cadastro
      setMostrarPassos(true);
      return;
    }
    setSalvando(true);
    try {
      await reivindicarPendente(user.id);
      navigate(["generico", "couple", "admin"].includes(profile?.account_type || "") ? "/meu-sonho" : "/dashboard");
    } finally {
      setSalvando(false);
    }
  };

  const mudouCard = (e: EscolhasCard) => {
    if (!resultado) return;
    const r = { ...resultado, ...e };
    setResultado(r);
    guardarPendente(r);
  };

  const cabecalho = (
    <header className="sticky top-0 z-10 border-b bg-[#FAFAF7]/95 backdrop-blur" style={{ borderColor: "#ECE3DA" }}>
      <div className="mx-auto flex h-14 max-w-xl items-center justify-between px-4">
        <Link to="/" aria-label="Casamenteiro, página inicial">
          <BrandLogo />
        </Link>
        {user ? (
          <UserMenu />
        ) : (
          <Link to="/login" className="text-sm font-medium" style={{ color: TERRA }}>
            Entrar
          </Link>
        )}
      </div>
    </header>
  );

  return (
    <div className="min-h-screen" style={{ background: "#FAFAF7", color: TINTA }}>
      <SEO
        title="Um dia vou casar: qual é o seu casamento dos sonhos? | Casamenteiro"
        description="Responda 8 perguntas com fotos e descubra o estilo do seu casamento. Grátis, em 1 minuto, e com card para o story."
        canonical={absoluteUrl("/quiz")}
      />
      {cabecalho}

      <main className="mx-auto max-w-xl px-5 pb-12 pt-6">
        {carregando ? (
          <div className="flex justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: SUAVE }} />
          </div>
        ) : perguntas.length === 0 ? (
          <div className="py-16 text-center">
            <h1 className="text-2xl font-semibold">O quiz está quase pronto</h1>
            <p className="mt-2" style={{ color: SUAVE }}>
              Estamos escolhendo as fotos. Volte em breve.
            </p>
            <Link to="/" className="mt-6 inline-block font-medium" style={{ color: TERRA }}>
              Voltar ao início
            </Link>
          </div>
        ) : etapa === "intro" ? (
          <section className="flex flex-col gap-6 py-6">
            <span className="text-sm font-medium" style={{ color: TERRA }}>
              Quiz · 1 minuto
            </span>
            <h1 className="text-[34px] font-bold leading-[1.08]" style={{ letterSpacing: "-0.03em" }}>
              Um dia vou casar. E vai ser assim.
            </h1>
            <p className="text-base leading-relaxed" style={{ color: SUAVE }}>
              Toque nas fotos que mais te emocionam e descubra o estilo do seu casamento. No fim, você ganha um card
              para o story.
            </p>
            <button
              type="button"
              onClick={() => {
                setEtapa("pergunta");
                setIndice(0);
              }}
              className="h-[52px] rounded-[14px] text-base font-semibold text-white"
              style={{ background: TERRA }}
            >
              Começar
            </button>
            <p className="text-xs" style={{ color: SUAVE }}>
              Não precisa de cadastro para jogar. Para guardar no seu mural, você cria uma conta grátis no fim.
            </p>
          </section>
        ) : etapa === "pergunta" && pergunta ? (
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <button
                type="button"
                aria-label="Voltar"
                onClick={() => (indice === 0 ? setEtapa("intro") : setIndice(indice - 1))}
                className="flex h-11 w-11 items-center"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <span className="text-sm" style={{ color: SUAVE }}>
                Pergunta {indice + 1} de {perguntas.length}
              </span>
              <button
                type="button"
                aria-label="Sair do quiz"
                onClick={() => navigate("/")}
                className="flex h-11 w-11 items-center justify-end"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div
              className="h-1.5 rounded-full"
              style={{ background: "#EFE4DA" }}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={perguntas.length}
              aria-valuenow={indice + 1}
            >
              <div
                className="h-1.5 rounded-full transition-all"
                style={{ width: `${((indice + 1) / perguntas.length) * 100}%`, background: "#D9905A" }}
              />
            </div>
            <div className="mt-1">
              <h1 className="text-[26px] font-semibold leading-tight" style={{ letterSpacing: "-0.01em" }}>
                {pergunta.titulo}
              </h1>
              <p className="mt-1 text-[15px]" style={{ color: SUAVE }}>
                {pergunta.subtitulo ||
                  (pergunta.multipla ? "Pode escolher mais de um." : "Toque na foto que mais combina com você.")}
              </p>
            </div>
            {temVisual && (
              <div
                role="tablist"
                aria-label="Escolha o visual"
                className="grid grid-cols-2 gap-1 rounded-xl p-1"
                style={{ background: "#EFE4DA" }}
              >
                {(["noiva", "noivo"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    role="tab"
                    aria-selected={visual === v}
                    onClick={() => setVisual(v)}
                    className="h-10 rounded-lg text-sm font-semibold"
                    style={{
                      background: visual === v ? "#fff" : "transparent",
                      color: visual === v ? "#2B211B" : SUAVE,
                    }}
                  >
                    {v === "noiva" ? "Visual de noiva" : "Visual de noivo"}
                  </button>
                ))}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2.5">
              {opcoesVisiveis.map((o) => {
                const on = selecionadas.some((x) => x.id === o.id);
                return (
                  <button
                    key={o.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => escolher(o)}
                    className="relative min-h-[170px] overflow-hidden rounded-2xl text-left [&:last-child:nth-child(odd)]:col-span-2"
                    style={{ outline: on ? `3px solid ${TERRA}` : "none", outlineOffset: 2, background: "#D9B99A" }}
                  >
                    <img
                      src={o.foto_url}
                      alt=""
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                    <span
                      className="absolute inset-0"
                      style={{ background: "linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(20,14,10,.7) 100%)" }}
                    />
                    <span className="absolute inset-x-2.5 bottom-2.5 flex flex-col gap-0.5">
                      <span className="text-[15px] font-semibold text-white">{o.rotulo}</span>
                      {o.credito_nome && <span className="text-[11px] text-white/90">Foto: {o.credito_nome}</span>}
                    </span>
                    {on && (
                      <span
                        className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full text-white"
                        style={{ background: TERRA }}
                      >
                        <Check className="h-4 w-4" strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {pergunta.multipla && (
              <button
                type="button"
                disabled={!selecionadas.length}
                onClick={() => avancar(respostas)}
                className="h-[52px] rounded-[14px] text-base font-semibold text-white disabled:opacity-40"
                style={{ background: TERRA }}
              >
                {selecionadas.length ? `Continuar (${selecionadas.length})` : "Escolha pelo menos um"}
              </button>
            )}
            <p className="text-center text-xs" style={{ color: SUAVE }}>
              Fotos de fornecedores do Casamenteiro e do{" "}
              <a href="https://unsplash.com" target="_blank" rel="noreferrer" className="underline">
                Unsplash
              </a>
              , com crédito.
            </p>
          </section>
        ) : etapa === "resultado" && resultado && info ? (
          <section className="flex flex-col gap-5">
            <div>
              <span className="text-sm" style={{ color: SUAVE }}>
                Seu casamento é
              </span>
              <h1 className="mt-1 text-[30px] font-semibold leading-[1.15]" style={{ letterSpacing: "-0.015em" }}>
                {info.nome}
              </h1>
              <p className="mt-2 text-[15px] leading-relaxed" style={{ color: SUAVE }}>
                {info.descricao}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {fotosResultado.map((f, i) => (
                <img key={i} src={f} alt="" className="h-[120px] w-full rounded-[14px] object-cover" />
              ))}
            </div>
            <div className="flex items-center gap-2.5">
              <span className="text-[13px]" style={{ color: SUAVE }}>
                Sua paleta
              </span>
              {info.paleta.map((c) => (
                <span
                  key={c}
                  className="h-6 w-6 rounded-full border"
                  style={{ background: c, borderColor: "rgba(43,33,27,.12)" }}
                />
              ))}
            </div>
            <div className="flex flex-col gap-1.5 rounded-2xl px-4 py-3.5" style={{ background: "#F6EBE1" }}>
              {fornecedores.length ? (
                <>
                  <span className="text-sm font-semibold">Você escolheu fotos destes fornecedores</span>
                  {fornecedores.map((f) => (
                    <Link
                      key={f.id}
                      to={`/fornecedor/${f.slug || f.id}`}
                      className="text-sm font-medium underline"
                      style={{ color: "#7E3F1F" }}
                    >
                      {f.company_name}
                    </Link>
                  ))}
                </>
              ) : (
                <>
                  <span className="text-sm font-semibold">Fornecedores com esse estilo</span>
                  <span className="text-[13px] leading-snug" style={{ color: "#5E4F45" }}>
                    Estamos selecionando os primeiros. Avisamos você quando chegarem.
                  </span>
                </>
              )}
              {contagem > 1 && (
                <span className="text-xs" style={{ color: "#5E4F45" }}>
                  {contagem} pessoas já tiveram esse resultado
                </span>
              )}
            </div>
            <div className="mt-2 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setEtapa("card");
                  window.scrollTo({ top: 0 });
                }}
                className="flex h-[52px] items-center justify-center gap-2 rounded-[14px] text-base font-semibold text-white"
                style={{ background: TERRA }}
              >
                <Share2 className="h-5 w-5" aria-hidden="true" /> Criar meu card para o story
              </button>
              <Link
                to={`/simulador?estilo=${resultado.estilo}`}
                className="flex h-[52px] items-center justify-center rounded-[14px] border text-base font-medium"
                style={{ borderColor: "#CDBFB3" }}
              >
                Simular quanto custaria
              </Link>
              <button
                type="button"
                onClick={salvarNoMural}
                disabled={salvando}
                className="h-11 text-[15px] font-medium"
                style={{ color: TERRA }}
              >
                {salvando ? "Salvando…" : user ? "Salvar no meu mural" : "Salvar no meu mural (conta grátis)"}
              </button>
            </div>
          </section>
        ) : etapa === "card" && resultado ? (
          <section className="flex flex-col gap-5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Voltar ao resultado"
                onClick={() => setEtapa("resultado")}
                className="flex h-11 w-11 items-center"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            </div>
            <div>
              <h1 className="text-[26px] font-semibold leading-tight">Como você quer aparecer?</h1>
              <p className="mt-1 text-[15px]" style={{ color: SUAVE }}>
                Escolha um título. Sério, romântico ou zoando, a escolha é sua.
              </p>
            </div>
            <AparenciaCard
              estilo={resultado.estilo}
              fotos={fotosResultado}
              textos={textos}
              inicial={resultado}
              fotoPerfil={profile?.avatar_url || null}
              urlCompartilhar={urlCompartilhar}
              selo={selo}
              madrinha={madrinha}
              onMudou={mudouCard}
              onCompartilhou={() => marcarCompartilhou(resultado.id)}
            />
            <button
              type="button"
              onClick={salvarNoMural}
              className="h-11 text-[15px] font-medium"
              style={{ color: TERRA }}
            >
              {user ? "Salvar no meu mural" : "Criar conta e salvar no meu mural"}
            </button>
          </section>
        ) : null}
      </main>

      {mostrarPassos && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={() => setMostrarPassos(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="titulo-passos" onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[440px] rounded-t-3xl bg-white p-6 pb-8 sm:rounded-3xl" style={{ color: "#2B211B" }}>
            <h2 id="titulo-passos" className="text-[22px] font-semibold leading-tight">Seu mural fica guardado na sua conta</h2>
            <p className="mt-1 text-[15px]" style={{ color: SUAVE }}>É grátis e leva 1 minuto. Funciona assim:</p>
            <ol className="mt-4 flex flex-col gap-3">
              {[
                ["Crie sua conta", "Só nome, e-mail e senha."],
                ["Seu resultado já entra no mural", "O que você escolheu no quiz fica guardado neste aparelho até lá."],
                ["Deixe o mural com a sua cara", "Música, fotos, frase e os lugares dos sonhos. Você decide o que aparece."],
              ].map(([t, d], i) => (
                <li key={t} className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white" style={{ background: TERRA }}>{i + 1}</span>
                  <span className="flex flex-col">
                    <span className="text-[15px] font-semibold">{t}</span>
                    <span className="text-sm" style={{ color: SUAVE }}>{d}</span>
                  </span>
                </li>
              ))}
            </ol>
            <button type="button" onClick={() => navigate("/cadastro?tipo=generico&redirect=/meu-sonho")}
              className="mt-6 h-[52px] w-full rounded-[14px] text-base font-semibold text-white" style={{ background: TERRA }}>
              Criar conta grátis
            </button>
            <button type="button" onClick={() => navigate("/login?redirect=/meu-sonho")}
              className="mt-2 h-11 w-full text-[15px] font-medium" style={{ color: TERRA }}>
              Já tenho conta
            </button>
            <button type="button" onClick={() => setMostrarPassos(false)} className="h-10 w-full text-sm" style={{ color: SUAVE }}>
              Agora não
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
