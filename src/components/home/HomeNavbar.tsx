import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import UserMenu from "@/components/UserMenu";

export default function HomeNavbar({ onSimularClick }: { onSimularClick: () => void }) {
  const { user } = useAuth();
  return (
    <header className="fixed top-0 inset-x-0 z-40 backdrop-blur-md animate-fade-in" style={{ background: "hsl(var(--color-bg) / 0.88)", borderBottom: "1px solid hsl(var(--color-border))" }}>
      <div className="container flex items-center justify-between h-14">
        <Link to="/" className="flex items-center gap-2" style={{ color: "hsl(var(--color-dark))" }}>
          <Heart className="h-4 w-4" style={{ color: "hsl(var(--color-primary))", fill: "hsl(var(--color-primary))" }} />
          <span className="font-serif text-lg">Casamenteiro</span>
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          <Link to="/explorar" className="hidden sm:inline px-3 py-1.5 hover:opacity-80" style={{ color: "hsl(var(--color-text-body))" }}>Explorar</Link>
          <Link to="/fornecedor" className="hidden sm:inline px-3 py-1.5 hover:opacity-80" style={{ color: "hsl(var(--color-text-body))" }}>Sou fornecedor →</Link>
          {user ? <UserMenu /> : (
            <Link
              to="/login"
              className="rounded-full px-5 py-2 font-semibold text-[13px] transition hover:opacity-90"
              style={{ background: "hsl(var(--color-dark))", color: "hsl(var(--color-bg))" }}
            >
              Entrar
            </Link>
          )}
          <button
            onClick={onSimularClick}
            className="rounded-full px-5 py-2 font-semibold text-[13px] transition hover:opacity-90"
            style={{ background: "hsl(var(--color-primary))", color: "hsl(var(--color-bg))" }}
          >
            Simular
          </button>
        </nav>
      </div>
    </header>
  );
}