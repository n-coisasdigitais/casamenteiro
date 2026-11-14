import { useEffect, useRef, useState } from "react";
import { Loader2, Pause, Play, Search } from "lucide-react";
import { buscarMusicas, linkDeezer, linkSpotify, type Musica } from "@/lib/appleMusic";

/** "Minha música de entrada": busca na Apple, prévia de 30 s e links para Spotify/Deezer. */
export default function MusicaEntrada({
  valor,
  onSalvar,
}: {
  valor: Musica | null;
  onSalvar: (m: Musica | null) => void;
}) {
  const [buscando, setBuscando] = useState(!valor);
  const [termo, setTermo] = useState("");
  const [resultados, setResultados] = useState<Musica[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [tocando, setTocando] = useState<number | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => () => audio.current?.pause(), []);

  // busca com espera de meio segundo enquanto a pessoa digita (limite da Apple: ~20 buscas/min)
  useEffect(() => {
    if (!buscando) return;
    const q = termo.trim();
    if (q.length < 2) {
      setResultados([]);
      return;
    }
    const t = setTimeout(async () => {
      setCarregando(true);
      setErro("");
      try {
        setResultados(await buscarMusicas(q));
      } catch (e: any) {
        setErro(e?.message || "Não foi possível buscar agora.");
      } finally {
        setCarregando(false);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [termo, buscando]);

  const tocar = (m: Musica) => {
    if (!m.previewUrl) return;
    if (tocando === m.trackId) {
      audio.current?.pause();
      setTocando(null);
      return;
    }
    audio.current?.pause();
    audio.current = new Audio(m.previewUrl);
    audio.current.onended = () => setTocando(null);
    audio.current.play().catch(() => setTocando(null));
    setTocando(m.trackId);
  };

  const escolher = (m: Musica) => {
    audio.current?.pause();
    setTocando(null);
    onSalvar(m);
    setBuscando(false);
    setTermo("");
    setResultados([]);
  };

  const BotaoPlay = ({ m, grande = false }: { m: Musica; grande?: boolean }) => (
    <button
      type="button"
      onClick={() => tocar(m)}
      disabled={!m.previewUrl}
      aria-label={tocando === m.trackId ? "Pausar prévia" : "Tocar prévia de 30 segundos"}
      className={`relative shrink-0 overflow-hidden rounded-[10px] text-white ${grande ? "h-14 w-14" : "h-12 w-12"}`}
      style={{ background: "#9E7B5B" }}
    >
      {m.capa && <img src={m.capa} alt="" className="absolute inset-0 h-full w-full object-cover" />}
      <span className="absolute inset-0 flex items-center justify-center bg-black/30">
        {tocando === m.trackId ? (
          <Pause className="h-5 w-5" fill="currentColor" />
        ) : (
          <Play className="h-5 w-5" fill="currentColor" />
        )}
      </span>
    </button>
  );

  return (
    <section className="flex flex-col gap-2.5" aria-labelledby="titulo-musica">
      <h2 id="titulo-musica" className="text-base font-semibold">
        Minha música de entrada
      </h2>

      {valor && !buscando && (
        <div className="flex flex-col gap-2.5 rounded-2xl border bg-white p-3" style={{ borderColor: "#ECE3DA" }}>
          <div className="flex items-center gap-3">
            <BotaoPlay m={valor} grande />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold">{valor.titulo}</p>
              <p className="truncate text-[13px]" style={{ color: "#6E625A" }}>
                {valor.artista} · prévia de 30 s
              </p>
            </div>
            <button
              type="button"
              onClick={() => setBuscando(true)}
              className="h-11 shrink-0 rounded-full border px-3 text-[13px] font-medium"
              style={{ borderColor: "#CDBFB3" }}
            >
              Trocar
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {valor.appleUrl && (
              <a
                href={valor.appleUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-md bg-black px-2.5 py-1.5 text-xs font-medium text-white"
              >
                Ouvir no Apple Music
              </a>
            )}
            <a
              href={linkSpotify(valor)}
              target="_blank"
              rel="noreferrer"
              className="px-1 py-1.5 text-[13px]"
              style={{ color: "#A9582D" }}
            >
              Abrir no Spotify
            </a>
            <a
              href={linkDeezer(valor)}
              target="_blank"
              rel="noreferrer"
              className="px-1 py-1.5 text-[13px]"
              style={{ color: "#A9582D" }}
            >
              Abrir no Deezer
            </a>
          </div>
        </div>
      )}

      {buscando && (
        <div className="flex flex-col gap-2">
          <label htmlFor="busca-musica" className="sr-only">
            Buscar música
          </label>
          <div
            className="flex h-11 items-center gap-2 rounded-xl border bg-white px-3"
            style={{ borderColor: "#DCCFC3" }}
          >
            <Search className="h-4 w-4 shrink-0" style={{ color: "#6E625A" }} aria-hidden="true" />
            <input
              id="busca-musica"
              value={termo}
              onChange={(e) => setTermo(e.target.value)}
              placeholder="Nome da música ou artista"
              className="h-full flex-1 bg-transparent text-[15px] outline-none"
              autoComplete="off"
            />
            {carregando && <Loader2 className="h-4 w-4 animate-spin" style={{ color: "#6E625A" }} />}
          </div>
          {erro && (
            <p className="text-[13px]" style={{ color: "#B42318" }}>
              {erro}
            </p>
          )}
          {resultados.length > 0 && (
            <ul className="flex flex-col divide-y rounded-2xl border bg-white" style={{ borderColor: "#ECE3DA" }}>
              {resultados.map((m) => (
                <li key={m.trackId} className="flex items-center gap-3 p-2.5">
                  <BotaoPlay m={m} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{m.titulo}</p>
                    <p className="truncate text-xs" style={{ color: "#6E625A" }}>
                      {m.artista}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => escolher(m)}
                    className="h-10 shrink-0 rounded-full px-3 text-[13px] font-semibold text-white"
                    style={{ background: "#2B211B" }}
                  >
                    Escolher
                  </button>
                </li>
              ))}
            </ul>
          )}
          {resultados.length > 0 && (
            <a
              href="https://music.apple.com"
              target="_blank"
              rel="noreferrer"
              className="self-start rounded-md bg-black px-2.5 py-1.5 text-xs font-medium text-white"
            >
              Ouvir no Apple Music
            </a>
          )}
          {valor && (
            <button
              type="button"
              onClick={() => setBuscando(false)}
              className="self-start text-[13px]"
              style={{ color: "#6E625A" }}
            >
              Cancelar
            </button>
          )}
        </div>
      )}
    </section>
  );
}
