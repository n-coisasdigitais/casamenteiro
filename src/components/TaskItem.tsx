import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";

type TaskItemProps = {
  id: string;
  title: string;
  category: string;
  priority: string;
  isCompleted: boolean;
  actionLabel?: string | null;
  actionUrl?: string | null;
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

const priorityVariant: Record<string, "default" | "secondary" | "outline"> = {
  essential: "default",
  recommended: "secondary",
  optional: "outline",
};

export default function TaskItem({ id, title, category, priority, isCompleted, actionLabel, actionUrl, onToggle }: TaskItemProps) {
  return (
    <div className="flex items-start gap-3 py-3 px-4 rounded-lg hover:bg-muted/50 transition-colors group">
      <Checkbox
        checked={isCompleted}
        onCheckedChange={(checked) => onToggle(id, !!checked)}
        className="mt-0.5"
      />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${isCompleted ? "line-through text-muted-foreground" : ""}`}>
          {title}
        </p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <Badge variant={priorityVariant[priority] || "secondary"} className="text-xs">
            {categoryLabels[category] || category}
          </Badge>
          {actionLabel && actionUrl && (
            <a
              href={actionUrl}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              {actionLabel}
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
