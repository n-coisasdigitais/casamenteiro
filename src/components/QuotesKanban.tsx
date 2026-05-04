import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ExternalLink, MessageSquare } from "lucide-react";
import { Link } from "react-router-dom";

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
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [loading, setLoading] = useState(true);

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

  const moveQuote = async (id: string, status: KanbanStatus) => {
    setQuotes(prev => prev.map(q => q.id === id ? { ...q, kanban_status: status } : q));
    await supabase.from("quotes").update({ kanban_status: status }).eq("id", id);
  };

  if (loading) return <p className="text-sm text-muted-foreground">Carregando orçamentos...</p>;

  if (quotes.length === 0) {
    return (
      <Card className="p-6 text-center">
        <p className="text-muted-foreground mb-3">Você ainda não enviou pedidos de orçamento.</p>
        <Button asChild variant="outline" size="sm">
          <Link to="/buscar">Buscar fornecedores</Link>
        </Button>
      </Card>
    );
  }

  return (
    <div className="overflow-x-auto pb-2">
      <div className="grid grid-cols-5 gap-3 min-w-[900px]">
        {COLUMNS.map(col => {
          const items = quotes.filter(q => q.kanban_status === col.key);
          return (
            <div key={col.key} className={`rounded-lg ${col.color} p-3`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">{col.label}</h3>
                <Badge variant="secondary" className="h-5">{items.length}</Badge>
              </div>
              <div className="space-y-2">
                {items.map(q => (
                  <Card key={q.id} className="p-3 space-y-2">
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
                    <div className="flex items-center gap-1">
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
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}