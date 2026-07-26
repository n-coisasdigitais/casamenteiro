import { LayoutDashboard, MessageSquare, Store, Users, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { SupplierDestination } from "./SupplierSidebar";

type Item = { key: SupplierDestination; label: string; icon: any; badge?: number | null; alert?: boolean };

export default function SupplierMobileTabBar({
  active,
  onChange,
  quotesCount,
  overdueLeads,
  vagasEnabled,
}: {
  active: SupplierDestination;
  onChange: (d: SupplierDestination) => void;
  quotesCount: number;
  overdueLeads: number;
  vagasEnabled: boolean;
}) {
  const items: Item[] = [
    { key: "painel", label: "Painel", icon: LayoutDashboard, alert: overdueLeads > 0 },
    { key: "orcamentos", label: "Orçamentos", icon: MessageSquare, badge: quotesCount || null },
    { key: "negocio", label: "Negócio", icon: Store },
  ];
  if (vagasEnabled) items.push({ key: "vagas", label: "Vagas", icon: Users });
  else items.push({ key: "avaliacoes", label: "Avaliações", icon: Star });

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-card border-t border-border"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="grid grid-cols-4">
        {items.map((it) => {
          const Icon = it.icon;
          const isActive = active === it.key;
          return (
            <button
              key={it.key}
              onClick={() => onChange(it.key)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] relative",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <span className="relative">
                <Icon className={cn("h-5 w-5", it.alert && !isActive && "text-destructive")} />
                {it.badge ? (
                  <Badge className="absolute -top-1.5 -right-2 h-4 min-w-4 px-1 text-[10px]">{it.badge}</Badge>
                ) : it.alert ? (
                  <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-destructive" />
                ) : null}
              </span>
              <span className="truncate max-w-full">{it.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}