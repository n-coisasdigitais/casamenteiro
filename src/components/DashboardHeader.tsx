import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import UserMenu from "@/components/UserMenu";
import NotificationsBell from "@/components/NotificationsBell";
import { useAuth } from "@/contexts/AuthContext";

export default function DashboardHeader() {
  const { profile } = useAuth();

  return (
    <header className="bg-card border-b border-border sticky top-0 z-40">
      <div className="container flex items-center justify-between h-16 px-4">
        <Link to="/" className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-primary fill-primary" />
          <span className="text-lg font-bold">Casamenteiro</span>
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground hidden sm:inline">
            Olá, {profile?.full_name || "Casal"}
          </span>
          <NotificationsBell />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
