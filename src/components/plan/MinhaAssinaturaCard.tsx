import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSupplierPlan } from "@/hooks/usePlanFeature";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, CheckCircle2, Lock, CalendarClock } from "lucide-react";

function fmtData(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

export default function MinhaAssinaturaCard({ supplierId }: { supplierId: string }) {
  const { plano, carregando } = useSupplierPlan(supplierId);
  const { toast } = useToast();
  const [cancelando, setCancelando] = useState(false);

  if (carregando)
    return (
      <Card>
        <CardContent className="py-8 animate-pulse text-center text-muted-foreground">Carregando…</CardContent>
      </Card>
    );
  if (!plano) return null;

  const cancelar = async () => {
    if (
      !confirm(
        "Cancelar sua assinatura? Você mantém o acesso até o fim do período já pago; depois disso o perfil volta ao plano gratuito.",
      )
    )
      return;
    setCancelando(true);
    try {
      // Chama a Edge Function que cancela no Mercado Pago e marca cancelada_em.
      const { data, error } = await supabase.functions.invoke("mp-cancel-subscription", {
        body: { supplier_id: supplierId },
      });
      if (error) throw error;
      toast({ title: "Assinatura cancelada", description: "Você mantém o acesso até o fim do período pago." });
      setTimeout(() => window.location.reload(), 1200);
    } catch (e: any) {
      toast({ title: "Erro ao cancelar", description: e?.message || "Tente novamente.", variant: "destructive" });
    } finally {
      setCancelando(false);
    }
  };

  // TRIAL
  if (plano.estado === "trial") {
    const dias = Math.max(0, Math.ceil((new Date(plano.trialEndsAt!).getTime() - Date.now()) / 864e5));
    return (
      <Card className="border-primary/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Período de teste
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Você tem acesso a <strong>todos os recursos</strong> gratuitamente.
          </p>
          <div className="flex items-center gap-2 text-sm">
            <CalendarClock className="h-4 w-4 text-primary" /> Termina em {fmtData(plano.trialEndsAt)} ·{" "}
            <strong>
              {dias} {dias === 1 ? "dia" : "dias"}
            </strong>
          </div>
          <Button asChild className="w-full">
            <Link to="/fornecedor/planos">Assinar agora e não perder o acesso</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ASSINANTE
  if (plano.estado === "assinante") {
    return (
      <Card className="border-emerald-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" /> {plano.nome || "Plano ativo"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {plano.cancelada ? (
            <Badge variant="secondary" className="bg-amber-100 text-amber-900">
              Cancelada · acesso até {fmtData(plano.periodEnd)}
            </Badge>
          ) : (
            <p className="text-sm text-muted-foreground">Renovação em {fmtData(plano.periodEnd)}.</p>
          )}
          <div className="flex gap-2">
            <Button asChild variant="outline" className="flex-1">
              <Link to="/fornecedor/planos">Mudar plano</Link>
            </Button>
            {!plano.cancelada && (
              <Button
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={cancelar}
                disabled={cancelando}
              >
                {cancelando ? "Cancelando…" : "Cancelar"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // BLOQUEADO
  return (
    <Card className="border-destructive/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Lock className="h-5 w-5 text-muted-foreground" /> Plano gratuito
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Seu período de teste terminou. Recursos premium estão bloqueados — assine para desbloquear e voltar a aparecer
          com destaque.
        </p>
        <Button asChild className="w-full">
          <Link to="/fornecedor/planos">
            <Sparkles className="h-4 w-4 mr-1.5" /> Ver planos e assinar
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
