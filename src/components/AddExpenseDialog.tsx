import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = [
  "recepção", "cerimônia", "decoração", "buffet", "bebidas", "foto-video",
  "música", "transporte", "convites", "alianças", "vestuário", "beleza",
  "lua-de-mel", "outros"
];

type AddExpenseDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coupleId?: string;
  onSuccess?: () => void;
};

export default function AddExpenseDialog({ open, onOpenChange, coupleId, onSuccess }: AddExpenseDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    description: "",
    category: "outros",
    estimated_cost: "",
    final_cost: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coupleId || !form.description || !form.estimated_cost) {
      toast({ title: "Erro", description: "Preencha todos os campos obrigatórios", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("budget_items").insert({
      couple_id: coupleId,
      description: form.description,
      category: form.category,
      estimated_cost: parseFloat(form.estimated_cost),
      final_cost: form.final_cost ? parseFloat(form.final_cost) : null,
      status: "estimated",
    });

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Sucesso", description: "Despesa criada com sucesso" });
      setForm({ description: "", category: "outros", estimated_cost: "", final_cost: "" });
      onOpenChange(false);
      onSuccess?.();
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar Despesa</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="description">Descrição *</Label>
            <Input
              id="description"
              placeholder="Ex: Buffet da festa"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="category">Categoria *</Label>
            <Select value={form.category} onValueChange={(value) => setForm({ ...form, category: value })}>
              <SelectTrigger id="category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="estimated_cost">Orçamento Estimado (R$) *</Label>
            <Input
              id="estimated_cost"
              type="number"
              placeholder="0.00"
              value={form.estimated_cost}
              onChange={(e) => setForm({ ...form, estimated_cost: e.target.value })}
              step="0.01"
              required
            />
          </div>
          <div>
            <Label htmlFor="final_cost">Custo Final (R$)</Label>
            <Input
              id="final_cost"
              type="number"
              placeholder="0.00"
              value={form.final_cost}
              onChange={(e) => setForm({ ...form, final_cost: e.target.value })}
              step="0.01"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adicionando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
