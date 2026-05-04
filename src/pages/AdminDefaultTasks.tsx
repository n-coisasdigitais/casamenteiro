import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Heart, ArrowLeft, Plus, Trash2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const PERIODS = ["10-12 meses","7-9 meses","4-6 meses","2-3 meses","ultimo-mes","ultima-semana","dia-do-casamento"];
const PRIORITIES = ["essential","recommended","optional"];

export default function AdminDefaultTasks() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [checked, setChecked] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [filterPeriod, setFilterPeriod] = useState<string>("all");

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login"); return; }
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }).then(({ data }) => {
      if (!data) { navigate("/"); return; }
      setChecked(true); load();
    });
  }, [user, authLoading, navigate]);

  const load = async () => {
    const { data } = await supabase.from("default_tasks" as any).select("*").order("sort_order");
    setRows((data as any) || []);
    setDirty(new Set());
  };

  const upd = (id: string, field: string, value: any) => {
    setRows(rs => rs.map(r => r.id === id ? { ...r, [field]: value } : r));
    setDirty(d => new Set(d).add(id));
  };

  const saveAll = async () => {
    let ok = 0, fail = 0;
    for (const r of rows.filter(r => dirty.has(r.id))) {
      const { error } = await (supabase.from("default_tasks" as any) as any).update({
        title: r.title, category: r.category, priority: r.priority,
        due_period: r.due_period, sort_order: r.sort_order,
        action_label: r.action_label, action_url: r.action_url, active: r.active,
      }).eq("id", r.id);
      if (error) fail++; else ok++;
    }
    toast({ title: `${ok} salvas${fail ? `, ${fail} com erro` : ""}` });
    load();
  };

  const addRow = async () => {
    const ordem = (rows[rows.length - 1]?.sort_order || 0) + 1;
    await (supabase.from("default_tasks" as any) as any).insert({
      title: "Nova tarefa", category: "planejamento", priority: "recommended",
      due_period: "10-12 meses", sort_order: ordem,
    });
    load();
  };

  const del = async (id: string) => {
    if (!confirm("Excluir tarefa padrão?")) return;
    await (supabase.from("default_tasks" as any) as any).delete().eq("id", id);
    load();
  };

  const importFromSeed = async () => {
    if (!confirm("Importar as 79 tarefas padrão atuais como base inicial? (não sobrescreve as já existentes)")) return;
    if (rows.length > 0) { toast({ title: "Já existem tarefas. Apague antes para reimportar." }); return; }
    // Triggers manual seed via RPC for any couple - we instead just inform admin
    toast({ title: "Para importar a base inicial, peça ao desenvolvedor uma carga inicial (ou cadastre manualmente)." });
  };

  const filtered = filterPeriod === "all" ? rows : rows.filter(r => r.due_period === filterPeriod);

  if (!checked) return <div className="min-h-screen flex items-center justify-center">Verificando...</div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b sticky top-0 z-40">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild><Link to="/admin"><ArrowLeft className="h-4 w-4" /></Link></Button>
            <Heart className="h-5 w-5 text-primary fill-primary" />
            <span className="font-bold">Banco de tarefas padrão</span>
          </div>
          <div className="flex gap-2">
            {dirty.size > 0 && <Button onClick={saveAll}><Save className="h-4 w-4 mr-1" />Salvar {dirty.size}</Button>}
            <Button variant="outline" onClick={addRow}><Plus className="h-4 w-4 mr-1" />Nova</Button>
          </div>
        </div>
      </header>
      <main className="container py-6">
        <div className="flex gap-2 mb-3 flex-wrap items-center">
          <span className="text-sm text-muted-foreground">Fase:</span>
          <Button size="sm" variant={filterPeriod === "all" ? "default" : "outline"} onClick={() => setFilterPeriod("all")}>Todas</Button>
          {PERIODS.map(p => <Button key={p} size="sm" variant={filterPeriod === p ? "default" : "outline"} onClick={() => setFilterPeriod(p)}>{p}</Button>)}
          {rows.length === 0 && <Button size="sm" variant="outline" onClick={importFromSeed}>Importar base</Button>}
        </div>

        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="p-2 w-12">#</th>
                <th className="p-2 text-left">Título</th>
                <th className="p-2 text-left">Categoria</th>
                <th className="p-2 text-left">Prioridade</th>
                <th className="p-2 text-left">Fase</th>
                <th className="p-2 text-left">Botão</th>
                <th className="p-2 text-left">Link</th>
                <th className="p-2">Ativo</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} className={`border-t ${dirty.has(r.id) ? "bg-yellow-50" : ""}`}>
                  <td className="p-2"><Input type="number" value={r.sort_order} onChange={e => upd(r.id, "sort_order", Number(e.target.value))} className="h-8 w-16" /></td>
                  <td className="p-2"><Input value={r.title} onChange={e => upd(r.id, "title", e.target.value)} className="h-8 min-w-[240px]" /></td>
                  <td className="p-2"><Input value={r.category} onChange={e => upd(r.id, "category", e.target.value)} className="h-8 w-32" /></td>
                  <td className="p-2">
                    <Select value={r.priority} onValueChange={v => upd(r.id, "priority", v)}>
                      <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                    </Select>
                  </td>
                  <td className="p-2">
                    <Select value={r.due_period || ""} onValueChange={v => upd(r.id, "due_period", v)}>
                      <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>{PERIODS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                    </Select>
                  </td>
                  <td className="p-2"><Input value={r.action_label || ""} onChange={e => upd(r.id, "action_label", e.target.value)} className="h-8 w-32" /></td>
                  <td className="p-2"><Input value={r.action_url || ""} onChange={e => upd(r.id, "action_url", e.target.value)} className="h-8 w-40" /></td>
                  <td className="p-2"><Switch checked={r.active} onCheckedChange={v => upd(r.id, "active", v)} /></td>
                  <td className="p-2"><Button size="icon" variant="ghost" onClick={() => del(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">Nenhuma tarefa cadastrada. Clique em "Nova" para começar.</td></tr>}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}