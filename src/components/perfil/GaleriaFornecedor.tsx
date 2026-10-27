import { useCallback, useEffect, useRef, useState } from "react";
import { Building, ChevronLeft, ChevronRight, Grid2x2, Heart, Pause, Play, Share2 } from "lucide-react";

type Foto = { id?: string; photo_url: string };

/**
 * Galeria do perfil: mosaico no computador, carrossel de deslizar no celular
 * e visualizador em tela cheia (claro) com apresentação automática.
 */
export default function GaleriaFornecedor({
  fotos,
  nome,
  favorito,
  onFavoritar,
  onCompartilhar,
}: {
  fotos: Foto[];
  nome: string;
  favorito: boolean;
  onFavoritar: () => void;
  onCompartilhar: () => void;
}) {
  const [aberto, setAberto] = useState<number | null>(null);
  const [slide, setSlide] = useState(0);
  const n = fotos.length;

  const acoes = (
    <div className="absolute right-3 top-3 z-[2] flex gap-2 md:right-4 md:top-4">
      <button type="button" className={`pf-glass ${favorito ? "on" : ""}`} onClick={onFavoritar} aria-pressed={favorito}>
        <Heart className={`h-4 w-4 ${favorito ? "fill-current" : ""}`} />
        <span className="hidden sm:inline">{favorito ? "Salvo" : "Salvar"}</span>
      </button>
      <button type="button" className="pf-glass" onClick={onCompartilhar}>
        <Share2 className="h-4 w-4" />
        <span className="hidden sm:inline">Compartilhar</span>
      </button>
    </div>
  );

  if (!n) {
    return (
      <div className="relative grid h-56 place-items-center rounded-3xl bg-[#efe7dd] md:h-80">
        <Building className="h-14 w-14 text-[#b9a999]" />
        {acoes}
      </div>
    );
  }

  return (
    <>
      {/* computador */}
      <div className={`pf-gal hidden md:grid n${Math.min(n, 5)}`}>
        {fotos.slice(0, 5).map((f, i) => (
          <button key={f.id || i} type="button" className="pf-ph" onClick={() => setAberto(i)} aria-label={`Abrir foto ${i + 1}`}>
            <img src={f.photo_url} alt={i === 0 ? nome : ""} loading={i === 0 ? "eager" : "lazy"} />
            {i === 4 && n > 5 && <span className="pf-mais">+{n - 5} fotos</span>}
          </button>
        ))}
        {acoes}
        <button type="button" className="pf-glass absolute bottom-4 right-4 z-[2]" onClick={() => setAberto(0)}>
          <Grid2x2 className="h-4 w-4" /> {n === 1 ? "Ver a foto" : `Ver as ${n} fotos`}
        </button>
      </div>

      {/* celular */}
      <div className="relative -mx-4 md:hidden">
        <div
          className="pf-trilho"
          onScroll={(e) => {
            const t = e.currentTarget;
            setSlide(Math.round(t.scrollLeft / t.clientWidth));
          }}
        >
          {fotos.map((f, i) => (
            <button key={f.id || i} type="button" className="pf-slide" onClick={() => setAberto(i)} aria-label={`Foto ${i + 1}`}>
              <img src={f.photo_url} alt={i === 0 ? nome : ""} loading={i === 0 ? "eager" : "lazy"} />
            </button>
          ))}
        </div>
        {acoes}
        {n > 1 && (
          <span className="absolute bottom-3 right-3 rounded-full bg-[rgba(34,29,25,.62)] px-2.5 py-1 text-xs font-bold text-white">
            {slide + 1} / {n}
          </span>
        )}
      </div>

      {aberto !== null && <Visualizador fotos={fotos} nome={nome} inicio={aberto} onFechar={() => setAberto(null)} />}
    </>
  );
}

/** Visualizador em tela cheia com setas, miniaturas, deslizar e apresentação automática. */
export function Visualizador({ fotos, nome, inicio, onFechar }: { fotos: Foto[]; nome: string; inicio: number; onFechar: () => void }) {
  const [atual, setAtual] = useState(inicio);
  const [tocando, setTocando] = useState(false);
  const [ciclo, setCiclo] = useState(0);
  const x0 = useRef<number | null>(null);
  const miniRef = useRef<HTMLDivElement>(null);
  const n = fotos.length;

  const ir = useCallback((i: number) => {
    setAtual(((i % n) + n) % n);
    setCiclo((c) => c + 1);
  }, [n]);

  useEffect(() => {
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFechar();
      if (e.key === "ArrowRight") ir(atual + 1);
      if (e.key === "ArrowLeft") ir(atual - 1);
    };
    window.addEventListener("keydown", tecla);
    return () => {
      document.body.style.overflow = anterior;
      window.removeEventListener("keydown", tecla);
    };
  }, [atual, ir, onFechar]);

  useEffect(() => {
    if (!tocando) return;
    const t = setTimeout(() => ir(atual + 1), 6000);
    return () => clearTimeout(t);
  }, [tocando, atual, ciclo, ir]);

  useEffect(() => {
    miniRef.current?.querySelector(".on")?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [atual]);

  return (
    <div className={`pf-lb ${tocando ? "tocando" : ""}`} role="dialog" aria-modal="true" aria-label={`Fotos de ${nome}`}>
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1 truncate text-sm">
          <b>{nome}</b> <span className="text-[var(--pf-muted)]">{atual + 1} de {n}</span>
        </div>
        {n > 1 && (
          <button type="button" className="pf-pill" onClick={() => setTocando((t) => !t)}>
            {tocando ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            <span className="hidden sm:inline">{tocando ? "Pausar" : "Apresentação"}</span>
          </button>
        )}
        <button type="button" className="pf-pill" onClick={onFechar}>
          Fechar
        </button>
      </div>
      <div
        className="pf-lb-palco"
        onTouchStart={(e) => (x0.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (x0.current == null) return;
          const dx = e.changedTouches[0].clientX - x0.current;
          if (Math.abs(dx) > 40) ir(atual + (dx < 0 ? 1 : -1));
          x0.current = null;
        }}
      >
        {fotos.map((f, i) =>
          Math.abs(i - atual) <= 1 || (atual === 0 && i === n - 1) || (atual === n - 1 && i === 0) ? (
            <img key={`${f.id || i}-${i === atual ? ciclo : 0}`} src={f.photo_url} alt="" className={i === atual ? "on" : ""} />
          ) : null,
        )}
        {n > 1 && (
          <>
            <button type="button" className="pf-lb-nav left-3.5" onClick={() => ir(atual - 1)} aria-label="Foto anterior">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button type="button" className="pf-lb-nav right-3.5" onClick={() => ir(atual + 1)} aria-label="Próxima foto">
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
        <i key={ciclo} className="pf-lb-prog" />
      </div>
      {n > 1 && (
        <div className="pf-mini" ref={miniRef}>
          {fotos.map((f, i) => (
            <button key={f.id || i} type="button" className={i === atual ? "on" : ""} onClick={() => ir(i)} aria-label={`Foto ${i + 1}`}>
              <img src={f.photo_url} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
