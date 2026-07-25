import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlanSupplier } from "./PlanKanban";

const fmt = (n: number) => `R$ ${n.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;

export default function BudgetTab({
  items, planoTotal, quotes,
  quoteIdsWithNewProposal, onOpenQuote,
}: {
  coupleId?: string;
  items: PlanSupplier[];
  planoTotal: number;
  onChange?: () => void;
  contextoMensagem?: { nomeCasal: string; data: string; cidade: string; convidados: number };
  quotes?: any[];
  quoteIdsWithNewProposal?: Set<string>;
  onOpenQuote?: (quoteId: string) => void;
}) {
  // Comparativo por categoria
  const porCategoria = useMemo(() => {
    const map = new Map<string, { name: string; plano: number; real: number; status: string }>();
    for (const it of items) {
      const key = it.category_slug || "outros";
      const real = it.kanban_status === "contratado" ? it.valor_contratado : it.valor_cotado;
      const cur = map.get(key) || { name: it.category_name || key, plano: 0, real: 0, status: it.kanban_status };
      cur.plano += it.valor_plano || 0;
      cur.real += real || 0;
      // status mais avançado vence
      const ordem = ["nao_iniciado", "em_orcamento", "negociando", "descartado", "contratado"];
      if (ordem.indexOf(it.kanban_status) > ordem.indexOf(cur.status)) cur.status = it.kanban_status;
      map.set(key, cur);
    }
    return Array.from(map.values());
  }, [items]);

  const projecao = useMemo(() => {
    const contratado = items.filter((i) => i.kanban_status === "contratado")
      .reduce((s, i) => s + (i.valor_contratado || 0), 0);
    const cotado = items.filter((i) => ["em_orcamento", "negociando"].includes(i.kanban_status))
      .reduce((s, i) => s + (i.valor_cotado || i.valor_plano || 0), 0);
    const naoIniciado = items.filter((i) => i.kanban_status === "nao_iniciado")
      .reduce((s, i) => s + (i.valor_plano || 0), 0);
    return { contratado, cotado, naoIniciado, total: contratado + cotado + naoIniciado };
  }, [items]);

  return (
    <div className="space-y-6">
      {/* Orçamentos solicitados (status inicial) */}
      {quotes && quotes.length > 0 && (
        <Card className="p-5">
          <h3 className="font-semibold mb-3">Orçamentos solicitados</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Pedidos enviados aos fornecedores. Clique para ver as propostas e negociar.
          </p>
          <div className="space-y-1.5">
            {quotes.map((q: any) => {
              const noPlano = items.some((i) => i.supplier_id === q.supplier_id);
              const novo = quoteIdsWithNewProposal?.has(q.id);
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => onOpenQuote?.(q.id)}
                  className="w-full text-left flex items-center gap-3 py-2 border-b border-border/60 last:border-0 hover:bg-muted/40 rounded px-2 -mx-2 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{q.suppliers?.company_name || "Fornecedor"}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {q.suppliers?.categories?.name || "—"} · {new Date(q.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  {novo && (
                    <Badge className="text-[10px] bg-amber-500 hover:bg-amber-500 text-white">Nova proposta</Badge>
                  )}
                  <Badge variant={noPlano ? "default" : "secondary"} className="text-[10px]">
                    {noPlano ? "no plano" : "em orçamento"}
                  </Badge>
                </button>
              );
            })}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="font-semibold mb-4">Plano vs realidade por categoria</h3>
          {porCategoria.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma categoria no plano ainda.</p>
          ) : (
            <div className="space-y-3">
              {porCategoria.map((c) => {
                const dot =
                  c.status === "contratado" ? "bg-emerald-500" :
                  c.status === "negociando" ? "bg-blue-500" :
                  c.status === "em_orcamento" ? "bg-amber-500" :
                  c.status === "descartado" ? "bg-rose-500" : "bg-muted-foreground/40";
                const dif = c.real - c.plano;
                return (
                  <div key={c.name} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
                      <span className="text-sm truncate capitalize">{c.name}</span>
                    </div>
                    <div className="text-right text-sm">
                      {c.real > 0 ? (
                        <>
                          <span className="font-medium">{fmt(c.real)}</span>
                          {dif !== 0 && (
                            <span className={`ml-2 text-xs ${dif > 0 ? "text-destructive" : "text-emerald-600"}`}>
                              {dif > 0 ? "+" : ""}{fmt(dif)}
                            </span>
                          )}
                        </>
                      ) : <span className="text-muted-foreground">—</span>}
                      <p className="text-[11px] text-muted-foreground">plano: {fmt(c.plano)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold mb-4">Projeção total</h3>
          <div className="space-y-2 text-sm">
            <Row label="Plano original" value={fmt(planoTotal)} />
            <Row label="Contratado" value={fmt(projecao.contratado)} className="text-emerald-600" />
            <Row label="Cotado / negociando" value={fmt(projecao.cotado)} className="text-amber-600" />
            <Row label="Não iniciado" value={fmt(projecao.naoIniciado)} className="text-muted-foreground" />
            <div className="border-t border-border pt-2 mt-2">
              <Row
                label={<span className="font-semibold">Projeção total</span>}
                value={
                  <span className={projecao.total > planoTotal && planoTotal > 0 ? "text-destructive font-bold" : "text-emerald-600 font-bold"}>
                    {fmt(projecao.total)}
                    {planoTotal > 0 && (
                      <span className="ml-2 text-xs font-normal">
                        ({projecao.total > planoTotal ? "+" : ""}{fmt(projecao.total - planoTotal)})
                      </span>
                    )}
                  </span>
                }
              />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value, className }: { label: React.ReactNode; value: React.ReactNode; className?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={className}>{value}</span>
    </div>
  );
}