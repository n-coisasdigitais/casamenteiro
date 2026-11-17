import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Heart, Loader2, Pause, Play, Share2, Volume2, VolumeX } from "lucide-react";
import SEO from "@/components/SEO";
import AdesivoPreview from "@/components/quiz/AdesivoPreview";
import { supabase } from "@/integrations/supabase/client";
import { absoluteUrl } from "@/lib/seo";
import {
  RESULTADOS,
  TEXTOS_PADRAO,
  carregarFonteCaveat,
  carregarTextos,
  nomeNivelMadrinha,
  type EstiloQuiz,
  type FormatoAdesivo,
} from "@/lib/quiz";
import type { Musica } from "@/lib/appleMusic";
import { useToast } from "@/hooks/use-toast";

type Dados = {
  dono: boolean;
  codigo: string;
  nome: string;
  foto: string | null;
  estilo: EstiloQuiz | null;
  titulo: string | null;
  adesivo: string | null;
  formato: FormatoAdesivo;
  frase: string | null;
  musica: Musica | null;
  selo_match: boolean;
  madrinha: number;
  lugar: { nome: string; cidade: string | null; uf: string | null } | null;
  fotos_quiz: string[];
  fotos_proprias: string[];
};

type Tela = "capa" | "frase" | "fotos" | "lugar" | "fim";
const DURACAO = 4500;

const CSS = `
@keyframes ap-kb{from{transform:scale(1)}to{transform:scale(1.12)}}
@keyframes ap-sobe{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
@keyframes ap-enche{from{width:0}to{width:100%}}
@keyframes ap-onda{0%,100%{height:6px}50%{height:16px}}
.ap-kb{animation:ap-kb 5s ease-out forwards}
.ap-sobe{animation:ap-sobe .7s ease-out both}
.ap-sobe2{animation:ap-sobe .7s .25s ease-out both}
.ap-sobe3{animation:ap-sobe .7s .5s ease-out both}
.ap-enche{animation:ap-enche ${DURACAO}ms linear forwards}
.ap-onda{animation:ap-onda .9s ease-in-out infinite}
@media (prefers-reduced-motion: reduce){.ap-kb,.ap-sobe,.ap-sobe2,.ap-sobe3,.ap-onda{animation:none}}
`;

