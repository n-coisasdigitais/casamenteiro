import { useEffect, useMemo, useRef, useState } from "react";
import { Heart, Loader2, Share2 } from "lucide-react";
import AdesivoPreview from "@/components/quiz/AdesivoPreview";
import {
  FORMATOS,
  RESULTADOS,
  textoPermitido,
  type EstiloQuiz,
  type FormatoAdesivo,
  type TextosQuiz,
} from "@/lib/quiz";
import { compartilharCartaoQuiz, gerarCartaoQuiz } from "@/lib/cartaoQuiz";
import { useToast } from "@/hooks/use-toast";

export type EscolhasCard = {
  titulo: string;
  adesivo: string | null;
  formato: FormatoAdesivo;
  usarFoto: boolean;
};

type Props = {
  estilo: EstiloQuiz;
  fotos: string[];
  textos: TextosQuiz;
  inicial?: Partial<EscolhasCard>;
  /** Foto de perfil salva na conta (se houver). Sem ela, a pessoa escolhe uma do aparelho só para o card. */
  fotoPerfil?: string | null;
  urlCompartilhar: string;
  /** Pessoa está na lista do Match e escolheu mostrar o selo no card. */
  selo?: string | null;
  onMudou?: (e: EscolhasCard) => void;
  onCompartilhou?: () => void;
};

const PRETO = "#2B211B";

