import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ExternalLink, MessageSquare, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import ConfirmFinishTaskDialog from "@/components/ConfirmFinishTaskDialog";
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
  { key: "enviado", label: "Enviado", color: "bg-muted" },
  { key: "respondido", label: "Respondido", color: "bg-blue-50 dark:bg-blue-950/30" },
  { key: "negociando", label: "Negociando", color: "bg-amber-50 dark:bg-amber-950/30" },
  { key: "fechado", label: "Fechado", color: "bg-green-50 dark:bg-green-950/30" },
  { key: "recusado", label: "Recusado", color: "bg-red-50 dark:bg-red-950/30" },
];

type QuoteRow = {
  id: string;
  kanban_status: KanbanStatus;
  message: string;
  event_date: string | null;
  guest_count: number | null;
  created_at: string;
  supplier_id: string;
  supplier?: { company_name: string; profile_photo_url: string | null };
  last_amount?: number | null;
};

export default function QuotesKanban({ coupleId }: { coupleId: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [allSuppliers, setAllSuppliers] = useState<{ id: string; company_name: string; category_id: string | null }[]>([]);
  const [supId, setSupId] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<KanbanStatus>("fechado");
  const [saving, setSaving] = useState(false);
  const [confirmTrigger, setConfirmTrigger] = useState(0);
  const [confirmCategory, setConfirmCategory] = useState<string | null>(null);
  const [confirmSupplierId, setConfirmSupplierId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data: qs } = await supabase
      .from("quotes")
      .select("id, kanban_status, message, event_date, guest_count, created_at, supplier_id")
      .eq("couple_id", coupleId)
      .order("created_at", { ascending: false });

    if (!qs) { setLoading(false); return; }

    const supplierIds = Array.from(new Set(qs.map((q: any) => q.supplier_id)));
    const { data: sups } = supplierIds.length
      ? await supabase.from("suppliers").select("id, company_name, profile_photo_url").in("id", supplierIds)
      : { data: [] as any[] };

    const { data: props } = qs.length
      ? await supabase.from("quote_proposals").select("quote_id, amount, created_at").in("quote_id", qs.map((q: any) => q.id)).order("created_at", { ascending: false })
      : { data: [] as any[] };

    const lastAmount: Record<string, number | null> = {};
    (props || []).forEach((p: any) => {
      if (lastAmount[p.quote_id] === undefined && p.amount != null) lastAmount[p.quote_id] = Number(p.amount);
    });

    const supMap = new Map((sups || []).map((s: any) => [s.id, s]));
    setQuotes(qs.map((q: any) => ({ ...q, supplier: supMap.get(q.supplier_id) as any, last_amount: lastAmount[q.id] ?? null })));
    setLoading(false);
  };

  useEffect(() => { if (coupleId) load(); }, [coupleId]);

  useEffect(() => {
    if (!addOpen || allSuppliers.length) return;
    supabase.from("suppliers").select("id, company_name, category_id").eq("status", "approved").order("company_name")
      .then(({ data }) => setAllSuppliers(data || []));
  }, [addOpen]);

  const addManual = async () => {
    if (!user || !coupleId || !supId) {
      toast({ title: "Selecione um fornecedor", variant: "destructive" });
      return;
    }
    setSaving(true);
    const sup = allSuppliers.find((s) => s.id === supId);
    const { data: q, error } = await (supabase.from("quotes") as any).insert({
      couple_id: coupleId,
      supplier_id: supId,
      user_id: user.id,
      message: "Contrato adicionado manualmente pelo casal.",
      kanban_status: status,
      status: status === "fechado" ? "accepted" : "pending",
    }).select("id").maybeSingle();
    if (error || !q) {
      toast({ title: "Erro", description: error?.message || "Falha ao criar", variant: "destructive" });
      setSaving(false);
      return;
    }
    if (amount) {
      await (supabase.from("quote_proposals") as any).insert({
        quote_id: q.id, sender_id: user.id, kind: "proposal",
        amount: Number(amount), status: status === "fechado" ? "accepted" : "pending",
      });
    }
    if (status === "fechado") {
      // garante couple_supplier contratado (trigger sync_budget cuida do orçamento)
      const { data: existing } = await supabase
        .from("couple_suppliers").select("id").eq("couple_id", coupleId).eq("supplier_id", supId).maybeSingle();
      const payload: any = {
        status: "contracted",
        category_id: sup?.category_id || null,
        final_value: amount ? Number(amount) : null,
        contract_value: amount ? Number(amount) : null,
        contracted_at: new Date().toISOString(),
      };
      if (existing) {
        await (supabase.from("couple_suppliers") as any).update(payload).eq("id", existing.id);
      } else {
        await (supabase.from("couple_suppliers") as any).insert({
          couple_id: coupleId, supplier_id: supId, ...payload,
        });
      }
      // pergunta para finalizar tarefa
      if (sup?.category_id) {
        const { data: cat } = await supabase.from("categories").select("name").eq("id", sup.category_id).maybeSingle();
        if (cat?.name) {
          setConfirmSupplierId(supId);
          setConfirmCategory(cat.name);
          setConfirmTrigger((n) => n + 1);
        }
      }
    }
    toast({ title: "Adicionado ao kanban" });
    setSupId(""); setAmount(""); setStatus("fechado"); setAddOpen(false);
    load();
    setSaving(false);
  };

  const moveQuote = async (id: string, status: KanbanStatus) => {
    setQuotes(prev => prev.map(q => q.id === id ? { ...q, kanban_status: status } : q));
    await supabase.from("quotes").update({ kanban_status: status }).eq("id", id);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );
  const onDragEnd = (e: DragEndEvent) => {
    const id = String(e.active.id);
    const target = e.over?.id ? String(e.over.id) : null;
    if (!target) return;
    const current = quotes.find((q) => q.id === id);
    if (!current || current.kanban_status === target) return;
    moveQuote(id, target as KanbanStatus);
  };

  if (loading) return <p className="text-sm text-muted-foreground">Carregando orçamentos...</p>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end gap-2">
        <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar contrato
        </Button>
      </div>
      {quotes.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-muted-foreground mb-3">Nenhum orçamento ainda. Envie pedidos pela plataforma ou registre contratos fechados por fora.</p>
          <div className="flex justify-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/buscar">Buscar fornecedores</Link>
            </Button>
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar contrato
            </Button>
          </div>
        </Card>
      ) : (
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="overflow-x-auto pb-2">
      <div className="grid grid-cols-5 gap-3 min-w-[900px]">
        {COLUMNS.map(col => {
          const items = quotes.filter(q => q.kanban_status === col.key);
          return (
            <DroppableColumn key={col.key} id={col.key} className={`rounded-lg ${col.color} p-3`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">{col.label}</h3>
                <Badge variant="secondary" className="h-5">{items.length}</Badge>
              </div>
              <div className="space-y-2">
                {items.map(q => (
                  <DraggableCard key={q.id} id={q.id}>
                  <Card className="p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      {q.supplier?.profile_photo_url && (
                        <img src={q.supplier.profile_photo_url} alt="" className="h-8 w-8 rounded object-cover" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{q.supplier?.company_name || "Fornecedor"}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(q.created_at).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    </div>
                    {q.last_amount != null && (
                      <p className="text-xs">
                        Proposta: <span className="font-semibold">R$ {q.last_amount.toLocaleString("pt-BR")}</span>
                      </p>
                    )}
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <Select value={q.kanban_status} onValueChange={(v) => moveQuote(q.id, v as KanbanStatus)}>
                        <SelectTrigger className="h-7 text-xs flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {COLUMNS.map(c => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Button asChild variant="ghost" size="icon" className="h-7 w-7" title="Abrir conversa">
                        <Link to="/meus-fornecedores"><MessageSquare className="h-3.5 w-3.5" /></Link>
                      </Button>
                      <Button asChild variant="ghost" size="icon" className="h-7 w-7" title="Ver fornecedor">
                        <Link to={`/fornecedor/${q.supplier_id}`} target="_blank"><ExternalLink className="h-3.5 w-3.5" /></Link>
                      </Button>
                    </div>
                  </Card>
                  </DraggableCard>
                ))}
              </div>
            </DroppableColumn>
          );
        })}
      </div>
      </div>
      </DndContext>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Adicionar contrato</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Use para registrar fornecedores fechados por fora da plataforma.</p>
            <div>
              <Label className="text-xs">Fornecedor</Label>
              <select value={supId} onChange={(e) => setSupId(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
                <option value="">Selecione...</option>
                {allSuppliers.map((s) => <option key={s.id} value={s.id}>{s.company_name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Valor (R$)</Label>
                <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as KanbanStatus)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COLUMNS.map(c => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancelar</Button>
              <Button onClick={addManual} disabled={saving || !supId}>Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <ConfirmFinishTaskDialog
        coupleId={coupleId}
        supplierId={confirmSupplierId}
        categoryName={confirmCategory}
        trigger={confirmTrigger}
      />
    </div>
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
    <div ref={setNodeRef} className={`${className || ""} ${isOver ? "ring-2 ring-primary" : ""}`}>
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
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}