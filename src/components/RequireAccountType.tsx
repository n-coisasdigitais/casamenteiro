import { ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import { NOME_PERFIL, possui, type TipoTrabalho } from "@/lib/perfis";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const HOME_BY_TYPE: Record<string, string> = {
  supplier: "/fornecedor/painel",
  profissional: "/profissional/painel",
  generico: "/meu-sonho",
};

/**
 * Impede que contas de fornecedor/prestador acessem as rotas do casal.
 * Espera o perfil carregar antes de decidir (não assume "casal" por padrão).
 */
export default function RequireAccountType({ allow, children }: { allow: string[]; children: ReactNode }) {
  const { loading, user, profile, isAdmin, perfis, trocarPerfil } = useAuth();
  const [trocando, setTrocando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (loading || (user && !profile)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;

  if (isAdmin && allow.includes("admin")) return <>{children}</>;
  const tipo = profile?.account_type || "couple";
  if (!allow.includes(tipo)) {
    const alvo = allow.find((a) => (a === "supplier" || a === "profissional") && possui(perfis, a)) as TipoTrabalho | undefined;
    if (alvo && (tipo === "supplier" || tipo === "profissional")) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="max-w-sm text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              Você está usando o perfil {NOME_PERFIL[tipo]}. Esta área é do perfil {NOME_PERFIL[alvo]}.
            </p>
            <Button
              disabled={trocando}
              onClick={async () => {
                setTrocando(true); setErro(null);
                try { await trocarPerfil(alvo); } catch (e: any) { setErro(e.message); } finally { setTrocando(false); }
              }}
            >
              {trocando ? "Trocando…" : `Trocar para perfil ${NOME_PERFIL[alvo]}`}
            </Button>
            {erro && <p className="text-sm text-destructive">{erro}</p>}
          </div>
        </div>
      );
    }
    return <Navigate to={HOME_BY_TYPE[tipo] || "/"} replace />;
  }
  return <>{children}</>;
}

/**
 * Para painéis sem guarda de tipo: se a conta possui o perfil do painel mas está
 * em outro perfil de trabalho, oferece a troca em vez de redirecionar.
 */
export function OferecerTrocaPerfil({ tipo, children }: { tipo: TipoTrabalho; children: ReactNode }) {
  const { profile, perfis, trocarPerfil } = useAuth();
  const [trocando, setTrocando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const ativo = profile?.account_type;
  if (!ativo || ativo === tipo || !(ativo === "supplier" || ativo === "profissional") || !possui(perfis, tipo)) {
    return <>{children}</>;
  }
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-sm text-center space-y-3">
        <p className="text-sm text-muted-foreground">
          Você está usando o perfil {NOME_PERFIL[ativo]}. Esta área é do perfil {NOME_PERFIL[tipo]}.
        </p>
        <Button
          disabled={trocando}
          onClick={async () => {
            setTrocando(true); setErro(null);
            try { await trocarPerfil(tipo); } catch (e: any) { setErro(e.message); } finally { setTrocando(false); }
          }}
        >
          {trocando ? "Trocando…" : `Trocar para perfil ${NOME_PERFIL[tipo]}`}
        </Button>
        {erro && <p className="text-sm text-destructive">{erro}</p>}
      </div>
    </div>
  );
}
