import { useCallback, useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Loader2, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";

/**
 * Ajuste de foto antes de salvar: arrastar para enquadrar e zoom.
 * Sem dependências externas. Devolve um JPEG já recortado.
 *
 * Uso:
 *   <AjustarFotoDialog src={urlOuObjectUrl} formato="redondo" onCancelar={...} onConfirmar={(blob) => ...} />
 *   - src: null fecha o modal.
 *   - Funciona com arquivo novo (URL.createObjectURL) ou com a foto já salva (URL pública do Storage).
 */
type Props = {
  src: string | null;
  formato?: "redondo" | "quadrado" | "retrato";
  tamanhoSaida?: number; // largura do JPEG final em px
  titulo?: string;
  salvando?: boolean;
  onCancelar: () => void;
  onConfirmar: (blob: Blob) => void;
};

const PROPORCAO: Record<NonNullable<Props["formato"]>, number> = {
  redondo: 1,
  quadrado: 1,
  retrato: 4 / 5,
};

const ZOOM_MAX = 4;

export default function AjustarFotoDialog({
  src,
  formato = "redondo",
  tamanhoSaida = 800,
  titulo = "Ajustar foto",
  salvando = false,
  onCancelar,
  onConfirmar,
}: Props) {
  const proporcao = PROPORCAO[formato];
  const quadroRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const arrasto = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const pinca = useRef<{ dist: number; zoom: number } | null>(null);
  const toques = useRef(new Map<number, { x: number; y: number }>());

  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [quadro, setQuadro] = useState({ w: 300, h: 300 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [erro, setErro] = useState<string | null>(null);

  // Carrega a imagem (com CORS liberado para poder desenhar no canvas)
  useEffect(() => {
    setNatural(null);
    setErro(null);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    if (!src) return;
    const img = new Image();
    let url = src;
    if (/^https?:/.test(src)) {
      // Foto já salva: pede com CORS e fura o cache (a versão em cache veio sem CORS e travaria o canvas).
      img.crossOrigin = "anonymous";
      url = `${src}${src.includes("?") ? "&" : "?"}ajuste=${Date.now()}`;
    }
    img.onload = () => {
      imgRef.current = img;
      setNatural({ w: img.naturalWidth, h: img.naturalHeight });
    };
    img.onerror = () => setErro("Não foi possível abrir esta imagem. Tente outra foto (JPG ou PNG).");
    img.src = url;
  }, [src]);

  // Tamanho do quadro acompanha a largura do modal
  useEffect(() => {
    if (!src) return;
    const medir = () => {
      const w = Math.min(quadroRef.current?.parentElement?.clientWidth ?? 300, 360);
      setQuadro({ w, h: Math.round(w / proporcao) });
    };
    const t = setTimeout(medir, 0);
    window.addEventListener("resize", medir);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", medir);
    };
  }, [src, proporcao]);

  // Escala mínima para a foto cobrir o quadro inteiro
  const escalaBase = natural ? Math.max(quadro.w / natural.w, quadro.h / natural.h) : 1;
  const escala = escalaBase * zoom;
  const larguraImg = natural ? natural.w * escala : 0;
  const alturaImg = natural ? natural.h * escala : 0;

  // Impede que apareça espaço vazio dentro do quadro
  const limitar = useCallback(
    (o: { x: number; y: number }, z = zoom) => {
      if (!natural) return o;
      const s = escalaBase * z;
      const maxX = Math.max(0, (natural.w * s - quadro.w) / 2);
      const maxY = Math.max(0, (natural.h * s - quadro.h) / 2);
      return { x: Math.min(maxX, Math.max(-maxX, o.x)), y: Math.min(maxY, Math.max(-maxY, o.y)) };
    },
    [natural, escalaBase, quadro, zoom],
  );

  const mudarZoom = (z: number) => {
    const nz = Math.min(ZOOM_MAX, Math.max(1, z));
    setZoom(nz);
    setOffset((o) => limitar(o, nz));
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    toques.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (toques.current.size === 2) {
      const [a, b] = Array.from(toques.current.values());
      pinca.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom };
      arrasto.current = null;
    } else {
      arrasto.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!toques.current.has(e.pointerId)) return;
    toques.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinca.current && toques.current.size === 2) {
      const [a, b] = Array.from(toques.current.values());
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      mudarZoom(pinca.current.zoom * (dist / (pinca.current.dist || 1)));
      return;
    }
    if (!arrasto.current) return;
    const dx = e.clientX - arrasto.current.x;
    const dy = e.clientY - arrasto.current.y;
    setOffset(limitar({ x: arrasto.current.ox + dx, y: arrasto.current.oy + dy }));
  };

  const onPointerUp = (e: React.PointerEvent) => {
    toques.current.delete(e.pointerId);
    if (toques.current.size < 2) pinca.current = null;
    if (toques.current.size === 0) arrasto.current = null;
  };

  const onWheel = (e: React.WheelEvent) => {
    mudarZoom(zoom * (e.deltaY < 0 ? 1.08 : 0.92));
  };

  const confirmar = () => {
    const img = imgRef.current;
    if (!img || !natural) return;
    const saidaW = tamanhoSaida;
    const saidaH = Math.round(tamanhoSaida / proporcao);
    const canvas = document.createElement("canvas");
    canvas.width = saidaW;
    canvas.height = saidaH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Posição da imagem dentro do quadro (canto superior esquerdo)
    const esquerda = quadro.w / 2 - larguraImg / 2 + offset.x;
    const topo = quadro.h / 2 - alturaImg / 2 + offset.y;
    const sx = -esquerda / escala;
    const sy = -topo / escala;
    const sw = quadro.w / escala;
    const sh = quadro.h / escala;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, saidaW, saidaH);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, saidaW, saidaH);
    try {
      canvas.toBlob((blob) => blob && onConfirmar(blob), "image/jpeg", 0.9);
    } catch {
      setErro("Esta foto não pode ser ajustada. Envie a foto de novo pelo botão de trocar.");
    }
  };

  return (
    <Dialog open={!!src} onOpenChange={(v) => !v && !salvando && onCancelar()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>Arraste para enquadrar e use o zoom para aproximar.</DialogDescription>
        </DialogHeader>

        <div className="flex justify-center">
          <div
            ref={quadroRef}
            className="relative overflow-hidden bg-muted select-none"
            style={{
              width: quadro.w,
              height: quadro.h,
              borderRadius: 12,
              touchAction: "none",
              cursor: arrasto.current ? "grabbing" : "grab",
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onWheel={onWheel}
          >
            {natural && src && (
              <img
                src={src}
                alt=""
                draggable={false}
                className="absolute max-w-none pointer-events-none"
                style={{
                  width: larguraImg,
                  height: alturaImg,
                  left: quadro.w / 2 - larguraImg / 2 + offset.x,
                  top: quadro.h / 2 - alturaImg / 2 + offset.y,
                }}
              />
            )}
            {!natural && !erro && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
            {/* Máscara: mostra como a foto vai aparecer */}
            {formato === "redondo" && natural && (
              <div
                className="pointer-events-none absolute inset-0"
                style={{ boxShadow: `0 0 0 ${quadro.w}px rgba(255,255,255,.65)`, borderRadius: "50%" }}
              />
            )}
            {natural && <div className="pointer-events-none absolute inset-0 rounded-[12px] ring-1 ring-black/10" />}
          </div>
        </div>

        {erro ? (
          <p className="text-sm text-destructive text-center">{erro}</p>
        ) : (
          <div className="flex items-center gap-3 px-1">
            <button
              type="button"
              aria-label="Diminuir zoom"
              onClick={() => mudarZoom(zoom - 0.2)}
              className="text-muted-foreground"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <Slider
              value={[zoom]}
              min={1}
              max={ZOOM_MAX}
              step={0.01}
              onValueChange={([v]) => mudarZoom(v)}
              className="flex-1"
            />
            <button
              type="button"
              aria-label="Aumentar zoom"
              onClick={() => mudarZoom(zoom + 0.2)}
              className="text-muted-foreground"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Voltar ao início"
              onClick={() => {
                setZoom(1);
                setOffset({ x: 0, y: 0 });
              }}
              className="text-muted-foreground"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="ghost" onClick={onCancelar} disabled={salvando}>
            Cancelar
          </Button>
          <Button type="button" onClick={confirmar} disabled={!natural || !!erro || salvando}>
            {salvando ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar foto"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