export default function AparenciaCard({
  estilo,
  fotos,
  textos,
  inicial,
  fotoPerfil,
  urlCompartilhar,
  selo,
  onMudou,
  onCompartilhou,
}: Props) {
  const { toast } = useToast();
  const info = RESULTADOS[estilo];
  const [titulo, setTitulo] = useState(inicial?.titulo || textos.titulos[1] || textos.titulos[0]);
  const [proprio, setProprio] = useState("");
  const [escrevendo, setEscrevendo] = useState(false);
  const [erroTitulo, setErroTitulo] = useState("");
  const [adesivo, setAdesivo] = useState<string | null>(
    inicial && inicial.adesivo !== undefined ? inicial.adesivo : (textos.adesivos[0]?.texto ?? null),
  );
  const [formato, setFormato] = useState<FormatoAdesivo>(inicial?.formato || "postit");
  const [usarFoto, setUsarFoto] = useState(!!inicial?.usarFoto);
  const [fotoLocal, setFotoLocal] = useState<string | null>(null);
  const [gerando, setGerando] = useState(false);
  const [cartao, setCartao] = useState<{ blob: Blob; url: string } | null>(null);
  const inputFoto = useRef<HTMLInputElement>(null);

  const foto = fotoLocal || fotoPerfil || null;
  const mensagem = useMemo(() => textos.adesivos.find((a) => a.texto === adesivo)?.mensagem || null, [adesivo, textos]);

  useEffect(() => {
    onMudou?.({ titulo, adesivo, formato, usarFoto: usarFoto && !!foto });
    setCartao(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [titulo, adesivo, formato, usarFoto, foto, selo]);

  useEffect(
    () => () => {
      if (fotoLocal) URL.revokeObjectURL(fotoLocal);
    },
    [fotoLocal],
  );

  const alternarFoto = () => {
    if (!usarFoto && !foto) {
      inputFoto.current?.click();
      return;
    }
    setUsarFoto((v) => !v);
  };

  const confirmarProprio = () => {
    const t = proprio.trim().replace(/\s+/g, " ");
    if (t.length < 3) return setErroTitulo("Escreva pelo menos 3 letras.");
    if (!textoPermitido(t, textos.palavras_bloqueadas))
      return setErroTitulo("Esse título não pode. Tente outro jeito de dizer.");
    setErroTitulo("");
    setTitulo(t);
    setEscrevendo(false);
  };

  const gerar = async () => {
    setGerando(true);
    try {
      const blob = await gerarCartaoQuiz({
        titulo,
        nomeEstilo: info.nome,
        paleta: info.paleta,
        fotos,
        fotoPerfil: usarFoto ? foto : null,
        adesivo,
        mensagem,
        formato,
        selo: selo || null,
        link: urlCompartilhar.replace(/^https?:\/\//, "").replace(/\?.*$/, ""),
      });
      setCartao((antigo) => {
        if (antigo) URL.revokeObjectURL(antigo.url);
        return { blob, url: URL.createObjectURL(blob) };
      });
    } catch (e: any) {
      toast({ title: "Não foi possível gerar o card", description: e?.message, variant: "destructive" });
    } finally {
      setGerando(false);
    }
  };

  const compartilhar = async () => {
    if (!cartao) return;
    const r = await compartilharCartaoQuiz(cartao.blob, urlCompartilhar, `${titulo}. Descobre o seu:`);
    if (r !== "cancelado") onCompartilhou?.();
    if (r === "imagem-baixada")
      toast({ title: "Imagem baixada e link copiado", description: "Poste a imagem no story e cole o link." });
  };

  const chip = (on: boolean) =>
    `min-h-[44px] rounded-xl px-3.5 py-2.5 text-left text-sm leading-snug transition ${on ? "border-2 font-semibold" : "border bg-white"}`;
  const pill = (on: boolean) =>
    `min-h-[44px] rounded-full px-3.5 text-[13px] font-semibold transition ${on ? "text-white" : "border bg-white"}`;

  return (
    <div className="flex flex-col gap-6">
      {/* prévia */}
      <div
        className="mx-auto flex h-[391px] w-[220px] flex-col items-center gap-3 rounded-[18px] border p-4"
        style={{ background: "#FBF4EC", borderColor: "#E3D3C4" }}
      >
        <span className="self-start text-[10px] font-semibold tracking-wide" style={{ color: PRETO }}>
          casamenteiro
        </span>
        <div className="relative mt-2 h-[112px] w-[112px]">
          {usarFoto && foto ? (
            <img src={foto} alt="" className="h-full w-full rounded-full border-[3px] border-white object-cover" />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center rounded-full border-[3px] border-white"
              style={{ background: "#F3E3D3", color: "#A9582D" }}
            >
              <Heart className="h-12 w-12" strokeWidth={1.6} aria-hidden="true" />
            </div>
          )}
          {adesivo && (
            <div className="absolute -bottom-3 -right-14">
              <AdesivoPreview texto={adesivo} mensagem={mensagem} formato={formato} />
            </div>
          )}
        </div>
        <p
          className="mt-4 text-center text-[19px] font-bold leading-tight"
          style={{ color: PRETO, letterSpacing: "-0.02em" }}
        >
          {titulo}
        </p>
        {selo && (
          <span
            className="rounded-full px-2.5 py-1 text-[10px] font-semibold"
            style={{ background: "#2B211B", color: "#FFFFFF" }}
          >
            {selo}
          </span>
        )}
        <span className="mt-auto text-[11px]" style={{ color: "#5E4F45" }}>
          {info.nome}
        </span>
      </div>

      <label
        className="flex items-center justify-between gap-3 rounded-xl border bg-white px-3 py-2.5 text-sm"
        style={{ borderColor: "#ECE3DA" }}
      >
        <span>
          Usar minha foto
          {!fotoPerfil && (
            <span className="block text-xs" style={{ color: "#6E625A" }}>
              Ela fica só no card, não sobe para o site.
            </span>
          )}
        </span>
        <input
          type="checkbox"
          checked={usarFoto && !!foto}
          onChange={alternarFoto}
          className="h-5 w-5 shrink-0"
          style={{ accentColor: "#A9582D" }}
        />
      </label>
      <input
        ref={inputFoto}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          setFotoLocal(URL.createObjectURL(f));
          setUsarFoto(true);
        }}
      />

      <fieldset className="flex flex-col gap-2.5">
        <legend className="mb-2.5 text-base font-semibold">Título</legend>
        {textos.titulos.map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={titulo === t}
            onClick={() => setTitulo(t)}
            className={chip(titulo === t)}
            style={
              titulo === t
                ? { background: "#F6EBE1", borderColor: "#A9582D", color: PRETO }
                : { borderColor: "#DCCFC3", color: PRETO }
            }
          >
            {t}
          </button>
        ))}
        {!textos.titulos.includes(titulo) && !escrevendo && (
          <button
            type="button"
            aria-pressed="true"
            onClick={() => setEscrevendo(true)}
            className={chip(true)}
            style={{ background: "#F6EBE1", borderColor: "#A9582D", color: PRETO }}
          >
            {titulo}
          </button>
        )}
        {escrevendo ? (
          <div className="flex flex-col gap-2">
            <label htmlFor="titulo-proprio" className="sr-only">
              Seu título
            </label>
            <input
              id="titulo-proprio"
              maxLength={80}
              autoFocus
              value={proprio}
              onChange={(e) => {
                setProprio(e.target.value);
                setErroTitulo("");
              }}
              className="h-11 rounded-xl border bg-white px-3 text-[15px]"
              style={{ borderColor: "#DCCFC3" }}
              placeholder="Ex.: Já tenho o vestido, falta o resto"
            />
            {erroTitulo && (
              <p className="text-[13px]" style={{ color: "#B42318" }}>
                {erroTitulo}
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={confirmarProprio}
                className="h-11 flex-1 rounded-xl text-sm font-semibold text-white"
                style={{ background: PRETO }}
              >
                Usar este título
              </button>
              <button
                type="button"
                onClick={() => setEscrevendo(false)}
                className="h-11 rounded-xl border px-4 text-sm"
                style={{ borderColor: "#DCCFC3" }}
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEscrevendo(true)}
            className="min-h-[44px] rounded-xl border-[1.5px] border-dashed text-sm font-medium"
            style={{ borderColor: "#CDBFB3", color: "#5E4F45" }}
          >
            Escrever o meu
          </button>
        )}
      </fieldset>

      <fieldset>
        <legend className="mb-2.5 text-base font-semibold">Adesivo</legend>
        <div className="flex flex-wrap gap-2">
          {[null, ...textos.adesivos.map((a) => a.texto)].map((a) => (
            <button
              key={a ?? "nenhum"}
              type="button"
              aria-pressed={adesivo === a}
              onClick={() => setAdesivo(a)}
              className={pill(adesivo === a)}
              style={adesivo === a ? { background: PRETO } : { borderColor: "#DCCFC3", color: PRETO }}
            >
              {a ?? "Nenhum"}
            </button>
          ))}
        </div>
      </fieldset>

      {adesivo && (
        <fieldset>
          <legend className="mb-2.5 text-base font-semibold">Formato do adesivo</legend>
          <div className="grid grid-cols-3 gap-2">
            {FORMATOS.map((f) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={formato === f.id}
                onClick={() => setFormato(f.id)}
                className={pill(formato === f.id)}
                style={formato === f.id ? { background: PRETO } : { borderColor: "#DCCFC3", color: PRETO }}
              >
                {f.rotulo}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {cartao ? (
        <div className="flex flex-col items-center gap-3">
          <img
            src={cartao.url}
            alt="Prévia do seu card para o story"
            className="w-[220px] rounded-2xl border"
            style={{ borderColor: "#E3D3C4" }}
          />
          <button
            type="button"
            onClick={compartilhar}
            className="flex h-[52px] w-full items-center justify-center gap-2 rounded-[14px] text-base font-semibold text-white"
            style={{ background: "#A9582D" }}
          >
            <Share2 className="h-5 w-5" aria-hidden="true" /> Compartilhar no story
          </button>
          <p className="text-center text-xs" style={{ color: "#6E625A" }}>
            No Instagram, use o adesivo de música para colocar a sua música de entrada.
          </p>
        </div>
      ) : (
        <button
          type="button"
          onClick={gerar}
          disabled={gerando}
          className="flex h-[52px] w-full items-center justify-center gap-2 rounded-[14px] text-base font-semibold text-white disabled:opacity-70"
          style={{ background: "#A9582D" }}
        >
          {gerando && <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />}{" "}
          {gerando ? "Gerando…" : "Gerar meu card"}
        </button>
      )}
    </div>
  );
}
