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
import { Heart, Search, Settings, LogOut, CheckSquare, Users, DollarSign, Store } from "lucide-react";
import UserAvatar from "@/components/UserAvatar";

export default function UserMenu() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

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
        <DropdownMenuItem asChild>
          <Link to="/dashboard" className="cursor-pointer">
            <Heart className="mr-2 h-4 w-4" />
            Meu Casamento
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/tarefas" className="cursor-pointer">
            <CheckSquare className="mr-2 h-4 w-4" />
            Agenda de Tarefas
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/meus-fornecedores" className="cursor-pointer">
            <Store className="mr-2 h-4 w-4" />
            Meus Fornecedores
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/convidados" className="cursor-pointer">
            <Users className="mr-2 h-4 w-4" />
            Convidados
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/orcamento" className="cursor-pointer">
            <DollarSign className="mr-2 h-4 w-4" />
            Orçamento
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/buscar" className="cursor-pointer">
            <Search className="mr-2 h-4 w-4" />
            Buscar Fornecedores
          </Link>
        </DropdownMenuItem>
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
