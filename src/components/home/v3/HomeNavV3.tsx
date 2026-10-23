import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import UserMenu from "@/components/UserMenu";

const LINKS = [
  { to: "/explorar", label: "Fornecedores" },
  { to: "/vagas", label: "Vagas" },
  { to: "/profissional", label: "Sou profissional" },
  { to: "/fornecedor", label: "Sou fornecedor" },
];

/**
 * Menu da Home:
 *  - sobre o hero: transparente, texto branco
 *  - depois de rolar: fixo, fundo branco, texto escuro
 *  - mobile: só logo, Entrar e Simular; o resto no menu sanduíche
 */
export default function HomeNavV3({ onSimular }: { onSimular: () => void }) {
  const { user } = useAuth();
  const [solido, setSolido] = useState(false);
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    const onScroll = () => setSolido(window.scrollY > Math.max(120, window.innerHeight * 0.6));
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!aberto) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [aberto]);

  const cor = solido ? "var(--hv-ink)" : "#fff";

  return (
    <>
      <header
        className="fixed inset-x-0 top-0 z-50 transition-[background,box-shadow,border-color] duration-300"
        style={{
          background: solido ? "rgba(255,255,255,.95)" : "transparent",
          backdropFilter: solido ? "saturate(180%) blur(16px)" : undefined,
          borderBottom: `1px solid ${solido ? "var(--hv-line)" : "transparent"}`,
          boxShadow: solido ? "0 6px 24px rgba(31,29,27,.06)" : undefined,
        }}
      >
        <nav aria-label="Navegação principal" className="mx-auto flex max-w-[1200px] items-center justify-between gap-2 px-4 sm:gap-4 sm:px-6" style={{ height: solido ? 64 : 76, transition: "height .3s" }}>
          <Link to="/" className="text-[18px] font-extrabold sm:text-[22px]" style={{ color: cor, letterSpacing: "-0.03em" }}>
            casamenteiro<span style={{ color: solido ? "var(--hv-terracota)" : "var(--hv-peach)" }}>.</span>
          </Link>

          <div className="hidden items-center gap-7 text-[15px] font-medium lg:flex">
            {LINKS.map((l) => (
              <Link key={l.to} to={l.to} className="hover:opacity-80" style={{ color: cor }}>
                {l.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {user ? (
              <span className="rounded-full" style={{ background: solido ? "transparent" : "rgba(255,255,255,.92)" }}>
                <UserMenu />
              </span>
            ) : (
              <Link to="/login" className="inline-flex min-h-[44px] items-center px-2 text-[15px] font-semibold sm:px-3" style={{ color: cor }}>
                Entrar
              </Link>
            )}
            <button
              type="button"
              onClick={onSimular}
              className="hv-btn inline-flex min-h-[44px] items-center rounded-full px-4 text-[15px] font-bold sm:px-5"
              style={solido ? { background: "var(--hv-clay)", color: "#fff" } : { background: "#fff", color: "var(--hv-ink)" }}
            >
              Simular
            </button>
            <button
              type="button"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full lg:hidden"
              onClick={() => setAberto(true)}
              aria-label="Abrir menu"
              aria-expanded={aberto}
              style={{
                color: cor,
                border: `1px solid ${solido ? "var(--hv-line)" : "rgba(255,255,255,.45)"}`,
                background: solido ? "#fff" : "rgba(255,255,255,.12)",
              }}
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </nav>
      </header>

      {aberto && (
        <div role="dialog" aria-modal="true" aria-label="Menu" className="fixed inset-0 z-[60] lg:hidden" style={{ background: "rgba(20,14,10,.45)" }} onClick={() => setAberto(false)}>
          <div className="flex flex-col rounded-b-[28px] bg-white px-6 pb-7 pt-3 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex min-h-[56px] items-center justify-between">
              <span className="text-[20px] font-extrabold" style={{ letterSpacing: "-0.03em" }}>
                casamenteiro<span style={{ color: "var(--hv-terracota)" }}>.</span>
              </span>
              <button type="button" onClick={() => setAberto(false)} aria-label="Fechar menu" className="inline-flex h-11 w-11 items-center justify-center rounded-full border" style={{ borderColor: "var(--hv-line)" }}>
                <X className="h-5 w-5" />
              </button>
            </div>
            {LINKS.map((l) => (
              <Link key={l.to} to={l.to} onClick={() => setAberto(false)} className="flex min-h-[56px] items-center border-b text-[20px] font-bold" style={{ borderColor: "#f2eee8", color: "var(--hv-ink)" }}>
                {l.label}
              </Link>
            ))}
            <button
              type="button"
              onClick={() => {
                setAberto(false);
                onSimular();
              }}
              className="hv-btn mt-5 min-h-[54px] rounded-full text-[17px] font-bold text-white"
              style={{ background: "var(--hv-clay)" }}
            >
              Simular meu casamento
            </button>
          </div>
        </div>
      )}
    </>
  );
}
