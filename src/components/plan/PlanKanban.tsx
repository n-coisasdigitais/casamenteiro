import { traduzirErro } from "@/lib/errorMessages";
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
import NegotiateSupplierDialog, { NegotiateTarget } from "./NegotiateSupplierDialog";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Pencil, Maximize2 } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export type KanbanStatus = "nao_iniciado" | "em_orcamento" | "negociando" | "contratado" | "descartado" | "fora_da_plataforma";

export type PlanSupplier = {
  id: string; // couple_supplier id
  supplier_id: string | null;
  company_name: string;
  category_slug: string | null;
  category_name: string | null;
  valor_plano: number;
  valor_cotado: number;
  valor_contratado: number;
  kanban_status: KanbanStatus;
  is_external?: boolean;
  external_phone?: string | null;
};

const COLUMNS: { key: KanbanStatus; label: string; tone: string }[] = [
  { key: "nao_iniciado", label: "Não iniciado", tone: "bg-[var(--ca-side,#f4f1ec)]" },
  { key: "em_orcamento", label: "Em orçamento", tone: "bg-[var(--ca-side,#f4f1ec)]" },
  { key: "negociando", label: "Negociando", tone: "bg-[var(--ca-side,#f4f1ec)]" },
  { key: "contratado", label: "Contratado", tone: "bg-[var(--ca-side,#f4f1ec)]" },
  { key: "descartado", label: "Descartado", tone: "bg-[var(--ca-side,#f4f1ec)]" },
];

const COR_COLUNA: Record<string, string> = {
  nao_iniciado: "#b9ada1",
  em_orcamento: "#d9905a",
  negociando: "#5b7fa6",
  contratado: "#2f7a5b",
  descartado: "#c46a5e",
};

