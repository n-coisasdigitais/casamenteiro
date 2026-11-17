import * as L from "lucide-react";

/** Ícones permitidos no conteúdo editável da Central de Ajuda. */
export const ICONES_AJUDA = [
  "Calculator", "MessageSquare", "Scale", "ListChecks", "UserPlus", "BadgeCheck", "CalendarDays", "Users",
  "Bell", "Send", "Star", "Mail", "Inbox", "KanbanSquare", "Briefcase", "Heart", "Search", "Camera",
  "Sparkles", "ShieldCheck", "Wallet", "Gift", "MapPin", "Clock",
] as const;

export default function IconeAjuda({ nome, className }: { nome: string; className?: string }) {
  const C = (L as any)[nome] ?? L.HelpCircle;
  return <C className={className} aria-hidden="true" />;
}
