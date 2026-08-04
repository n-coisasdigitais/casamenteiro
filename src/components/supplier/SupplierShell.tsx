import { Link, useLocation } from "react-router-dom";
import { Heart, LayoutDashboard, MessageSquare, Store, Star, Sparkles, Receipt } from "lucide-react";
import NotificationsBell from "@/components/NotificationsBell";
import UserMenu from "@/components/UserMenu";
import { cn } from "@/lib/utils";

const links = [
  { label: "Painel", to: "/fornecedor/painel?tab=painel", match: "painel", icon: LayoutDashboard },
  { label: "Orçamentos", to: "/fornecedor/painel?tab=orcamentos", match: "orcamentos", icon: MessageSquare },
  { label: "Meu negócio", to: "/fornecedor/painel?tab=negocio", match: "negocio", icon: Store },
  { label: "Avaliações", to: "/fornecedor/painel?tab=avaliacoes", match: "avaliacoes", icon: Star },
  { label: "Planos e destaques", to: "/fornecedor/planos", match: "/fornecedor/planos", icon: Sparkles },
  { label: "Faturas e pagamentos", to: "/fornecedor/faturas", match: "/fornecedor/faturas", icon: Receipt },
];

/** Casca com cabeçalho e navegação para páginas isoladas do fornecedor. */
export default function SupplierShell({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="container flex items-center justify-between h-16 px-4">
          <Link to="/" className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary fill-primary" />
            <span className="text-lg font-bold">Casamenteiro</span>
          </Link>
          <div className="flex items-center gap-2">
            <NotificationsBell />
            <UserMenu />
          </div>
        </div>
      </header>

      <nav className="md:hidden bg-card border-b border-border overflow-x-auto">
        <div className="flex items-center gap-1 px-2">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={cn(
                "flex items-center gap-2 px-3 py-3 text-sm whitespace-nowrap border-b-2",
                pathname === l.match
                  ? "border-primary text-primary font-medium"
                  : "border-transparent text-muted-foreground"
              )}
            >
              <l.icon className="h-4 w-4" />
              {l.label}
            </Link>
          ))}
        </div>
      </nav>

      <div className="flex">
        <aside className="hidden md:flex md:flex-col w-60 shrink-0 border-r border-border bg-card">
          <nav className="p-3 space-y-1 sticky top-16">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                  pathname === l.match ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-foreground"
                )}
              >
                <l.icon className="h-4 w-4 shrink-0" />
                <span className="flex-1 truncate">{l.label}</span>
              </Link>
            ))}
          </nav>
        </aside>
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
