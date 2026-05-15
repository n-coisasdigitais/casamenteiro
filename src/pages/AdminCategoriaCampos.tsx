import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import FieldEditorDrawer, { type Campo } from "@/components/admin/categorias/FieldEditorDrawer";

type Cat = { id: string; name: string; icon: string | null };

function FieldRow({
  campo, onToggle, onEdit, onDelete, draggable,
}: {
  campo: Campo;
  onToggle: (v: boolean) => void;
  onEdit: () => void;
  onDelete?: () => void;
  draggable?: boolean;
}) {
  const sortable = useSortable({ id: campo.id!, disabled: !draggable });
  const style = draggable
    ? { transform: CSS.Transform.toString(sortable.transform), transition: sortable.transition }
    : undefined;

  return (
    <div ref={draggable ? sortable.setNodeRef : undefined} style={style}>
      <Card className={!campo.ativo ? "opacity-50" : ""}>
        <CardContent className="p-3 flex items-center gap-3">
          {draggable ? (
            <button {...sortable.attributes} {...sortable.listeners} className="cursor-grab text-muted-foreground">
              <GripVertical className="h-4 w-4" />
            </button>
          ) : <div className="w-4" />}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium">{campo.label}</span>
              <span className="text-xs text-muted-foreground font-mono">{campo.chave}</span>
              <Badge variant="outline" className="text-xs">{campo.tipo}</Badge>
              {campo.obrigatorio && <Badge variant="secondary" className="text-xs">obrigatório</Badge>}
              {!campo.ativo && <Badge variant="destructive" className="text-xs">desativado</Badge>}
              {Array.isArray(campo.opcoes) && campo.opcoes.length > 0 && (
                <span className="text-xs text-muted-foreground">Opções: {campo.opcoes.length}</span>
              )}
            </div>
          </div>
          <Switch checked={campo.ativo} onCheckedChange={onToggle} />
          <Button variant="ghost" size="icon" onClick={onEdit}><Pencil className="h-4 w-4" /></Button>
          {onDelete && (
            <Button variant="ghost" size="icon" onClick={onDelete}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminCategoriaCampos() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [cat, setCat] = useState<Cat | null>(null);
  const [campos, setCampos] = useState<Campo[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Campo | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Campo | null>(null);

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const { data: c } = await supabase.from("categories").select("id,name,icon").eq("id", id).maybeSingle();
    setCat(c as any);
    const { data } = await supabase.from("campos_categoria").select("*").eq("category_id", id).order("ordem");
    setCampos((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const base = campos.filter((c) => c.is_base).sort((a, b) => a.ordem - b.ordem);
  const custom = campos.filter((c) => !c.is_base).sort((a, b) => a.ordem - b.ordem);

  const toggleAtivo = async (c: Campo, v: boolean) => {
    setCampos((prev) => prev.map((x) => x.id === c.id ? { ...x, ativo: v } : x));
    const { error } = await supabase.from("campos_categoria").update({ ativo: v }).eq("id", c.id!);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); load(); return; }
    toast({ title: "Salvo" });
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const { error } = await supabase.from("campos_categoria").delete().eq("id", confirmDelete.id!);
    setConfirmDelete(null);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Campo removido" });
    load();
  };

  const handleDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = custom.findIndex((c) => c.id === active.id);
    const newIdx = custom.findIndex((c) => c.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    const reordered = arrayMove(custom, oldIdx, newIdx);
    const baseStart = base.length;
    setCampos([...base, ...reordered]);
    await Promise.all(reordered.map((c, i) =>
      supabase.from("campos_categoria").update({ ordem: baseStart + i }).eq("id", c.id!)
    ));
    toast({ title: "Ordem salva" });
    load();
  };

  const openNew = () => { setEditing(null); setDrawerOpen(true); };
  const openEdit = (c: Campo) => { setEditing(c); setDrawerOpen(true); };

  if (loading) return <div className="p-6">Carregando...</div>;
  if (!cat) return <div className="p-6">Categoria não encontrada.</div>;

  const allKeys = campos.map((c) => c.chave);

  return (
    <div className="px-4 md:px-8 py-6 max-w-4xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => navigate("/admin/categorias")} className="mb-4">
        <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
      </Button>

      <div className="flex items-center gap-3 mb-8">
        <span className="text-3xl">{cat.icon || "📁"}</span>
        <div>
          <h1 className="text-2xl font-bold">{cat.name}</h1>
          <p className="text-sm text-muted-foreground">Gerencie os campos do formulário desta categoria.</p>
        </div>
      </div>

      <section className="mb-10">
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-lg font-semibold">Campos base</h2>
          <Badge variant="secondary" className="text-xs">Pré-definidos</Badge>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Comuns a todos os fornecedores. Ligue ou desligue conforme a categoria.</p>
        <div className="space-y-2">
          {base.map((c) => (
            <FieldRow key={c.id} campo={c}
              onToggle={(v) => toggleAtivo(c, v)}
              onEdit={() => openEdit(c)} />
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Campos desta categoria</h2>
            <Badge variant="outline" className="text-xs">{custom.length}</Badge>
          </div>
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" />Adicionar campo</Button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Específicos para {cat.name}. Arraste para reordenar.</p>

        {custom.length === 0 ? (
          <div className="border-2 border-dashed rounded-md p-8 text-center text-muted-foreground">
            Nenhum campo personalizado ainda.
            <div className="mt-3"><Button variant="outline" onClick={openNew}><Plus className="h-4 w-4 mr-1" />Adicionar o primeiro</Button></div>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={custom.map((c) => c.id!)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {custom.map((c) => (
                  <FieldRow key={c.id} campo={c} draggable
                    onToggle={(v) => toggleAtivo(c, v)}
                    onEdit={() => openEdit(c)}
                    onDelete={() => setConfirmDelete(c)} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </section>

      <FieldEditorDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        campo={editing}
        categoryId={cat.id}
        existingKeys={allKeys}
        onSaved={load}
      />

      <AlertDialog open={!!confirmDelete} onOpenChange={(v) => !v && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover campo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O campo "{confirmDelete?.label}" será excluído.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
