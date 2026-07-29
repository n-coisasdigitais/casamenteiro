import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download } from "lucide-react";

type Row = {
  id: string;
  created_at: string;
  admin_id: string | null;
  action: string;
  target_table: string | null;
  target_id: string | null;
  details: any;
};

export default function AdminAuditLog() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [admins, setAdmins] = useState<Record<string, string>>({});

  // filtros
  const [q, setQ] = useState("");
  const [action, setAction] = useState<string>("all");
  const [table, setTable] = useState<string>("all");
  const [adminId, setAdminId] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login"); return; }
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }).then(async ({ data }) => {
      if (!data) { navigate("/"); return; }
      setChecked(true);
      await load();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  async function load() {
    setLoading(true);
    let query = supabase.from("admin_audit_log").select("*").order("created_at", { ascending: false }).limit(1000);
    if (dateFrom) query = query.gte("created_at", new Date(dateFrom).toISOString());
    if (dateTo) query = query.lte("created_at", new Date(dateTo + "T23:59:59").toISOString());
    if (action !== "all") query = query.eq("action", action);
    if (table !== "all") query = query.eq("target_table", table);
    if (adminId !== "all") query = query.eq("admin_id", adminId);
    const { data } = await query;
    const list = (data || []) as Row[];
    setRows(list);

    const ids = Array.from(new Set(list.map(r => r.admin_id).filter(Boolean))) as string[];
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("user_id, full_name").in("user_id", ids);
      const map: Record<string, string> = {};
      (profs || []).forEach((p: any) => { map[p.user_id] = p.full_name || p.user_id.slice(0, 8); });
      setAdmins(map);
    }
    setLoading(false);
  }

  const filtered = useMemo(() => {
    if (!q.trim()) return rows;
    const term = q.trim().toLowerCase();
    return rows.filter(r =>
      r.action?.toLowerCase().includes(term) ||
      r.target_table?.toLowerCase().includes(term) ||
      r.target_id?.toLowerCase().includes(term) ||
      JSON.stringify(r.details || {}).toLowerCase().includes(term) ||
      admins[r.admin_id || ""]?.toLowerCase().includes(term)
    );
  }, [rows, q, admins]);

  const actions = useMemo(() => Array.from(new Set(rows.map(r => r.action).filter(Boolean))).sort(), [rows]);
  const tables = useMemo(() => Array.from(new Set(rows.map(r => r.target_table).filter(Boolean))).sort() as string[], [rows]);
  const adminIds = useMemo(() => Array.from(new Set(rows.map(r => r.admin_id).filter(Boolean))) as string[], [rows]);

  function exportCsv() {
    const header = ["quando", "admin", "acao", "tabela", "id_alvo", "detalhes"];
    const lines = filtered.map(r => [
      new Date(r.created_at).toLocaleString("pt-BR"),
      admins[r.admin_id || ""] || r.admin_id || "",
      r.action,
      r.target_table || "",
      r.target_id || "",
      JSON.stringify(r.details || {}).replace(/"/g, '""'),
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","));
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `auditoria-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!checked) return <div className="p-8 text-center">Verificando...</div>;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Logs de auditoria</h1>
          <p className="text-sm text-muted-foreground">Rastreamento de ações administrativas sensíveis.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{filtered.length} de {rows.length}</span>
          <Button size="sm" variant="outline" onClick={exportCsv} disabled={!filtered.length}>
            <Download className="h-4 w-4 mr-1" />CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-2 border rounded-lg p-3 bg-card">
        <Input placeholder="Buscar..." value={q} onChange={e => setQ(e.target.value)} className="md:col-span-2" />
        <Select value={action} onValueChange={setAction}>
          <SelectTrigger><SelectValue placeholder="Ação" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas ações</SelectItem>
            {actions.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={table} onValueChange={setTable}>
          <SelectTrigger><SelectValue placeholder="Tabela" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas tabelas</SelectItem>
            {tables.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={adminId} onValueChange={setAdminId}>
          <SelectTrigger><SelectValue placeholder="Admin" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos admins</SelectItem>
            {adminIds.map(id => <SelectItem key={id} value={id}>{admins[id] || id.slice(0, 8)}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex gap-1">
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
        <div className="md:col-span-6 flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={() => {
            setQ(""); setAction("all"); setTable("all"); setAdminId("all"); setDateFrom(""); setDateTo("");
          }}>Limpar filtros</Button>
          <Button size="sm" onClick={load} disabled={loading}>{loading ? "Carregando..." : "Aplicar"}</Button>
        </div>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="p-2 text-left">Quando</th>
              <th className="p-2 text-left">Admin</th>
              <th className="p-2 text-left">Ação</th>
              <th className="p-2 text-left">Tabela</th>
              <th className="p-2 text-left">ID alvo</th>
              <th className="p-2 text-left">Detalhes</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id} className="border-t hover:bg-muted/40">
                <td className="p-2 whitespace-nowrap">{new Date(r.created_at).toLocaleString("pt-BR")}</td>
                <td className="p-2">{admins[r.admin_id || ""] || <span className="font-mono text-xs">{r.admin_id?.slice(0, 8)}</span>}</td>
                <td className="p-2"><Badge variant="outline">{r.action}</Badge></td>
                <td className="p-2">{r.target_table || "—"}</td>
                <td className="p-2 font-mono text-xs">{r.target_id?.slice(0, 8) || "—"}</td>
                <td className="p-2 max-w-md"><code className="text-xs break-all">{r.details ? JSON.stringify(r.details) : "—"}</code></td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhum registro.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}