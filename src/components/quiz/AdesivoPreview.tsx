import type { FormatoAdesivo } from "@/lib/quiz";

/** Adesivo sobre a foto, nos 3 formatos: post-it, etiqueta e mensagem do Cupido. */
export default function AdesivoPreview({
  texto,
  mensagem,
  formato,
  className = "",
}: {
  texto: string;
  mensagem?: string | null;
  formato: FormatoAdesivo;
  className?: string;
}) {
  if (formato === "postit") {
    return (
      <div
        className={`relative flex h-[78px] w-[86px] items-center justify-center px-2 pb-1 pt-3 text-center leading-none ${className}`}
        style={{
          background: "#F7E27A",
          color: "#3A2E05",
          transform: "rotate(6deg)",
          fontFamily: "Caveat, 'Comic Sans MS', cursive",
          fontSize: 19,
          fontWeight: 600,
        }}
      >
        <span
          aria-hidden="true"
          className="absolute -top-2 left-6 h-3.5 w-9"
          style={{ background: "rgba(255,255,255,.65)", transform: "rotate(-4deg)" }}
        />
        {texto}
      </div>
    );
  }
  if (formato === "etiqueta") {
    return (
      <span
        className={`inline-block whitespace-nowrap rounded-lg border-2 border-white px-2.5 py-1.5 text-[11px] font-bold text-white ${className}`}
        style={{ background: "#2B211B", transform: "rotate(-8deg)" }}
      >
        {texto}
      </span>
    );
  }
  return (
    <div
      className={`flex w-[136px] flex-col gap-0.5 border px-2.5 pb-1.5 pt-2 text-left ${className}`}
      style={{
        background: "#FFFFFF",
        borderColor: "#E3D3C4",
        borderRadius: "4px 12px 12px 12px",
        transform: "rotate(-4deg)",
      }}
    >
      <span className="text-[10px] font-bold" style={{ color: "#A9582D" }}>
        Cupido
      </span>
      <span className="text-[11px] leading-snug" style={{ color: "#2B211B" }}>
        {mensagem || texto}
      </span>
      <span className="self-end text-[9px]" style={{ color: "#6E625A" }}>
        23:47
      </span>
    </div>
  );
}
