import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const HOME_BY_TYPE: Record<string, string> = {
  supplier: "/fornecedor/painel",
  profissional: "/profissional/painel",
};

/**
 * Impede que contas de fornecedor/prestador acessem as rotas do casal.
 * Enquanto o perfil carrega, não redireciona (evita flicker/redirect indevido).
 */
export default function RequireAccountType({
  allow,
  children,
}: {
  allow: string[];
  children: ReactNode;
}) {
  const { loading, user, profile } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;

  const tipo = profile?.account_type || "couple";
  if (!allow.includes(tipo)) {
    return <Navigate to={HOME_BY_TYPE[tipo] || "/"} replace />;
  }
  return <>{children}</>;
}