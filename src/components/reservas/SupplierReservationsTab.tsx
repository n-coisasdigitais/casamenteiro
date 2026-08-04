import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { calcularTaxa, formatBRL } from "@/lib/platformPricing";
import { RESERVA_STATUS_LABEL, RESERVA_STATUS_TONE, TAXA_STATUS_LABEL, formatarData, formatarDataHora, type ReservaStatus } from "@/lib/reservas";
import { Calendar, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

type Reserva = {
  id: string;
  couple_id: string;
  promo_date: string;
  guest_count: number | null;
  valor_estimado: number | null;
  desconto_pct: number | null;
  status: ReservaStatus;
  taxa_plataforma: number | null;
  taxa_status: string;
  observacoes: string | null;
  expira_em: string | null;
  solicitada_em: string;
  confirmada_em?: string | null;
  cancelada_em?: string | null;
  motivo_cancelamento?: string | null;
  couples?: { partner_name?: string | null; wedding_city?: string | null } | null;
};

export default function SupplierReservationsTab({ supplierId, categoriaSlug }: { supplierId: string; categoriaSlug?: string | null }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState<{ r: Reserva; taxa: number } | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase.from("idle_date_reservations" as any)
      .select("*, couples(partner_name, wedding_city)")
      .eq("supplier_id", supplierId)
      .order("solicitada_em", { ascending: false }) as any);
    setRows((data as Reserva[]) || []);
    setLoading(false);
  };

  useEffect(() => { if (supplierId) load(); }, [supplierId]);

  const abrirConfirmacao = async (r: Reserva) => {
    const { valor } = await calcularTaxa("reserva_data_ociosa", {
      categoriaSlug: categoriaSlug ?? null,
      valorBase: r.valor_estimado ?? undefined,
    });
    setConfirming({ r, taxa: valor });
  };

  const confirmar = async () => {
    if (!confirming) return;
    const { r, taxa } = confirming;
    const { error } = await (supabase.from("idle_date_reservations" as any) as any)
      .update({
        status: "confirmada",
        respondida_em: new Date().toISOString(),
        confirmada_em: new Date().toISOString(),
        taxa_plataforma: taxa,
        taxa_status: "pendente",
        taxa_memoria: { calculada_em: new Date().toISOString() },
      })
      .eq("id", r.id);
    setConfirming(null);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    if (taxa > 0) {
      toast({ title: "Reserva confirmada", description: `Falta pagar a taxa de ${formatBRL(taxa)} para liberar a data.` });
      navigate(`/pagamento?tipo=reserva&ref=${r.id}`);
      return;
    }
    toast({ title: "Reserva confirmada" });
    load();
  };

  const recusar = async (r: Reserva) => {
    const { error } = await (supabase.from("idle_date_reservations" as any) as any)
      .update({ status: "recusada", respondida_em: new Date().toISOString() })
      .eq("id", r.id);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Solicitação recusada" });
    load();
  };

  if (loading) return <p className="text-sm text-muted-foreground">Carregando reservas...</p>;

  const pendentes = rows.filter(r => r.status === "solicitada");
  const outras = rows.filter(r => r.status !== "solicitada");
  const taxasAbertas = rows.filter(r => r.status === "confirmada" && r.taxa_status === "pendente" && (r.taxa_plataforma ?? 0) > 0);

  return (
    <div className="space-y-6">
      <div className="rounded-md bg-muted/50 border p-3 text-xs text-muted-foreground">
        Ao confirmar uma reserva, o casal recebe a garantia da data e a taxa da plataforma é cobrada de você. Você pode recusar sem custos.
      </div>

      {taxasAbertas.length > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 flex flex-wrap items-center gap-3">
          <AlertTriangle className="h-4 w-4" />
          <span className="flex-1">
            Você tem {taxasAbertas.length} taxa(s) de reserva em aberto. Quite para manter a data garantida.
          </span>
          <Button size="sm" onClick={() => navigate(`/pagamento?tipo=reserva&ref=${taxasAbertas[0].id}`)}>
            Pagar {formatBRL(taxasAbertas[0].taxa_plataforma ?? 0)}
          </Button>
        </div>
      )}

      <section>
        <h3 className="font-semibold mb-2">Pendentes de resposta ({pendentes.length})</h3>
        {pendentes.length === 0 && <p className="text-sm text-muted-foreground italic">Nenhuma solicitação aguardando resposta.</p>}
        <div className="grid gap-3">
          {pendentes.map(r => (
            <ReservationCard key={r.id} r={r} onConfirm={() => abrirConfirmacao(r)} onDecline={() => recusar(r)} />
          ))}
        </div>
      </section>

      <section>
        <h3 className="font-semibold mb-2">Histórico</h3>
        {outras.length === 0 && <p className="text-sm text-muted-foreground italic">Sem histórico ainda.</p>}
        <div className="grid gap-3">
          {outras.map(r => (
            <ReservationCard
              key={r.id}
              r={r}
              onPay={
                r.status === "confirmada" && r.taxa_status === "pendente" && (r.taxa_plataforma ?? 0) > 0
                  ? () => navigate(`/pagamento?tipo=reserva&ref=${r.id}`)
                  : undefined
              }
            />
          ))}
        </div>
      </section>

      <AlertDialog open={!!confirming} onOpenChange={(o) => !o && setConfirming(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar disponibilidade?</AlertDialogTitle>
            <AlertDialogDescription>
              Ao confirmar, será cobrada a taxa de reserva de <strong>{formatBRL(confirming?.taxa || 0)}</strong>.
              A data <strong>{confirming ? formatarData(confirming.r.promo_date) : ""}</strong> será bloqueada na sua agenda e o casal receberá a confirmação.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmar}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ReservationCard({ r, onConfirm, onDecline, onPay }: { r: Reserva; onConfirm?: () => void; onDecline?: () => void; onPay?: () => void }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              {formatarData(r.promo_date)}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {r.couples?.partner_name || "Casal"} {r.couples?.wedding_city ? `· ${r.couples.wedding_city}` : ""}
            </p>
          </div>
          <Badge className={RESERVA_STATUS_TONE[r.status]}>{RESERVA_STATUS_LABEL[r.status]}</Badge>
        </div>
      </CardHeader>
      <CardContent className="text-sm space-y-2">
        <div className="grid grid-cols-2 gap-2 text-xs">
          {r.guest_count && <div>Convidados: <strong>{r.guest_count}</strong></div>}
          {r.valor_estimado != null && <div>Valor estimado: <strong>{formatBRL(r.valor_estimado)}</strong></div>}
          {r.desconto_pct != null && <div>Desconto: <strong>{r.desconto_pct}%</strong></div>}
          {r.taxa_plataforma != null && <div>Taxa plataforma: <strong>{formatBRL(r.taxa_plataforma)}</strong> ({TAXA_STATUS_LABEL[r.taxa_status as keyof typeof TAXA_STATUS_LABEL] || r.taxa_status})</div>}
        </div>
        {r.observacoes && <p className="text-muted-foreground italic">"{r.observacoes}"</p>}
        {r.status === "confirmada" && r.confirmada_em && (
          <p className="text-xs rounded-md bg-emerald-50 border border-emerald-200 p-2 text-emerald-900">
            Você confirmou esta data em <strong>{formatarDataHora(r.confirmada_em)}</strong>. A plataforma apenas intermedia:
            combine os detalhes com o casal e formalizem um contrato entre vocês.
          </p>
        )}
        {r.status === "cancelada" && (
          <p className="text-xs rounded-md bg-muted p-2">
            Cancelada pelo casal{r.cancelada_em ? ` em ${formatarDataHora(r.cancelada_em)}` : ""}.
            {r.motivo_cancelamento ? ` Motivo: ${r.motivo_cancelamento}` : ""}
            {r.taxa_status === "estornada" ? " A taxa paga será estornada." : ""}
          </p>
        )}
        {onConfirm && (
          <div className="flex gap-2 pt-2">
            <Button size="sm" onClick={onConfirm}><CheckCircle2 className="h-4 w-4 mr-1" /> Confirmar</Button>
            <Button size="sm" variant="outline" onClick={onDecline}><XCircle className="h-4 w-4 mr-1" /> Recusar</Button>
          </div>
        )}
        {onPay && (
          <div className="pt-2">
            <Button size="sm" onClick={onPay}>Pagar taxa da plataforma</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}