import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  coupleId: string;
  onAdded: () => void;
}

/**
 * Adiciona ao Kanban um fornecedor que NÃO está na plataforma.
 * Útil para o casal contabilizar gastos com profissionais externos
 * (parente, indicação, contratado antes do app, etc.).
 */
export default function AddExternalSupplierDialog({ open, onOpenChange, coupleId, onAdded }: Props) {
  const { toast } = useToast();
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [categoria, setCategoria] = useState("");
  const [categoriaId, setCategoriaId] = useState<string | null>(null);
  const [valorEstimado, setValorEstimado] = useState("");
  const [saving, setSaving] = useState(false);
  const [categorias, setCategorias] = useState<Array<{ id: string; name: string; slug: string }>>([]);

  useEffect(() => {
    if (!open) return;
    supabase.from("categories").select("id, name, slug").order("name").then(({ data }) => {
      setCategorias((data || []) as any);
    });
  }, [open]);

  const reset = () => {
    setNome(""); setTelefone(""); setCategoria(""); setCategoriaId(null); setValorEstimado("");
  };

  const salvar = async () => {
    if (!nome.trim()) {
      toast({ title: "Informe o nome do fornecedor", variant: "destructive" });
      return;
    }
    if (!categoriaId) {
      toast({ title: "Selecione a categoria", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await (supabase.from("couple_suppliers") as any).insert({
      couple_id: coupleId,
      supplier_id: null,
      category_id: categoriaId,
      is_external: true,
      external_supplier_name: nome.trim(),
      external_supplier_phone: telefone.trim() || null,
      external_supplier_category: categoria || null,
      kanban_status: "fora_da_plataforma",
      status: "saved",
      estimated_value: valorEstimado ? Number(valorEstimado) : null,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao adicionar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Fornecedor externo adicionado", description: "Ele aparecerá na coluna 'Fora da plataforma' do seu kanban." });
    reset();
    onOpenChange(false);
    onAdded();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar fornecedor fora da plataforma</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Use isso para registrar profissionais que você contratou por fora (indicação, parente, etc.).
            O valor entra no seu orçamento total mas o fornecedor não recebe notificações.
          </p>
          <div>
            <Label htmlFor="ext-nome">Nome do fornecedor *</Label>
            <Input id="ext-nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Tio João — DJ" />
          </div>
          <div>
            <Label>Categoria *</Label>
            <Select value={categoriaId || ""} onValueChange={(v) => {
              setCategoriaId(v);
              const c = categorias.find((x) => x.id === v);
              if (c) setCategoria(c.name);
            }}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {categorias.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="ext-tel">Telefone (opcional)</Label>
            <Input id="ext-tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(11) 99999-9999" />
          </div>
          <div>
            <Label htmlFor="ext-valor">Valor estimado (R$)</Label>
            <Input id="ext-valor" type="number" value={valorEstimado} onChange={(e) => setValorEstimado(e.target.value)} placeholder="0,00" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={salvar} disabled={saving}>{saving ? "Salvando..." : "Adicionar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}