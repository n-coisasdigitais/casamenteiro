import type { RedeChave } from "@/lib/redesSociais";

/** Ícones das redes em uma cor só (currentColor), traço fino como os do lucide. */
export default function RedeIcon({ rede, className = "h-4 w-4" }: { rede: RedeChave; className?: string }) {
  const p = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (rede) {
    case "instagram":
      return (
        <svg {...p}>
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.3" cy="6.7" r="0.6" fill="currentColor" />
        </svg>
      );
    case "tiktok":
      return (
        <svg {...p}>
          <path d="M14 3.5v11a3.5 3.5 0 1 1-3.5-3.5" />
          <path d="M14 3.5c.5 2.6 2.3 4.2 5 4.4" />
        </svg>
      );
    case "youtube":
      return (
        <svg {...p}>
          <rect x="2.5" y="5.5" width="19" height="13" rx="4" />
          <path d="M10.5 9.5v5l4.3-2.5z" fill="currentColor" />
        </svg>
      );
    case "facebook":
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="9" />
          <path d="M13.2 21v-7.3h2.3M10.6 13.7h4.9M13.2 13.7V10.6c0-1.2.7-1.9 1.9-1.9h1.3" />
        </svg>
      );
    case "pinterest":
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="9" />
          <path d="M11 9.6c-.3 1.5-1.8 7.4-2.2 9.6" />
          <path d="M10.4 13.2c.4.8 1.3 1.3 2.3 1.3 2.2 0 3.6-2 3.6-4.5 0-2.3-1.9-3.9-4.2-3.9-2.6 0-4.4 1.8-4.4 4 0 1 .4 1.9 1.1 2.4" />
        </svg>
      );
    default:
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c2.6 2.5 2.6 15.5 0 18M12 3c-2.6 2.5-2.6 15.5 0 18" />
        </svg>
      );
  }
}
