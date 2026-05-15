import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { slugify } from "@/lib/slugify";

type Cat = {
  id?: string;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
  active: boolean;
};

const EMOJIS = ["📷","🎵","🍰","💐","💍","👗","🤵","🚗","✉️","🏛️","🎬","💄","🍽️","🎂","🎉","🌸"];

export default function CategoryFormDialog({
  open, onOpenChange, category, onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  category: Cat | null;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [data, setData] = useState<Cat>({ name: "", slug: "", icon: "", description: "", active: true });
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (category) {
      setData({ ...category, icon: category.icon || "", description: category.description || "" });
      setSlugTouched(true);
    } else {
      setData({ name: "", slug: "", icon: "", description: "", active: true });
      setSlugTouched(false);
    }
  }, [category, open]);

  const onName = (v: string) => {
    setData((d) => ({ ...d, name: v, slug: slugTouched ? d.slug : slugify(v) }));
  };

  const save = async () => {
    if (!data.name.trim() || !data.slug.trim()) {
      toast({ title: "Nome e slug são obrigatórios", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      name: data.name.trim(),
      slug: data.slug.trim(),
      icon: data.icon || null,
      description: data.description || null,
      active: data.active,
    };
    const q = data.id
      ? supabase.from("categories").update(payload).eq("id", data.id)
      : supabase.from("categories").insert(payload);
    const { error } = await q;
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: data.id ? "Categoria atualizada" : "Categoria criada" });
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{data.id ? "Editar categoria" : "Nova categoria"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nome</Label>
            <Input value={data.name} onChange={(e) => onName(e.target.value)} placeholder="Ex: Fotografia" />
          </div>
          <div>
            <Label>Slug</Label>
            <Input
              value={data.slug}
              onChange={(e) => { setSlugTouched(true); setData({ ...data, slug: slugify(e.target.value) }); }}
              placeholder="fotografia"
            />
          </div>
          <div>
            <Label>Ícone (emoji)</Label>
            <Input value={data.icon || ""} onChange={(e) => setData({ ...data, icon: e.target.value })} placeholder="📷" />
            <div className="flex flex-wrap gap-1 mt-2">
              {EMOJIS.map((e) => (
                <button key={e} type="button" onClick={() => setData({ ...data, icon: e })}
                  className="h-8 w-8 rounded border hover:bg-muted text-lg">{e}</button>
              ))}
            </div>
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea rows={3} value={data.description || ""} onChange={(e) => setData({ ...data, description: e.target.value })}
              placeholder="Aparece para o fornecedor no cadastro" />
          </div>
          <div className="flex items-center justify-between">
            <Label>Ativo</Label>
            <Switch checked={data.active} onCheckedChange={(v) => setData({ ...data, active: v })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
