import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck } from "lucide-react";
import SEO from "@/components/SEO";
import { iniciarCheckout, CheckoutResposta } from "@/lib/monetizacao";
import { formatBRL } from "@/lib/platformPricing";
import { useFeatureFlag } from "@/contexts/FeatureFlagsContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

declare global {
  interface Window {
    MercadoPago?: any;
  }
}

function carregarSdkMp(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.MercadoPago) return resolve();
    const s = document.createElement("script");
    s.src = "https://sdk.mercadopago.com/js/v2";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Falha ao carregar o Mercado Pago"));
    document.body.appendChild(s);
  });
}

export default function Pagamento() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const transparenteFlag = useFeatureFlag("checkout_transparente", false);
  const tipo = (params.get("tipo") ?? "") as "reserva" | "assinatura" | "destaque" | "cancelamento";
  const ref = params.get("ref") ?? "";

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [checkout, setCheckout] = useState<CheckoutResposta | null>(null);
  const brickRef = useRef<HTMLDivElement | null>(null);
  const brickMontado = useRef(false);

  // Whitelabel (brick) só quando NÃO for ambiente de teste: o sandbox do MP quebra
  // assinatura recorrente com card_token ("Card token service not found").
  // Em sandbox, o checkout retorna checkout_url e caímos no redirect.
  const ehSandbox = checkout?.ambiente === "sandbox";
  // Whitelabel exige public_key; assinatura em sandbox sempre usa redirect.
  const transparente =
    transparenteFlag && !!checkout?.public_key && !(tipo === "assinatura" && ehSandbox);

  useEffect(() => {
    if (!tipo || !ref) {
      setErro("Cobrança inválida.");
      setCarregando(false);
      return;
    }
    (async () => {
      const { data, erro } = await iniciarCheckout(tipo, ref);
      if (erro || !data) setErro(erro ?? "Não foi possível iniciar o pagamento.");
      else setCheckout(data);
      setCarregando(false);
    })();
  }, [tipo, ref]);

  useEffect(() => {
    if (!transparente || !checkout?.public_key || brickMontado.current) return;
    brickMontado.current = true;
    (async () => {
      try {
        await carregarSdkMp();
        const mp = new window.MercadoPago(checkout.public_key, { locale: "pt-BR" });
        const bricks = mp.bricks();
        await bricks.create("payment", "mp-bricks", {
          initialization: { amount: checkout.valor },
          customization: { paymentMethods: { creditCard: "all", bankTransfer: "all" } },
          callbacks: {
            onReady: () => {},
            onError: () => toast({ title: "Erro no formulário de pagamento", variant: "destructive" }),
            onSubmit: async ({ formData }: any) => {
              const { data, error } = await supabase.functions.invoke("mp-process-payment", {
                body: { tipo, referencia_id: ref, formData },
              });
              if (error) {
                let detalhe = "Tente outro meio de pagamento.";
                try {
                  const ctx = (error as any)?.context;
                  if (ctx?.json) {
                    const j = await ctx.json();
                    if (j?.detalhe) detalhe = String(j.detalhe);
                  }
                } catch {
                  /* ignora */
                }
                toast({ title: "Pagamento não aprovado", description: detalhe, variant: "destructive" });
                throw error;
              }
              if (data?.status === "approved" || data?.status === "authorized") {
                toast({ title: tipo === "assinatura" ? "Assinatura ativada!" : "Pagamento aprovado!" });
              }
              if (tipo === "assinatura") {
                navigate("/fornecedor/planos?assinatura=ok");
              } else {
                navigate(`/pagamento/status?tipo=${tipo}&ref=${ref}`);
              }
            },
          },
        });
      } catch {
        brickMontado.current = false;
      }
    })();
  }, [transparente, checkout, tipo, ref, navigate, toast]);

  return (
    <div className="container mx-auto max-w-2xl px-4 py-10">
      <SEO title="Pagamento | Meu Grande Dia" description="Finalize seu pagamento com segurança." noIndex />
      <h1 className="text-2xl font-semibold mb-6">Finalizar pagamento</h1>

      {carregando ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Preparando o pagamento...
        </div>
      ) : erro ? (
        <Card>
          <CardContent className="p-6 space-y-4">
            <p className="text-sm text-destructive">{erro}</p>
            <Button variant="outline" onClick={() => navigate(-1)}>
              Voltar
            </Button>
          </CardContent>
        </Card>
      ) : checkout ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{checkout.titulo}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-2xl font-semibold">{formatBRL(checkout.valor)}</p>
            {checkout.ambiente === "sandbox" && (
              <p className="text-xs rounded-md bg-amber-50 border border-amber-200 p-2 text-amber-900">
                Ambiente de testes — nenhum valor real será cobrado.
              </p>
            )}

            {transparente && checkout.public_key ? (
              <div id="mp-bricks" ref={brickRef} />
            ) : checkout.checkout_url ? (
              <>
                <Button
                  className="w-full"
                  onClick={() => {
                    window.location.href = checkout.checkout_url;
                  }}
                >
                  Pagar com Mercado Pago
                </Button>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" /> Você será levado ao ambiente seguro do Mercado Pago.
                </p>
              </>
            ) : (
              <p className="text-sm text-destructive">
                Não foi possível gerar o link de pagamento. Tente novamente em instantes.
              </p>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
