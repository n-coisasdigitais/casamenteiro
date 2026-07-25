import { useState } from "react";
import { useNavigate, Link, Navigate } from "react-router-dom";
import { Heart, Users, Store, Loader2, ArrowLeft } from "lucide-react";
import { DEMO_ACCOUNTS, loginAsDemo, DemoRole } from "@/lib/demoAuth";
import { useToast } from "@/hooks/use-toast";
import SEO from "@/components/SEO";
import { useAuth } from "@/contexts/AuthContext";

export default function DemoLanding() {
  const [loading, setLoading] = useState<DemoRole | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, loading: authLoading, user } = useAuth();

  if (authLoading) return null;
  if (!user || !isAdmin) return <Navigate to="/login" replace />;

  const enter = async (role: DemoRole) => {
    setLoading(role);
    try {
      await loginAsDemo(role);
      navigate(role === "supplier" ? "/fornecedor/painel" : "/dashboard", { replace: true });
    } catch (e: any) {
      toast({ title: "Não foi possível entrar na demo", description: e.message, variant: "destructive" });
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "hsl(var(--color-bg))" }}>
      <SEO title="Demonstração — Casamenteiro" description="Explore a plataforma Casamenteiro com dados fictícios em uma conta demo de casal ou fornecedor." noIndex />

      <header className="border-b" style={{ borderColor: "hsl(var(--color-border))" }}>
        <div className="container flex items-center justify-between h-14">
          <Link to="/" className="flex items-center gap-2" style={{ color: "hsl(var(--color-dark))" }}>
            <Heart className="h-4 w-4" style={{ color: "hsl(var(--color-primary))", fill: "hsl(var(--color-primary))" }} />
            <span className="font-serif text-lg">Casamenteiro</span>
          </Link>
          <Link to="/" className="text-sm inline-flex items-center gap-1 hover:opacity-80" style={{ color: "hsl(var(--color-text-body))" }}>
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar ao site
          </Link>
        </div>
      </header>

      <main className="flex-1 container py-12 max-w-3xl">
        <div className="text-center mb-10">
          <span className="inline-block text-[11px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full" style={{ background: "#FEF3C7", color: "#78350F" }}>
            Ambiente de demonstração
          </span>
          <h1 className="font-serif text-3xl md:text-4xl mt-4" style={{ color: "hsl(var(--color-dark))" }}>
            Conheça a plataforma por dentro
          </h1>
          <p className="mt-3 text-sm md:text-base" style={{ color: "hsl(var(--color-text-body))" }}>
            Entre em uma conta pré-populada com dados fictícios e navegue livremente. Nada aqui afeta usuários reais.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <button
            onClick={() => enter("couple")}
            disabled={loading !== null}
            className="text-left rounded-2xl p-6 border transition hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ background: "hsl(var(--color-surface))", borderColor: "hsl(var(--color-border))" }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ background: "hsl(var(--color-primary) / 0.12)" }}>
                <Users className="h-5 w-5" style={{ color: "hsl(var(--color-primary))" }} />
              </div>
              <h2 className="font-serif text-xl" style={{ color: "hsl(var(--color-dark))" }}>{DEMO_ACCOUNTS.couple.label}</h2>
            </div>
            <p className="text-sm mb-4" style={{ color: "hsl(var(--color-text-body))" }}>{DEMO_ACCOUNTS.couple.description}</p>
            <span className="inline-flex items-center gap-2 text-sm font-semibold" style={{ color: "hsl(var(--color-primary))" }}>
              {loading === "couple" ? <><Loader2 className="h-4 w-4 animate-spin" /> Entrando…</> : "Entrar na demo do casal →"}
            </span>
          </button>

          <button
            onClick={() => enter("supplier")}
            disabled={loading !== null}
            className="text-left rounded-2xl p-6 border transition hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ background: "hsl(var(--color-surface))", borderColor: "hsl(var(--color-border))" }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ background: "hsl(var(--color-primary) / 0.12)" }}>
                <Store className="h-5 w-5" style={{ color: "hsl(var(--color-primary))" }} />
              </div>
              <h2 className="font-serif text-xl" style={{ color: "hsl(var(--color-dark))" }}>{DEMO_ACCOUNTS.supplier.label}</h2>
            </div>
            <p className="text-sm mb-4" style={{ color: "hsl(var(--color-text-body))" }}>{DEMO_ACCOUNTS.supplier.description}</p>
            <span className="inline-flex items-center gap-2 text-sm font-semibold" style={{ color: "hsl(var(--color-primary))" }}>
              {loading === "supplier" ? <><Loader2 className="h-4 w-4 animate-spin" /> Entrando…</> : "Entrar na demo do fornecedor →"}
            </span>
          </button>
        </div>

        <p className="text-xs text-center mt-8" style={{ color: "hsl(var(--color-text-muted))" }}>
          Ao entrar, um banner amarelo aparece no topo lembrando que você está na demo. Basta clicar em "Sair da demo" para voltar.
        </p>
      </main>
    </div>
  );
}