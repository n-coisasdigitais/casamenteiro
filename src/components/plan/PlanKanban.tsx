import { useMemo, useState } from "react";
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useDroppable, useSensor, useSensors,
} from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ContractSupplierDialog, { ContractTarget } from "./ContractSupplierDialog";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export type KanbanStatus = "nao_iniciado" | "em_orcamento" | "negociando" | "contratado" | "descartado";

export type PlanSupplier = {
  id: string; // couple_supplier id
  supplier_id: string;
  company_name: string;
  category_slug: string | null;
  category_name: string | null;
  valor_plano: number;
  valor_cotado: number;
  valor_contratado: number;
  kanban_status: KanbanStatus;
};

const COLUMNS: { key: KanbanStatus; label: string; tone: string }[] = [
  { key: "nao_iniciado", label: "Não iniciado", tone: "bg-muted/50" },
  { key: "em_orcamento", label: "Em orçamento", tone: "bg-amber-50 dark:bg-amber-950/30" },
  { key: "negociando", label: "Negociando", tone: "bg-blue-50 dark:bg-blue-950/30" },
  { key: "contratado", label: "Contratado", tone: "bg-emerald-50 dark:bg-emerald-950/30" },
  { key: "descartado", label: "Descartado", tone: "bg-rose-50 dark:bg-rose-950/30" },
];

