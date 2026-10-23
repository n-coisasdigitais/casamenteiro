import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Monitor, Smartphone } from "lucide-react";

export type EspacoImagem = "home_hero" | "home_story" | "home_form" | "home_categoria";

/**
 * Tamanhos sugeridos e os cortes reais que cada espaço usa na Home.
 * A mesma foto é cortada de jeitos diferentes no desktop e no celular,
 * por isso cada imagem guarda um ponto de foco para cada um.
 */
export const FORMATOS: Record<
  EspacoImagem,
  { nome: string; sugerido: string; minimo: string; dica: string; desktop: { ratio: string; rotulo: string }[]; mobile: { ratio: string; rotulo: string }[] }
> = {
  home_hero: {
    nome: "Hero",
    sugerido: "2400 × 1600 px",
    minimo: "1920 × 1280 px",
    dica: "Deixe o assunto principal no centro; o celular corta as laterais.",
    desktop: [{ ratio: "16 / 9", rotulo: "Tela cheia" }],
    mobile: [{ ratio: "9 / 19", rotulo: "Celular em pé" }],
  },
  home_story: {
    nome: "Stories",
    sugerido: "1080 × 1920 px",
    minimo: "720 × 1280 px",
    dica: "Vertical. Evite detalhes importantes no rodapé (fica atrás do texto).",
    desktop: [{ ratio: "9 / 16", rotulo: "Story" }],
    mobile: [{ ratio: "9 / 16", rotulo: "Story" }],
  },
  home_form: {
    nome: "Formulário",
    sugerido: "2400 × 1200 px",
    minimo: "1600 × 800 px",
    dica: "Panorâmica. No celular a faixa fica mais alta e corta as laterais.",
    desktop: [{ ratio: "11 / 3", rotulo: "Faixa desktop" }],
    mobile: [{ ratio: "4 / 3", rotulo: "Faixa celular" }],
  },
  home_categoria: {
    nome: "Categorias",
    sugerido: "1600 × 1600 px",
    minimo: "1000 × 1000 px",
    dica: "Quadrada. O bloco pode aparecer alto, largo ou quadrado conforme a posição.",
    desktop: [
      { ratio: "3 / 5", rotulo: "Bloco alto" },
      { ratio: "5 / 2", rotulo: "Bloco largo" },
      { ratio: "6 / 5", rotulo: "Bloco normal" },
    ],
    mobile: [{ ratio: "10 / 7", rotulo: "Celular" }],
  },
};

const PRESETS: { rotulo: string; valor: string }[] = [
  { rotulo: "Centro", valor: "50% 50%" },
  { rotulo: "Topo", valor: "50% 15%" },
  { rotulo: "Base", valor: "50% 85%" },
  { rotulo: "Esquerda", valor: "15% 50%" },
  { rotulo: "Direita", valor: "85% 50%" },
];

const parse = (v?: string | null) => {
  const m = /(-?\d+(?:\.\d+)?)%\s+(-?\d+(?:\.\d+)?)%/.exec(v || "");
  return m ? { x: Number(m[1]), y: Number(m[2]) } : { x: 50, y: 50 };
};
const fmt = (x: number, y: number) => `${Math.round(Math.min(100, Math.max(0, x)))}% ${Math.round(Math.min(100, Math.max(0, y)))}%`;

/**
 * Editor de enquadramento: clique (ou arraste) na foto para marcar o ponto
 * que não pode ser cortado; as prévias mostram o corte real no desktop e no celular.
 */