/** Apresentação do mural: story animado com a música de entrada (prévia Apple), fotos, frase e lugar. */
export default function ApresentacaoSonho() {
  const { codigo = "" } = useParams();
  const { toast } = useToast();
  const [dados, setDados] = useState<Dados | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [fotosProprias, setFotosProprias] = useState<string[]>([]);
  const [mensagemAdesivo, setMensagemAdesivo] = useState<string | null>(null);
  const [iniciado, setIniciado] = useState(false);
  const [indice, setIndice] = useState(0);
  const [pausado, setPausado] = useState(false);
  const [mudo, setMudo] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    carregarFonteCaveat();
    (async () => {
      const { data } = await (supabase.rpc as any)("apresentacao_sonho", { _codigo: codigo });
      setDados(data || null);
      if (data?.fotos_proprias?.length) {
        const { data: urls } = await supabase.storage
          .from("sonho-fotos")
          .createSignedUrls(data.fotos_proprias, 60 * 60);
        setFotosProprias((urls || []).map((u: any) => u.signedUrl).filter(Boolean));
      }
      const textos = await carregarTextos().catch(() => TEXTOS_PADRAO);
      setMensagemAdesivo(textos.adesivos.find((a) => a.texto === data?.adesivo)?.mensagem || null);
      setCarregando(false);
    })();
    return () => audio.current?.pause();
  }, [codigo]);

  const fotos = [...fotosProprias, ...(dados?.fotos_quiz || [])];
  // sempre as 5 etapas do design; o que faltar ganha um texto ou cor no lugar
  const telas: Tela[] = dados ? ["capa", "frase", "fotos", "lugar", "fim"] : [];
  const tela = telas[indice];
  const info = dados?.estilo ? RESULTADOS[dados.estilo] : null;
  const fraseExibida = dados?.frase || info?.descricao || "Um dia vou casar, e já sei como quero que seja.";
  const temMusica = !!dados?.musica?.previewUrl;

  const ir = useCallback((n: number) => setIndice(Math.max(0, Math.min(telas.length - 1, n))), [telas.length]);

  // avança sozinho
  useEffect(() => {
    if (!iniciado || pausado || indice >= telas.length - 1) return;
    const t = setTimeout(() => ir(indice + 1), DURACAO);
    return () => clearTimeout(t);
  }, [iniciado, pausado, indice, telas.length, ir]);

  const comecar = () => {
    setIniciado(true);
    if (temMusica && dados?.musica?.previewUrl) {
      audio.current = new Audio(dados.musica.previewUrl);
      audio.current.loop = true;
      audio.current.volume = 0.6;
      audio.current.play().catch(() => setMudo(true));
    }
  };

  const alternarSom = () => {
    if (!audio.current) return;
    if (mudo) audio.current.play().catch(() => {});
    else audio.current.pause();
    setMudo(!mudo);
  };

  const compartilhar = async () => {
    const url = absoluteUrl(`/sonho/${codigo}`);
    const nav = navigator as any;
    if (nav.share) {
      try {
        await nav.share({ text: "Olha o meu casamento dos sonhos:", url });
        return;
      } catch (e: any) {
        if (e?.name === "AbortError") return;
      }
    }
    await navigator.clipboard?.writeText(url).catch(() => {});
    toast({ title: "Link copiado" });
  };

  if (carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#2B211B]">
        <Loader2 className="h-6 w-6 animate-spin text-white" />
      </div>
    );
  }

  if (!dados) {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center"
        style={{ background: "#FAFAF7", color: "#2B211B" }}
      >
        <SEO title="Apresentação indisponível | Casamenteiro" noIndex />
        <Heart className="h-10 w-10" style={{ color: "#A9582D" }} aria-hidden="true" />
        <h1 className="text-2xl font-semibold">Esta apresentação não está disponível</h1>
        <p className="max-w-sm text-[15px]" style={{ color: "#6E625A" }}>
          A pessoa pode ter deixado só para ela. Que tal descobrir o seu casamento dos sonhos?
        </p>
        <Link
          to="/quiz"
          className="flex h-[52px] items-center rounded-[14px] px-7 font-semibold text-white"
          style={{ background: "#A9582D" }}
        >
          Fazer o quiz
        </Link>
      </div>
    );
  }

  const linkQuiz = `/quiz?de=${dados.codigo}`;
  const madrinha = nomeNivelMadrinha(dados.madrinha);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#1a1410]">
      <SEO
        title={`${dados.nome || "Alguém"} e o casamento dos sonhos | Casamenteiro`}
        description="Um dia vou casar. Veja como vai ser e descubra o seu."
        noIndex
      />
      <style>{CSS}</style>

      <div
        className="relative h-[100dvh] max-h-[860px] w-full max-w-[480px] overflow-hidden text-white sm:rounded-3xl"
        style={{ background: "#2B211B" }}
      >
        {/* barras de progresso */}
        <div
          className="absolute inset-x-3.5 top-3.5 z-30 grid gap-1"
          style={{ gridTemplateColumns: `repeat(${telas.length}, minmax(0, 1fr))` }}
        >
          {telas.map((t, n) => (
            <div key={t} className="h-[3px] overflow-hidden rounded bg-white/30">
              <div
                key={`${n}-${indice}-${pausado}`}
                className={iniciado && n === indice && !pausado ? "ap-enche h-full bg-white" : "h-full bg-white"}
                style={{ width: n < indice ? "100%" : n === indice && pausado ? "50%" : n === indice ? undefined : 0 }}
              />
            </div>
          ))}
        </div>

        {/* toque à esquerda volta, à direita avança; segurar pausa */}
        {iniciado && (
          <>
            <button
              type="button"
              aria-label="Voltar"
              onClick={() => ir(indice - 1)}
              className="absolute bottom-32 left-0 top-0 z-20 w-[35%]"
            />
            <button
              type="button"
              aria-label="Avançar"
              onClick={() => ir(indice + 1)}
              onPointerDown={() => setPausado(true)}
              onPointerUp={() => setPausado(false)}
              onPointerLeave={() => setPausado(false)}
              className="absolute bottom-32 right-0 top-0 z-20 w-[65%]"
            />
          </>
        )}

        {tela === "capa" && (
          <div
            key="capa"
            className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-8 text-center"
            style={{ background: madrinha ? "#8A6420" : "#A9582D" }}
          >
            <div className="ap-sobe relative h-[140px] w-[140px]">
              {dados.foto ? (
                <img
                  src={dados.foto}
                  alt=""
                  className="h-full w-full rounded-full border-4 border-white object-cover"
                />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center rounded-full border-4 border-white"
                  style={{ background: "#F3E3D3", color: "#A9582D" }}
                >
                  <Heart className="h-14 w-14" strokeWidth={1.6} aria-hidden="true" />
                </div>
              )}
              {dados.adesivo && (
                <div className="absolute -bottom-3 -right-16">
                  <AdesivoPreview
                    texto={dados.adesivo}
                    mensagem={mensagemAdesivo}
                    formato={dados.formato || "postit"}
                  />
                </div>
              )}
            </div>
            {dados.nome && <span className="ap-sobe2 text-base font-medium">{dados.nome}</span>}
            <h1 className="ap-sobe3 text-[34px] font-bold leading-[1.1]" style={{ letterSpacing: "-0.02em" }}>
              {dados.titulo || "Um dia vou casar"}
            </h1>
            <div className="ap-sobe3 flex flex-wrap justify-center gap-2">
              {madrinha && (
                <span
                  className="rounded-full px-3 py-1 text-xs font-semibold"
                  style={{ background: "#F3E2B8", color: "#5C4310" }}
                >
                  {madrinha}
                </span>
              )}
              {dados.selo_match && (
                <span className="rounded-full bg-black/40 px-3 py-1 text-xs font-semibold">Topo conhecer alguém</span>
              )}
            </div>
          </div>
        )}

        {tela === "frase" && (
          <div key="frase" className="absolute inset-0 overflow-hidden">
            {fotos[0] ? (
              <img src={fotos[0]} alt="" className="ap-kb absolute inset-0 h-full w-full object-cover" />
            ) : (
              <div className="absolute inset-0" style={{ background: "#9E7B5B" }} />
            )}
            <div className="absolute inset-0 bg-[rgba(30,20,14,.6)]" />
            <div className="absolute inset-x-7 top-[28%] flex flex-col gap-3.5">
              <span className="ap-sobe text-sm font-medium opacity-90">Meu sonho</span>
              <p className="ap-sobe2 text-[28px] font-semibold leading-[1.25]">“{fraseExibida}”</p>
              {!dados.frase && dados.dono && (
                <Link to="/meu-sonho" className="ap-sobe3 relative z-30 self-start rounded-full bg-white/20 px-3 py-1.5 text-xs font-semibold">
                  Só você vê este aviso: escreva sua frase no mural
                </Link>
              )}
            </div>
          </div>
        )}

        {tela === "fotos" && (
          <div
            key="fotos"
            className="absolute inset-0 grid grid-cols-2 gap-2 px-4 pb-36 pt-16"
            style={{ background: "#F6EBE1", gridTemplateRows: "repeat(3, minmax(0, 1fr))" }}
          >
            {(fotos.length ? fotos.slice(0, 3) : [null, null, null]).map((f, n) =>
              f ? (
                <img
                  key={f}
                  src={f}
                  alt=""
                  className={`h-full w-full rounded-2xl object-cover ${n === 0 ? "row-span-2" : ""} ${n % 2 ? "ap-sobe2" : "ap-sobe"}`}
                />
              ) : (
                <div
                  key={`cor-${n}`}
                  className={`rounded-2xl ${n === 0 ? "row-span-2" : ""} ${n % 2 ? "ap-sobe2" : "ap-sobe"}`}
                  style={{ background: (info?.paleta || ["#D9B99A", "#C9A27E", "#B7A99A"])[n % 3] }}
                />
              ),
            )}
            {info && (
              <div
                className="ap-sobe3 col-span-2 flex items-end rounded-2xl p-3.5"
                style={{ background: info.paleta[2] }}
              >
                <span className="text-lg font-semibold">{info.nome}</span>
              </div>
            )}
          </div>
        )}

        {tela === "lugar" && (
          <div key="lugar" className="absolute inset-0 overflow-hidden">
            {fotos[1] || fotos[0] ? (
              <img src={fotos[1] || fotos[0]} alt="" className="ap-kb absolute inset-0 h-full w-full object-cover" />
            ) : (
              <div className="absolute inset-0" style={{ background: "#C9A27E" }} />
            )}
            <div className="absolute inset-0 bg-[rgba(30,20,14,.55)]" />
            <div className="absolute inset-x-7 bottom-44 flex flex-col gap-2">
              <span className="ap-sobe text-sm font-medium">Onde eu sonho casar</span>
              <span className="ap-sobe2 text-[34px] font-bold leading-[1.1]" style={{ letterSpacing: "-0.02em" }}>
                {dados.lugar?.nome || "Ainda estou escolhendo"}
              </span>
              {dados.lugar && (dados.lugar.cidade || dados.lugar.uf) ? (
                <span className="ap-sobe3 text-base">
                  {[dados.lugar.cidade, dados.lugar.uf].filter(Boolean).join(", ")}
                </span>
              ) : (
                !dados.lugar && info && <span className="ap-sobe3 text-base">Mas já sei: {info.nome.toLowerCase()}</span>
              )}
              {!dados.lugar && dados.dono && (
                <Link to="/meu-sonho" className="ap-sobe3 relative z-30 mt-2 self-start rounded-full bg-white/20 px-3 py-1.5 text-xs font-semibold">
                  Só você vê este aviso: adicione o lugar dos sonhos
                </Link>
              )}
            </div>
          </div>
        )}

        {tela === "fim" && (
          <div
            key="fim"
            className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center"
            style={{ background: "#F6EBE1", color: "#2B211B" }}
          >
            <span className="ap-sobe text-[15px] font-semibold tracking-wide">casamenteiro</span>
            <h2 className="ap-sobe2 text-[34px] font-bold leading-[1.1]" style={{ letterSpacing: "-0.02em" }}>
              E o seu casamento,
              <br />
              como seria?
            </h2>
            <Link
              to={linkQuiz}
              className="ap-sobe3 relative z-30 flex h-[52px] items-center rounded-[14px] px-7 text-base font-semibold text-white"
              style={{ background: "#A9582D" }}
            >
              Fazer o quiz
            </Link>
            {dados.dono && (
              <button
                type="button"
                onClick={compartilhar}
                className="relative z-30 flex items-center gap-2 text-sm font-semibold"
                style={{ color: "#A9582D" }}
              >
                <Share2 className="h-4 w-4" aria-hidden="true" /> Compartilhar minha apresentação
              </button>
            )}
          </div>
        )}

        {/* música */}
        {temMusica && dados.musica && (
          <div className="absolute inset-x-3.5 bottom-4 z-30 flex flex-col gap-2 rounded-2xl bg-[rgba(20,14,10,.8)] p-3">
            <div className="flex items-center gap-2.5">
              {dados.musica.capa ? (
                <img src={dados.musica.capa} alt="" className="h-10 w-10 rounded-lg object-cover" />
              ) : (
                <div className="h-10 w-10 rounded-lg bg-[#9E7B5B]" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{dados.musica.titulo}</p>
                <p className="truncate text-xs text-[#E9DFD6]">{dados.musica.artista} · prévia</p>
              </div>
              {iniciado && !mudo && (
                <span aria-hidden="true" className="flex h-[18px] items-center gap-[3px]">
                  <span className="ap-onda w-[3px] rounded bg-white" />
                  <span className="ap-onda w-[3px] rounded bg-white" style={{ animationDelay: ".2s" }} />
                  <span className="ap-onda w-[3px] rounded bg-white" style={{ animationDelay: ".4s" }} />
                </span>
              )}
              {iniciado && (
                <button
                  type="button"
                  onClick={alternarSom}
                  aria-label={mudo ? "Ligar o som" : "Desligar o som"}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15"
                >
                  {mudo ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
              )}
            </div>
            {dados.musica.appleUrl && (
              <a
                href={dados.musica.appleUrl}
                target="_blank"
                rel="noreferrer"
                className="self-start rounded-md border border-white/40 bg-black px-2.5 py-1 text-xs font-medium"
              >
                Ouvir no Apple Music
              </a>
            )}
          </div>
        )}

        {/* início: o toque libera o som (os navegadores não deixam tocar sozinho) */}
        {!iniciado && (
          <button
            type="button"
            onClick={comecar}
            className="absolute inset-0 z-40 flex flex-col items-center justify-end gap-3 bg-gradient-to-t from-black/70 via-black/10 to-transparent pb-40"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-[#2B211B]">
              <Play className="ml-1 h-7 w-7" fill="currentColor" aria-hidden="true" />
            </span>
            <span className="text-base font-semibold">{temMusica ? "Toque para ver, com som" : "Toque para ver"}</span>
          </button>
        )}

        {iniciado && (
          <button
            type="button"
            onClick={() => setPausado((p) => !p)}
            aria-label={pausado ? "Continuar" : "Pausar"}
            className="absolute right-3.5 top-7 z-30 flex h-9 w-9 items-center justify-center rounded-full bg-black/30"
          >
            {pausado ? (
              <Play className="h-4 w-4" fill="currentColor" />
            ) : (
              <Pause className="h-4 w-4" fill="currentColor" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
