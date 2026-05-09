import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, ArrowUp, ArrowDown, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Cat = { id: string; name: string; slug: string };
type Campo = {
  id: string; category_id: string; chave: string; label: string; ajuda: string | null;
  tipo: string; opcoes: any; obrigatorio: boolean; grupo: string | null;
  ordem: number; ativo: boolean; mostrar_no_perfil: boolean;
};

const TIPOS = ["texto","textarea","numero","booleano","select","lista","faixa"];

export default function AdminCampos() {
  const { toast } = useToast();
  const [cats, setCats] = useState<Cat[]>([]);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [campos, setCampos] = useState<Campo[]>([]);
  const [editing, setEditing] = useState<Partial<Campo> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("categories").select("id,name,slug").order("name").then(({ data }) => {
      setCats(data || []);
      if (data?.[0]) setSelectedCat(data[0].id);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (selectedCat) loadCampos();
  }, [selectedCat]);

  const loadCampos = async () => {
    const { data } = await supabase.from("campos_categoria").select("*")
      .eq("category_id", selectedCat!).order("ordem");
    setCampos((data as any) || []);
  };

  const save = async () => {
    if (!editing || !selectedCat) return;
    if (!editing.chave || !editing.label || !editing.tipo) {
      toast({ title: "Preencha chave, label e tipo", variant: "destructive" }); return;
    }
    const opcoes = (editing.tipo === "select" || editing.tipo === "lista") && typeof (editing as any)._opcoesText === "string"
      ? (editing as any)._opcoesText.split("\n").map((s: string) => s.trim()).filter(Boolean)
      : editing.opcoes;
    const payload: any = {
      category_id: selectedCat,
      chave: editing.chave, label: editing.label, ajuda: editing.ajuda || null,
      tipo: editing.tipo, opcoes: opcoes || null,
      obrigatorio: !!editing.obrigatorio, grupo: editing.grupo || null,
      ordem: editing.ordem ?? campos.length,
      ativo: editing.ativo !== false, mostrar_no_perfil: editing.mostrar_no_perfil !== false,
    };
    const q = editing.id
      ? supabase.from("campos_categoria").update(payload).eq("id", editing.id)
      : supabase.from("campos_categoria").insert(payload);
    const { error } = await q;
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Campo salvo" });
    setEditing(null); loadCampos();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir este campo?")) return;
    await supabase.from("campos_categoria").delete().eq("id", id);
    loadCampos();
  };

  const move = async (campo: Campo, dir: -1 | 1) => {
    const idx = campos.findIndex(c => c.id === campo.id);
    const swap = campos[idx + dir];
    if (!swap) return;
    await supabase.from("campos_categoria").update({ ordem: swap.ordem }).eq("id", campo.id);
    await supabase.from("campos_categoria").update({ ordem: campo.ordem }).eq("id", swap.id);
    loadCampos();
  };

  const openNew = () => setEditing({ tipo: "texto", obrigatorio: false, ativo: true, mostrar_no_perfil: true, ordem: campos.length });
  const openEdit = (c: Campo) => setEditing({
    ...c,
    ...(Array.isArray(c.opcoes) ? { _opcoesText: c.opcoes.join("\n") } as any : {}),
  });

  if (loading) return <div className="p-6">Carregando...</div>;

  return (
    <div className="px-4 md:px-8 py-6">
      <h1 className="text-2xl font-bold mb-6">Campos por categoria</h1>

      <div className="flex flex-wrap gap-2 mb-6">
        {cats.map(c => (
          <Button key={c.id} variant={selectedCat === c.id ? "default" : "outline"} size="sm" onClick={() => setSelectedCat(c.id)}>
            {c.name}
          </Button>
        ))}
      </div>

      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-muted-foreground">{campos.length} campo(s)</p>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" />Novo campo</Button>
      </div>

      <div className="space-y-2">
        {campos.map((c, i) => (
          <Card key={c.id}>
            <CardContent className="p-3 flex items-center gap-3">
              <div className="flex flex-col">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => move(c, -1)} disabled={i === 0}><ArrowUp className="h-3 w-3" /></Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => move(c, 1)} disabled={i === campos.length - 1}><ArrowDown className="h-3 w-3" /></Button>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{c.label}</span>
                  <span className="text-xs text-muted-foreground font-mono">{c.chave}</span>
                  <span className="text-xs px-2 py-0.5 bg-muted rounded">{c.tipo}</span>
                  {c.grupo && <span className="text-xs px-2 py-0.5 bg-accent rounded">{c.grupo}</span>}
                  {c.obrigatorio && <span className="text-xs text-primary">obrigatório</span>}
                  {!c.ativo && <span className="text-xs text-destructive">inativo</span>}
                </div>
                {c.ajuda && <p className="text-xs text-muted-foreground mt-1">{c.ajuda}</p>}
              </div>
              <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => remove(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </CardContent>
          </Card>
        ))}
        {campos.length === 0 && <p className="text-muted-foreground text-center py-12">Nenhum campo cadastrado.</p>}
      </div>

      <Dialog open={!!editing} onOpenChange={v => !v && setEditing(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? "Editar campo" : "Novo campo"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div><Label>Chave (slug, sem espaços)</Label>
                <Input value={editing.chave || ""} onChange={e => setEditing({ ...editing, chave: e.target.value })} placeholder="capacidade_max" />
              </div>
              <div><Label>Label (visível ao fornecedor)</Label>
                <Input value={editing.label || ""} onChange={e => setEditing({ ...editing, label: e.target.value })} />
              </div>
              <div><Label>Texto de ajuda (opcional)</Label>
                <Input value={editing.ajuda || ""} onChange={e => setEditing({ ...editing, ajuda: e.target.value })} />
              </div>
              <div><Label>Tipo</Label>
                <Select value={editing.tipo} onValueChange={v => setEditing({ ...editing, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {(editing.tipo === "select" || editing.tipo === "lista") && (
                <div><Label>Opções (uma por linha)</Label>
                  <Textarea rows={5} value={(editing as any)._opcoesText ?? (Array.isArray(editing.opcoes) ? editing.opcoes.join("\n") : "")}
                    onChange={e => setEditing({ ...editing, _opcoesText: e.target.value } as any)} />
                </div>
              )}
              <div><Label>Grupo / etapa (opcional)</Label>
                <Input value={editing.grupo || ""} onChange={e => setEditing({ ...editing, grupo: e.target.value })} placeholder="Capacidade, Preço..." />
              </div>
              <div className="flex items-center gap-2"><Checkbox checked={!!editing.obrigatorio} onCheckedChange={v => setEditing({ ...editing, obrigatorio: !!v })} /><Label>Obrigatório</Label></div>
              <div className="flex items-center gap-2"><Checkbox checked={editing.ativo !== false} onCheckedChange={v => setEditing({ ...editing, ativo: !!v })} /><Label>Ativo</Label></div>
              <div className="flex items-center gap-2"><Checkbox checked={editing.mostrar_no_perfil !== false} onCheckedChange={v => setEditing({ ...editing, mostrar_no_perfil: !!v })} /><Label>Mostrar no perfil público</Label></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
