import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Lock, Sparkles } from "lucide-react";
import { usePlanFeature } from "@/hooks/usePlanFeature";
import type { PlanFeatureKey } from "@/lib/planFeatures";
import { Button } from "@/components/ui/button";

/**
 * Envolve conteúdo premium. Três comportamentos:
 * - trial ou recurso liberado -> mostra o conteúdo normalmente.
 * - bloqueado -> mostra o conteúdo BORRADO por baixo + overlay "assine para ver" (estilo Tinder).
 *
 * O conteúdo borrado NÃO é interativo (pointer-events none) e é escondido de leitores de tela.
 */
export default function PlanGate({
  supplierId,
  feature,
  children,
  titulo = "Recurso do plano pago",
  descricao = "Assine um plano para desbloquear.",
  minHeight = 220,
}: {
  supplierId: string | null | undefined;
  feature: PlanFeatureKey;
  children: ReactNode;
  titulo?: string;
  descricao?: string;
  minHeight?: number;
}) {
  const { liberado, carregando, estado } = usePlanFeature(supplierId, feature);

  if (carregando) {
    return <div className="animate-pulse rounded-xl bg-muted" style={{ minHeight }} />;
  }

  if (liberado) return <>{children}</>;

  return (
    <div className="relative overflow-hidden rounded-xl border" style={{ minHeight }}>
      {/* Conteúdo real, borrado e inerte */}
      <div className="pointer-events-none select-none blur-[6px] opacity-60" aria-hidden="true">
        {children}
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/70 backdrop-blur-[2px] text-center px-6">
        <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10">
          <Lock className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="font-semibold text-foreground">{titulo}</p>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">{descricao}</p>
        </div>
        <Button asChild size="sm" className="mt-1">
          <Link to="/fornecedor/planos">
            <Sparkles className="h-4 w-4 mr-1.5" />
            {estado === "bloqueado" ? "Assinar e desbloquear" : "Fazer upgrade"}
          </Link>
        </Button>
      </div>
    </div>
  );
}

/**
 * Banner de trial: mostra quantos dias restam do período grátis.
 * Coloque no topo do painel do fornecedor.
 */
export function TrialBanner({ supplierId }: { supplierId: string | null | undefined }) {
  const { plano, carregando } = usePlanFeature(supplierId, "crm_leads");
  if (carregando || !plano) return null;
  if (plano.estado !== "trial" || !plano.trialEndsAt) return null;

  const diasRestantes = Math.max(0, Math.ceil((new Date(plano.trialEndsAt).getTime() - Date.now()) / 864e5));

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-2.5">
        <Sparkles className="h-5 w-5 text-primary shrink-0" />
        <div>
          <p className="text-sm font-medium text-foreground">
            Período de teste — {diasRestantes} {diasRestantes === 1 ? "dia restante" : "dias restantes"}
          </p>
          <p className="text-xs text-muted-foreground">
            Você tem acesso a todos os recursos. Assine para não perder quando o teste acabar.
          </p>
        </div>
      </div>
      <Button asChild size="sm" variant="outline">
        <Link to="/fornecedor/planos">Ver planos</Link>
      </Button>
    </div>
  );
}
