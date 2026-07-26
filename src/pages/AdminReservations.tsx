import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Heart, ArrowLeft, CalendarRange, History } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { RESERVA_STATUS_LABEL, RESERVA_STATUS_TONE, TAXA_STATUS_LABEL, formatarData, type ReservaStatus, type TaxaStatus } from "@/lib/reservas";
import { formatBRL } from "@/lib/platformPricing";

type Row = {
  id: string;
  promo_date: string;
  status: ReservaStatus;
  taxa_plataforma: number | null;
  taxa_status: TaxaStatus;
  solicitada_em: string;
  supplier_id: string;
  suppliers?: { company_name?: string | null; city?: string | null } | null;
  couples?: { partner_name?: string | null; wedding_city?: string | null } | null;
};

export default function AdminReservations() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [checked, setChecked] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [tab, setTab] = useState<ReservaStatus | "todas">("todas");
  const [timelineFor, setTimelineFor] = useState<Row | null>(null);
  const [events, setEvents] = useState<any[]>([]);

  const abrirTimeline = async (r: Row) => {
    setTimelineFor(r);
    const { data } = await (supabase.from("reservation_events" as any)
      .select("*").eq("reservation_id", r.id).order("created_at", { ascending: true }) as any);
    setEvents((data as any[]) || []);
  };

  const load = async () => {
    const { data } = await (supabase.from("idle_date_reservations" as any)
      .select("id, promo_date, status, taxa_plataforma, taxa_status, solicitada_em, supplier_id, suppliers(company_name, city), couples(partner_name, wedding_city)")
      .order("solicitada_em", { ascending: false })
      .limit(500) as any);
    setRows((data as Row[]) || []);
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login"); return; }
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }).then(({ data }) => {
      if (!data) { navigate("/"); return; }
      setChecked(true);
      load();
    });
  }, [user, authLoading, navigate]);

  const filtered = tab === "todas" ? rows : rows.filter(r => r.status === tab);

  const total = rows.length || 1;
  const kpis = {
    solicitada: rows.filter(r => r.status === "solicitada").length,
    confirmada: rows.filter(r => r.status === "confirmada").length,
    recusada: rows.filter(r => r.status === "recusada").length,
    expirada: rows.filter(r => r.status === "expirada").length,
    conversao: Math.round((rows.filter(r => r.status === "confirmada").length / total) * 100),
    receitaPendente: rows.filter(r => r.taxa_status === "pendente").reduce((a, r) => a + Number(r.taxa_plataforma || 0), 0),
    receitaPaga: rows.filter(r => r.taxa_status === "paga").reduce((a, r) => a + Number(r.taxa_plataforma || 0), 0),
  };

  const marcarTaxa = async (id: string, novo: TaxaStatus) => {
    const { error } = await (supabase.from("idle_date_reservations" as any) as any).update({ taxa_status: novo }).eq("id", id);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Status da taxa atualizado" });
    load();
  };

  if (!checked) return <div className="min-h-screen flex items-center justify-center">Verificando...</div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b sticky top-0 z-40">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild><Link to="/admin"><ArrowLeft className="h-4 w-4" /></Link></Button>
            <Heart className="h-5 w-5 text-primary fill-primary" />
            <span className="font-bold">Reservas de datas ociosas</span>
          </div>
        </div>
      </header>
      <main className="container py-6 max-w-6xl space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <KPI title="Solicitadas" value={kpis.solicitada} />
          <KPI title="Confirmadas" value={kpis.confirmada} />
          <KPI title="Recusadas" value={kpis.recusada} />
          <KPI title="Expiradas" value={kpis.expirada} />
          <KPI title="Conversão" value={`${kpis.conversao}%`} />
          <KPI title="Taxa pendente" value={formatBRL(kpis.receitaPendente)} />
          <KPI title="Taxa paga" value={formatBRL(kpis.receitaPaga)} />
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList>
            <TabsTrigger value="todas">Todas</TabsTrigger>
            <TabsTrigger value="solicitada">Solicitadas</TabsTrigger>
            <TabsTrigger value="confirmada">Confirmadas</TabsTrigger>
            <TabsTrigger value="recusada">Recusadas</TabsTrigger>
            <TabsTrigger value="expirada">Expiradas</TabsTrigger>
          </TabsList>
          <TabsContent value={tab} className="space-y-3 mt-4">
            {filtered.length === 0 && <p className="text-sm text-muted-foreground italic">Nenhuma reserva.</p>}
            {filtered.map(r => (
              <Card key={r.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <CalendarRange className="h-4 w-4 text-primary" />
                        {formatarData(r.promo_date)}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        <strong>{r.suppliers?.company_name || "Fornecedor"}</strong>
                        {r.suppliers?.city ? ` (${r.suppliers.city})` : ""}
                        {" · "}
                        {r.couples?.partner_name || "Casal"}
                        {r.couples?.wedding_city ? ` (${r.couples.wedding_city})` : ""}
                      </p>
                    </div>
                    <Badge className={RESERVA_STATUS_TONE[r.status]}>{RESERVA_STATUS_LABEL[r.status]}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="text-sm flex flex-wrap gap-4 items-center">
                  {r.taxa_plataforma != null && (
                    <>
                      <span>Taxa: <strong>{formatBRL(r.taxa_plataforma)}</strong></span>
                      <span className="text-xs">Status taxa: <Badge variant="secondary">{TAXA_STATUS_LABEL[r.taxa_status]}</Badge></span>
                      {r.status === "confirmada" && (
                        <Select value={r.taxa_status} onValueChange={(v) => marcarTaxa(r.id, v as TaxaStatus)}>
                          <SelectTrigger className="h-8 w-40"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pendente">Pendente</SelectItem>
                            <SelectItem value="faturada">Faturada</SelectItem>
                            <SelectItem value="paga">Paga</SelectItem>
                            <SelectItem value="estornada">Estornada</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </>
                  )}
                  <Button size="sm" variant="ghost" className="ml-auto" onClick={() => abrirTimeline(r)}>
                    <History className="h-3 w-3 mr-1" /> Timeline
                  </Button>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>

        <Sheet open={!!timelineFor} onOpenChange={(v) => { if (!v) { setTimelineFor(null); setEvents([]); } }}>
          <SheetContent className="sm:max-w-md overflow-auto">
            <SheetHeader>
              <SheetTitle>Timeline da reserva</SheetTitle>
            </SheetHeader>
            {timelineFor && (
              <div className="mt-4 space-y-3">
                <p className="text-sm">
                  <strong>{formatarData(timelineFor.promo_date)}</strong> · {timelineFor.suppliers?.company_name || "Fornecedor"}
                </p>
                <ol className="relative border-l pl-4 space-y-3">
                  {events.length === 0 && <li className="text-xs text-muted-foreground italic">Sem eventos registrados.</li>}
                  {events.map((e) => (
                    <li key={e.id} className="text-xs">
                      <div className="absolute -left-1.5 h-3 w-3 rounded-full bg-primary" />
                      <p className="font-medium capitalize">{String(e.tipo).replace(/_/g, " ")}
                        {e.from_status && <span className="ml-1 text-muted-foreground">({e.from_status} → {e.to_status})</span>}
                        {!e.from_status && e.to_status && <span className="ml-1 text-muted-foreground">→ {e.to_status}</span>}
                      </p>
                      <p className="text-muted-foreground">{new Date(e.created_at).toLocaleString("pt-BR")}</p>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </main>
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