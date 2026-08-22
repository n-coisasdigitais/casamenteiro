import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TicketPercent, Loader2, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { resgatarCupom, descreverBeneficio } from "@/lib/beneficios";

/**
 * Campo "Tenho um cupom" na página de planos do fornecedor.
 * O benefício vale a partir do primeiro ciclo cobrado (depois do período de teste).
 */
export default function CupomInput({
  supplierId,
  planId,
  onResgatado,
}: {
  supplierId: string;
  planId?: string | null;
  onResgatado?: () => void;
}) {
  const { toast } = useToast();
  const [codigo, setCodigo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [ok, setOk] = useState<string | null>(null);

  const aplicar = async () => {
    const c = codigo.trim();
    if (!c) return;
    setEnviando(true);
    const r = await resgatarCupom(supplierId, c, planId ?? null);
    setEnviando(false);
    if (!r.ok) {
      toast({ title: "Cupom não aplicado", description: r.erro, variant: "destructive" });
      return;
    }
    const texto = descreverBeneficio({ tipo: r.tipo, valor: r.valor, ciclos_total: r.ciclos });
    setOk(texto);
    setCodigo("");
    toast({
      title: "Cupom aplicado!",
      description: `${texto}. O desconto entra na primeira cobrança, quando o período de teste terminar.`,
    });
    onResgatado?.();
  };

  return (
    <Card className="border-dashed">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <TicketPercent className="h-4 w-4 text-primary" />
          Tenho um cupom
        </div>
        <div className="flex gap-2">
          <Input
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.toUpperCase())}
            placeholder="Digite o código"
            className="uppercase"
            onKeyDown={(e) => {
              if (e.key === "Enter") aplicar();
            }}
          />
          <Button onClick={aplicar} disabled={enviando || !codigo.trim()} variant="secondary">
            {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aplicar"}
          </Button>
        </div>
        {ok ? (
          <Badge variant="secondary" className="bg-emerald-50 text-emerald-800">
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
            {ok}
          </Badge>
        ) : (
          <p className="text-xs text-muted-foreground">
            O desconto é aplicado na primeira cobrança, depois do período de teste gratuito.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
