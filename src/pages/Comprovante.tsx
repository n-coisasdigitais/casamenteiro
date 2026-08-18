import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Printer } from "lucide-react";
import SEO from "@/components/SEO";
import { formatBRL } from "@/lib/platformPricing";
import {
  buscarIntentPorId, ETAPA_LABEL, ETAPA_TONE, etapaDoStatus, formatarDataHora,
  PaymentIntent, TIPO_LABEL,
} from "@/lib/pagamentos";

type Detalhe = { rotulo: string; valor: string };

export default function Comprovante() {
  const { id = "" } = useParams();
  const [intent, setIntent] = useState<PaymentIntent | null>(null);
  const [detalhes, setDetalhes] = useState<Detalhe[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    (async () => {
      const i = await buscarIntentPorId(id);
      setIntent(i);
      if (i?.referencia_id) {
        const linhas: Detalhe[] = [];
        if (i.tipo === "assinatura") {
          const { data } = await (supabase.from("supplier_subscriptions" as any)
            .select("ciclo, status, current_period_start, current_period_end, plan:subscription_plans(nome)")
            .eq("id", i.referencia_id).maybeSingle() as any);
          if (data) {
            linhas.push({ rotulo: "Plano", valor: (data as any).plan?.nome ?? "—" });
            linhas.push({ rotulo: "Ciclo", valor: data.ciclo === "anual" ? "Anual" : "Mensal" });
            linhas.push({ rotulo: "Vigência", valor: `${formatarDataHora(data.current_period_start)} até ${formatarDataHora(data.current_period_end)}` });
          }
        } else if (i.tipo === "destaque") {
          const { data } = await (supabase.from("featured_purchases" as any)
            .select("dias, status, inicio, fim").eq("id", i.referencia_id).maybeSingle() as any);
          if (data) {
            linhas.push({ rotulo: "Produto", valor: `Destaque na busca — ${data.dias} dias` });
            linhas.push({ rotulo: "Período de destaque", valor: `${formatarDataHora(data.inicio)} até ${formatarDataHora(data.fim)}` });
          }
        } else {
          const { data } = await (supabase.from("idle_date_reservations" as any)
            .select("promo_date, status, guest_count, supplier:suppliers(company_name, city)")
            .eq("id", i.referencia_id).maybeSingle() as any);
          if (data) {
            linhas.push({ rotulo: "Fornecedor", valor: (data as any).supplier?.company_name ?? "—" });
            linhas.push({ rotulo: "Data reservada", valor: new Date(data.promo_date + "T00:00:00").toLocaleDateString("pt-BR") });
            if (data.guest_count) linhas.push({ rotulo: "Convidados", valor: String(data.guest_count) });
          }
        }
        setDetalhes(linhas);
      }
      setCarregando(false);
    })();
  }, [id]);

  const etapa = etapaDoStatus(intent?.status);

  return (
    <div className="container mx-auto max-w-2xl px-4 py-10 print:py-4">
      <SEO title="Comprovante de pagamento | Casamenteiro" description="Comprovante do seu pagamento." noIndex />

      {carregando ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando comprovante...
        </div>
      ) : !intent ? (
        <Card><CardContent className="p-6 text-sm text-muted-foreground">Comprovante não encontrado.</CardContent></Card>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4 print:hidden">
            <h1 className="text-2xl font-semibold">Comprovante</h1>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" /> Imprimir / salvar PDF
            </Button>
          </div>

          <Card className="print:border-0 print:shadow-none">
            <CardContent className="p-6 space-y-6">
              <div className="flex items-start justify-between gap-4 border-b pb-4">
                <div>
                  <p className="text-lg font-semibold">Casamenteiro</p>
                  <p className="text-sm text-muted-foreground">{TIPO_LABEL[intent.tipo] ?? intent.tipo}</p>
                </div>
                <Badge className={ETAPA_TONE[etapa]} variant="secondary">{ETAPA_LABEL[etapa]}</Badge>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Valor pago</p>
                <p className="text-3xl font-semibold">{formatBRL(intent.valor)}</p>
              </div>

              <dl className="grid sm:grid-cols-2 gap-3 text-sm">
                {detalhes.map((d) => (
                  <div key={d.rotulo}>
                    <dt className="text-muted-foreground">{d.rotulo}</dt>
                    <dd className="font-medium">{d.valor}</dd>
                  </div>
                ))}
                <div><dt className="text-muted-foreground">Data</dt><dd className="font-medium">{formatarDataHora(intent.updated_at)}</dd></div>
                <div><dt className="text-muted-foreground">Meio de pagamento</dt><dd className="font-medium">{intent.metodo === "bricks" ? "Checkout no site" : "Mercado Pago"}</dd></div>
                <div><dt className="text-muted-foreground">Código do pagamento</dt><dd className="font-medium">{intent.mp_payment_id ?? "—"}</dd></div>
                <div><dt className="text-muted-foreground">Identificador</dt><dd className="font-medium break-all">{intent.id}</dd></div>
              </dl>

              {intent.ambiente === "sandbox" && (
                <p className="text-xs rounded-md bg-amber-50 border border-amber-200 p-2 text-amber-900">
                  Comprovante de ambiente de testes — nenhum valor real foi cobrado.
                </p>
              )}

              <p className="text-xs text-muted-foreground border-t pt-4">
                Documento gerado eletronicamente pela plataforma Casamenteiro.
              </p>
            </CardContent>
          </Card>

          <div className="mt-4 print:hidden">
            <Button variant="ghost" asChild>
              <Link to={intent.tipo === "reserva" ? "/meu-casamento/reservas" : "/fornecedor/faturas"}>Voltar</Link>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