export default function FocoImagemEditor({
  imagem,
  espaco,
  focoDesktop,
  focoMobile,
  onChange,
}: {
  imagem: string;
  espaco: EspacoImagem;
  focoDesktop?: string | null;
  focoMobile?: string | null;
  onChange: (v: { focoDesktop: string; focoMobile: string }) => void;
}) {
  const f = FORMATOS[espaco];
  const mesmoCorte = espaco === "home_story";
  const [alvo, setAlvo] = useState<"desktop" | "mobile">("desktop");
  const [arrastando, setArrastando] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const d = focoDesktop || "50% 50%";
  const m = focoMobile || d;
  const atual = parse(alvo === "desktop" || mesmoCorte ? d : m);

  const definir = (valor: string) => {
    if (mesmoCorte) onChange({ focoDesktop: valor, focoMobile: valor });
    else if (alvo === "desktop") onChange({ focoDesktop: valor, focoMobile: m });
    else onChange({ focoDesktop: d, focoMobile: valor });
  };

  const porPonteiro = (e: React.PointerEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    definir(fmt(((e.clientX - r.left) / r.width) * 100, ((e.clientY - r.top) / r.height) * 100));
  };

  const Previa = ({ ratio, rotulo, pos, largura }: { ratio: string; rotulo: string; pos: string; largura: number }) => (
    <figure className="m-0 flex flex-col gap-1" style={{ width: largura }}>
      <div className="overflow-hidden rounded-md border bg-muted" style={{ aspectRatio: ratio }}>
        <img src={imagem} alt="" className="h-full w-full object-cover" style={{ objectPosition: pos }} />
      </div>
      <figcaption className="text-[11px] text-muted-foreground">{rotulo}</figcaption>
    </figure>
  );

  return (
    <div className="space-y-4">
      <div className="rounded-md bg-muted/60 p-3 text-xs leading-relaxed">
        <strong>Tamanho sugerido: {f.sugerido}</strong> (mínimo {f.minimo}). JPG ou WebP, até 8 MB.
        <br />
        {f.dica}
      </div>

      {!mesmoCorte && (
        <div className="flex gap-2" role="tablist" aria-label="Ajustar para">
          <Button type="button" size="sm" variant={alvo === "desktop" ? "default" : "outline"} onClick={() => setAlvo("desktop")} role="tab" aria-selected={alvo === "desktop"}>
            <Monitor className="mr-1.5 h-4 w-4" /> Desktop
          </Button>
          <Button type="button" size="sm" variant={alvo === "mobile" ? "default" : "outline"} onClick={() => setAlvo("mobile")} role="tab" aria-selected={alvo === "mobile"}>
            <Smartphone className="mr-1.5 h-4 w-4" /> Celular
          </Button>
        </div>
      )}

      <div>
        <p className="mb-1 text-xs text-muted-foreground">
          Clique ou arraste na foto para marcar o ponto principal{mesmoCorte ? "" : ` (${alvo === "desktop" ? "desktop" : "celular"})`}.
        </p>
        <div className="flex justify-center rounded-md border bg-muted/40">
        <div
          ref={ref}
          className="relative inline-block cursor-crosshair touch-none select-none overflow-hidden"
          onPointerDown={(e) => {
            setArrastando(true);
            (e.target as Element).setPointerCapture?.(e.pointerId);
            porPonteiro(e);
          }}
          onPointerMove={(e) => arrastando && porPonteiro(e)}
          onPointerUp={() => setArrastando(false)}
        >
          <img src={imagem} alt="Foto para enquadrar" className="block max-h-[320px] max-w-full" draggable={false} />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white"
            style={{ left: `${atual.x}%`, top: `${atual.y}%`, boxShadow: "0 0 0 2px rgba(0,0,0,.5), inset 0 0 0 2px rgba(0,0,0,.35)" }}
          />
        </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <Button key={p.valor} type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => definir(p.valor)}>
              {p.rotulo}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        {f.desktop.map((c) => (
          <Previa key={c.rotulo} ratio={c.ratio} rotulo={`Desktop · ${c.rotulo}`} pos={d} largura={c.ratio === "3 / 5" ? 90 : c.ratio === "9 / 16" ? 110 : 200} />
        ))}
        {!mesmoCorte &&
          f.mobile.map((c) => <Previa key={c.rotulo} ratio={c.ratio} rotulo={`Celular · ${c.rotulo}`} pos={m} largura={c.ratio === "9 / 19" ? 80 : 140} />)}
      </div>
    </div>
  );
}
