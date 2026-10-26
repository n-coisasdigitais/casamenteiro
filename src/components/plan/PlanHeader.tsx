import { Button } from "@/components/ui/button";
import { Send, Bell } from "lucide-react";
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

  const linhaPlano = [
    city,
    guests ? `${guests} convidados` : null,
    style,
    weddingDate ? new Date(weddingDate + "T00:00:00").toLocaleDateString("pt-BR") : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0" style={{ flex: "1 1 220px" }}>
          <h1 className="ca-titulo">Orçamento</h1>
          <p className="ca-sub">{linhaPlano ? `Plano: ${linhaPlano}` : coupleName ? `Casamento ${coupleName}` : "Nosso casamento"}</p>
        </div>
        {onRequestQuotes && (
          <Button onClick={onRequestQuotes} className="h-11 rounded-full">
            <Send className="mr-1 h-3.5 w-3.5" /> Solicitar orçamentos
          </Button>
        )}
      </div>

      {newProposals && newProposals.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3" style={{ background: "var(--ca-amber-soft, #fbefd9)" }}>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white" style={{ color: "var(--ca-warn, #a86a12)" }}>
            <Bell className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="m-0 text-sm font-bold">
              {newProposals.length === 1 ? "Vocês receberam uma nova proposta" : `Vocês receberam ${newProposals.length} novas propostas`}
            </p>
            <p className="m-0 truncate text-[13px]" style={{ color: "var(--ca-body, #5e564e)" }}>
              {newProposals
                .slice(0, 2)
                .map((n) => n.title)
                .join(" · ")}
            </p>
          </div>
          {onOpenProposals ? (
            <button type="button" className="ca-pill pri" onClick={onOpenProposals}>
              Ver proposta
            </button>
          ) : (
            <Link to="/orcamento" className="ca-pill pri">
              Ver proposta
            </Link>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <MetricCard label="Plano" value={fmt(orcamentoTotal)} />
        <MetricCard label="Contratado" value={fmt(contratado)} accent="green" />
        <MetricCard
          label="Cotado"
          value={fmt(cotado)}
          accent="amber"
          subtext={cotado > orcamentoTotal && orcamentoTotal > 0 ? "acima do plano" : undefined}
        />
        <MetricCard
          label="A pagar"
          value={fmt(aPagar)}
          accent={hasUrgent ? "danger" : undefined}
          subtext={proxVencimento ? `próx. ${new Date(proxVencimento.data + "T00:00:00").toLocaleDateString("pt-BR", { day: "numeric", month: "short" }).replace(".", "")} · ${proxVencimento.fornecedor}` : undefined}
        />
      </div>
    </div>
  );
}

function MetricCard({ label, value, accent, subtext }: { label: string; value: string; accent?: "green" | "amber" | "danger"; subtext?: string }) {
  const color =
    accent === "green" ? "var(--ca-ok, #2f7a5b)" : accent === "amber" ? "var(--ca-warn, #a86a12)" : accent === "danger" ? "var(--ca-err, #b4412d)" : "var(--ca-ink, #1f1d1b)";
  return (
    <div className="ca-card" style={{ padding: "12px 14px", gap: 2 }}>
      <p className="m-0 text-[12.5px] font-semibold" style={{ color: "var(--ca-muted, #8a8178)" }}>
        {label}
      </p>
      <p className="ca-num m-0 text-[20px] font-extrabold" style={{ letterSpacing: "-0.03em", color }}>
        {value}
      </p>
      {subtext && (
        <p className="m-0 truncate text-xs" style={{ color: "var(--ca-body, #5e564e)" }}>
          {subtext}
        </p>
      )}
    </div>
  );
}
