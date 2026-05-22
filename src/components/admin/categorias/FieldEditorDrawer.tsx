import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { snakeKey } from "@/lib/slugify";

export type Campo = {
  id?: string;
  category_id: string;
  chave: string;
  label: string;
  tipo: "texto" | "numero" | "select" | "lista" | "textarea" | "booleano" | "checkbox" | "faixa";
  opcoes: string[] | null;
  obrigatorio: boolean;
  ativo: boolean;
  ordem: number;
  is_base?: boolean;
  placeholder?: string | null;
  mostrar_no_perfil?: boolean;
};

const TIPO_OPTIONS: { value: Campo["tipo"]; label: string }[] = [
  { value: "texto", label: "Texto" },
  { value: "numero", label: "Número" },
  { value: "select", label: "Seleção única" },
  { value: "lista", label: "Múltipla escolha" },
];

export default function FieldEditorDrawer({
  open, onOpenChange, campo, categoryId, existingKeys, onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  campo: Campo | null;
  categoryId: string;
  existingKeys: string[];
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [data, setData] = useState<Campo>({
    category_id: categoryId, chave: "", label: "", tipo: "texto",
    opcoes: null, obrigatorio: false, ativo: true, ordem: 0, is_base: false, placeholder: "", mostrar_no_perfil: true,
  });
  const [keyTouched, setKeyTouched] = useState(false);
  const [optionInput, setOptionInput] = useState("");
  const [pendingTipo, setPendingTipo] = useState<Campo["tipo"] | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (campo) {
      setData({
        ...campo,
        opcoes: campo.opcoes || [],
        placeholder: campo.placeholder || "",
        mostrar_no_perfil: campo.mostrar_no_perfil !== false,
      });
      setKeyTouched(true);
    } else {
      setData({
        category_id: categoryId, chave: "", label: "", tipo: "texto",
        opcoes: [], obrigatorio: false, ativo: true, ordem: 0, is_base: false, placeholder: "", mostrar_no_perfil: true,
      });
      setKeyTouched(false);
    }
    setOptionInput("");
  }, [campo, open, categoryId]);

  const onLabel = (v: string) => {
    setData((d) => ({ ...d, label: v, chave: keyTouched ? d.chave : snakeKey(v) }));
  };

  const isOptionType = (t: Campo["tipo"]) => t === "select" || t === "lista";

  const requestTipoChange = (t: Campo["tipo"]) => {
    if (data.tipo === t) return;
    if (isOptionType(data.tipo) && !isOptionType(t) && (data.opcoes?.length ?? 0) > 0) {
      setPendingTipo(t);
      return;
    }
    setData({ ...data, tipo: t, opcoes: isOptionType(t) ? (data.opcoes || []) : null });
  };

  const confirmTipoChange = () => {
    if (pendingTipo) setData({ ...data, tipo: pendingTipo, opcoes: null });
    setPendingTipo(null);
  };

  const addOption = () => {
    const v = optionInput.trim();
    if (!v) return;
    if ((data.opcoes || []).includes(v)) return;
    setData({ ...data, opcoes: [...(data.opcoes || []), v] });
    setOptionInput("");
  };

  const removeOption = (idx: number) => {
    setData({ ...data, opcoes: (data.opcoes || []).filter((_, i) => i !== idx) });
  };

  const keyDuplicate = () => {
    const k = data.chave.trim();
    if (!k) return false;
    return existingKeys.filter((x) => x !== campo?.chave).includes(k);
  };

  const optionsHaveDuplicates = () => {
    const arr = (data.opcoes || []).map((o) => o.trim().toLowerCase());
    return arr.length !== new Set(arr).size;
  };

  const save = async () => {
    if (!data.label.trim()) return toast({ title: "Label obrigatório", variant: "destructive" });
    if (!data.chave.trim()) return toast({ title: "Key obrigatória", variant: "destructive" });
    if (keyDuplicate()) return toast({ title: "Essa key já existe nesta categoria", variant: "destructive" });
    if (isOptionType(data.tipo) && (data.opcoes?.length ?? 0) < 2) {
      return toast({ title: "Adicione pelo menos 2 opções", variant: "destructive" });
    }
    if (isOptionType(data.tipo) && optionsHaveDuplicates()) {
      return toast({ title: "Existem opções duplicadas", variant: "destructive" });
    }
    if (isOptionType(data.tipo) && (data.opcoes || []).some((o) => !o.trim())) {
      return toast({ title: "Remova opções vazias", variant: "destructive" });
    }

    setSaving(true);
    const payload: any = {
      category_id: categoryId,
      chave: data.chave.trim(),
      label: data.label.trim(),
      tipo: data.tipo,
      opcoes: isOptionType(data.tipo) ? data.opcoes : null,
      obrigatorio: data.obrigatorio,
      ativo: data.ativo,
      mostrar_no_perfil: data.mostrar_no_perfil !== false,
      placeholder: data.placeholder || null,
    };
    if (campo?.is_base) {
      // Em campos base só atualizamos obrigatorio/ativo/placeholder/mostrar_no_perfil
      const baseOnly = {
        obrigatorio: data.obrigatorio,
        ativo: data.ativo,
        placeholder: data.placeholder || null,
        mostrar_no_perfil: data.mostrar_no_perfil !== false,
      };
      const { error } = await supabase.from("campos_categoria").update(baseOnly).eq("id", campo.id!);
      setSaving(false);
      if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      const q = campo?.id
        ? supabase.from("campos_categoria").update(payload).eq("id", campo.id)
        : supabase.from("campos_categoria").insert({ ...payload, ordem: data.ordem, is_base: false });
      const { error } = await q;
      setSaving(false);
      if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
    toast({ title: "Salvo" });
    onSaved();
    onOpenChange(false);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{campo?.id ? "Editar campo" : "Adicionar campo"}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Label</Label>
              <Input value={data.label} onChange={(e) => onLabel(e.target.value)}
                placeholder="Ex: Estilo de fotografia" disabled={!!campo?.is_base} />
              <p className="text-xs text-muted-foreground mt-1">Como aparece para o fornecedor.</p>
            </div>
            <div>
              <Label>Key</Label>
              <Input value={data.chave}
                onChange={(e) => { setKeyTouched(true); setData({ ...data, chave: snakeKey(e.target.value) }); }}
                placeholder="estilo_fotografia"
                className={keyDuplicate() ? "border-destructive" : ""}
                disabled={!!campo?.is_base} />
              {keyDuplicate() && <p className="text-xs text-destructive mt-1">Essa key já existe nesta categoria.</p>}
            </div>
            <div>
              <Label>Tipo</Label>
              {campo?.is_base ? (
                <div className="text-sm text-muted-foreground mt-1">{data.tipo} (campo base, não editável)</div>
              ) : (
                <RadioGroup value={data.tipo} onValueChange={(v) => requestTipoChange(v as Campo["tipo"])}
                  className="grid grid-cols-2 gap-2 mt-2">
                  {TIPO_OPTIONS.map((t) => (
                    <label key={t.value} className={`flex items-center gap-2 border rounded-md p-2 cursor-pointer ${data.tipo === t.value ? "border-primary bg-primary/5" : ""}`}>
                      <RadioGroupItem value={t.value} />
                      <span className="text-sm">{t.label}</span>
                    </label>
                  ))}
                </RadioGroup>
              )}
            </div>
            {isOptionType(data.tipo) && !campo?.is_base && (
              <div>
                <Label>Opções</Label>
                <div className="flex gap-2">
                  <Input value={optionInput} onChange={(e) => setOptionInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addOption(); } }}
                    placeholder="Ex: Editorial" />
                  <Button type="button" onClick={addOption}>Adicionar</Button>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {(data.opcoes || []).map((op, i) => (
                    <Badge key={i} variant="secondary" className="pl-2 pr-1 gap-1">
                      {op}
                      <button onClick={() => removeOption(i)} className="ml-1 hover:bg-destructive/20 rounded-sm">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            <div>
              <Label>Placeholder (opcional)</Label>
              <Input value={data.placeholder || ""} onChange={(e) => setData({ ...data, placeholder: e.target.value })}
                placeholder="Texto de dica" />
            </div>
            <div className="flex items-center justify-between">
              <Label>Obrigatório</Label>
              <Switch checked={data.obrigatorio} onCheckedChange={(v) => setData({ ...data, obrigatorio: v })} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Mostrar no perfil público</Label>
                <p className="text-xs text-muted-foreground">Quando desligado, fica apenas interno.</p>
              </div>
              <Switch
                checked={data.mostrar_no_perfil !== false}
                onCheckedChange={(v) => setData({ ...data, mostrar_no_perfil: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Ativo</Label>
              <Switch checked={data.ativo} onCheckedChange={(v) => setData({ ...data, ativo: v })} />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Salvando..." : "Salvar campo"}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!pendingTipo} onOpenChange={(v) => !v && setPendingTipo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limpar opções?</AlertDialogTitle>
            <AlertDialogDescription>Ao mudar o tipo, as opções existentes serão removidas.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmTipoChange}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
