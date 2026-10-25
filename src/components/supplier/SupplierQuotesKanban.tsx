import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Users as UsersIcon } from "lucide-react";
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

const COLUMNS: { key: KanbanStatus; label: string; dot: string }[] = [
  { key: "enviado", label: "Novos", dot: "var(--pv-terracota)" },
  { key: "respondido", label: "Respondidos", dot: "#c2a03c" },
  { key: "negociando", label: "Negociando", dot: "var(--pv-clay)" },
  { key: "fechado", label: "Fechados", dot: "var(--pv-ok)" },
  { key: "recusado", label: "Recusados", dot: "#b9ada1" },
];

type Props = {
  quotes: any[];
  onOpen: (q: any) => void;
  onChange: () => void;
};

function haQuanto(iso: string) {
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
  if (h < 1) return "agora";
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  return d === 1 ? "ontem" : `há ${d} dias`;
}

/** Funil de orçamentos em colunas. Arrastar muda o status; o seletor faz o mesmo sem arrastar. */
export default function SupplierQuotesKanban({ quotes, onOpen, onChange }: Props) {
  const [items, setItems] = useState(quotes);
  useEffect(() => setItems(quotes), [quotes]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

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
      <div className="-mx-1 overflow-x-auto px-1 pb-2" style={{ scrollSnapType: "x mandatory" }}>
        <div className="grid min-w-[1000px] grid-cols-5 gap-3">
          {COLUMNS.map((col) => {
            const list = items.filter((q) => (q.kanban_status || "enviado") === col.key);
            return (
              <DroppableColumn key={col.key} id={col.key}>
                <div className="mb-2.5 flex items-center justify-between px-1">
                  <h3 className="m-0 flex items-center gap-2 text-[12.5px] font-bold uppercase" style={{ letterSpacing: ".06em", color: "var(--pv-body)" }}>
                    <span className="h-2 w-2 rounded-full" style={{ background: col.dot }} />
                    {col.label}
                  </h3>
                  <span className="pv-num text-xs font-semibold" style={{ color: "var(--pv-muted)" }}>{list.length}</span>
                </div>
                <div className="flex flex-col gap-2">
                  {list.map((q) => {
                    const novo = q.status === "pending";
                    return (
                      <DraggableCard key={q.id} id={q.id}>
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => onOpen(q)}
                          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onOpen(q))}
                          className="pv-lift flex flex-col gap-2 rounded-[14px] border bg-white p-3 text-left"
                          style={{ borderColor: novo ? "var(--pv-terracota)" : "var(--pv-line)" }}
                          aria-label={`Abrir pedido de ${q.event_date ? new Date(q.event_date).toLocaleDateString("pt-BR") : "orçamento"}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="pv-num text-xs" style={{ color: "var(--pv-muted)" }}>{haQuanto(q.created_at)}</span>
                            {novo && (
                              <span className="rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ background: "var(--pv-rose-soft)", color: "var(--pv-err)" }}>não lido</span>
                            )}
                          </div>
                          {q.message && <p className="m-0 line-clamp-2 text-[13.5px] leading-snug" style={{ color: "var(--pv-ink)" }}>{q.message}</p>}
                          <div className="pv-num flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px]" style={{ color: "var(--pv-body)" }}>
                            {q.event_date && (
                              <span className="inline-flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                                {new Date(q.event_date).toLocaleDateString("pt-BR")}
                              </span>
                            )}
                            {q.guest_count && (
                              <span className="inline-flex items-center gap-1">
                                <UsersIcon className="h-3.5 w-3.5" aria-hidden="true" />
                                {q.guest_count} conv.
                              </span>
                            )}
                          </div>
                          <div onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
                            <Select value={q.kanban_status || "enviado"} onValueChange={(v) => move(q.id, v as KanbanStatus)}>
                              <SelectTrigger className="h-8 rounded-lg text-xs" aria-label="Mover para">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {COLUMNS.map((c) => (
                                  <SelectItem key={c.key} value={c.key}>
                                    {c.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </DraggableCard>
                    );
                  })}
                  {list.length === 0 && (
                    <p className="m-0 rounded-xl border border-dashed py-5 text-center text-xs" style={{ borderColor: "var(--pv-line)", color: "var(--pv-muted)" }}>
                      Arraste um pedido para cá
                    </p>
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

function DroppableColumn({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className="min-h-[200px] rounded-2xl border p-2.5 transition-colors"
      style={{
        scrollSnapAlign: "start",
        background: isOver ? "#fbefe3" : "hsl(var(--background))",
        borderColor: isOver ? "var(--pv-clay)" : "var(--pv-line)",
      }}
    >
      {children}
    </div>
  );
}

function DraggableCard({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });
  const style: React.CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.5 : 1,
    cursor: "grab",
    zIndex: isDragging ? 10 : undefined,
    position: "relative",
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}
