import { useState } from "react";
import { Link } from "react-router-dom";
import { Heart, Menu, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import UserMenu from "@/components/UserMenu";

export default function HomeNavbar({ onSimularClick }: { onSimularClick: () => void }) {
  const { user, isAdmin } = useAuth();
  const [open, setOpen] = useState(false);

  const links = [
    { to: "/explorar", label: "Fornecedores" },
    { to: "/vagas", label: "Vagas" },
    { to: "/profissional", label: "Sou profissional" },
    { to: "/fornecedor", label: "Sou fornecedor" },
  ];

  return (
    <header
      className="fixed top-0 inset-x-0 z-40 backdrop-blur-md animate-fade-in"
      style={{ background: "hsl(var(--color-bg) / 0.88)", borderBottom: "1px solid hsl(var(--color-border))" }}
    >
      <div className="container flex items-center justify-between h-14">
        <Link to="/" className="flex items-center gap-2" style={{ color: "hsl(var(--color-dark))" }}>
          <Heart
            className="h-4 w-4"
            style={{ color: "hsl(var(--color-primary))", fill: "hsl(var(--color-primary))" }}
          />
          <span className="font-serif text-lg">Casamenteiro</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1 text-sm">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="px-3 py-1.5 hover:opacity-80"
              style={{ color: "hsl(var(--color-text-body))" }}
            >
              {l.label}
            </Link>
          ))}
          {isAdmin && (
            <Link to="/demo" className="px-3 py-1.5 hover:opacity-80" style={{ color: "hsl(var(--color-text-body))" }}>
              Ver demo
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <UserMenu />
          ) : (
            <Link
              to="/login"
              className="hidden sm:inline rounded-full px-5 py-2 font-semibold text-[13px] transition hover:opacity-90"
              style={{ background: "hsl(var(--color-dark))", color: "hsl(var(--color-bg))" }}
            >
              Entrar
            </Link>
          )}
          <button
            onClick={onSimularClick}
            className="hidden sm:inline rounded-full px-5 py-2 font-semibold text-[13px] transition hover:opacity-90"
            style={{ background: "hsl(var(--color-primary))", color: "hsl(var(--color-bg))" }}
          >
            Simular
          </button>
          {/* Mobile toggle */}
          <button
            className="md:hidden p-2"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
            style={{ color: "hsl(var(--color-dark))" }}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div
          className="md:hidden border-t"
          style={{ borderColor: "hsl(var(--color-border))", background: "hsl(var(--color-bg))" }}
        >
          <nav className="container py-3 flex flex-col gap-1 text-sm">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="py-2.5 px-1 hover:opacity-80"
                style={{ color: "hsl(var(--color-text-body))" }}
              >
                {l.label}
              </Link>
            ))}
            {!user && (
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className="py-2.5 px-1 font-semibold"
                style={{ color: "hsl(var(--color-dark))" }}
              >
                Entrar
              </Link>
            )}
            <button
              onClick={() => {
                setOpen(false);
                onSimularClick();
              }}
              className="mt-1 rounded-full px-5 py-2.5 font-semibold text-[13px] text-center"
              style={{ background: "hsl(var(--color-primary))", color: "hsl(var(--color-bg))" }}
            >
              Simular meu casamento
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
