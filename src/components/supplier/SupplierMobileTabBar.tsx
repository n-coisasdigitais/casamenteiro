import { LayoutDashboard, MessageSquare, Store, Users, Star, LifeBuoy } from "lucide-react";
import type { SupplierDestination } from "./SupplierSidebar";

type Item = { key: SupplierDestination; label: string; icon: any; badge?: number | null; alert?: boolean };

/** Barra inferior do painel no celular (mesmos destinos do menu lateral). */
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
  items.push({ key: "ajuda", label: "Ajuda", icon: LifeBuoy });

  return (
    <nav
      aria-label="Seções"
      className="fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur md:hidden"
      style={{
        background: "rgba(255,255,255,.94)",
        borderColor: "var(--pv-line)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="grid grid-cols-5 px-1">
        {items.map((it) => {
          const Icon = it.icon;
          const isActive = active === it.key;
          return (
            <button
              key={it.key}
              type="button"
              onClick={() => onChange(it.key)}
              aria-current={isActive ? "page" : undefined}
              className="relative flex h-[58px] flex-col items-center justify-center gap-1 text-[11px] font-semibold"
              style={{ color: isActive ? "var(--pv-clay)" : "var(--pv-muted)" }}
            >
              <span className="relative">
                <Icon className="h-[22px] w-[22px]" strokeWidth={1.8} aria-hidden="true" />
                {it.badge ? (
                  <span className="pv-num absolute -right-2.5 -top-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full px-1 text-[10px] font-bold text-white" style={{ background: "var(--pv-clay)" }}>
                    {it.badge}
                  </span>
                ) : it.alert ? (
                  <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full" style={{ background: "var(--pv-terracota)" }} />
                ) : null}
              </span>
              <span className="max-w-full truncate">{it.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
