import { Checkbox } from "@/components/ui/checkbox";
import { ExternalLink, CheckCircle2, Calendar, AlertCircle, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { dueStatus, formatDueDate } from "@/lib/taskDueDate";

type TaskItemProps = {
  id: string;
  title: string;
  category: string;
  priority: string;
  isCompleted: boolean;
  actionLabel?: string | null;
  actionUrl?: string | null;
  supplierId?: string | null;
  supplierName?: string | null;
  dueDate?: string | null;
  createdAt?: string | null;
  seededAsBacklog?: boolean;
  onToggle: (id: string, completed: boolean) => void;
};

const categoryLabels: Record<string, string> = {
  planejamento: "Planejamento",
  orcamento: "Orçamento",
  convidados: "Convidados",
  cerimonia: "Cerimônia",
  recepcao: "Recepção",
  "foto-video": "Foto & Vídeo",
  musica: "Música",
  buffet: "Buffet",
  convites: "Convites",
  decoracao: "Decoração",
  trajes: "Trajes",
  presentes: "Presentes",
  logistica: "Logística",
  "lua-de-mel": "Lua de Mel",
  beleza: "Beleza",
  eventos: "Eventos",
  legal: "Legal",
  "dia-do-casamento": "Dia do Casamento",
  geral: "Geral",
};


export default function TaskItem({ id, title, category, priority, isCompleted, actionLabel, actionUrl, supplierId, supplierName, dueDate, createdAt, seededAsBacklog, onToggle }: TaskItemProps) {
  const d = dueDate ? new Date(dueDate) : null;
  const status = dueStatus(d, isCompleted, { createdAt: createdAt ?? null, seededAsBacklog });
  const dueChip = (() => {
    if (status === "overdue") return { icon: AlertCircle, label: `atrasada · era para ${formatDueDate(d)}`, cls: "" };
    if (status === "backlog") return null; // o grupo "Comece por aqui" já diz isso
    if (status === "soon")    return { icon: Clock, label: `até ${formatDueDate(d)}`, cls: "" };
    if (status === "ok")      return { icon: Calendar, label: formatDueDate(d), cls: "text-muted-foreground" };
    return null;
  })();
  const interna = actionUrl && actionUrl.startsWith("/");
  return (
    <div className="ca-row flex items-center gap-3 py-2.5">
      <Checkbox
        checked={isCompleted}
        onCheckedChange={(checked) => onToggle(id, !!checked)}
        className="h-5 w-5 rounded-md"
        aria-label={isCompleted ? `Desmarcar: ${title}` : `Concluir: ${title}`}
      />
      <div className="min-w-0 flex-1">
        <p
          className="m-0 text-[14.5px] font-semibold"
          style={isCompleted ? { color: "var(--ca-muted, #8a8178)", textDecoration: "line-through" } : undefined}
        >
          {title}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="ca-tag no_plano" title={priority === "essential" ? "Essencial" : undefined}>
            {categoryLabels[category] || category}
          </span>
          {dueChip && (
            <span className={`inline-flex items-center gap-1 text-xs ${status === "overdue" ? "font-semibold" : ""}`} style={{ color: status === "overdue" ? "var(--ca-err, #b4412d)" : status === "soon" ? "var(--ca-warn, #a86a12)" : "var(--ca-muted, #8a8178)" }}>
              <dueChip.icon className="h-3 w-3" aria-hidden="true" /> {dueChip.label}
            </span>
          )}
          {supplierId && supplierName && (
            <Link to={`/fornecedor/${supplierId}`} className="ca-tag contratado inline-flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" aria-hidden="true" /> {supplierName}
            </Link>
          )}
        </div>
      </div>
      {actionLabel && actionUrl && !isCompleted && (
        interna ? (
          <Link to={actionUrl} className="shrink-0 text-[13px] font-bold" style={{ color: "var(--ca-clay, #a9551f)" }}>
            {actionLabel} →
          </Link>
        ) : (
          <a href={actionUrl} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1 text-[13px] font-bold" style={{ color: "var(--ca-clay, #a9551f)" }}>
            {actionLabel} <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
        )
      )}
    </div>
  );
}
