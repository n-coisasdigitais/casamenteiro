import { traduzirErro } from "@/lib/errorMessages";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Receipt } from "lucide-react";
import SEO from "@/components/SEO";
import { formatBRL } from "@/lib/platformPricing";
import SupplierShell from "@/components/supplier/SupplierShell";
import {
  ETAPA_LABEL,
  ETAPA_TONE,
  etapaDoStatus,
  formatarDataHora,
  TIPO_LABEL,
  METODO_LABEL,
  PaymentIntent,
} from "@/lib/pagamentos";

export default function FornecedorFaturas() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [carregando, setCarregando] = useState(true);
  const [cobrancas, setCobrancas] = useState<PaymentIntent[]>([]);
  const [faturas, setFaturas] = useState<any[]>([]);
  const [cancelandoId, setCancelandoId] = useState<string | null>(null);

  const cancelarTentativa = async (c: PaymentIntent) => {
    if (!confirm("Cancelar esta tentativa de pagamento? Ela sairá da sua lista de cobranças pendentes.")) return;
    setCancelandoId(c.id);
    const { data, error } = await (supabase.from("payment_intents" as any) as any)
      .update({ status: "cancelled" })
      .eq("id", c.id)
      .select("id");
    setCancelandoId(null);
    if (error) {
      toast({ title: "Erro", description: traduzirErro(error), variant: "destructive" });
      return;
    }
    if (!data || data.length === 0) {
      toast({
        title: "Não foi possível cancelar",
        description: "Esta cobrança já não está mais pendente. Atualize a página.",
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Tentativa cancelada" });
    setCobrancas((prev) => prev.filter((x) => x.id !== c.id));
  };

  useEffect(() => {
    if (!user) {
      navigate("/fornecedor/login");
      return;
    }
    (async () => {
      const { data: fornecedor } = await supabase.from("suppliers").select("id").eq("user_id", user.id).maybeSingle();
      if (!fornecedor) {
        setCarregando(false);
        return;
      }
      const [{ data: pi }, { data: inv }] = await Promise.all([
        supabase
          .from("payment_intents" as any)
          .select("*")
          .eq("supplier_id", fornecedor.id)
          .order("created_at", { ascending: false })
          .limit(100) as any,
        supabase
          .from("subscription_invoices" as any)
          .select("id, valor, status, ambiente, periodo_inicio, periodo_fim, pago_em, created_at")
          .eq("supplier_id", fornecedor.id)
          .order("created_at", { ascending: false })
          .limit(100) as any,
      ]);
      setCobrancas((pi as PaymentIntent[]) ?? []);
      setFaturas((inv as any[]) ?? []);
      setCarregando(false);
    })();
  }, [user, navigate]);

  return (
    <SupplierShell>
      <div className="container mx-auto max-w-5xl px-4 py-8 space-y-6">
        <SEO
          title="Faturas e pagamentos | Casamenteiro"
          description="Histórico de cobranças, assinaturas e destaques."
          noIndex
        />
        <div className="flex items-center gap-2">
          <Receipt className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-semibold">Faturas e pagamentos</h1>
        </div>

        {carregando ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
          </div>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Cobranças</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Pagamentos avulsos (reservas, destaques) e a autorização inicial da sua assinatura.
                </p>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {cobrancas.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma cobrança ainda.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Método</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Situação</TableHead>
                        <TableHead>Ambiente</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cobrancas.map((c) => {
                        const etapa = etapaDoStatus(c.status);
                        return (
                          <TableRow key={c.id}>
                            <TableCell>{formatarDataHora(c.created_at)}</TableCell>
                            <TableCell>{TIPO_LABEL[c.tipo] ?? c.tipo}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {METODO_LABEL[c.metodo] ?? "—"}
                            </TableCell>
                            <TableCell>{formatBRL(c.valor)}</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className={ETAPA_TONE[etapa]}>
                                {ETAPA_LABEL[etapa]}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {c.ambiente === "sandbox" ? "Testes" : "Produção"}
                            </TableCell>
                            <TableCell className="text-right space-x-2">
                              {etapa === "concluido" ? (
                                <Button size="sm" variant="outline" asChild>
                                  <Link to={`/comprovante/${c.id}`}>Comprovante</Link>
                                </Button>
                              ) : (
                                <>
                                  <Button size="sm" variant="outline" asChild>
                                    <Link to={`/pagamento/status?tipo=${c.tipo}&ref=${c.referencia_id}`}>
                                      Acompanhar
                                    </Link>
                                  </Button>
                                  {etapa === "pendente" && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="text-destructive hover:text-destructive"
                                      disabled={cancelandoId === c.id}
                                      onClick={() => cancelarTentativa(c)}
                                    >
                                      {cancelandoId === c.id ? "Cancelando…" : "Cancelar"}
                                    </Button>
                                  )}
                                </>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Faturas da assinatura</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Cobranças mensais recorrentes do seu plano, geradas automaticamente a cada ciclo.
                </p>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {faturas.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma fatura de assinatura emitida.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Emissão</TableHead>
                        <TableHead>Período</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Situação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {faturas.map((f) => (
                        <TableRow key={f.id}>
                          <TableCell>{formatarDataHora(f.created_at)}</TableCell>
                          <TableCell className="text-sm">
                            {formatarDataHora(f.periodo_inicio)} — {formatarDataHora(f.periodo_fim)}
                          </TableCell>
                          <TableCell>{formatBRL(f.valor)}</TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={
                                f.status === "pago"
                                  ? "bg-emerald-100 text-emerald-900"
                                  : f.status === "cancelada" || f.status === "cancelado"
                                    ? "bg-gray-200 text-gray-700"
                                    : "bg-amber-100 text-amber-900"
                              }
                            >
                              {f.status === "pago"
                                ? "Paga"
                                : f.status === "cancelada" || f.status === "cancelado"
                                  ? "Cancelada"
                                  : "Pendente"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </SupplierShell>
  );
}
