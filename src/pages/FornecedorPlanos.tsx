import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Loader2, RefreshCw, Sparkles } from "lucide-react";
import SEO from "@/components/SEO";
import { useToast } from "@/hooks/use-toast";
import { useFeatureFlag } from "@/contexts/FeatureFlagsContext";
import { formatBRL } from "@/lib/platformPricing";
import SupplierShell from "@/components/supplier/SupplierShell";
import {
  listarPlanos,
  assinaturaAtual,
  criarAssinatura,
  sincronizarAssinatura,

  criarCompraDestaque,
  ASSINATURA_STATUS_LABEL,
  DESTAQUE_STATUS_LABEL,
  PACOTES_DESTAQUE,
  listarPacotesDestaque,
  type Plano,
  type Assinatura,
  type PacoteDestaque,
} from "@/lib/monetizacao";
import CupomInput from "@/components/plan/CupomInput";
import {
  BENEFICIO_ORIGEM_LABEL,
  beneficiosPendentes,
  descreverBeneficio,
  type Beneficio,
} from "@/lib/beneficios";

export default function FornecedorPlanos() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const assinaturaOn = useFeatureFlag("assinatura_fornecedor", false);
  const destaqueOn = useFeatureFlag("destaque_pago", false);
  const cuponsOn = useFeatureFlag("cupons", false);

  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [pacotes, setPacotes] = useState<PacoteDestaque[]>([]);
  const [assinatura, setAssinatura] = useState<Assinatura | null>(null);
  const [destaques, setDestaques] = useState<any[]>([]);
  const [ciclo, setCiclo] = useState<"mensal" | "anual">("mensal");
  const [carregando, setCarregando] = useState(true);
  const [processando, setProcessando] = useState<string | null>(null);
  const [beneficios, setBeneficios] = useState<Beneficio[]>([]);

  const recarregarBeneficios = async () => {
    if (supplierId) setBeneficios(await beneficiosPendentes(supplierId));
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
      setSupplierId(fornecedor.id);
      setBeneficios(await beneficiosPendentes(fornecedor.id));
      const [ps, a, pk] = await Promise.all([listarPlanos(), assinaturaAtual(fornecedor.id), listarPacotesDestaque()]);
      setPlanos(ps);
      setAssinatura(a);
      setPacotes(
        pk.length > 0
          ? pk
          : PACOTES_DESTAQUE.map((p) => ({
              id: `fallback-${p.dias}`,
              label: p.label,
              dias: p.dias,
              valor: p.valor,
              ativo: true,
              ordem: p.dias,
            })),
      );
      const { data: fp } = await (supabase
        .from("featured_purchases" as any)
        .select("id, dias, valor, status, inicio, fim")
        .eq("supplier_id", fornecedor.id)
        .order("created_at", { ascending: false })
        .limit(5) as any);
      setDestaques((fp as any[]) ?? []);
      setCarregando(false);
    })();
  }, [user, navigate]);

  const verificarPagamento = async () => {
    if (!supplierId || !assinatura) return;
    setProcessando("sync");
    const { ok, encontrado, erro } = await sincronizarAssinatura(assinatura.id);
    if (ok && encontrado) {
      setAssinatura(await assinaturaAtual(supplierId));
      toast({ title: "Assinatura ativada!", description: "Encontramos seu pagamento e liberamos o plano." });
    } else {
      toast({
        title: "Nenhum pagamento confirmado ainda",
        description: erro ?? "Se você acabou de pagar, aguarde alguns minutos e tente de novo.",
        variant: erro ? "destructive" : "default",
      });
    }
    setProcessando(null);
  };

  const assinar = async (plano: Plano) => {

    if (!supplierId) return;
    setProcessando(plano.id);
    const { id, erro, ativadaDireto, trocaDireta } = await criarAssinatura({ supplierId, plano, ciclo });
    setProcessando(null);
    if (erro || !id) {
      toast({ title: "Não foi possível alterar o plano", description: erro, variant: "destructive" });
      return;
    }
    if (ativadaDireto) {
      toast({ title: "Plano Essencial ativado", description: "Você já pode receber pedidos de orçamento." });
      setAssinatura(await assinaturaAtual(supplierId));
      return;
    }
    if (trocaDireta) {
      toast({
        title: "Plano alterado!",
        description: "O novo valor passa a valer na próxima cobrança. Nenhum pagamento agora.",
      });
      setAssinatura(await assinaturaAtual(supplierId));
      return;
    }
    navigate(`/pagamento?tipo=assinatura&ref=${id}`);
  };

  const comprarDestaque = async (dias: number, valor: number) => {
    if (!supplierId) return;
    setProcessando(`destaque-${dias}`);
    const { id, erro } = await criarCompraDestaque({ supplierId, dias, valor });
    setProcessando(null);
    if (erro || !id) {
      toast({ title: "Não foi possível iniciar a compra", description: erro, variant: "destructive" });
      return;
    }
    navigate(`/pagamento?tipo=destaque&ref=${id}`);
  };

  if (carregando) {
    return (
      <SupplierShell>
        <div className="container mx-auto px-4 py-16 flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando planos...
        </div>
      </SupplierShell>
    );
  }

  if (!supplierId) {
    return (
      <SupplierShell>
        <div className="container mx-auto max-w-xl px-4 py-16 text-center space-y-4">
          <p>Complete o cadastro do seu negócio para acessar os planos.</p>
          <Button onClick={() => navigate("/fornecedor/cadastro")}>Completar cadastro</Button>
        </div>
      </SupplierShell>
    );
  }

  return (
    <SupplierShell>
      <div className="container mx-auto max-w-5xl px-4 py-10 space-y-10">
        <SEO
          title="Planos e destaques | Casamenteiro"
          description="Escolha seu plano e amplie a visibilidade do seu negócio."
          noIndex
        />

        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Planos e destaques</h1>
          <p className="text-muted-foreground text-sm">
            Escolha o plano que combina com o seu momento e turbine sua visibilidade na busca.
          </p>
          {assinatura && (
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">
                Assinatura atual: {ASSINATURA_STATUS_LABEL[assinatura.status] ?? assinatura.status}
                {assinatura.current_period_end
                  ? ` · até ${new Date(assinatura.current_period_end).toLocaleDateString("pt-BR")}`
                  : ""}
              </Badge>
              {assinatura.status !== "ativa" && (
                <Button size="sm" variant="outline" onClick={verificarPagamento} disabled={processando === "sync"}>
                  {processando === "sync" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Já paguei, verificar
                </Button>
              )}
            </div>
          )}
        </header>


        {!assinaturaOn ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              As assinaturas serão liberadas em breve. Enquanto isso, seu perfil segue ativo no plano Essencial.
            </CardContent>
          </Card>
        ) : (
          <section className="space-y-4">
            {cuponsOn && supplierId && (
              <div className="grid gap-4 md:grid-cols-2">
                <CupomInput supplierId={supplierId} onResgatado={recarregarBeneficios} />
                {beneficios.length > 0 && (
                  <Card className="border-emerald-200 bg-emerald-50/50">
                    <CardContent className="p-4 space-y-2">
                      <p className="text-sm font-medium text-emerald-900">Descontos na sua próxima cobrança</p>
                      {beneficios.map((b) => (
                        <p key={b.id} className="text-sm text-emerald-800">
                          • {descreverBeneficio(b)} ({BENEFICIO_ORIGEM_LABEL[b.origem] ?? b.origem})
                        </p>
                      ))}
                      <p className="text-xs text-emerald-700">
                        Aplicados a partir da primeira cobrança, com teto de 100% por mês.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            <Tabs value={ciclo} onValueChange={(v) => setCiclo(v as "mensal" | "anual")}>
              <TabsList>
                <TabsTrigger value="mensal">Mensal</TabsTrigger>
                <TabsTrigger value="anual">Anual (2 meses grátis)</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="grid gap-4 md:grid-cols-3">
              {planos.map((p) => {
                const preco = ciclo === "anual" ? p.preco_anual : p.preco_mensal;
                const atual = assinatura?.plan_id === p.id && assinatura?.status === "ativa";
                return (
                  <Card key={p.id} className={p.destaque_busca ? "border-primary" : undefined}>
                    <CardHeader className="space-y-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {p.nome}
                        {p.destaque_busca && <Sparkles className="h-4 w-4 text-primary" />}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">{p.descricao}</p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-2xl font-semibold">
                        {preco > 0 ? formatBRL(preco) : "Grátis"}
                        {preco > 0 && (
                          <span className="text-sm font-normal text-muted-foreground">
                            /{ciclo === "anual" ? "ano" : "mês"}
                          </span>
                        )}
                      </p>
                      <ul className="space-y-1 text-sm">
                        {p.beneficios.map((b) => (
                          <li key={b} className="flex gap-2">
                            <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                      <Button
                        className="w-full"
                        variant={p.destaque_busca ? "default" : "outline"}
                        disabled={atual || processando === p.id}
                        onClick={() => assinar(p)}
                      >
                        {atual
                          ? "Plano atual"
                          : processando === p.id
                            ? "Aguarde..."
                            : preco > 0
                              ? "Assinar"
                              : "Usar plano grátis"}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        )}

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Destaque na busca</h2>
            <p className="text-sm text-muted-foreground">
              Apareça no topo dos resultados e receba mais pedidos de orçamento.
            </p>
          </div>

          {!destaqueOn ? (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">
                A compra de destaque será liberada em breve.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {pacotes.map((pac) => (
                <Card key={pac.id}>
                  <CardHeader>
                    <CardTitle className="text-base">{pac.label}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-xl font-semibold">{formatBRL(pac.valor)}</p>
                    <Button
                      className="w-full"
                      variant="outline"
                      disabled={processando === `destaque-${pac.dias}`}
                      onClick={() => comprarDestaque(pac.dias, pac.valor)}
                    >
                      {processando === `destaque-${pac.dias}` ? "Aguarde..." : "Comprar destaque"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {destaques.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Meus destaques</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {destaques.map((d) => (
                  <div key={d.id} className="flex items-center justify-between border-t pt-2 first:border-0 first:pt-0">
                    <span>
                      {d.dias} dias · {formatBRL(Number(d.valor))}
                    </span>
                    <div className="flex items-center gap-2">
                      {d.fim && (
                        <span className="text-xs text-muted-foreground">
                          até {new Date(d.fim).toLocaleDateString("pt-BR")}
                        </span>
                      )}
                      <Badge variant="secondary">{DESTAQUE_STATUS_LABEL[d.status] ?? d.status}</Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </section>
      </div>
    </SupplierShell>
  );
}
