import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Parcela = { descricao: string; valor: string; vencimento: string };

export type ContractTarget = {
  coupleSupplierId: string;
  supplierId: string;
  supplierName: string;
  coupleId: string;
  suggestedValue?: number | null;
};

export default function ContractSupplierDialog({
  open, onOpenChange, target, onConfirmed,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  target: ContractTarget | null;
  onConfirmed: () => void;
}) {
  const { toast } = useToast();
  const [valor, setValor] = useState("");
  const [notas, setNotas] = useState("");
  const [parcelas, setParcelas] = useState<Parcela[]>([
    { descricao: "Sinal", valor: "", vencimento: "" },
  ]);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setValor(target?.suggestedValue ? String(target.suggestedValue) : "");
    setNotas("");
    setParcelas([{ descricao: "Sinal", valor: "", vencimento: "" }]);
  };

  const aplicarPreset = (preset: "vista" | "sinal" | "tres") => {
    const v = Number(valor || 0);
    if (!v) { toast({ title: "Defina o valor primeiro", variant: "destructive" }); return; }
    const today = new Date();
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const addMonths = (m: number) => { const d = new Date(today); d.setMonth(d.getMonth() + m); return d; };
    if (preset === "vista") {
      setParcelas([{ descricao: "Pagamento integral", valor: String(v), vencimento: fmt(today) }]);
    } else if (preset === "sinal") {
      const meio = Math.round(v / 2);
      setParcelas([
        { descricao: "Sinal 50%", valor: String(meio), vencimento: fmt(today) },
        { descricao: "Restante 50%", valor: String(v - meio), vencimento: fmt(addMonths(2)) },
      ]);
    } else {
      const a = Math.round(v * 0.3), b = Math.round(v * 0.3), c = v - a - b;
      setParcelas([
        { descricao: "Parcela 1", valor: String(a), vencimento: fmt(today) },
        { descricao: "Parcela 2", valor: String(b), vencimento: fmt(addMonths(1)) },
        { descricao: "Parcela 3", valor: String(c), vencimento: fmt(addMonths(2)) },
      ]);
    }
  };

  const confirmar = async () => {
    if (!target) return;
    const v = Number(valor);
    if (!v || v <= 0) { toast({ title: "Informe o valor contratado", variant: "destructive" }); return; }
    if (parcelas.length === 0) { toast({ title: "Adicione pelo menos uma parcela", variant: "destructive" }); return; }
    for (const p of parcelas) {
      if (!Number(p.valor) || !p.vencimento) {
        toast({ title: "Preencha todas as parcelas (valor e vencimento)", variant: "destructive" });
        return;
      }
    }
    setSaving(true);
    try {
      // 1. Atualiza couple_supplier — trigger sincroniza budget_items e tarefas.
      const { error: e1 } = await (supabase.from("couple_suppliers") as any).update({
        kanban_status: "contratado",
        contract_value: v,
        final_value: v,
        notes: notas || null,
      }).eq("id", target.coupleSupplierId);
      if (e1) throw e1;

      // 2. Localiza budget_item correspondente para vincular as parcelas.
      const { data: bi } = await supabase
        .from("budget_items").select("id")
        .eq("couple_id", target.coupleId)
        .eq("supplier_id", target.supplierId)
        .maybeSingle();

      if (bi?.id) {
        const rows = parcelas.map((p) => ({
          couple_id: target.coupleId,
          budget_item_id: bi.id,
          description: p.descricao,
          amount: Number(p.valor),
          due_date: p.vencimento,
          status: "pending",
        }));
        const { error: e2 } = await (supabase.from("budget_payments") as any).insert(rows);
        if (e2) throw e2;
      }

      toast({ title: "Fornecedor contratado!", description: "Parcelas salvas em Pagamentos." });
      onOpenChange(false);
      reset();
      onConfirmed();
    } catch (e: any) {
      toast({ title: "Erro ao contratar", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Contratar {target?.supplierName || "fornecedor"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="valor-contratado">Valor contratado (R$) *</Label>
            <Input
              id="valor-contratado"
              type="number"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder={target?.suggestedValue ? String(target.suggestedValue) : "0,00"}
            />
          </div>

          <div>
            <Label htmlFor="notas">Notas (opcional)</Label>
            <Textarea id="notas" rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Parcelas de pagamento</Label>
              <div className="flex gap-1">
                <Button type="button" size="sm" variant="outline" onClick={() => aplicarPreset("vista")}>À vista</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => aplicarPreset("sinal")}>50/50</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => aplicarPreset("tres")}>3x</Button>
              </div>
            </div>
            <div className="space-y-2">
              {parcelas.map((p, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-end">
                  <Input
                    className="col-span-5"
                    placeholder="Descrição"
                    value={p.descricao}
                    onChange={(e) => setParcelas((arr) => arr.map((x, j) => j === i ? { ...x, descricao: e.target.value } : x))}
                  />
                  <Input
                    className="col-span-3"
                    type="number"
                    placeholder="Valor"
                    value={p.valor}
                    onChange={(e) => setParcelas((arr) => arr.map((x, j) => j === i ? { ...x, valor: e.target.value } : x))}
                  />
                  <Input
                    className="col-span-3"
                    type="date"
                    value={p.vencimento}
                    onChange={(e) => setParcelas((arr) => arr.map((x, j) => j === i ? { ...x, vencimento: e.target.value } : x))}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="col-span-1 h-9 w-9"
                    onClick={() => setParcelas((arr) => arr.filter((_, j) => j !== i))}
                    disabled={parcelas.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => setParcelas((arr) => [...arr, { descricao: `Parcela ${arr.length + 1}`, valor: "", vencimento: "" }])}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar parcela
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={confirmar} disabled={saving}>{saving ? "Salvando..." : "Confirmar contratação"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}