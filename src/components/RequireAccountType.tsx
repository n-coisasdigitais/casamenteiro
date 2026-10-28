import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const HOME_BY_TYPE: Record<string, string> = {
  supplier: "/fornecedor/painel",
  profissional: "/profissional/painel",
};

/**
 * Impede que contas de fornecedor/prestador acessem as rotas do casal.
 * Espera o perfil carregar antes de decidir (não assume "casal" por padrão).
 */
export default function RequireAccountType({
  allow,
  children,
}: {
  allow: string[];
  children: ReactNode;
}) {
  const { loading, user, profile, isAdmin } = useAuth();

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
    return <Navigate to={HOME_BY_TYPE[tipo] || "/"} replace />;
  }
  return <>{children}</>;
}
