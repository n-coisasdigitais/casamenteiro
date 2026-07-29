import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, XCircle, Clock, AlertTriangle, Ban } from "lucide-react";

type Row = {
  id: string;
  message_id: string | null;
  template_name: string;
  recipient_email: string;
  status: string;
  error_message: string | null;
  metadata: any;
  created_at: string;
};

const STATUS_META: Record<string, { label: string; variant: any; icon: any }> = {
  sent:        { label: "Enviado",     variant: "default",     icon: CheckCircle2 },
  pending:     { label: "Pendente",    variant: "secondary",   icon: Clock },
  failed:      { label: "Falhou",      variant: "destructive", icon: XCircle },
  bounced:     { label: "Devolvido",   variant: "destructive", icon: AlertTriangle },
  complained:  { label: "Spam",        variant: "destructive", icon: AlertTriangle },
  suppressed:  { label: "Suprimido",   variant: "outline",     icon: Ban },
  dlq:         { label: "DLQ",         variant: "destructive", icon: AlertTriangle },
};

export default function AdminEmailLogs() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [template, setTemplate] = useState<string>("all");
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
    let query = supabase.from("email_send_log").select("*").order("created_at", { ascending: false }).limit(500);
    if (status !== "all") query = query.eq("status", status);
    if (template !== "all") query = query.eq("template_name", template);
    if (dateFrom) query = query.gte("created_at", new Date(dateFrom).toISOString());
    if (dateTo) query = query.lte("created_at", new Date(dateTo + "T23:59:59").toISOString());
    const { data } = await query;
    setRows((data || []) as Row[]);
    setLoading(false);
  }

  const filtered = useMemo(() => {
    if (!q.trim()) return rows;
    const t = q.trim().toLowerCase();
    return rows.filter(r =>
      r.recipient_email.toLowerCase().includes(t) ||
      r.template_name.toLowerCase().includes(t) ||
      (r.error_message || "").toLowerCase().includes(t) ||
      (r.message_id || "").toLowerCase().includes(t)
    );
  }, [rows, q]);

  const templates = useMemo(() => Array.from(new Set(rows.map(r => r.template_name))).sort(), [rows]);
  const stats = useMemo(() => {
    const s: Record<string, number> = {};
    rows.forEach(r => { s[r.status] = (s[r.status] || 0) + 1; });
    return s;
  }, [rows]);

  if (!checked) return <div className="p-8 text-center">Verificando...</div>;

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Envios de e-mail</h1>
        <p className="text-sm text-muted-foreground">Rastreamento de e-mails transacionais e broadcasts.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
        {(["sent","pending","failed","bounced","suppressed","dlq"] as const).map(k => {
          const meta = STATUS_META[k];
          const Icon = meta.icon;
          return (
            <Card key={k}>
              <CardContent className="p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="h-3.5 w-3.5" /> {meta.label}</div>
                <div className="text-2xl font-semibold">{stats[k] || 0}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-2 border rounded-lg p-3 bg-card">
        <Input placeholder="Buscar e-mail, template, erro..." value={q} onChange={e => setQ(e.target.value)} className="md:col-span-2" />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            {Object.keys(STATUS_META).map(s => <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={template} onValueChange={setTemplate}>
          <SelectTrigger><SelectValue placeholder="Template" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos templates</SelectItem>
            {templates.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        <div className="md:col-span-6 flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={() => {
            setQ(""); setStatus("all"); setTemplate("all"); setDateFrom(""); setDateTo("");
          }}>Limpar</Button>
          <Button size="sm" onClick={load} disabled={loading}>{loading ? "Carregando..." : "Aplicar"}</Button>
        </div>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="p-2 text-left">Quando</th>
              <th className="p-2 text-left">Status</th>
              <th className="p-2 text-left">Template</th>
              <th className="p-2 text-left">Destinatário</th>
              <th className="p-2 text-left">Erro / Detalhes</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => {
              const meta = STATUS_META[r.status] || { label: r.status, variant: "outline" as const };
              return (
                <tr key={r.id} className="border-t hover:bg-muted/40">
                  <td className="p-2 whitespace-nowrap">{new Date(r.created_at).toLocaleString("pt-BR")}</td>
                  <td className="p-2"><Badge variant={meta.variant as any}>{meta.label}</Badge></td>
                  <td className="p-2">{r.template_name}</td>
                  <td className="p-2">{r.recipient_email}</td>
                  <td className="p-2 max-w-md">
                    {r.error_message ? <span className="text-destructive text-xs">{r.error_message}</span> : <span className="text-muted-foreground text-xs">—</span>}
                  </td>
                </tr>
              );
            })}
            {!loading && filtered.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Nenhum envio registrado.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}