import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { calcularExpiraEm, formatarData } from "@/lib/reservas";
import { CalendarClock } from "lucide-react";
import { useFeatureFlag } from "@/contexts/FeatureFlagsContext";
import { formatBRL } from "@/lib/platformPricing";
import { gerarCorpoContratoHtml } from "@/lib/contratos";
import { carenciaCancelamentoDias, taxaCancelamento } from "@/lib/reservasConfig";

type Props = {
  supplierId: string;
  supplierName: string;
  promoDate: string; // YYYY-MM-DD
  discountPct?: number | null;
  estimatedValue?: number | null;
  pisoFornecedor?: number | null;
  markupPct?: number | null;
  valorOfertado?: number | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
};

export default function RequestReservationDialog({ supplierId, supplierName, promoDate, discountPct, estimatedValue, pisoFornecedor, markupPct, valorOfertado, open, onOpenChange }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const corretagemOn = useFeatureFlag("corretagem_datas_ociosas", false);
  const isCorretagem = corretagemOn && pisoFornecedor != null && valorOfertado != null;
  const [guests, setGuests] = useState<string>("");
  const [obs, setObs] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [carencia, setCarencia] = useState<number>(7);
  const [taxaCancel, setTaxaCancel] = useState<number>(0);

  useEffect(() => {
    if (!open) return;
    carenciaCancelamentoDias().then(setCarencia);
    taxaCancelamento().then(setTaxaCancel);
  }, [open]);

  const submit = async () => {
    if (!user) {
      toast({ title: "Faça login para solicitar", description: "É gratuito para o casal." });
      navigate("/login");
      return;
    }
    setSaving(true);
    const { data: coupleId } = await (supabase.rpc as any)("get_couple_id_for_user", { _user_id: user.id });
    if (!coupleId) {
      toast({ title: "Complete seu cadastro de casal antes de reservar", variant: "destructive" });
      setSaving(false);
      navigate("/onboarding");
      return;
    }
    const comissao = isCorretagem ? Number(valorOfertado) - Number(pisoFornecedor) : null;
    const payload: Record<string, unknown> = {
      supplier_id: supplierId,
      couple_id: coupleId,
      promo_date: promoDate,
      guest_count: guests ? Number(guests) : null,
      valor_estimado: isCorretagem ? valorOfertado : (estimatedValue ?? null),
      desconto_pct: discountPct ?? null,
      status: "solicitada",
      expira_em: calcularExpiraEm(promoDate),
      observacoes: obs || null,
      modo_cobranca: isCorretagem ? "corretagem" : "taxa_reserva",
      piso_fornecedor: isCorretagem ? pisoFornecedor : null,
      markup_pct: isCorretagem ? markupPct : null,
      valor_ofertado: isCorretagem ? valorOfertado : null,
      comissao_plataforma: comissao,
    };
    const { data: inserted, error } = await (supabase
      .from("idle_date_reservations" as any) as any)
      .insert(payload)
      .select("id")
      .maybeSingle();
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao solicitar", description: error.message, variant: "destructive" });
      return;
    }

    if (isCorretagem && inserted?.id) {
      // Gera contrato + linha do ledger. Erros aqui não devem cancelar a solicitação.
      const corpo = gerarCorpoContratoHtml({
        casalNome: user.user_metadata?.full_name || "Casal",
        fornecedorNome: supplierName,
        dataEvento: promoDate,
        valorOfertado: Number(valorOfertado),
      });
      await (supabase.from("reservation_contracts" as any) as any).insert({
        reservation_id: inserted.id,
        couple_id: coupleId,
        supplier_id: supplierId,
        piso: pisoFornecedor,
        valor_ofertado: valorOfertado,
        comissao,
        corpo_html: corpo,
        status: "rascunho",
      });
      await (supabase.from("commission_ledger" as any) as any).insert({
        reservation_id: inserted.id,
        supplier_id: supplierId,
        couple_id: coupleId,
        piso: pisoFornecedor,
        valor_ofertado: valorOfertado,
        comissao,
        status: "pendente",
      });
    }

    toast({
      title: isCorretagem ? "Reserva criada — finalize o pagamento" : "Solicitação enviada",
      description: isCorretagem
        ? "A data só é garantida após o pagamento confirmado."
        : "A data só é garantida após a confirmação do fornecedor. Você receberá uma notificação.",
    });
    onOpenChange(false);
    if (isCorretagem && inserted?.id) {
      navigate(`/pagamento?tipo=reserva&ref=${inserted.id}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            {isCorretagem ? "Reservar esta data" : "Solicitar reserva"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p>
            Você está solicitando <strong>{formatarData(promoDate)}</strong> com <strong>{supplierName}</strong>.
          </p>
          {isCorretagem ? (
            <div className="rounded-md bg-emerald-50 border border-emerald-200 p-3 text-emerald-900 text-xs space-y-1">
              <p>Valor total: <strong>{formatBRL(Number(valorOfertado))}</strong></p>
              <p>O pagamento é feito dentro da plataforma. A data só é garantida <strong>após o pagamento confirmado</strong>.</p>
              <p>Ao continuar você vai direto para o pagamento seguro.</p>
            </div>
          ) : (
            <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-amber-900 text-xs">
              A data só está garantida <strong>após a confirmação do fornecedor</strong>. Enquanto isso, o status é "aguardando confirmação".
              O fornecedor tem até 24h para responder. Você <strong>não paga nada</strong> — a taxa é cobrada do fornecedor.
            </div>
          )}
          <div className="rounded-md bg-muted/50 border p-3 text-xs">
            <strong>Reservar é gratuito.</strong> Você pode cancelar sem custo em até <strong>{carencia} dias</strong> após a solicitação.
            {taxaCancel > 0 && <> Depois desse prazo, o cancelamento tem taxa de <strong>{formatBRL(taxaCancel)}</strong>.</>}
          </div>
          <div>
            <Label>Número estimado de convidados</Label>
            <Input type="number" value={guests} onChange={e => setGuests(e.target.value)} placeholder="Opcional" />
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea value={obs} onChange={e => setObs(e.target.value)} rows={3} placeholder="Algum detalhe importante para o fornecedor?" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Enviando..." : isCorretagem ? "Reservar e pagar" : "Enviar solicitação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}