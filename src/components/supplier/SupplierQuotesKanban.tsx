import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, Calendar, Users as UsersIcon } from "lucide-react";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

type KanbanStatus = "enviado" | "respondido" | "negociando" | "fechado" | "recusado";

const COLUMNS: { key: KanbanStatus; label: string; color: string }[] = [
  { key: "enviado", label: "Novos", color: "bg-muted" },
  { key: "respondido", label: "Respondidos", color: "bg-blue-50 dark:bg-blue-950/30" },
  { key: "negociando", label: "Negociando", color: "bg-amber-50 dark:bg-amber-950/30" },
  { key: "fechado", label: "Fechados", color: "bg-green-50 dark:bg-green-950/30" },
  { key: "recusado", label: "Recusados", color: "bg-red-50 dark:bg-red-950/30" },
];

type Props = {
  quotes: any[];
  onOpen: (q: any) => void;
  onChange: () => void;
};

export default function SupplierQuotesKanban({ quotes, onOpen, onChange }: Props) {
  const [items, setItems] = useState(quotes);
  useEffect(() => setItems(quotes), [quotes]);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const move = async (id: string, status: KanbanStatus) => {
    setItems((prev) => prev.map((q) => (q.id === id ? { ...q, kanban_status: status } : q)));
    await supabase.from("quotes").update({ kanban_status: status }).eq("id", id);
    onChange();
  };

  const onDragEnd = (e: DragEndEvent) => {
    const id = String(e.active.id);
    const target = e.over?.id ? String(e.over.id) : null;
    if (!target) return;
    const current = items.find((q) => q.id === id);
    if (!current || (current.kanban_status || "enviado") === target) return;
    move(id, target as KanbanStatus);
  };

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
    <div className="overflow-x-auto pb-2">
      <div className="grid grid-cols-5 gap-3 min-w-[900px]">
        {COLUMNS.map((col) => {
          const list = items.filter((q) => (q.kanban_status || "enviado") === col.key);
          return (
            <DroppableColumn key={col.key} id={col.key} className={`rounded-lg ${col.color} p-3`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">{col.label}</h3>
                <Badge variant="secondary" className="h-5">{list.length}</Badge>
              </div>
              <div className="space-y-2">
                {list.map((q) => (
                  <DraggableCard key={q.id} id={q.id}>
                    <Card className="p-3 space-y-2 hover:shadow-md transition" onClick={() => onOpen(q)}>
                    <p className="text-xs text-muted-foreground">{new Date(q.created_at).toLocaleDateString("pt-BR")}</p>
                    <p className="text-sm line-clamp-2">{q.message}</p>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                      {q.event_date && (
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(q.event_date).toLocaleDateString("pt-BR")}</span>
                      )}
                      {q.guest_count && (
                        <span className="flex items-center gap-1"><UsersIcon className="h-3 w-3" />{q.guest_count}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <Select value={q.kanban_status || "enviado"} onValueChange={(v) => move(q.id, v as KanbanStatus)}>
                        <SelectTrigger className="h-7 text-xs flex-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {COLUMNS.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onOpen(q)}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    </Card>
                  </DraggableCard>
                ))}
                {list.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">—</p>
                )}
              </div>
            </DroppableColumn>
          );
        })}
      </div>
    </div>
    </DndContext>
  );
}

function DroppableColumn({
  id,
  className,
  children,
}: {
  id: string;
  className?: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`${className || ""} ${isOver ? "ring-2 ring-primary" : ""}`}
    >
      {children}
    </div>
  );
}

function DraggableCard({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });
  const style: React.CSSProperties = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    opacity: isDragging ? 0.5 : 1,
    cursor: "grab",
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}
