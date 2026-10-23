/** Selo "Em breve" para funcionalidades anunciadas que ainda estão desligadas. */
export default function EmBreveBadge({ escuro = false }: { escuro?: boolean }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase"
      style={{
        letterSpacing: ".06em",
        background: escuro ? "rgba(255,255,255,.14)" : "rgba(31,29,27,.08)",
        color: escuro ? "#F2B98A" : "#7E3C12",
        border: escuro ? "1px solid rgba(242,185,138,.45)" : "1px solid rgba(126,60,18,.25)",
      }}
    >
      Em breve
    </span>
  );
}
