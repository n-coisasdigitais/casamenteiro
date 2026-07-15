import { Link, useLocation } from "react-router-dom";
import { Heart, CheckSquare, Store, Users, DollarSign, User, Globe, MessageSquare, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFeatureFlags } from "@/contexts/FeatureFlagsContext";

const allItems: { label: string; path: string; icon: any; flag?: string }[] = [
  { label: "Meu Casamento", path: "/dashboard", icon: Heart },
  { label: "Tarefas", path: "/tarefas", icon: CheckSquare },
  { label: "Orçamento", path: "/orcamento", icon: DollarSign },
  { label: "Fornecedores", path: "/meus-fornecedores", icon: Store },
  { label: "Convidados", path: "/convidados", icon: Users, flag: "rsvp_convidados" },
  { label: "Perfil público", path: "/meu-casamento/perfil", icon: Globe, flag: "perfil_social_casal" },
  { label: "Mensagens", path: "/mensagens", icon: MessageSquare, flag: "mensagens_casais" },
  { label: "Indicações", path: "/meu-casamento/indicacoes", icon: Share2, flag: "indicacoes" },
  { label: "Perfil", path: "/perfil", icon: User },
];

export default function DashboardNav() {
  const { pathname } = useLocation();
  const flags = useFeatureFlags();
  const navItems = allItems.filter((it) => !it.flag || flags[it.flag]);

  return (
    <nav className="bg-card border-b border-border overflow-x-auto">
      <div className="container flex items-center gap-1 px-4">
        {navItems.map((item) => {
          const active = pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              <item.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
