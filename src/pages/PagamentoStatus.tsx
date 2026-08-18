import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, Loader2, XCircle, RefreshCw } from "lucide-react";
import SEO from "@/components/SEO";
import { formatBRL } from "@/lib/platformPricing";
import {
  buscarIntent, ETAPA_LABEL, ETAPA_TONE, etapaDoStatus, formatarDataHora,
  previsaoLiberacao, TIPO_LABEL, PaymentIntent, EtapaPagamento,
} from "@/lib/pagamentos";

const ICONE: Record<EtapaPagamento, any> = {
  pendente: Clock,
  processando: Loader2,
  concluido: CheckCircle2,
  recusado: XCircle,
  expirado: XCircle,
  cancelado: XCircle,
};

const MENSAGEM: Record<EtapaPagamento, string> = {
  pendente: "Ainda não recebemos a confirmação do pagamento. Se você gerou um Pix ou boleto, conclua o pagamento para seguir.",
  processando: "Recebemos seu pagamento e ele está sendo analisado pelo Mercado Pago. Avisaremos assim que for confirmado.",
  concluido: "Pagamento confirmado! Tudo certo por aqui.",
  recusado: "O pagamento não foi aprovado. Você pode tentar novamente com outro meio de pagamento.",
  expirado: "Esta cobrança expirou. Gere uma nova para continuar.",
  cancelado: "Esta cobrança foi cancelada.",
};

export default function PagamentoStatus() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const tipo = params.get("tipo") ?? "";
  const ref = params.get("ref") ?? "";
  const [intent, setIntent] = useState<PaymentIntent | null>(null);
  const [carregando, setCarregando] = useState(true);
  const tentativas = useRef(0);

  const carregar = useCallback(async () => {
    if (!tipo || !ref) { setCarregando(false); return; }
    const data = await buscarIntent(tipo, ref);
    setIntent(data);
    setCarregando(false);
  }, [tipo, ref]);

  useEffect(() => { carregar(); }, [carregar]);

  // Enquanto não conclui, consulta a cada 5s (até ~3 min)
  useEffect(() => {
    const etapa = etapaDoStatus(intent?.status);
    if (etapa === "concluido" || etapa === "recusado" || etapa === "expirado") return;
    const t = setInterval(() => {
      tentativas.current += 1;
      if (tentativas.current > 36) { clearInterval(t); return; }
      carregar();
    }, 5000);
    return () => clearInterval(t);
  }, [intent, carregar]);

  const etapa = etapaDoStatus(intent?.status);
  const Icone = ICONE[etapa];
  const voltar = tipo === "reserva" ? "/meu-casamento/reservas" : "/fornecedor/faturas";

  return (
    <div className="container mx-auto max-w-2xl px-4 py-10">
      <SEO title="Status do pagamento | Casamenteiro" description="Acompanhe o status do seu pagamento." noIndex />
      <h1 className="text-2xl font-semibold mb-6">Status do pagamento</h1>

      {carregando ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Consultando...
        </div>
      ) : !intent ? (
        <Card>
          <CardContent className="p-6 space-y-4">
            <p className="text-sm text-muted-foreground">Não encontramos essa cobrança.</p>
            <Button variant="outline" onClick={() => navigate(voltar)}>Voltar</Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6 space-y-5">
            <div className="flex items-center gap-3">
              <Icone className={`h-8 w-8 ${etapa === "processando" ? "animate-spin" : ""} ${etapa === "concluido" ? "text-emerald-600" : etapa === "recusado" || etapa === "expirado" ? "text-destructive" : "text-amber-600"}`} />
              <div>
                <p className="text-lg font-medium">{ETAPA_LABEL[etapa]}</p>
                <p className="text-sm text-muted-foreground">{TIPO_LABEL[intent.tipo] ?? intent.tipo}</p>
              </div>
              <Badge className={`ml-auto ${ETAPA_TONE[etapa]}`} variant="secondary">
                {intent.ambiente === "sandbox" ? "Testes" : "Produção"}
              </Badge>
            </div>

            <p className="text-sm text-muted-foreground">{MENSAGEM[etapa]}</p>

            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-muted-foreground">Valor</dt><dd className="font-medium">{formatBRL(intent.valor)}</dd></div>
              <div><dt className="text-muted-foreground">Iniciado em</dt><dd className="font-medium">{formatarDataHora(intent.created_at)}</dd></div>
              <div><dt className="text-muted-foreground">Previsão de liberação</dt><dd className="font-medium">{previsaoLiberacao(intent)}</dd></div>
              <div><dt className="text-muted-foreground">Código do pagamento</dt><dd className="font-medium">{intent.mp_payment_id ?? "—"}</dd></div>
            </dl>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={carregar}>
                <RefreshCw className="h-4 w-4 mr-2" /> Atualizar
              </Button>
              {etapa === "concluido" && (
                <Button asChild><Link to={`/comprovante/${intent.id}`}>Ver comprovante</Link></Button>
              )}
              {(etapa === "recusado" || etapa === "expirado") && (
                <Button onClick={() => navigate(`/pagamento?tipo=${tipo}&ref=${ref}`)}>Tentar novamente</Button>
              )}
              <Button variant="ghost" asChild><Link to={voltar}>Voltar</Link></Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
