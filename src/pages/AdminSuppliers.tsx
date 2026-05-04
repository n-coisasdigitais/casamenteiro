import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Heart, ArrowLeft, Save, Trash2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Sup = {
  id: string; company_name: string; city: string|null; state: string|null;
  phone: string|null; whatsapp: string|null; instagram: string|null; website: string|null;
  price_min: number|null; price_max: number|null; status: string;
  is_demo: boolean; featured: boolean; category_id: string|null;
};

export default function AdminSuppliers() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checked, setChecked] = useState(false);
  const [rows, setRows] = useState<Sup[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<"all"|"demo"|"real">("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login"); return; }
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }).then(({ data }) => {
      if (!data) { navigate("/"); return; }
      setIsAdmin(true); setChecked(true); load();
    });
  }, [user, authLoading]);

  const load = async () => {
    setLoading(true);
    const [{ data: sup }, { data: ct }] = await Promise.all([
      supabase.from("suppliers").select("id,company_name,city,state,phone,whatsapp,instagram,website,price_min,price_max,status,is_demo,featured,category_id").order("created_at", { ascending: false }),
      supabase.from("categories").select("id,name").order("name"),
    ]);
    setRows((sup as any) || []); setCats(ct || []); setLoading(false);
    setDirty(new Set()); setSelected(new Set());
  };

  const update = (id: string, field: keyof Sup, value: any) => {
    setRows(r => r.map(x => x.id === id ? { ...x, [field]: value } : x));
    setDirty(d => new Set(d).add(id));
  };

  const saveAll = async () => {
    const toSave = rows.filter(r => dirty.has(r.id));
    let ok = 0, fail = 0;
    for (const r of toSave) {
      const { error } = await supabase.from("suppliers").update({
        company_name: r.company_name, city: r.city, state: r.state,
        phone: r.phone, whatsapp: r.whatsapp, instagram: r.instagram, website: r.website,
        price_min: r.price_min, price_max: r.price_max, status: r.status as any,
        is_demo: r.is_demo, featured: r.featured, category_id: r.category_id,
      } as any).eq("id", r.id);
      if (error) fail++; else ok++;
    }
    toast({ title: `${ok} salvos${fail ? `, ${fail} com erro` : ""}` });
    load();
  };

  const deleteSelected = async () => {
    if (!confirm(`Excluir ${selected.size} fornecedor(es)?`)) return;
    const { error } = await supabase.from("suppliers").delete().in("id", [...selected]);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: `${selected.size} excluídos` }); load(); }
  };

  const deleteAllDemo = async () => {
    if (!confirm("Excluir TODOS os fornecedores marcados como demo?")) return;
    const { error } = await (supabase.from("suppliers").delete() as any).eq("is_demo", true);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: "Todos os demos foram excluídos" }); load(); }
  };

  const filtered = rows.filter(r => {
    if (filter === "demo" && !r.is_demo) return false;
    if (filter === "real" && r.is_demo) return false;
    if (search && !r.company_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const toggleSel = (id: string) => {
    const n = new Set(selected);
    n.has(id) ? n.delete(id) : n.add(id);
    setSelected(n);
  };
  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(r => r.id)));
  };

  if (authLoading || !checked) return <div className="min-h-screen flex items-center justify-center"><p>Verificando...</p></div>;
  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="container flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild><Link to="/admin"><ArrowLeft className="h-4 w-4" /></Link></Button>
            <Heart className="h-5 w-5 text-primary fill-primary" />
            <span className="text-lg font-bold">Edição em Massa de Fornecedores</span>
          </div>
        </div>
      </header>

      <main className="container px-4 py-6">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Input placeholder="Buscar por nome..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />
          <Select value={filter} onValueChange={v => setFilter(v as any)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="demo">Apenas Demo</SelectItem>
              <SelectItem value="real">Apenas Reais</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex-1" />
          {dirty.size > 0 && <Button onClick={saveAll}><Save className="h-4 w-4 mr-1" />Salvar {dirty.size}</Button>}
          {selected.size > 0 && <Button variant="destructive" onClick={deleteSelected}><Trash2 className="h-4 w-4 mr-1" />Excluir {selected.size}</Button>}
          <Button variant="outline" onClick={deleteAllDemo}><Trash2 className="h-4 w-4 mr-1" />Excluir todos Demo</Button>
        </div>

        <p className="text-sm text-muted-foreground mb-2">
          {filtered.length} fornecedores · {rows.filter(r => r.is_demo).length} demos
        </p>

        {loading ? <p>Carregando...</p> : (
          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="p-2"><Checkbox checked={selected.size === filtered.length && filtered.length > 0} onCheckedChange={toggleAll} /></th>
                  <th className="p-2 text-left">Nome</th>
                  <th className="p-2 text-left">Categoria</th>
                  <th className="p-2 text-left">Cidade/UF</th>
                  <th className="p-2 text-left">WhatsApp</th>
                  <th className="p-2 text-left">Instagram</th>
                  <th className="p-2 text-left">Preço Min</th>
                  <th className="p-2 text-left">Preço Max</th>
                  <th className="p-2 text-left">Status</th>
                  <th className="p-2 text-left">Demo</th>
                  <th className="p-2 text-left">Destaque</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} className={`border-t ${dirty.has(r.id) ? "bg-yellow-50" : ""}`}>
                    <td className="p-2"><Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggleSel(r.id)} /></td>
                    <td className="p-2"><Input value={r.company_name} onChange={e => update(r.id, "company_name", e.target.value)} className="h-8 min-w-[180px]" /></td>
                    <td className="p-2">
                      <Select value={r.category_id || ""} onValueChange={v => update(r.id, "category_id", v)}>
                        <SelectTrigger className="h-8 w-40"><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>{cats.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </td>
                    <td className="p-2 flex gap-1">
                      <Input value={r.city || ""} onChange={e => update(r.id, "city", e.target.value)} className="h-8 w-24" />
                      <Input value={r.state || ""} onChange={e => update(r.id, "state", e.target.value)} className="h-8 w-12" />
                    </td>
                    <td className="p-2"><Input value={r.whatsapp || ""} onChange={e => update(r.id, "whatsapp", e.target.value)} className="h-8 w-32" /></td>
                    <td className="p-2"><Input value={r.instagram || ""} onChange={e => update(r.id, "instagram", e.target.value)} className="h-8 w-32" /></td>
                    <td className="p-2"><Input type="number" value={r.price_min || ""} onChange={e => update(r.id, "price_min", e.target.value ? Number(e.target.value) : null)} className="h-8 w-24" /></td>
                    <td className="p-2"><Input type="number" value={r.price_max || ""} onChange={e => update(r.id, "price_max", e.target.value ? Number(e.target.value) : null)} className="h-8 w-24" /></td>
                    <td className="p-2">
                      <Select value={r.status} onValueChange={v => update(r.id, "status", v)}>
                        <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pendente</SelectItem>
                          <SelectItem value="approved">Aprovado</SelectItem>
                          <SelectItem value="rejected">Rejeitado</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-2"><Checkbox checked={r.is_demo} onCheckedChange={v => update(r.id, "is_demo", !!v)} /></td>
                    <td className="p-2"><Checkbox checked={r.featured} onCheckedChange={v => update(r.id, "featured", !!v)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
