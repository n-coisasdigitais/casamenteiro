import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Send, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

export type PlanHeaderData = {
  coupleName: string;
  weddingDate?: string | null;
  city?: string | null;
  guests?: number | null;
  style?: string | null;
  orcamentoTotal: number;
  cotado: number;
  contratado: number;
  aPagar: number;
  proxVencimento?: { data: string; fornecedor: string } | null;
  hasUrgent: boolean;
  newProposals?: { id: string; title: string; body: string | null; link: string | null }[];
};

const fmt = (n: number) => `R$ ${n.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;

export default function PlanHeader({
  data,
  onRequestQuotes,
  onOpenProposals,
}: {
  data: PlanHeaderData;
  onRequestQuotes?: () => void;
  onOpenProposals?: () => void;
}) {
  const { coupleName, weddingDate, city, guests, style, orcamentoTotal, cotado, contratado, aPagar, proxVencimento, hasUrgent, newProposals } = data;

  return (
    <div className="space-y-4">
      {newProposals && newProposals.length > 0 && (
        <Card className="p-4 border-amber-300 bg-amber-50 dark:bg-amber-950/30">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center shrink-0">
              <Bell className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-amber-900 dark:text-amber-100">
                {newProposals.length === 1
                  ? "Você recebeu uma nova proposta!"
                  : `Você recebeu ${newProposals.length} novas propostas!`}
              </p>
              <ul className="mt-1 space-y-0.5 text-xs text-amber-900/80 dark:text-amber-100/80">
                {newProposals.slice(0, 3).map((n) => (
                  <li key={n.id} className="truncate">• {n.title}{n.body ? ` — ${n.body}` : ""}</li>
                ))}
              </ul>
              {onOpenProposals ? (
                <Button size="sm" variant="outline" className="mt-2 h-7 text-xs border-amber-400 bg-white" onClick={onOpenProposals}>
                  Ver propostas
                </Button>
              ) : (
                <Button asChild size="sm" variant="outline" className="mt-2 h-7 text-xs border-amber-400 bg-white">
                  <Link to="/orcamento">Ver propostas</Link>
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-serif">
            {coupleName ? `Casamento ${coupleName}` : "Nosso casamento"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {weddingDate && new Date(weddingDate + "T00:00:00").toLocaleDateString("pt-BR")}
            {city && ` · ${city}`}
            {guests ? ` · ${guests} convidados` : ""}
            {style ? ` · ${style}` : ""}
          </p>
        </div>
        {onRequestQuotes && (
          <Button onClick={onRequestQuotes} size="sm">
            <Send className="h-3.5 w-3.5 mr-1" /> Solicitar orçamentos
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Orçamento do plano" value={fmt(orcamentoTotal)} />
        <MetricCard
          label="Cotado até agora"
          value={fmt(cotado)}
          accent={cotado > orcamentoTotal && orcamentoTotal > 0 ? "amber" : undefined}
        />
        <MetricCard label="Já contratado" value={fmt(contratado)} accent="green" />
        <MetricCard
          label="A pagar"
          value={fmt(aPagar)}
          accent={hasUrgent ? "danger" : undefined}
          subtext={proxVencimento ? `Próx: ${new Date(proxVencimento.data + "T00:00:00").toLocaleDateString("pt-BR")} · ${proxVencimento.fornecedor}` : undefined}
        />
      </div>
    </div>
  );
}

function MetricCard({ label, value, accent, subtext }: { label: string; value: string; accent?: "green" | "amber" | "danger"; subtext?: string }) {
  const color =
    accent === "green" ? "text-emerald-600" :
    accent === "amber" ? "text-amber-600" :
    accent === "danger" ? "text-destructive" : "";
  return (
    <Card className="p-4">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={cn("text-2xl font-bold mt-1", color)}>{value}</p>
      {subtext && <p className="text-xs text-muted-foreground mt-1 truncate">{subtext}</p>}
    </Card>
  );
}