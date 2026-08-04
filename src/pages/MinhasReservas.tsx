import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardNav from "@/components/DashboardNav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarRange, Loader2 } from "lucide-react";
import SEO from "@/components/SEO";
import { formatBRL } from "@/lib/platformPricing";
import { RESERVA_STATUS_LABEL, RESERVA_STATUS_TONE, formatarData, type ReservaStatus } from "@/lib/reservas";
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
  supplier?: { company_name?: string | null; city?: string | null } | null;
};

export default function MinhasReservas() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [intents, setIntents] = useState<Record<string, PaymentIntent | null>>({});
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!user) { navigate("/auth"); return; }
    (async () => {
      const { data: coupleId } = await (supabase.rpc as any)("get_couple_id_for_user", { _user_id: user.id });
      if (!coupleId) { setCarregando(false); return; }
      const { data } = await (supabase.from("idle_date_reservations" as any)
        .select("id, promo_date, status, valor_ofertado, valor_estimado, modo_cobranca, expira_em, supplier:suppliers(company_name, city)")
        .eq("couple_id", coupleId)
        .order("created_at", { ascending: false }) as any);
      const lista = (data as Reserva[]) ?? [];
      setReservas(lista);
      const pares = await Promise.all(lista.map(async (r) => [r.id, await buscarIntent("reserva", r.id)] as const));
      setIntents(Object.fromEntries(pares));
      setCarregando(false);
    })();
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />
      <div className="container mx-auto max-w-4xl px-4 py-8 space-y-6">
        <SEO title="Minhas reservas | Meu Grande Dia" description="Acompanhe o status das suas reservas de data." noIndex />
        <div className="flex items-center gap-2">
          <CalendarRange className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-semibold">Minhas reservas</h1>
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
                    {intent && etapa === "concluido" ? (
                      <Button size="sm" asChild><Link to={`/comprovante/${intent.id}`}>Ver comprovante</Link></Button>
                    ) : intent ? (
                      <Button size="sm" variant="outline" asChild>
                        <Link to={`/pagamento/status?tipo=reserva&ref=${r.id}`}>Acompanhar pagamento</Link>
                      </Button>
                    ) : r.modo_cobranca === "corretagem" && r.status !== "expirada" && r.status !== "cancelada" ? (
                      <Button size="sm" asChild><Link to={`/pagamento?tipo=reserva&ref=${r.id}`}>Pagar agora</Link></Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
