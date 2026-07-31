import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useFeatureFlag, useFeatureFlagsLoading } from "@/contexts/FeatureFlagsContext";

export default function FlagGate({ flag, children }: { flag: string; children: ReactNode }) {
  const enabled = useFeatureFlag(flag);
  const loading = useFeatureFlagsLoading();

  // Enquanto as flags carregam, não redireciona (evita cair na Home por engano).
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Carregando…
      </div>
    );
  }
  if (!enabled) return <Navigate to="/" replace />;
  return <>{children}</>;
}