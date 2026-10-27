import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import UserMenu from "@/components/UserMenu";
import NotificationsBell from "@/components/NotificationsBell";
import "./vitrine.css";

export function TopoVitrine({ ativo }: { ativo?: "fornecedores" }) {
  const { user, loading } = useAuth();
  return (
    <header className="vt-top">
      <div className="vt-wrap flex h-[60px] items-center gap-6">
        <Link to="/" className="vt-serif text-[22px] tracking-tight">
          casamenteiro<span className="text-[var(--vt-clay)]">.</span>
        </Link>
        <nav className="hidden items-center gap-5 text-sm font-semibold text-[var(--vt-body)] md:flex">
          <Link to="/explorar" className={ativo === "fornecedores" ? "text-[var(--vt-ink)]" : "hover:text-[var(--vt-ink)]"}>
            Fornecedores
          </Link>
          {user && (
            <Link to="/dashboard" className="hover:text-[var(--vt-ink)]">
              Meu casamento
            </Link>
          )}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {loading ? null : user ? (
            <>
              <NotificationsBell />
              <UserMenu />
            </>
          ) : (
            <>
              <Link to="/login" className="vt-pill sm">
                Entrar
              </Link>
              <Link to="/cadastro" className="vt-pill sm pri hidden sm:inline-flex">
                Criar conta
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export function RodapeVitrine() {
  return (
    <footer className="mt-12 border-t border-[var(--vt-line)] pb-8 pt-8 text-[13.5px] text-[var(--vt-muted)]">
      <div className="vt-wrap">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="vt-serif text-[22px] text-[var(--vt-ink)]">
              casamenteiro<span className="text-[var(--vt-clay)]">.</span>
            </Link>
            <p className="mt-2 max-w-[30ch]">Fornecedores de casamento, orçamento grátis e sem comissão.</p>
          </div>
          <div>
            <h4 className="mb-2 text-[13.5px] font-semibold text-[var(--vt-ink)]">Para casais</h4>
            <nav className="flex flex-col gap-1.5">
              <Link to="/explorar">Buscar fornecedores</Link>
              <Link to="/cadastro?tipo=couple">Criar conta grátis</Link>
              <Link to="/dashboard">Meu casamento</Link>
            </nav>
          </div>
          <div>
            <h4 className="mb-2 text-[13.5px] font-semibold text-[var(--vt-ink)]">Para fornecedores</h4>
            <nav className="flex flex-col gap-1.5">
              <Link to="/cadastro?tipo=supplier">Cadastrar empresa</Link>
              <Link to="/fornecedor/painel">Painel do fornecedor</Link>
            </nav>
          </div>
          <div>
            <h4 className="mb-2 text-[13.5px] font-semibold text-[var(--vt-ink)]">Casamenteiro</h4>
            <nav className="flex flex-col gap-1.5">
              <Link to="/termos">Termos de uso</Link>
              <Link to="/privacidade">Privacidade</Link>
            </nav>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap justify-between gap-2 border-t border-[var(--vt-line)] pt-4 text-[12.5px]">
          <span>© {new Date().getFullYear()} Casamenteiro</span>
          <a href="https://ncoisas.digital/" target="_blank" rel="noopener noreferrer">
            Desenvolvido pela N Coisas Digitais
          </a>
        </div>
      </div>
    </footer>
  );
}

/** Favoritos do casal logado (coração dos cards). */
export function useFavoritos() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [ids, setIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) {
      setCoupleId(null);
      setIds(new Set());
      return;
    }
    (async () => {
      const { data: c } = await supabase.from("couples").select("id").eq("user_id", user.id).maybeSingle();
      if (!c) return;
      setCoupleId(c.id);
      const { data } = await supabase.from("couple_favorites").select("supplier_id").eq("couple_id", c.id);
      setIds(new Set((data || []).map((f: any) => f.supplier_id)));
    })();
  }, [user]);

  const alternar = useCallback(
    async (supplierId: string) => {
      if (!user) {
        toast({ title: "Entre para salvar", description: "Crie sua conta grátis para guardar seus fornecedores favoritos." });
        return;
      }
      if (!coupleId) {
        toast({ title: "Favoritos são para contas de casal" });
        return;
      }
      const tinha = ids.has(supplierId);
      setIds((s) => {
        const n = new Set(s);
        if (tinha) n.delete(supplierId);
        else n.add(supplierId);
        return n;
      });
      const { error } = tinha
        ? await supabase.from("couple_favorites").delete().eq("couple_id", coupleId).eq("supplier_id", supplierId)
        : await supabase.from("couple_favorites").insert({ couple_id: coupleId, supplier_id: supplierId });
      if (error) {
        setIds((s) => {
          const n = new Set(s);
          if (tinha) n.add(supplierId);
          else n.delete(supplierId);
          return n;
        });
        toast({ title: "Não foi possível salvar", variant: "destructive" });
      } else toast({ title: tinha ? "Removido dos favoritos" : "Salvo nos favoritos" });
    },
    [user, coupleId, ids, toast],
  );

  return { favoritos: ids, alternar };
}