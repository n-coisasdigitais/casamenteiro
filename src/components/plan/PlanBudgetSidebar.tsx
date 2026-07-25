import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlanSupplier } from "./PlanKanban";

const fmt = (n: number) => `R$ ${(n || 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;

type CategoryRow = {
  slug: string;
  name: string;
  planned: number;
  quoted: number;
  contracted: number;
  items: PlanSupplier[];
};

export default function PlanBudgetSidebar({
  coupleId, items, planoTotal, collapsed, onToggle, className,
}: {
  coupleId: string;
  items: PlanSupplier[];
  planoTotal: number;
  collapsed?: boolean;
  onToggle?: () => void;
  className?: string;
}) {
  const [budgetRows, setBudgetRows] = useState<Record<string, { name: string; estimated: number }>>({});
  const [openCats, setOpenCats] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!coupleId) return;
    (async () => {
      const [{ data: bi }, { data: cats }] = await Promise.all([
        supabase.from("budget_items").select("category, estimated_cost").eq("couple_id", coupleId),
        supabase.from("categories").select("slug, name"),
      ]);
      const nameMap = new Map((cats || []).map((c: any) => [c.slug, c.name]));
      const map: Record<string, { name: string; estimated: number }> = {};
      for (const r of bi || []) {
        const slug = (r as any).category || "outros";
        const prev = map[slug] || { name: nameMap.get(slug) || slug, estimated: 0 };
        prev.estimated += Number((r as any).estimated_cost || 0);
        map[slug] = prev;
      }
      setBudgetRows(map);
    })();
  }, [coupleId, items]);

  const rows = useMemo<CategoryRow[]>(() => {
    const bySlug = new Map<string, CategoryRow>();
    // seed from budget_items
    for (const slug of Object.keys(budgetRows)) {
      bySlug.set(slug, {
        slug,
        name: budgetRows[slug].name,
        planned: budgetRows[slug].estimated,
        quoted: 0,
        contracted: 0,
        items: [],
      });
    }
    for (const it of items) {
      const slug = it.category_slug || "outros";
      const cur = bySlug.get(slug) || {
        slug,
        name: it.category_name || slug,
        planned: 0,
        quoted: 0,
        contracted: 0,
        items: [],
      };
      if (it.kanban_status === "contratado") cur.contracted += it.valor_contratado || 0;
      else if (["em_orcamento", "negociando"].includes(it.kanban_status)) cur.quoted += it.valor_cotado || it.valor_plano || 0;
      cur.items.push(it);
      bySlug.set(slug, cur);
    }
    return Array.from(bySlug.values()).sort((a, b) => b.planned - a.planned);
  }, [budgetRows, items]);

  const totalPlanejado = planoTotal || rows.reduce((s, r) => s + r.planned, 0);
  const totalCotado = rows.reduce((s, r) => s + r.quoted, 0);
  const totalContratado = rows.reduce((s, r) => s + r.contracted, 0);
  const saldo = totalPlanejado - totalContratado - totalCotado;

  const toggle = (slug: string) => {
    setOpenCats((prev) => {
      const n = new Set(prev);
      if (n.has(slug)) n.delete(slug); else n.add(slug);
      return n;
    });
  };

  if (collapsed) {
    return (
      <div className={cn("flex justify-end", className)}>
        <Button variant="outline" size="sm" onClick={onToggle}>
          <PanelLeftOpen className="h-4 w-4 mr-2" /> Mostrar plano
        </Button>
      </div>
    );
  }

  return (
    <Card className={cn("p-4 space-y-3", className)}>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Extrato do plano</h3>
        {onToggle && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggle} aria-label="Ocultar plano">
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="space-y-1 text-xs border-b border-border pb-3">
        <SummaryRow label="Plano" value={fmt(totalPlanejado)} bold />
        <SummaryRow label="Cotado" value={fmt(totalCotado)} tone="amber" />
        <SummaryRow label="Contratado" value={fmt(totalContratado)} tone="emerald" />
        <SummaryRow label="Saldo" value={fmt(saldo)} tone={saldo < 0 ? "rose" : "muted"} bold />
      </div>
      <div className="space-y-1 max-h-[420px] overflow-y-auto pr-1">
        {rows.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">Sem categorias no plano ainda.</p>
        )}
        {rows.map((r) => {
          const open = openCats.has(r.slug);
          const consumed = r.contracted + r.quoted;
          const over = r.planned > 0 && consumed > r.planned;
          return (
            <Collapsible key={r.slug} open={open} onOpenChange={() => toggle(r.slug)}>
              <CollapsibleTrigger className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 transition-colors text-left">
                {open ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                <span className="text-xs capitalize truncate flex-1">{r.name}</span>
                <span className={cn("text-xs font-medium tabular-nums", over && "text-destructive")}>{fmt(r.planned)}</span>
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-6 pr-2 pb-2 pt-1 space-y-1">
                {r.items.length === 0 && (
                  <p className="text-[11px] text-muted-foreground">Nenhum fornecedor vinculado.</p>
                )}
                {r.items.map((it) => (
                  <div key={it.id} className="flex items-center gap-2 text-[11px]">
                    <span className="truncate flex-1">{it.company_name}</span>
                    <Badge variant="outline" className="text-[9px] px-1 h-4 capitalize">
                      {it.kanban_status.replace("_", " ")}
                    </Badge>
                    <span className="tabular-nums text-muted-foreground">
                      {fmt(it.valor_contratado || it.valor_cotado || it.valor_plano)}
                    </span>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
    </Card>
  );
}

function SummaryRow({
  label, value, bold, tone,
}: { label: string; value: string; bold?: boolean; tone?: "amber" | "emerald" | "rose" | "muted" }) {
  const cls =
    tone === "amber" ? "text-amber-600" :
    tone === "emerald" ? "text-emerald-600" :
    tone === "rose" ? "text-destructive" :
    tone === "muted" ? "text-muted-foreground" : "";
  return (
    <div className="flex items-center justify-between">
      <span className={cn("text-muted-foreground", bold && "font-medium text-foreground")}>{label}</span>
      <span className={cn("tabular-nums", cls, bold && "font-semibold")}>{value}</span>
    </div>
  );
}