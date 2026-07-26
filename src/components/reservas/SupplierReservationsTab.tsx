import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { calcularTaxa, formatBRL } from "@/lib/platformPricing";
import { RESERVA_STATUS_LABEL, RESERVA_STATUS_TONE, TAXA_STATUS_LABEL, formatarData, type ReservaStatus } from "@/lib/reservas";
import { Calendar, CheckCircle2, XCircle } from "lucide-react";

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
  couples?: { partner_name?: string | null; wedding_city?: string | null } | null;
};

export default function SupplierReservationsTab({ supplierId, categoriaSlug }: { supplierId: string; categoriaSlug?: string | null }) {
  const { user } = useAuth();
  const { toast } = useToast();
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
        taxa_plataforma: taxa,
        taxa_status: "pendente",
        taxa_memoria: { calculada_em: new Date().toISOString() },
      })
      .eq("id", r.id);
    setConfirming(null);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Reserva confirmada", description: `Taxa de ${formatBRL(taxa)} ficará como pendente até compensação.` });
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

  return (
    <div className="space-y-6">
      <div className="rounded-md bg-muted/50 border p-3 text-xs text-muted-foreground">
        Ao confirmar uma reserva, o casal recebe a garantia da data e a taxa da plataforma é cobrada de você. Você pode recusar sem custos.
      </div>

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
          {outras.map(r => <ReservationCard key={r.id} r={r} />)}
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

function ReservationCard({ r, onConfirm, onDecline }: { r: Reserva; onConfirm?: () => void; onDecline?: () => void }) {
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
        {onConfirm && (
          <div className="flex gap-2 pt-2">
            <Button size="sm" onClick={onConfirm}><CheckCircle2 className="h-4 w-4 mr-1" /> Confirmar</Button>
            <Button size="sm" variant="outline" onClick={onDecline}><XCircle className="h-4 w-4 mr-1" /> Recusar</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}