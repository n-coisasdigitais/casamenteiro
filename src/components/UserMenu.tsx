import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Heart, Search, Settings, LogOut, CheckSquare, Users, DollarSign, Store,
  LayoutDashboard, MessageSquareQuote, CalendarDays, ShieldCheck, UserCircle,
} from "lucide-react";
import UserAvatar from "@/components/UserAvatar";

export default function UserMenu() {
  const { profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const isSupplier = profile?.account_type === "supplier";

  const items = isSupplier
    ? [
        { to: "/fornecedor/painel", icon: LayoutDashboard, label: "Painel do Fornecedor" },
        { to: "/fornecedor/painel?tab=quotes", icon: MessageSquareQuote, label: "Orçamentos recebidos" },
        { to: "/fornecedor/painel?tab=availability", icon: CalendarDays, label: "Disponibilidade" },
        { to: "/fornecedor/painel?tab=profile", icon: UserCircle, label: "Perfil público" },
      ]
    : [
        { to: "/dashboard", icon: Heart, label: "Meu Casamento" },
        { to: "/tarefas", icon: CheckSquare, label: "Agenda de Tarefas" },
        { to: "/meus-fornecedores", icon: Store, label: "Meus Fornecedores" },
        { to: "/convidados", icon: Users, label: "Convidados" },
        { to: "/orcamento", icon: DollarSign, label: "Orçamento" },
        { to: "/buscar", icon: Search, label: "Buscar Fornecedores" },
      ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-full">
          <UserAvatar fullName={profile?.full_name} avatarUrl={profile?.avatar_url} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <p className="text-sm font-medium leading-none">{profile?.full_name || "Minha conta"}</p>
          <Link to="/perfil" className="text-xs text-primary hover:underline mt-1 inline-block">
            Ver perfil
          </Link>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.map((it) => (
          <DropdownMenuItem asChild key={it.to}>
            <Link to={it.to} className="cursor-pointer">
              <it.icon className="mr-2 h-4 w-4" />
              {it.label}
            </Link>
          </DropdownMenuItem>
        ))}
        {isAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/admin" className="cursor-pointer">
                <ShieldCheck className="mr-2 h-4 w-4" />
                Painel Admin
              </Link>
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/perfil" className="cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            Configurações
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive focus:text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