const fmt = (n: number) => `R$ ${n.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;

export default function PlanKanban({
  coupleId, items, onChange,
}: {
  coupleId: string;
  items: PlanSupplier[];
  onChange: () => void;
}) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [contractTarget, setContractTarget] = useState<ContractTarget | null>(null);
  const [contractOpen, setContractOpen] = useState(false);

  const grouped = useMemo(() => {
    const map: Record<KanbanStatus, PlanSupplier[]> = {
      nao_iniciado: [], em_orcamento: [], negociando: [], contratado: [], descartado: [],
    };
    for (const it of items) map[it.kanban_status]?.push(it);
    return map;
  }, [items]);

  const activeItem = items.find((i) => i.id === activeId);

  const updateStatus = async (item: PlanSupplier, newStatus: KanbanStatus) => {
    const { error } = await (supabase.from("couple_suppliers") as any)
      .update({ kanban_status: newStatus }).eq("id", item.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    if (newStatus === "contratado") {
      // verifica se trigger marcou tarefa
      const slug = item.category_slug;
      if (slug) {
        const { data: t } = await (supabase as any)
          .from("wedding_tasks").select("title")
          .eq("couple_id", coupleId)
          .eq("auto_completed_source", "kanban_contracted")
          .ilike("category", `${slug}%`)
          .order("auto_completed_at", { ascending: false })
          .limit(1).maybeSingle();
        if (t?.title) toast({ title: "Tarefa concluída", description: `✓ '${t.title}' marcada como concluída automaticamente.` });
      }
    }
    onChange();
  };

  const handleDragEnd = async (e: DragEndEvent) => {
    setActiveId(null);
    const id = String(e.active.id);
    const over = e.over?.id ? String(e.over.id) : null;
    if (!over) return;
    const item = items.find((i) => i.id === id);
    if (!item) return;
    const newStatus = over as KanbanStatus;
    if (newStatus === item.kanban_status) return;
    await requestStatusChange(item, newStatus);
  };

  const requestStatusChange = async (item: PlanSupplier, newStatus: KanbanStatus) => {
    if (newStatus === item.kanban_status) return;
    if (newStatus === "contratado") {
      setContractTarget({
        coupleSupplierId: item.id,
        supplierId: item.supplier_id,
        supplierName: item.company_name,
        coupleId,
        suggestedValue: item.valor_cotado || item.valor_plano || null,
      });
      setContractOpen(true);
      return;
    }
    if (newStatus === "descartado") {
      const ok = window.confirm(`Descartar ${item.company_name}? Você poderá buscar substitutos depois.`);
      if (!ok) return;
      await updateStatus(item, newStatus);
      const goSearch = window.confirm("Quer buscar um substituto agora?");
      if (goSearch && item.category_slug) navigate(`/buscar?categoria=${item.category_slug}`);
      return;
    }
    await updateStatus(item, newStatus);
  };

  if (isMobile) {
    return (
      <>
        <div className="space-y-4">
          {COLUMNS.map((col) => {
            const colItems = grouped[col.key];
            if (colItems.length === 0) return null;
            return (
              <div key={col.key} className={cn("rounded-lg p-3", col.tone)}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold">{col.label}</h3>
                  <Badge variant="secondary" className="h-5">{colItems.length}</Badge>
                </div>
                <div className="space-y-2">
                  {colItems.map((item) => (
                    <div key={item.id} className="space-y-2">
                      <KanbanCard item={item} />
                      <Select
                        value={item.kanban_status}
                        onValueChange={(v) => requestStatusChange(item, v as KanbanStatus)}
                      >
                        <SelectTrigger className="h-8 text-xs bg-background">
                          <SelectValue placeholder="Mover para..." />
                        </SelectTrigger>
                        <SelectContent>
                          {COLUMNS.map((c) => (
                            <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {items.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum fornecedor no plano ainda.
            </p>
          )}
        </div>
        <ContractSupplierDialog
          open={contractOpen}
          onOpenChange={setContractOpen}
          target={contractTarget}
          onConfirmed={() => { setContractTarget(null); onChange(); }}
        />
      </>
    );
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        onDragStart={(e: DragStartEvent) => setActiveId(String(e.active.id))}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="overflow-x-auto pb-2 -mx-4 px-4">
          <div className="grid grid-cols-5 gap-3 min-w-[900px]">
            {COLUMNS.map((col) => (
              <Column key={col.key} col={col} items={grouped[col.key]} />
            ))}
          </div>
        </div>
        <DragOverlay>
          {activeItem ? <KanbanCard item={activeItem} dragging /> : null}
        </DragOverlay>
      </DndContext>

      <ContractSupplierDialog
        open={contractOpen}
        onOpenChange={setContractOpen}
        target={contractTarget}
        onConfirmed={() => { setContractTarget(null); onChange(); }}
      />
    </>
  );
}

function Column({ col, items }: { col: { key: KanbanStatus; label: string; tone: string }; items: PlanSupplier[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: col.key });
  return (
    <div
      ref={setNodeRef}
      className={cn("rounded-lg p-3 min-h-[200px] transition-colors", col.tone, isOver && "ring-2 ring-primary/60")}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">{col.label}</h3>
        <Badge variant="secondary" className="h-5">{items.length}</Badge>
      </div>
      <div className="space-y-2">
        {items.map((item) => <DraggableCard key={item.id} item={item} />)}
        {items.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-6">Arraste cards para cá</p>
        )}
      </div>
    </div>
  );
}

function DraggableCard({ item }: { item: PlanSupplier }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: item.id });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn("touch-none", isDragging && "opacity-30")}
    >
      <KanbanCard item={item} />
    </div>
  );
}

function KanbanCard({ item, dragging }: { item: PlanSupplier; dragging?: boolean }) {
  return (
    <Card className={cn("p-3 space-y-1.5 cursor-grab active:cursor-grabbing", dragging && "shadow-xl rotate-1")}>
      {item.category_name && (
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{item.category_name}</p>
      )}
      <p className="text-sm font-semibold leading-tight">{item.company_name}</p>
      <div className="text-xs space-y-0.5">
        <p className="text-muted-foreground">Plano: <span className="font-medium text-foreground">{fmt(item.valor_plano)}</span></p>
        {item.valor_cotado > 0 && (
          <p className="text-amber-600">Cotado: <span className="font-medium">{fmt(item.valor_cotado)}</span></p>
        )}
        {item.kanban_status === "contratado" && item.valor_contratado > 0 && (
          <p className="text-emerald-600">Fechado: <span className="font-medium">{fmt(item.valor_contratado)}</span></p>
        )}
      </div>
    </Card>
  );
}