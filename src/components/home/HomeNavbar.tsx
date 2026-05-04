import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import UserMenu from "@/components/UserMenu";

export default function HomeNavbar({ onSimularClick }: { onSimularClick: () => void }) {
  const { user } = useAuth();
  return (
    <header className="fixed top-0 inset-x-0 z-40 bg-cream/85 backdrop-blur-md border-b border-ink/5 animate-fade-in">
      <div className="container flex items-center justify-between h-14">
        <Link to="/" className="flex items-center gap-2 text-ink">
          <Heart className="h-4 w-4 text-rose-gold fill-rose-gold" />
          <span className="font-serif text-lg tracking-tight">Casamenteiro</span>
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          <Link to="/explorar" className="hidden sm:inline px-3 py-1.5 text-ink/70 hover:text-ink">Explorar</Link>
          {user ? <UserMenu /> : (
            <Link to="/login" className="px-3 py-1.5 text-ink/70 hover:text-ink">Entrar</Link>
          )}
          <button
            onClick={onSimularClick}
            className="bg-rose-gold text-white text-sm px-4 py-2 rounded-md hover:opacity-90 transition"
          >
            Simular
          </button>
        </nav>
      </div>
    </header>
  );
}