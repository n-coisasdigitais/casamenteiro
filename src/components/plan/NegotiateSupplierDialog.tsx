import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export type NegotiateTarget = {
  coupleSupplierId: string;
  supplierName: string;
  suggestedValue?: number | null;
  currentNotes?: string | null;
};

export default function NegotiateSupplierDialog({
  open, onOpenChange, target, onConfirmed,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  target: NegotiateTarget | null;
  onConfirmed: () => void;
}) {
  const { toast } = useToast();
  const [valor, setValor] = useState("");
  const [notas, setNotas] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && target) {
      setValor(target.suggestedValue ? String(target.suggestedValue) : "");
      setNotas(target.currentNotes || "");
    }
  }, [open, target]);

  const confirmar = async () => {
    if (!target) return;
    const v = Number(valor);
    if (!v || v <= 0) {
      toast({ title: "Informe o valor proposto", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { error } = await (supabase.from("couple_suppliers") as any).update({
        kanban_status: "negociando",
        proposed_value: v,
        notes: notas || null,
      }).eq("id", target.coupleSupplierId);
      if (error) throw error;
      toast({ title: "Negociação atualizada", description: `Valor proposto: R$ ${v.toLocaleString("pt-BR")}` });
      onOpenChange(false);
      onConfirmed();
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Negociando com {target?.supplierName || "fornecedor"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="valor-negociado">Valor proposto / em negociação (R$) *</Label>
            <Input
              id="valor-negociado"
              type="number"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="0,00"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Use este campo para registrar o valor da contraproposta — mesmo que a negociação tenha acontecido fora da plataforma.
            </p>
          </div>
          <div>
            <Label htmlFor="notas-neg">Notas da negociação (opcional)</Label>
            <Textarea id="notas-neg" rows={3} value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Condições, prazos, observações..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={confirmar} disabled={saving}>{saving ? "Salvando..." : "Salvar negociação"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}