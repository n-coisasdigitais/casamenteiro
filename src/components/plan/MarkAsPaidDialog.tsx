import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function MarkAsPaidDialog({
  open, onOpenChange, paymentId, defaultAmount, onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  paymentId: string | null;
  defaultAmount: number;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setAmount(String(defaultAmount || ""));
      setDate(new Date().toISOString().slice(0, 10));
    }
  }, [open, defaultAmount]);

  const confirmar = async () => {
    if (!paymentId) return;
    setSaving(true);
    const { error } = await (supabase.from("budget_payments") as any).update({
      status: "paid",
      payment_date: date,
      amount: Number(amount),
    }).eq("id", paymentId);
    setSaving(false);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Pagamento registrado" });
    onOpenChange(false);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Marcar como pago</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Valor pago (R$)</Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <Label>Data do pagamento</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={confirmar} disabled={saving}>{saving ? "Salvando..." : "Confirmar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}