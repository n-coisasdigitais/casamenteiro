import { useState } from "react";
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

type Props = {
  supplierId: string;
  supplierName: string;
  promoDate: string; // YYYY-MM-DD
  discountPct?: number | null;
  estimatedValue?: number | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
};

export default function RequestReservationDialog({ supplierId, supplierName, promoDate, discountPct, estimatedValue, open, onOpenChange }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [guests, setGuests] = useState<string>("");
  const [obs, setObs] = useState<string>("");
  const [saving, setSaving] = useState(false);

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
    const payload = {
      supplier_id: supplierId,
      couple_id: coupleId,
      promo_date: promoDate,
      guest_count: guests ? Number(guests) : null,
      valor_estimado: estimatedValue ?? null,
      desconto_pct: discountPct ?? null,
      status: "solicitada",
      expira_em: calcularExpiraEm(promoDate),
      observacoes: obs || null,
    };
    const { error } = await (supabase.from("idle_date_reservations" as any) as any).insert(payload);
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao solicitar", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: "Solicitação enviada",
      description: "A data só é garantida após a confirmação do fornecedor. Você receberá uma notificação.",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            Solicitar reserva
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p>
            Você está solicitando <strong>{formatarData(promoDate)}</strong> com <strong>{supplierName}</strong>.
          </p>
          <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-amber-900 text-xs">
            A data só está garantida <strong>após a confirmação do fornecedor</strong>. Enquanto isso, o status é "aguardando confirmação".
            O fornecedor tem até 24h para responder. Você <strong>não paga nada</strong> — a taxa é cobrada do fornecedor.
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
          <Button onClick={submit} disabled={saving}>{saving ? "Enviando..." : "Enviar solicitação"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}