const fmt = (n: number) => `R$ ${n.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;

export default function PlanKanban({
  coupleId, items, onChange, supplierIdsWithNewProposal, onOpenQuoteForSupplier, onOpenCard,
}: {
  coupleId: string;
  items: PlanSupplier[];
  onChange: () => void;
  supplierIdsWithNewProposal?: Set<string>;
  onOpenQuoteForSupplier?: (supplierId: string) => void;
  onOpenCard?: (item: PlanSupplier) => void;
}) {
  const { toast } = useToast();
  const navigate = useNavigate();
  // celular: mostra uma etapa por vez, escolhida no topo
  const [colMobile, setColMobile] = useState<KanbanStatus | null>(null);
  const isMobile = useIsMobile();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [contractTarget, setContractTarget] = useState<ContractTarget | null>(null);
  const [contractOpen, setContractOpen] = useState(false);
  const [negotiateTarget, setNegotiateTarget] = useState<NegotiateTarget | null>(null);
  const [negotiateOpen, setNegotiateOpen] = useState(false);

  const grouped = useMemo(() => {
    const map: Record<KanbanStatus, PlanSupplier[]> = {
      nao_iniciado: [], em_orcamento: [], negociando: [], contratado: [], descartado: [], fora_da_plataforma: [],
    };
    for (const it of items) {
      const key = it.kanban_status === "fora_da_plataforma" ? "nao_iniciado" : it.kanban_status;
      map[key]?.push(it);
    }
    return map;
  }, [items]);

  const activeItem = items.find((i) => i.id === activeId);

  const updateStatus = async (item: PlanSupplier, newStatus: KanbanStatus) => {
    const { error } = await (supabase.from("couple_suppliers") as any)
      .update({ kanban_status: newStatus }).eq("id", item.id);
    if (error) {
      toast({ title: "Erro", description: traduzirErro(error), variant: "destructive" });
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
    if (newStatus === "negociando") {
      setNegotiateTarget({
        coupleSupplierId: item.id,
        supplierName: item.company_name,
        suggestedValue: item.valor_cotado || item.valor_plano || null,
      });
      setNegotiateOpen(true);
      return;
    }
    if (newStatus === "descartado") {
      const ok = window.confirm(
        `Descartar ${item.company_name}?\n\n` +
        `O fornecedor será avisado da desistência. ` +
        `Você poderá buscar substitutos depois.`
      );
      if (!ok) return;
      await updateStatus(item, newStatus);
      const goSearch = window.confirm("Quer buscar um substituto agora?");
      if (goSearch && item.category_slug) navigate(`/categoria/${item.category_slug}`);
      return;
    }
    await updateStatus(item, newStatus);
  };

  const openNegotiateEdit = (item: PlanSupplier) => {
    setNegotiateTarget({
      coupleSupplierId: item.id,
      supplierName: item.company_name,
      suggestedValue: item.valor_cotado || item.valor_plano || null,
    });
    setNegotiateOpen(true);
  };

  if (isMobile) {
    const colAtual: KanbanStatus =
      colMobile ??
      (["em_orcamento", "negociando", "nao_iniciado", "contratado"] as KanbanStatus[]).find((k) => grouped[k]?.length > 0) ??
      "nao_iniciado";
    return (
      <>
        <div className="ca-chips mb-3" role="group" aria-label="Etapa do funil">
          {COLUMNS.map((c) => (
            <button key={c.key} type="button" className="ca-chip" aria-pressed={colAtual === c.key} onClick={() => setColMobile(c.key)}>
              {c.label}
              <b className="ca-num">{grouped[c.key].length}</b>
            </button>
          ))}
        </div>
        <div className="space-y-4">
          {COLUMNS.filter((col) => col.key === colAtual).map((col) => {
            const colItems = grouped[col.key];
            if (colItems.length === 0)
              return (
                <p key={col.key} className="rounded-2xl border border-dashed py-8 text-center text-sm" style={{ borderColor: "var(--ca-line-strong)", color: "var(--ca-body)" }}>
                  Nenhum fornecedor em "{col.label}".
                </p>
              );
            return (
              <div key={col.key}>
                <div className="space-y-2.5">
                  {colItems.map((item) => (
                    <div key={item.id} className="space-y-2">
                      <KanbanCard
                        item={item}
                        onEditValue={item.kanban_status === "negociando" ? () => openNegotiateEdit(item) : undefined}
                        onOpen={onOpenCard ? () => onOpenCard(item) : undefined}
                      />
                      {item.supplier_id && supplierIdsWithNewProposal?.has(item.supplier_id) && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full h-7 text-xs border-amber-400 bg-amber-50 text-amber-900 hover:bg-amber-100"
                          onClick={() => onOpenQuoteForSupplier?.(item.supplier_id!)}
                        >
                          Nova proposta · ver
                        </Button>
                      )}
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
        <NegotiateSupplierDialog
          open={negotiateOpen}
          onOpenChange={setNegotiateOpen}
          target={negotiateTarget}
          onConfirmed={() => { setNegotiateTarget(null); onChange(); }}
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
          <div className="grid grid-cols-5 gap-3 min-w-[920px]">
            {COLUMNS.map((col) => (
              <Column
                key={col.key}
                col={col}
                items={grouped[col.key]}
                onEditValue={openNegotiateEdit}
                supplierIdsWithNewProposal={supplierIdsWithNewProposal}
                onOpenQuoteForSupplier={onOpenQuoteForSupplier}
                onOpenCard={onOpenCard}
              />
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
      <NegotiateSupplierDialog
        open={negotiateOpen}
        onOpenChange={setNegotiateOpen}
        target={negotiateTarget}
        onConfirmed={() => { setNegotiateTarget(null); onChange(); }}
      />
    </>
  );
}

function Column({ col, items, onEditValue, supplierIdsWithNewProposal, onOpenQuoteForSupplier, onOpenCard }: {
  col: { key: KanbanStatus; label: string; tone: string };
  items: PlanSupplier[];
  onEditValue: (item: PlanSupplier) => void;
  supplierIdsWithNewProposal?: Set<string>;
  onOpenQuoteForSupplier?: (supplierId: string) => void;
  onOpenCard?: (item: PlanSupplier) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.key });
  return (
    <div
      ref={setNodeRef}
      className={cn("rounded-2xl p-2.5 min-h-[220px] transition-colors", col.tone, isOver && "ring-2 ring-primary/60")}
    >
      <div className="mb-2.5 flex items-center justify-between px-1">
        <h3 className="m-0 flex items-center gap-2 text-[12px] font-bold uppercase" style={{ letterSpacing: ".06em", color: "var(--ca-body, #5e564e)" }}>
          <span className="h-2 w-2 rounded-full" style={{ background: COR_COLUNA[col.key] }} aria-hidden="true" />
          {col.label}
        </h3>
        <span className="text-xs font-semibold" style={{ color: "var(--ca-muted, #8a8178)" }}>{items.length}</span>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="space-y-1.5">
            <DraggableCard
              item={item}
              onEditValue={item.kanban_status === "negociando" ? () => onEditValue(item) : undefined}
              onOpen={onOpenCard ? () => onOpenCard(item) : undefined}
            />
            {item.supplier_id && supplierIdsWithNewProposal?.has(item.supplier_id) && (
              <Button
                size="sm"
                variant="outline"
                className="w-full h-7 text-xs border-amber-400 bg-amber-50 text-amber-900 hover:bg-amber-100"
                onClick={() => onOpenQuoteForSupplier?.(item.supplier_id!)}
              >
                Nova proposta · ver
              </Button>
            )}
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-6">Arraste cards para cá</p>
        )}
      </div>
    </div>
  );
}

function DraggableCard({ item, onEditValue, onOpen }: { item: PlanSupplier; onEditValue?: () => void; onOpen?: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: item.id });
  return (
    <div
      ref={setNodeRef}
      className={cn("touch-none", isDragging && "opacity-30")}
    >
      <div {...listeners} {...attributes}>
        <KanbanCard item={item} onEditValue={onEditValue} onOpen={onOpen} />
      </div>
    </div>
  );
}

function KanbanCard({ item, dragging, onEditValue, onOpen }: { item: PlanSupplier; dragging?: boolean; onEditValue?: () => void; onOpen?: () => void }) {
  return (
    <Card className={cn("rounded-[14px] p-3 space-y-1.5 cursor-grab active:cursor-grabbing", dragging && "shadow-xl rotate-1")}>
      <div className="flex items-start gap-1">
        <div className="min-w-0 flex-1">
          {item.category_name && (
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{item.category_name}</p>
          )}
          <p className="text-sm font-semibold leading-tight">{item.company_name}</p>
          {item.is_external && (
            <Badge variant="outline" className="mt-1 h-4 px-1.5 text-[10px] font-normal">Externo</Badge>
          )}
        </div>
        {onOpen && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            aria-label="Abrir detalhes"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onOpen(); }}
          >
            <Maximize2 className="h-3 w-3" />
          </Button>
        )}
      </div>
      <div className="text-xs space-y-0.5">
        <p className="text-muted-foreground">Plano: <span className="font-medium text-foreground">{fmt(item.valor_plano)}</span></p>
        {item.valor_cotado > 0 && (
          <p className="text-amber-600">Cotado: <span className="font-medium">{fmt(item.valor_cotado)}</span></p>
        )}
        {item.kanban_status === "contratado" && item.valor_contratado > 0 && (
          <p className="text-emerald-600">Fechado: <span className="font-medium">{fmt(item.valor_contratado)}</span></p>
        )}
      </div>
      {onEditValue && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs w-full justify-start"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onEditValue(); }}
        >
          <Pencil className="h-3 w-3 mr-1" /> {item.valor_cotado > 0 ? "Editar valor" : "Registrar valor"}
        </Button>
      )}
    </Card>
  );
}