import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Copy, Heart, Loader2, Play, Share2, Sparkles } from "lucide-react";
import { absoluteUrl } from "@/lib/seo";
import BrandLogo from "@/components/shared/BrandLogo";
import SEO from "@/components/SEO";
import UserMenu from "@/components/UserMenu";
import DashboardNav from "@/components/DashboardNav";
import VideoApresentacao from "@/components/sonho/VideoApresentacao";
import AvatarUpload from "@/components/AvatarUpload";
import MadrinhaNiveis from "@/components/sonho/MadrinhaNiveis";
import FotosSonho, { carregarFotosSonho } from "@/components/sonho/FotosSonho";
import MusicaEntrada from "@/components/sonho/MusicaEntrada";
import LugaresSonho from "@/components/sonho/LugaresSonho";
import SobreMimMatch, { type DadosSobreMim } from "@/components/sonho/SobreMimMatch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Musica } from "@/lib/appleMusic";
import {
  RESULTADOS,
  carregarTextos,
  guardarPendente,
  novoId,
  reivindicarPendente,
  textoPermitido,
  type EstiloQuiz,
  type FormatoAdesivo,
} from "@/lib/quiz";

type Perfil = DadosSobreMim & {
  codigo: string;
  estilo: EstiloQuiz | null;
  resultado_id: string | null;
  titulo: string | null;
  adesivo: string | null;
  formato_adesivo: FormatoAdesivo;
  mostrar_foto: boolean;
  fotos_autorizadas: boolean;
  apresentacao_publica: boolean;
  frase: string | null;
  musica: Musica | null;
};

const TERRA = "#A9582D";
const SUAVE = "#6E625A";

