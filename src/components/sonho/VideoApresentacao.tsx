import { useEffect, useRef, useState } from "react";
import { Download, Film, Heart, Loader2, Share2, Volume2, VolumeX, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { absoluteUrl } from "@/lib/seo";
import { RESULTADOS, nomeNivelMadrinha, type EstiloQuiz } from "@/lib/quiz";
import {
  DURACAO_APRESENTACAO,
  gerarImagensApresentacao,
  gerarVideoApresentacao,
  type DadosVideoApresentacao,
} from "@/lib/videoApresentacao";
import { formatoVideoSuportado } from "@/lib/cartaoQuiz";
import { useToast } from "@/hooks/use-toast";

const TERRA = "#A9582D";

async function montarDados(codigo: string): Promise<DadosVideoApresentacao | null> {
  const { data } = await (supabase.rpc as any)("apresentacao_sonho", { _codigo: codigo });
  if (!data) return null;
  let proprias: string[] = [];
  if (data.fotos_proprias?.length) {
    const { data: urls } = await supabase.storage.from("sonho-fotos").createSignedUrls(data.fotos_proprias, 60 * 60);
    proprias = (urls || []).map((u: any) => u.signedUrl).filter(Boolean);
  }
  const info = data.estilo ? RESULTADOS[data.estilo as EstiloQuiz] : null;
  return {
    nome: data.nome || "",
    foto: data.foto || null,
    titulo: data.titulo || "Um dia vou casar",
    adesivo: data.adesivo || null,
    frase: data.frase || info?.descricao || "Um dia vou casar, e já sei como quero que seja.",
    nomeEstilo: info?.nome || null,
    paleta: info?.paleta || [],
    fotos: [...proprias, ...(data.fotos_quiz || [])],
    lugar: data.lugar || null,
    musica: data.musica?.titulo
      ? {
          titulo: data.musica.titulo,
          artista: data.musica.artista || "",
          previewUrl: data.musica.previewUrl || null,
          appleUrl: data.musica.appleUrl || null,
        }
      : null,
    madrinha: nomeNivelMadrinha(data.madrinha || 0),
    link: absoluteUrl("/quiz").replace(/^https?:\/\//, ""),
  };
}

function baixar(blob: Blob, nome: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

/**
 * Botão "Vídeo para o story": junta as 5 telas da apresentação num vídeo só (16 s) para postar de uma vez.
 * Só o dono usa (a função do banco já devolve os dados completos só para ele).
 */
export default function VideoApresentacao({
  codigo,
  dados,
  claro = false,
  destaque = false,
  rotulo = "Vídeo para o story",
  onCompartilhou,
  onSalvarMural,
  rotuloSalvar = "Salvar no meu mural",
}: {
  /** Mural/apresentação: busca tudo pelo código. */
  codigo?: string;
  /** Quiz: dados montados na hora, sem precisar de conta. */
  dados?: () => DadosVideoApresentacao;
  claro?: boolean;
  /** Botão principal (grande, terracota). */
  destaque?: boolean;
  rotulo?: string;
  onCompartilhou?: () => void;
  /** Quiz: botão "Salvar no meu mural" dentro da prévia. */
  onSalvarMural?: () => void;
  rotuloSalvar?: string;
}) {
  const { toast } = useToast();
  const [aberto, setAberto] = useState(false);
  // prévia com a música: o vídeo (mudo) e a prévia de 30 s da Apple tocam juntos, só aqui na tela
  const [comSom, setComSom] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const pararSom = () => {
    audioRef.current?.pause();
    audioRef.current = null;
    setComSom(false);
  };

  const ouvirComMusica = () => {
    if (comSom) return pararSom();
    const url = musica?.previewUrl;
    const v = videoRef.current;
    if (!url || !v) return;
    const a = new Audio(url);
    a.volume = 0.8;
    audioRef.current = a;
    v.currentTime = 0;
    v.play().catch(() => {});
    a.play()
      .then(() => setComSom(true))
      .catch(() => {
        audioRef.current = null;
        toast({ title: "Não foi possível tocar a música agora" });
      });
  };

  // o vídeo dá a volta: a música volta junto, para a prévia ficar igual ao story
  const recomecou = () => {
    if (audioRef.current) audioRef.current.currentTime = 0;
  };

  useEffect(() => () => audioRef.current?.pause(), []);
  const [progresso, setProgresso] = useState(0);
  const [gerando, setGerando] = useState(false);
  const [video, setVideo] = useState<{ blob: Blob; url: string } | null>(null);
  const [imagens, setImagens] = useState<{ blob: Blob; url: string }[]>([]);
  const [musica, setMusica] = useState<DadosVideoApresentacao["musica"]>(null);

  useEffect(
    () => () => {
      if (video) URL.revokeObjectURL(video.url);
      imagens.forEach((i) => URL.revokeObjectURL(i.url));
    },
    [video, imagens],
  );

  const gerar = async () => {
    setAberto(true);
    setGerando(true);
    setProgresso(0);
    try {
      const d = dados ? dados() : codigo ? await montarDados(codigo) : null;
      if (!d) throw new Error("Não encontramos sua apresentação.");
      setMusica(d.musica);
      const blob = formatoVideoSuportado() ? await gerarVideoApresentacao(d, setProgresso) : null;
      if (blob) {
        setVideo({ blob, url: URL.createObjectURL(blob) });
      } else {
        const blobs = await gerarImagensApresentacao(d);
        setImagens(blobs.map((b) => ({ blob: b, url: URL.createObjectURL(b) })));
      }
    } catch (e: any) {
      toast({ title: "Não foi possível gerar", description: e?.message, variant: "destructive" });
      setAberto(false);
    } finally {
      setGerando(false);
    }
  };

  const compartilhar = async () => {
    const arquivos = video
      ? [new File([video.blob], "meu-casamento-dos-sonhos.mp4", { type: "video/mp4" })]
      : imagens.map((i, n) => new File([i.blob], `meu-casamento-dos-sonhos-${n + 1}.jpg`, { type: "image/jpeg" }));
    const nav = navigator as any;
    if (nav.canShare?.({ files: arquivos })) {
      try {
        await nav.share({ files: arquivos });
        onCompartilhou?.();
        return;
      } catch (e: any) {
        if (e?.name === "AbortError") return;
      }
    }
    arquivos.forEach((f) => baixar(f, f.name));
    onCompartilhou?.();
    toast({ title: video ? "Vídeo baixado" : "Imagens baixadas", description: "Agora é só postar no story." });
  };

  const fechar = () => {
    pararSom();
    setAberto(false);
    if (video) URL.revokeObjectURL(video.url);
    imagens.forEach((i) => URL.revokeObjectURL(i.url));
    setVideo(null);
    setImagens([]);
  };

  return (
    <>
      <button
        type="button"
        onClick={gerar}
        className={
          destaque
            ? "relative z-30 flex h-[52px] w-full items-center justify-center gap-2 rounded-[14px] text-base font-semibold text-white"
            : "relative z-30 flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold"
        }
        style={
          destaque
            ? { background: TERRA }
            : claro
              ? { background: "#FFFFFF", color: "#2B211B" }
              : { border: "1px solid #DCCFC3", color: "#2B211B" }
        }
      >
        <Film className={destaque ? "h-5 w-5" : "h-4 w-4"} aria-hidden="true" /> {rotulo}
      </button>

      {aberto && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 sm:items-center" onClick={gerando ? undefined : fechar}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-video-story"
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[92dvh] w-full max-w-[420px] flex-col gap-4 overflow-y-auto rounded-t-3xl bg-white p-5 pb-7 sm:rounded-3xl"
            style={{ color: "#2B211B" }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="titulo-video-story" className="text-lg font-semibold">
                  {gerando ? "Montando seu vídeo…" : video ? "Seu vídeo está pronto" : "Suas 5 telas estão prontas"}
                </h2>
                <p className="text-[13px]" style={{ color: "#6E625A" }}>
                  {gerando
                    ? `As 5 telas da sua apresentação em ${DURACAO_APRESENTACAO} segundos. Deixe esta tela aberta.`
                    : video
                      ? "Um vídeo só, para postar de uma vez."
                      : "Este aparelho não grava vídeo. Poste as 5 imagens em sequência."}
                </p>
              </div>
              {!gerando && (
                <button type="button" onClick={fechar} aria-label="Fechar" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/5">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* aviso de som: aparece já enquanto monta, para ninguém estranhar o vídeo mudo */}
            <p className="flex gap-2 rounded-xl p-3 text-[13px] leading-snug" style={{ background: "#F6EBE1" }}>
              <span aria-hidden="true">🔇</span>
              <span>
                <b>O vídeo sai sem som.</b> No Instagram, toque no <b>adesivo de música</b> e escolha{" "}
                {musica ? (
                  <b>
                    {musica.titulo}
                    {musica.artista ? ` · ${musica.artista}` : ""}
                  </b>
                ) : (
                  "a sua música de entrada"
                )}
                .
              </span>
            </p>

            {gerando ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <Loader2 className="h-7 w-7 animate-spin" style={{ color: TERRA }} />
                <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: "#EFE4DA" }} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progresso * 100)}>
                  <div className="h-2 rounded-full transition-all" style={{ width: `${Math.round(progresso * 100)}%`, background: TERRA }} />
                </div>
              </div>
            ) : video ? (
              <div className="flex flex-col items-center gap-2">
                <video
                  ref={videoRef}
                  src={video.url}
                  autoPlay
                  muted
                  loop
                  playsInline
                  onSeeked={recomecou}
                  onTimeUpdate={(e) => {
                    // no "loop" o navegador volta para 0 sem avisar; detecta a volta pelo tempo
                    const v = e.currentTarget;
                    const anterior = Number(v.dataset.t || 0);
                    if (v.currentTime < anterior - 1) recomecou();
                    v.dataset.t = String(v.currentTime);
                  }}
                  aria-label="Prévia do seu vídeo para o story"
                  className="aspect-[9/16] w-[62%] rounded-2xl bg-black object-cover"
                />
                {musica?.previewUrl && (
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={ouvirComMusica}
                      className="flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold"
                      style={{ borderColor: "#DCCFC3" }}
                    >
                      {comSom ? <VolumeX className="h-4 w-4" aria-hidden="true" /> : <Volume2 className="h-4 w-4" aria-hidden="true" />}
                      {comSom ? "Tirar o som" : "Ver com a música"}
                    </button>
                    {musica.appleUrl && (
                      <a
                        href={musica.appleUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-md bg-black px-2.5 py-1.5 text-xs font-medium text-white"
                      >
                        Ouvir no Apple Music
                      </a>
                    )}
                  </div>
                )}
                {musica?.previewUrl && (
                  <p className="text-center text-[11px]" style={{ color: "#6E625A" }}>
                    A música toca só aqui, para você ver como fica. Prévia de 30 s.
                  </p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-5 gap-1.5">
                {imagens.map((i, n) => (
                  <img key={i.url} src={i.url} alt={`Tela ${n + 1}`} className="aspect-[9/16] w-full rounded-lg object-cover" />
                ))}
              </div>
            )}

            {!gerando && (
              <>
                <button
                  type="button"
                  onClick={compartilhar}
                  className="flex h-[52px] items-center justify-center gap-2 rounded-[14px] text-base font-semibold text-white"
                  style={{ background: TERRA }}
                >
                  <Share2 className="h-5 w-5" aria-hidden="true" /> Compartilhar no story
                </button>
                <button
                  type="button"
                  onClick={() =>
                    video
                      ? baixar(video.blob, "meu-casamento-dos-sonhos.mp4")
                      : imagens.forEach((i, n) => baixar(i.blob, `meu-casamento-dos-sonhos-${n + 1}.jpg`))
                  }
                  className="flex h-11 items-center justify-center gap-2 text-[15px] font-medium"
                  style={{ color: TERRA }}
                >
                  <Download className="h-4 w-4" aria-hidden="true" /> Baixar
                </button>
                {onSalvarMural && (
                  <button
                    type="button"
                    onClick={() => {
                      fechar();
                      onSalvarMural();
                    }}
                    className="flex h-11 items-center justify-center gap-2 rounded-[14px] border text-[15px] font-medium"
                    style={{ borderColor: "#DCCFC3", color: "#2B211B" }}
                  >
                    <Heart className="h-4 w-4" aria-hidden="true" /> {rotuloSalvar}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
