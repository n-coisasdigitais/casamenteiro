import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, SlidersHorizontal } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import CategoryFormDialog from "@/components/admin/categorias/CategoryFormDialog";

type Cat = {
  id: string; name: string; slug: string; icon: string | null;
  description: string | null; active: boolean;
  fields_count?: number;
};

export default function AdminCategorias() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [cats, setCats] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Cat | null>(null);
  const [open, setOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: catsData } = await supabase
      .from("categories")
      .select("id,name,slug,icon,description,active")
      .order("name");
    const { data: counts } = await supabase
      .from("campos_categoria")
      .select("category_id, ativo");
    const map = new Map<string, number>();
    (counts || []).forEach((c: any) => {
      if (c.ativo) map.set(c.category_id, (map.get(c.category_id) || 0) + 1);
    });
    setCats((catsData || []).map((c: any) => ({ ...c, fields_count: map.get(c.id) || 0 })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleActive = async (cat: Cat, v: boolean) => {
    const { error } = await supabase.from("categories").update({ active: v }).eq("id", cat.id);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    setCats((prev) => prev.map((c) => c.id === cat.id ? { ...c, active: v } : c));
  };

  const openNew = () => { setEditing(null); setOpen(true); };
  const openEdit = (c: Cat) => { setEditing(c); setOpen(true); };

  return (
    <div className="px-4 md:px-8 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Categorias</h1>
          <p className="text-sm text-muted-foreground">Gerencie categorias e os campos do cadastro de fornecedores.</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" />Nova categoria</Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : (
        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Ícone</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead className="text-center">Campos ativos</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cats.map((c) => (
                <TableRow key={c.id} className="cursor-pointer" onClick={() => navigate(`/admin/categorias/${c.id}/campos`)}>
                  <TableCell className="text-xl">{c.icon || "📁"}</TableCell>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono">{c.slug}</TableCell>
                  <TableCell className="text-center">{c.fields_count}</TableCell>
                  <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-2">
                      <Switch checked={c.active} onCheckedChange={(v) => toggleActive(c, v)} />
                      {c.active
                        ? <Badge variant="secondary" className="text-xs">Ativo</Badge>
                        : <Badge variant="destructive" className="text-xs">Inativo</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(c)} title="Editar">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/categorias/${c.id}/campos`)} title="Campos">
                      <SlidersHorizontal className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {cats.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhuma categoria.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <CategoryFormDialog open={open} onOpenChange={setOpen} category={editing} onSaved={load} />
    </div>
  );
}
