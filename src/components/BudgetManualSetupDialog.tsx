import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  coupleId: string | null;
  onSuccess?: () => void;
};

type Default = {
  category_slug: string;
  pct_simples: number;
  pct_medio: number;
  pct_grande: number;
  display_order: number;
};

export default function BudgetManualSetupDialog({ open, onOpenChange, coupleId, onSuccess }: Props) {
  const { toast } = useToast();
  const [target, setTarget] = useState("");
  const [defaults, setDefaults] = useState<Default[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    (supabase.from("budget_distribution_defaults" as any).select("*").order("display_order") as any)
      .then(({ data }: any) => setDefaults(data || []));
  }, [open]);

  const submit = async () => {
    if (!coupleId) return;
    const total = Number(target);
    if (!total || total <= 0) {
      toast({ title: "Informe um valor válido", variant: "destructive" });
      return;
    }
    setSaving(true);

    // grava meta no casal
    await (supabase.from("couples") as any).update({ target_budget: total, budget_mode: "fixed" }).eq("id", coupleId);

    // escolhe distribuição por porte
    const pctKey: keyof Default = total < 60000 ? "pct_simples" : total < 150000 ? "pct_medio" : "pct_grande";

    // categorias slug → nome
    const slugs = defaults.map((d) => d.category_slug);
    const { data: cats } = await supabase.from("categories").select("slug, name").in("slug", slugs);
    const nameBySlug = new Map((cats || []).map((c: any) => [c.slug, c.name]));

    // verifica itens existentes
    const { data: existing } = await supabase
      .from("budget_items").select("category").eq("couple_id", coupleId);
    const existingSet = new Set((existing || []).map((i: any) => i.category));

    const inserts = defaults
      .filter((d) => !existingSet.has(d.category_slug))
      .map((d) => ({
        couple_id: coupleId,
        category: d.category_slug,
        description: nameBySlug.get(d.category_slug) || d.category_slug,
        estimated_cost: Math.round((total * Number(d[pctKey] || 0)) / 100),
        status: "estimated",
      }));

    if (inserts.length) {
      await (supabase.from("budget_items") as any).insert(inserts);
    }

    toast({ title: "Orçamento criado!", description: "Categorias adicionadas pela distribuição padrão." });
    setSaving(false);
    onOpenChange(false);
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Definir orçamento manualmente</DialogTitle>
          <DialogDescription>
            Informe quanto pretende investir. Vamos sugerir uma distribuição inicial por categoria que você pode ajustar depois.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Meta total (R$)</Label>
            <Input type="number" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="Ex: 80000" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={saving}>Criar orçamento</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
