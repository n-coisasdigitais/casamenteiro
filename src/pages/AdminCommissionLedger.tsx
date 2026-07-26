import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { formatBRL } from "@/lib/platformPricing";
import { CORRETAGEM_STATUS_LEDGER } from "@/lib/corretagem";
import { formatarData } from "@/lib/reservas";
import { CalendarRange } from "lucide-react";

type Row = {
  id: string;
  reservation_id: string;
  piso: number;
  valor_ofertado: number;
  comissao: number;
  status: string;
  mp_payment_id: string | null;
  paid_at: string | null;
  created_at: string;
  suppliers?: { company_name?: string | null; city?: string | null } | null;
  couples?: { partner_name?: string | null } | null;
  idle_date_reservations?: { promo_date?: string | null } | null;
};

export default function AdminCommissionLedger() {
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase.from("commission_ledger" as any)
      .select("id, reservation_id, piso, valor_ofertado, comissao, status, mp_payment_id, paid_at, created_at, suppliers(company_name, city), couples(partner_name), idle_date_reservations(promo_date)")
      .order("created_at", { ascending: false })
      .limit(500) as any);
    setRows((data as Row[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const marcarPago = async (r: Row) => {
    // Enquanto MP não integra, admin pode marcar manualmente. Também confirma a reserva.
    const { error: e1 } = await (supabase.from("commission_ledger" as any) as any)
      .update({ status: "pago", paid_at: new Date().toISOString() })
      .eq("id", r.id);
    if (e1) { toast({ title: "Erro", description: e1.message, variant: "destructive" }); return; }
    await (supabase.from("idle_date_reservations" as any) as any)
      .update({ status: "confirmada", respondida_em: new Date().toISOString() })
      .eq("id", r.reservation_id);
    await (supabase.from("reservation_contracts" as any) as any)
      .update({ status: "emitido" })
      .eq("reservation_id", r.reservation_id);
    toast({ title: "Marcado como pago", description: "Reserva confirmada e contrato emitido." });
    load();
  };

  const setStatus = async (r: Row, status: string) => {
    const { error } = await (supabase.from("commission_ledger" as any) as any)
      .update({ status })
      .eq("id", r.id);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    load();
  };

  const totais = {
    pendente: rows.filter(r => r.status === "pendente").reduce((a, r) => a + Number(r.comissao || 0), 0),
    pago: rows.filter(r => r.status === "pago").reduce((a, r) => a + Number(r.comissao || 0), 0),
    estornado: rows.filter(r => r.status === "estornado").reduce((a, r) => a + Number(r.comissao || 0), 0),
  };

  return (
    <div className="container py-6 max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Corretagem — Ledger de comissões</h1>
        <p className="text-sm text-muted-foreground">
          Registro de todas as ofertas de corretagem geradas pela plataforma. Enquanto a integração Mercado Pago não é liberada, use "Marcar pago manualmente" para testes.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <KPI title="Comissão pendente" value={formatBRL(totais.pendente)} />
        <KPI title="Comissão paga" value={formatBRL(totais.pago)} />
        <KPI title="Comissão estornada" value={formatBRL(totais.estornado)} />
      </div>

      {loading ? <p>Carregando...</p> : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">Nenhum registro ainda.</p>
      ) : (
        <div className="space-y-3">
          {rows.map(r => (
            <Card key={r.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <CalendarRange className="h-4 w-4 text-primary" />
                      {r.idle_date_reservations?.promo_date ? formatarData(r.idle_date_reservations.promo_date) : "—"}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      <strong>{r.suppliers?.company_name || "Fornecedor"}</strong>
                      {r.suppliers?.city ? ` (${r.suppliers.city})` : ""} · {r.couples?.partner_name || "Casal"}
                    </p>
                  </div>
                  <Badge variant="secondary">{CORRETAGEM_STATUS_LEDGER[r.status] || r.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="text-sm flex flex-wrap gap-4 items-center">
                <span>Piso: <strong>{formatBRL(r.piso)}</strong></span>
                <span>Ofertado: <strong>{formatBRL(r.valor_ofertado)}</strong></span>
                <span>Comissão: <strong>{formatBRL(r.comissao)}</strong></span>
                {r.status === "pendente" && (
                  <Button size="sm" variant="outline" onClick={() => marcarPago(r)}>
                    Marcar pago manualmente
                  </Button>
                )}
                {r.status !== "pendente" && (
                  <Select value={r.status} onValueChange={(v) => setStatus(r, v)}>
                    <SelectTrigger className="h-8 w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="pago">Pago</SelectItem>
                      <SelectItem value="estornado">Estornado</SelectItem>
                      <SelectItem value="cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function KPI({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="border rounded-lg p-3 bg-card">
      <p className="text-xs text-muted-foreground">{title}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}