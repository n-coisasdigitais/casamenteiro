import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";

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
};

const fmt = (n: number) => `R$ ${n.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;

export default function PlanHeader({ data, onRequestQuotes }: { data: PlanHeaderData; onRequestQuotes?: () => void }) {
  const { coupleName, weddingDate, city, guests, style, orcamentoTotal, cotado, contratado, aPagar, proxVencimento, hasUrgent } = data;

  return (
    <div className="space-y-4">
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