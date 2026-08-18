import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardNav from "@/components/DashboardNav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CalendarRange, Loader2, Info } from "lucide-react";
import SEO from "@/components/SEO";
import { formatBRL } from "@/lib/platformPricing";
import { RESERVA_STATUS_LABEL, RESERVA_STATUS_TONE, formatarData, formatarDataHora, type ReservaStatus } from "@/lib/reservas";
import { cancelarReserva, carenciaCancelamentoDias, taxaCancelamento } from "@/lib/reservasConfig";
import { useToast } from "@/hooks/use-toast";
import {
  buscarIntent, ETAPA_LABEL, ETAPA_TONE, etapaDoStatus, previsaoLiberacao, PaymentIntent,
} from "@/lib/pagamentos";

type Reserva = {
  id: string;
  promo_date: string;
  status: ReservaStatus;
  valor_ofertado: number | null;
  valor_estimado: number | null;
  modo_cobranca: string;
  expira_em: string | null;
  solicitada_em: string;
  confirmada_em: string | null;
  taxa_cancelamento: number | null;
  taxa_cancelamento_status: string;
  supplier?: { company_name?: string | null; city?: string | null } | null;
};

export default function MinhasReservas() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [intents, setIntents] = useState<Record<string, PaymentIntent | null>>({});
  const [carregando, setCarregando] = useState(true);
  const [carencia, setCarencia] = useState(7);
  const [taxaCancel, setTaxaCancel] = useState(0);
  const [cancelando, setCancelando] = useState<Reserva | null>(null);
  const [motivo, setMotivo] = useState("");

  const carregar = async () => {
    if (!user) return;
    const { data: coupleId } = await (supabase.rpc as any)("get_couple_id_for_user", { _user_id: user.id });
    if (!coupleId) { setCarregando(false); return; }
    const { data } = await (supabase.from("idle_date_reservations" as any)
      .select("id, promo_date, status, valor_ofertado, valor_estimado, modo_cobranca, expira_em, solicitada_em, confirmada_em, taxa_cancelamento, taxa_cancelamento_status, supplier:suppliers(company_name, city)")
      .eq("couple_id", coupleId)
      .order("created_at", { ascending: false }) as any);
    const lista = (data as Reserva[]) ?? [];
    setReservas(lista);
    const pares = await Promise.all(lista.map(async (r) => [r.id, await buscarIntent("reserva", r.id)] as const));
    setIntents(Object.fromEntries(pares));
    setCarregando(false);
  };

  useEffect(() => {
    if (!user) { navigate("/auth"); return; }
    carregar();
    carenciaCancelamentoDias().then(setCarencia);
    taxaCancelamento().then(setTaxaCancel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, navigate]);

  const dentroDaCarencia = (r: Reserva) =>
    Date.now() <= new Date(r.solicitada_em).getTime() + carencia * 86400000;

  const confirmarCancelamento = async () => {
    if (!cancelando) return;
    const alvo = cancelando;
    const { erro, resultado } = await cancelarReserva(alvo.id, motivo || undefined);
    setCancelando(null);
    setMotivo("");
    if (erro) { toast({ title: "Erro ao cancelar", description: erro, variant: "destructive" }); return; }
    if (resultado?.com_custo) {
      toast({ title: "Reserva cancelada", description: `Taxa de cancelamento de ${formatBRL(resultado.taxa)} em aberto.` });
      navigate(`/pagamento?tipo=cancelamento&ref=${alvo.id}`);
      return;
    }
    toast({ title: "Reserva cancelada", description: "Sem custos, dentro do prazo de carência." });
    carregar();
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />
      <div className="container mx-auto max-w-4xl px-4 py-8 space-y-6">
        <SEO title="Minhas reservas | Casamenteiro" description="Acompanhe o status das suas reservas de data." noIndex />
        <div className="flex items-center gap-2">
          <CalendarRange className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-semibold">Minhas reservas</h1>
        </div>

        <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground flex gap-2">
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            A plataforma apenas intermedia a reserva da data. Depois da confirmação, procure o fornecedor para alinhar os
            detalhes e formalizar um contrato entre vocês. Reservar é gratuito; cancelar após {carencia} dias
            {taxaCancel > 0 ? ` tem taxa de ${formatBRL(taxaCancel)}` : " pode ter taxa"}.
          </span>
        </div>

        {carregando ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
          </div>
        ) : reservas.length === 0 ? (
          <Card><CardContent className="p-6 text-sm text-muted-foreground">
            Você ainda não solicitou nenhuma reserva de data.
          </CardContent></Card>
        ) : (
          reservas.map((r) => {
            const intent = intents[r.id] ?? null;
            const etapa = intent ? etapaDoStatus(intent.status) : "pendente";
            const valor = Number(r.valor_ofertado ?? r.valor_estimado ?? 0);
            return (
              <Card key={r.id}>
                <CardContent className="p-6 space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex-1 min-w-[200px]">
                      <p className="font-medium">{r.supplier?.company_name ?? "Fornecedor"}</p>
                      <p className="text-sm text-muted-foreground">
                        Data {formatarData(r.promo_date)}{r.supplier?.city ? ` · ${r.supplier.city}` : ""}
                      </p>
                    </div>
                    <Badge variant="secondary" className={RESERVA_STATUS_TONE[r.status]}>
                      {RESERVA_STATUS_LABEL[r.status]}
                    </Badge>
                  </div>

                  {r.status === "confirmada" && r.confirmada_em && (
                    <p className="text-xs rounded-md bg-emerald-50 border border-emerald-200 p-2 text-emerald-900">
                      O fornecedor confirmou a data em <strong>{formatarDataHora(r.confirmada_em)}</strong>. Entre em contato
                      para alinhar os detalhes e formalizar um contrato — a plataforma apenas intermedia.
                    </p>
                  )}

                  {r.taxa_cancelamento_status === "pendente" && (
                    <p className="text-xs rounded-md bg-amber-50 border border-amber-200 p-2 text-amber-900">
                      Taxa de cancelamento pendente: <strong>{formatBRL(Number(r.taxa_cancelamento ?? 0))}</strong>.
                    </p>
                  )}

                  <div className="grid sm:grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Valor</p>
                      <p className="font-medium">{valor > 0 ? formatBRL(valor) : "A combinar"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Etapa do pagamento</p>
                      <Badge variant="secondary" className={ETAPA_TONE[etapa]}>{ETAPA_LABEL[etapa]}</Badge>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Previsão de liberação</p>
                      <p className="font-medium">{intent ? previsaoLiberacao(intent) : "—"}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {r.taxa_cancelamento_status === "pendente" && (
                      <Button size="sm" asChild>
                        <Link to={`/pagamento?tipo=cancelamento&ref=${r.id}`}>Pagar taxa de cancelamento</Link>
                      </Button>
                    )}
                    {intent && etapa === "concluido" ? (
                      <Button size="sm" asChild><Link to={`/comprovante/${intent.id}`}>Ver comprovante</Link></Button>
                    ) : intent ? (
                      <Button size="sm" variant="outline" asChild>
                        <Link to={`/pagamento/status?tipo=reserva&ref=${r.id}`}>Acompanhar pagamento</Link>
                      </Button>
                    ) : r.modo_cobranca === "corretagem" && r.status !== "expirada" && r.status !== "cancelada" ? (
                      <Button size="sm" asChild><Link to={`/pagamento?tipo=reserva&ref=${r.id}`}>Pagar agora</Link></Button>
                    ) : null}
                    {["solicitada", "pre_reservada", "confirmada"].includes(r.status) && (
                      <Button size="sm" variant="outline" onClick={() => setCancelando(r)}>
                        Cancelar reserva
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}

        <AlertDialog open={!!cancelando} onOpenChange={(o) => { if (!o) { setCancelando(null); setMotivo(""); } }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancelar esta reserva?</AlertDialogTitle>
              <AlertDialogDescription>
                {cancelando && dentroDaCarencia(cancelando)
                  ? `Você está dentro do prazo de carência de ${carencia} dias: o cancelamento é gratuito.`
                  : `O prazo de carência de ${carencia} dias já passou. Será cobrada a taxa de cancelamento de ${formatBRL(taxaCancel)}.`}
                {" "}A data será liberada na agenda do fornecedor.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
              placeholder="Motivo do cancelamento (opcional)"
            />
            <AlertDialogFooter>
              <AlertDialogCancel>Voltar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmarCancelamento}>Confirmar cancelamento</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