/** Mural do perfil genérico: quem ainda não está noivo guarda o casamento dos sonhos. */
export default function MeuSonho() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [frase, setFrase] = useState("");
  const [erroFrase, setErroFrase] = useState("");
  const [confirmarNoivado, setConfirmarNoivado] = useState(false);
  const [mudando, setMudando] = useState(false);
  const [bloqueadas, setBloqueadas] = useState<string[]>([]);

  const carregar = async () => {
    if (!user) return;
    await reivindicarPendente(user.id).catch(() => false);
    let { data } = await (supabase.from("sonho_perfis" as any) as any).select("*").eq("user_id", user.id).maybeSingle();
    if (!data) {
      const novo = await (supabase.from("sonho_perfis" as any) as any)
        .insert({ user_id: user.id })
        .select("*")
        .maybeSingle();
      data = novo.data;
    }
    setPerfil(data);
    setFrase(data?.frase || "");
    setCarregando(false);
  };

  useEffect(() => {
    carregar();
    carregarTextos().then((t) => setBloqueadas(t.palavras_bloqueadas));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const salvar = async (campos: Partial<Perfil>) => {
    if (!user) return;
    setPerfil((p) => (p ? { ...p, ...campos } : p));
    const { error } = await (supabase.from("sonho_perfis" as any) as any)
      .update({ ...campos, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);
    if (error) toast({ title: "Não foi possível salvar", description: error.message, variant: "destructive" });
  };

  const salvarFrase = () => {
    const t = frase.trim();
    if ((perfil?.frase || "") === t) return;
    if (t && !textoPermitido(t, bloqueadas)) return setErroFrase("Essa frase não pode. Tente outro jeito de dizer.");
    setErroFrase("");
    salvar({ frase: t || null });
  };

  const criarCard = async () => {
    if (!user || !perfil?.estilo) return;
    const fotos = (await carregarFotosSonho(user.id)).map((f) => f.url);
    guardarPendente({
      id: perfil.resultado_id || novoId(),
      estilo: perfil.estilo,
      opcoes: [],
      fotos: fotos.slice(0, 3),
      titulo: perfil.titulo || "Um dia vou casar",
      adesivo: perfil.adesivo,
      formato: perfil.formato_adesivo || "postit",
      usarFoto: perfil.mostrar_foto,
    });
    navigate("/quiz?card=1");
  };

  const fiqueiNoivo = async () => {
    setMudando(true);
    const { error } = await (supabase.rpc as any)("fiquei_noivo");
    if (error) {
      setMudando(false);
      toast({ title: "Não foi possível mudar agora", description: error.message, variant: "destructive" });
      return;
    }
    await refreshProfile();
    toast({ title: "Parabéns!", description: "Agora vamos montar o plano do seu casamento." });
    navigate("/onboarding", { replace: true });
  };

  const info = perfil?.estilo ? RESULTADOS[perfil.estilo] : null;
  // casal já noivo: mesmo mural, dentro do menu do casal, sem lista do Match nem "Fiquei noivo(a)"
  const ehCasal = profile?.account_type === "couple";

  return (
    <div className="min-h-screen" style={{ background: "#FAFAF7", color: "#2B211B" }}>
      {ehCasal && <DashboardNav />}
      <SEO title="Meu casamento dos sonhos | Casamenteiro" noIndex />
      <header className="border-b" style={{ borderColor: "#ECE3DA" }}>
        <div className="mx-auto flex h-14 max-w-xl items-center justify-between px-4">
          <Link to="/" aria-label="Casamenteiro, página inicial">
            <BrandLogo />
          </Link>
          <UserMenu />
        </div>
      </header>

      <main className="mx-auto flex max-w-xl flex-col gap-7 px-5 pb-14 pt-6">
        {carregando || !perfil ? (
          <div className="flex justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: SUAVE }} />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <AvatarUpload
                avatarUrl={profile?.avatar_url || null}
                fullName={profile?.full_name || null}
                onUploaded={() => refreshProfile()}
              />
              <div className="min-w-0 flex-1">
                <h1 className="text-lg font-semibold">Meu casamento dos sonhos</h1>
                <p className="text-sm" style={{ color: SUAVE }}>
                  {info ? info.nome : "Estilo ainda não descoberto"}
                </p>
              </div>
            </div>

            {!info ? (
              <Link to="/quiz" className="flex items-center gap-3 rounded-2xl p-4" style={{ background: "#F6EBE1" }}>
                <Sparkles className="h-6 w-6 shrink-0" style={{ color: TERRA }} aria-hidden="true" />
                <span className="flex-1">
                  <span className="block font-semibold">Descubra o estilo do seu casamento</span>
                  <span className="block text-[13px]" style={{ color: "#5E4F45" }}>
                    8 fotos, 1 minuto e um card para o story.
                  </span>
                </span>
              </Link>
            ) : (
              // vídeo completo com o que está no mural agora (fotos, frase, música, lugar)
              <VideoApresentacao codigo={perfil.codigo} destaque rotulo="Criar meu vídeo para o story" />
            )}

            {user && <FotosSonho userId={user.id} />}

            {user && <MusicaEntrada valor={perfil.musica} onSalvar={(m) => salvar({ musica: m })} />}

            <section className="flex flex-col gap-2">
              <label htmlFor="frase" className="text-base font-semibold">
                Meu sonho em poucas palavras
              </label>
              <textarea
                id="frase"
                rows={3}
                maxLength={200}
                value={frase}
                onChange={(e) => {
                  setFrase(e.target.value);
                  setErroFrase("");
                }}
                onBlur={salvarFrase}
                placeholder="Quero todo mundo que eu amo numa mesa só, com o sol se pondo."
                className="resize-none rounded-xl border bg-white p-3 text-[15px] leading-relaxed"
                style={{ borderColor: "#DCCFC3" }}
              />
              <div className="flex justify-between text-xs" style={{ color: SUAVE }}>
                <span style={{ color: erroFrase ? "#B42318" : undefined }}>{erroFrase}</span>
                <span>{frase.length} de 200</span>
              </div>
            </section>

            {user && <LugaresSonho userId={user.id} />}

            {!ehCasal && (
              <SobreMimMatch
                valor={{ ...perfil, interesses: perfil.interesses || [] }}
                bloqueadas={bloqueadas}
                onSalvar={(campos) => salvar(campos)}
              />
            )}

            <section
              className="flex flex-col gap-3 rounded-2xl border bg-white p-4"
              style={{ borderColor: "#ECE3DA" }}
              aria-labelledby="titulo-apresentacao"
            >
              <div>
                <h2 id="titulo-apresentacao" className="text-base font-semibold">
                  Minha apresentação
                </h2>
                <p className="text-[13px] leading-snug" style={{ color: SUAVE }}>
                  Um story animado com a sua música, fotos, frase e lugar. Você escolhe o que aparece.
                </p>
              </div>
              {[
                { k: "mostrar_foto" as const, t: "Mostrar minha foto de perfil" },
                {
                  k: "fotos_autorizadas" as const,
                  t: "Mostrar as fotos que eu subi (são minhas ou tenho direito de usar)",
                },
                { k: "apresentacao_publica" as const, t: "Deixar visível para quem tiver o link" },
              ].map((o) => (
                <label key={o.k} className="flex items-start justify-between gap-3 text-sm leading-snug">
                  <span>{o.t}</span>
                  <input
                    type="checkbox"
                    checked={!!perfil[o.k]}
                    onChange={(e) => salvar({ [o.k]: e.target.checked } as Partial<Perfil>)}
                    className="mt-0.5 h-5 w-5 shrink-0"
                    style={{ accentColor: TERRA }}
                  />
                </label>
              ))}
              <div className="flex gap-2">
                <Link
                  to={`/sonho/${perfil.codigo}`}
                  className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white"
                  style={{ background: "#2B211B" }}
                >
                  <Play className="h-4 w-4" fill="currentColor" aria-hidden="true" /> Ver minha apresentação
                </Link>
                {perfil.apresentacao_publica && (
                  <button
                    type="button"
                    aria-label="Copiar link da apresentação"
                    onClick={() =>
                      navigator.clipboard
                        ?.writeText(absoluteUrl(`/sonho/${perfil.codigo}`))
                        .then(() => toast({ title: "Link copiado" }))
                    }
                    className="flex h-11 w-11 items-center justify-center rounded-xl border"
                    style={{ borderColor: "#DCCFC3" }}
                  >
                    <Copy className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </div>
              {!perfil.apresentacao_publica && (
                <p className="text-xs" style={{ color: SUAVE }}>
                  Por enquanto, só você vê.
                </p>
              )}
            </section>

            <MadrinhaNiveis codigo={perfil.codigo} />

            {!ehCasal && (
            <section className="mt-2 flex flex-col gap-2.5">
              <p className="text-center text-sm" style={{ color: SUAVE }}>
                Tem novidade?
              </p>
              <button
                type="button"
                onClick={() => setConfirmarNoivado(true)}
                className="flex h-[52px] items-center justify-center gap-2 rounded-[14px] text-base font-semibold text-white"
                style={{ background: "#2B211B" }}
              >
                <Heart className="h-5 w-5" aria-hidden="true" /> Fiquei noivo(a)!
              </button>
              <Link
                to="/buscar"
                className="flex h-[52px] items-center justify-center rounded-[14px] border text-base font-medium"
                style={{ borderColor: "#CDBFB3" }}
              >
                Planejar outro evento
              </Link>
              <p className="text-center text-xs" style={{ color: SUAVE }}>
                Ao noivar, seu mural continua salvo e vira o ponto de partida do casamento.
              </p>
            </section>
            )}
          </>
        )}
      </main>

      <AlertDialog open={confirmarNoivado} onOpenChange={setConfirmarNoivado}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Que notícia boa!</AlertDialogTitle>
            <AlertDialogDescription>
              Sua conta vira conta de casal: você ganha orçamento, convidados, tarefas e pedidos de orçamento. Suas
              fotos, música e lugares continuam salvos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={mudando}>Agora não</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                fiqueiNoivo();
              }}
              disabled={mudando}
            >
              {mudando ? "Mudando…" : "Sim, fiquei noivo(a)"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
