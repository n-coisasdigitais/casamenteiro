import { LayoutDashboard, MessageSquare, Store, Users, Star, Sparkles, Receipt, CalendarRange, LifeBuoy } from "lucide-react";
import { Link } from "react-router-dom";

export type SupplierDestination = "painel" | "orcamentos" | "negocio" | "reservas" | "vagas" | "avaliacoes" | "ajuda";

type Item = {
  key: SupplierDestination;
  label: string;
  icon: any;
  badge?: number | null;
  alert?: boolean;
};

export function getSupplierDestinations(opts: {
  quotesCount: number;
  overdueLeads: number;
  vagasEnabled: boolean;
  reservasEnabled?: boolean;
  reservasPendentes?: number;
}): Item[] {
  const items: Item[] = [
    { key: "painel", label: "Painel", icon: LayoutDashboard, alert: opts.overdueLeads > 0 },
    { key: "orcamentos", label: "Orçamentos", icon: MessageSquare, badge: opts.quotesCount || null },
    { key: "negocio", label: "Meu negócio", icon: Store },
  ];
  if (opts.reservasEnabled)
    items.push({ key: "reservas", label: "Reservas", icon: CalendarRange, badge: opts.reservasPendentes || null });
  if (opts.vagasEnabled) items.push({ key: "vagas", label: "Equipe e vagas", icon: Users });
  items.push({ key: "avaliacoes", label: "Avaliações", icon: Star });
  items.push({ key: "ajuda", label: "Ajuda", icon: LifeBuoy });
  return items;
}

/** Menu lateral do painel do fornecedor (desktop). */
export default function SupplierSidebar({
  active,
  onChange,
  items,
  cabecalho,
  rodape,
}: {
  active: SupplierDestination;
  onChange: (d: SupplierDestination) => void;
  items: Item[];
  /** bloco com o nome e a categoria do negócio */
  cabecalho?: React.ReactNode;
  /** bloco do plano / período de teste */
  rodape?: React.ReactNode;
}) {
  const linkCls =
    "flex h-[42px] w-full items-center gap-3 rounded-[11px] px-3 text-left text-[15px] font-medium transition-colors hover:bg-white/60";
  return (
    <div className="hidden w-[248px] shrink-0 self-stretch border-r md:block" style={{ background: "var(--pv-side)", borderColor: "var(--pv-line)" }}>
    <aside
      className="sticky top-16 flex h-[calc(100dvh-4rem)] flex-col gap-1.5 overflow-y-auto px-3 pb-4 pt-4"
      aria-label="Menu do fornecedor"
    >
      {cabecalho}
      <nav className="flex flex-col gap-0.5" aria-label="Seções">
        {items.map((it) => {
          const Icon = it.icon;
          const isActive = active === it.key;
          return (
            <button
              key={it.key}
              type="button"
              onClick={() => onChange(it.key)}
              aria-current={isActive ? "page" : undefined}
              className={`pv-nav-btn ${linkCls}`}
              style={
                isActive
                  ? { background: "#fff", color: "var(--pv-ink)", fontWeight: 650, boxShadow: "0 0 0 1px var(--pv-line)" }
                  : { color: "var(--pv-body)" }
              }
            >
              <Icon className="h-[19px] w-[19px] shrink-0" strokeWidth={1.8} aria-hidden="true" />
              <span className="flex-1 truncate">{it.label}</span>
              {it.badge ? (
                <span className="pv-num grid h-5 min-w-[22px] place-items-center rounded-full px-1.5 text-xs font-bold text-white" style={{ background: "var(--pv-clay)" }}>
                  {it.badge}
                </span>
              ) : it.alert ? (
                <span className="h-2 w-2 rounded-full" style={{ background: "var(--pv-terracota)" }} aria-label="Requer atenção" />
              ) : null}
            </button>
          );
        })}
        <div className="my-2 h-px" style={{ background: "var(--pv-line)" }} />
        <Link to="/fornecedor/planos" className={linkCls} style={{ color: "var(--pv-body)" }}>
          <Sparkles className="h-[19px] w-[19px] shrink-0" strokeWidth={1.8} style={{ color: "var(--pv-clay)" }} aria-hidden="true" />
          <span className="flex-1 truncate">Planos e destaques</span>
        </Link>
        <Link to="/fornecedor/faturas" className={linkCls} style={{ color: "var(--pv-body)" }}>
          <Receipt className="h-[19px] w-[19px] shrink-0" strokeWidth={1.8} aria-hidden="true" />
          <span className="flex-1 truncate">Faturas e pagamentos</span>
        </Link>
      </nav>
      <div className="flex-1" />
      {rodape}
    </aside>
    </div>
  );
}
