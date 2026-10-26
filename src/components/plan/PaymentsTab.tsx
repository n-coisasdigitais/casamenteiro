import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CalendarClock } from "lucide-react";
import MarkAsPaidDialog from "./MarkAsPaidDialog";
import { PlanSupplier } from "./PlanKanban";

export type PaymentRow = {
  id: string;
  budget_item_id: string;
  description: string | null;
  amount: number;
  due_date: string | null;
  payment_date: string | null;
  status: string;
  // joined
  supplier_id?: string | null;
};

const fmt = (n: number) => `R$ ${n.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;

function dueState(p: PaymentRow): { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className: string } {
  if (p.status === "paid") return { label: "Pago", variant: "default", className: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" };
  if (!p.due_date) return { label: "A pagar", variant: "secondary", className: "" };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(p.due_date + "T00:00:00");
  const diff = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return { label: `Atrasado ${Math.abs(diff)}d`, variant: "destructive", className: "" };
  if (diff <= 7) return { label: `Vence em ${diff}d`, variant: "outline", className: "border-amber-500 text-amber-700" };
  return { label: "A pagar", variant: "secondary", className: "" };
}

export default function PaymentsTab({
  payments, items, onChange,
}: {
  payments: PaymentRow[];
  items: PlanSupplier[];
  onChange: () => void;
}) {
  const [paying, setPaying] = useState<PaymentRow | null>(null);
  const [open, setOpen] = useState(false);

  // mapa supplier -> categoria/nome via items + budget_items lookup
  // PaymentsTab recebe payments já enriquecidos com supplier_id (vindo de WeddingPlan)
  const supMap = useMemo(() => {
    const m = new Map<string, PlanSupplier>();
    for (const i of items) m.set(i.supplier_id, i);
    return m;
  }, [items]);

  const ordered = useMemo(
    () => [...payments].sort((a, b) => (a.due_date || "9999").localeCompare(b.due_date || "9999")),
    [payments]
  );

  const totalContratado = items.filter(i => i.kanban_status === "contratado").reduce((s, i) => s + i.valor_contratado, 0);
  const totalPago = payments.filter(p => p.status === "paid").reduce((s, p) => s + Number(p.amount || 0), 0);
  const emAberto = payments.filter(p => p.status !== "paid").reduce((s, p) => s + Number(p.amount || 0), 0);
  const proxPendente = ordered.find(p => p.status !== "paid" && p.due_date);
  const pctPago = totalContratado > 0 ? (totalPago / totalContratado) * 100 : 0;

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const atrasados = ordered.filter(p => p.status !== "paid" && p.due_date && new Date(p.due_date + "T00:00:00") < today);
  const vencendoLogo = ordered.filter(p => {
    if (p.status === "paid" || !p.due_date) return false;
    const d = new Date(p.due_date + "T00:00:00");
    const diff = (d.getTime() - today.getTime()) / 86400000;
    return diff >= 0 && diff <= 7;
  });
  const totalVencendo = vencendoLogo.reduce((s, p) => s + Number(p.amount || 0), 0);

  return (
    <div className="space-y-6">
      {atrasados.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {atrasados.length === 1
              ? `Pagamento atrasado: ${supMap.get(atrasados[0].supplier_id || "")?.company_name || "Fornecedor"} — ${fmt(Number(atrasados[0].amount))} venceu em ${new Date(atrasados[0].due_date! + "T00:00:00").toLocaleDateString("pt-BR")}.`
              : `Você tem ${atrasados.length} pagamentos atrasados, totalizando ${fmt(atrasados.reduce((s, p) => s + Number(p.amount), 0))}.`}
          </AlertDescription>
        </Alert>
      )}
      {vencendoLogo.length > 0 && (
        <Alert className="border-amber-500/50 bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          <CalendarClock className="h-4 w-4" />
          <AlertDescription>
            Atenção: você tem {fmt(totalVencendo)} vencendo nos próximos 7 dias.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase">Total contratado</p>
          <p className="text-2xl font-bold mt-1">{fmt(totalContratado)}</p>
          <Progress value={Math.min(pctPago, 100)} className="h-1.5 mt-2" />
          <p className="text-xs text-muted-foreground mt-1">{fmt(totalPago)} pagos ({pctPago.toFixed(0)}%)</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase">Próximo vencimento</p>
          {proxPendente ? (
            <>
              <p className="text-2xl font-bold mt-1 text-amber-600">{fmt(Number(proxPendente.amount))}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(proxPendente.due_date! + "T00:00:00").toLocaleDateString("pt-BR")} ·{" "}
                {supMap.get(proxPendente.supplier_id || "")?.company_name || "Fornecedor"}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground mt-2">Nenhum pendente</p>
          )}
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase">Em aberto</p>
          <p className="text-2xl font-bold mt-1">{fmt(emAberto)}</p>
        </Card>
      </div>

      {/* celular: cartões */}
      <div className="flex flex-col gap-2 md:hidden">
        {ordered.length === 0 && (
          <p className="rounded-2xl border border-dashed py-8 text-center text-sm" style={{ borderColor: "var(--ca-line-strong)", color: "var(--ca-body)" }}>
            Nenhum pagamento ainda. Contrate um fornecedor para registrar parcelas.
          </p>
        )}
        {ordered.map((p) => {
          const sup = supMap.get(p.supplier_id || "");
          const st = dueState(p);
          const atrasado = st.variant === "destructive";
          return (
            <div key={p.id} className="ca-card flex-row items-center gap-3" style={{ padding: "12px 14px", opacity: p.status === "paid" ? 0.65 : 1 }}>
              <span
                className="w-11 shrink-0 rounded-xl py-1.5 text-center"
                style={{ background: atrasado ? "var(--ca-rose-soft)" : "var(--ca-bg)", color: atrasado ? "var(--ca-err)" : undefined }}
              >
                <b className="ca-num block text-[17px] leading-none">{p.due_date ? new Date(p.due_date + "T00:00:00").getDate() : "—"}</b>
                <small className="text-[10.5px] font-bold uppercase" style={{ color: "var(--ca-muted)" }}>
                  {p.due_date ? new Date(p.due_date + "T00:00:00").toLocaleDateString("pt-BR", { month: "short" }).replace(".", "") : ""}
                </small>
              </span>
              <span className="min-w-0 flex-1 text-sm">
                <b className="block truncate">{sup?.company_name || "Fornecedor"}</b>
                <small className="block truncate text-[12.5px]" style={{ color: "var(--ca-muted)" }}>
                  {[sup?.category_name, p.description].filter(Boolean).join(" · ") || "parcela"}
                </small>
                <Badge variant={st.variant} className={`mt-1 ${st.className}`}>{st.label}</Badge>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1.5">
                <b className="ca-num whitespace-nowrap">{fmt(Number(p.amount))}</b>
                {p.status !== "paid" && (
                  <button type="button" className="ca-pill" onClick={() => { setPaying(p); setOpen(true); }}>
                    Marcar pago
                  </button>
                )}
              </span>
            </div>
          );
        })}
      </div>

      <Card className="hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr>
                <th className="text-left py-2 px-3 font-medium">Fornecedor</th>
                <th className="text-left py-2 px-3 font-medium">Categoria</th>
                <th className="text-left py-2 px-3 font-medium">Parcela</th>
                <th className="text-right py-2 px-3 font-medium">Valor</th>
                <th className="text-left py-2 px-3 font-medium">Vencimento</th>
                <th className="text-left py-2 px-3 font-medium">Status</th>
                <th className="text-right py-2 px-3 font-medium">Ação</th>
              </tr>
            </thead>
            <tbody>
              {ordered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum pagamento ainda. Contrate um fornecedor para registrar parcelas.</td></tr>
              ) : ordered.map((p) => {
                const sup = supMap.get(p.supplier_id || "");
                const st = dueState(p);
                return (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="py-2 px-3">{sup?.company_name || "—"}</td>
                    <td className="py-2 px-3 capitalize text-muted-foreground">{sup?.category_name || sup?.category_slug || "—"}</td>
                    <td className="py-2 px-3">{p.description || "—"}</td>
                    <td className="py-2 px-3 text-right font-medium">{fmt(Number(p.amount))}</td>
                    <td className="py-2 px-3">{p.due_date ? new Date(p.due_date + "T00:00:00").toLocaleDateString("pt-BR") : "—"}</td>
                    <td className="py-2 px-3"><Badge variant={st.variant} className={st.className}>{st.label}</Badge></td>
                    <td className="py-2 px-3 text-right">
                      {p.status !== "paid" && (
                        <Button size="sm" variant="outline" onClick={() => { setPaying(p); setOpen(true); }}>
                          Marcar como pago
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <MarkAsPaidDialog
        open={open}
        onOpenChange={setOpen}
        paymentId={paying?.id || null}
        defaultAmount={Number(paying?.amount || 0)}
        onSuccess={() => { setPaying(null); onChange(); }}
      />
    </div>
  );
}