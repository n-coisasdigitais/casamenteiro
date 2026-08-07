import { LayoutDashboard, MessageSquare, Store, Users, Star, Sparkles, Receipt, CalendarRange } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type SupplierDestination = "painel" | "orcamentos" | "negocio" | "reservas" | "vagas" | "avaliacoes";

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
  return items;
}

export default function SupplierSidebar({
  active,
  onChange,
  items,
}: {
  active: SupplierDestination;
  onChange: (d: SupplierDestination) => void;
  items: Item[];
}) {
  return (
    <aside className="hidden md:flex md:flex-col w-60 shrink-0 border-r border-border bg-card">
      <nav className="p-3 space-y-1 sticky top-16">
        {items.map((it) => {
          const Icon = it.icon;
          const isActive = active === it.key;
          return (
            <button
              key={it.key}
              onClick={() => onChange(it.key)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-left transition-colors",
                isActive ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-foreground",
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0", it.alert && "text-destructive")} />
              <span className="flex-1 truncate">{it.label}</span>
              {it.badge ? (
                <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                  {it.badge}
                </Badge>
              ) : it.alert ? (
                <span className="h-2 w-2 rounded-full bg-destructive" aria-label="Requer atenção" />
              ) : null}
            </button>
          );
        })}
        <Link
          to="/fornecedor/planos"
          className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-muted text-foreground"
        >
          <Sparkles className="h-4 w-4 shrink-0 text-primary" />
          <span className="flex-1 truncate">Planos e destaques</span>
        </Link>
        <Link
          to="/fornecedor/faturas"
          className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-muted text-foreground"
        >
          <Receipt className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="flex-1 truncate">Faturas e pagamentos</span>
        </Link>
      </nav>
    </aside>
  );
}
