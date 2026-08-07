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
        "Cancelar sua assinatura? Você mantém o acesso até o fim do período já pago (ou até o fim do teste, se ainda não começou a pagar); depois disso o perfil volta ao plano gratuito.",
      )
    )
      return;
    setCancelando(true);
    try {
      const { error } = await supabase.functions.invoke("mp-cancel-subscription", {
        body: { supplier_id: supplierId },
      });
      if (error) throw error;
      toast({ title: "Assinatura cancelada", description: "Você mantém o acesso pelo período contratado." });
      setTimeout(() => window.location.reload(), 1200);
    } catch (e: any) {
      toast({ title: "Erro ao cancelar", description: e?.message || "Tente novamente.", variant: "destructive" });
    } finally {
      setCancelando(false);
    }
  };

  const botoesGestao = (
    <div className="flex gap-2">
      <Button asChild variant="outline" className="flex-1">
        <Link to="/fornecedor/planos">Trocar de plano</Link>
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
  );

  // ---------- EM TRIAL ----------
  if (plano.estado === "trial") {
    const dias = Math.max(0, Math.ceil((new Date(plano.trialEndsAt!).getTime() - Date.now()) / 864e5));
    return (
      <Card className="border-primary/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2 flex-wrap">
            <Sparkles className="h-5 w-5 text-primary" /> Período de teste
            {plano.temAssinatura && plano.nome && (
              <Badge className="bg-primary text-primary-foreground">{plano.nome} garantido</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Você tem acesso a <strong>todos os recursos</strong> gratuitamente.
          </p>
          <div className="flex items-center gap-2 text-sm">
            <CalendarClock className="h-4 w-4 text-primary" /> Teste termina em {fmtData(plano.trialEndsAt)} ·{" "}
            <strong>
              {dias} {dias === 1 ? "dia" : "dias"}
            </strong>
          </div>

          {plano.temAssinatura ? (
            <>
              <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2 text-sm text-emerald-800">
                <CheckCircle2 className="h-4 w-4 inline mr-1.5" />
                Plano <strong>{plano.nome}</strong> ativo. A primeira cobrança só acontece em{" "}
                <strong>{fmtData(plano.cobrancaComecaEm)}</strong>, quando o teste terminar.
              </div>
              {botoesGestao}
            </>
          ) : (
            <Button asChild className="w-full">
              <Link to="/fornecedor/planos">Assinar agora — só paga quando o teste acabar</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // ---------- ASSINANTE (fora do trial) ----------
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
          {botoesGestao}
        </CardContent>
      </Card>
    );
  }

  // ---------- BLOQUEADO ----------
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
