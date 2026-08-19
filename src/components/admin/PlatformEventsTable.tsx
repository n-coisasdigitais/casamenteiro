import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download } from "lucide-react";

type Evento = {
  id: string;
  created_at: string;
  actor_id: string | null;
  actor_role: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  severity: string;
  source: string;
  before: any;
  after: any;
  details: any;
};

const SEVERIDADE_LABEL: Record<string, string> = {
  info: "Informação",
  warning: "Atenção",
  error: "Erro",
};

export default function PlatformEventsTable() {
  const [rows, setRows] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(false);
  const [nomes, setNomes] = useState<Record<string, string>>({});
  const [expandido, setExpandido] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [acao, setAcao] = useState("all");
  const [entidade, setEntidade] = useState("all");
  const [severidade, setSeveridade] = useState("all");
  const [dataDe, setDataDe] = useState("");
  const [dataAte, setDataAte] = useState("");

  const carregar = async () => {
    setLoading(true);
    let query = supabase
      .from("platform_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (dataDe) query = query.gte("created_at", new Date(dataDe).toISOString());
    if (dataAte) query = query.lte("created_at", new Date(dataAte + "T23:59:59").toISOString());
    if (acao !== "all") query = query.eq("action", acao);
    if (entidade !== "all") query = query.eq("entity", entidade);
    if (severidade !== "all") query = query.eq("severity", severidade);
    const { data } = await query;
    const lista = (data || []) as Evento[];
    setRows(lista);

    const ids = Array.from(new Set(lista.map((r) => r.actor_id).filter(Boolean))) as string[];
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("user_id, full_name").in("user_id", ids);
      const map: Record<string, string> = {};
      (profs || []).forEach((p: any) => { map[p.user_id] = p.full_name || p.user_id.slice(0, 8); });
      setNomes(map);
    }
    setLoading(false);
  };

  useEffect(() => { carregar(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const filtrados = useMemo(() => {
    if (!q.trim()) return rows;
    const termo = q.trim().toLowerCase();
    return rows.filter((r) =>
      r.action?.toLowerCase().includes(termo) ||
      r.entity?.toLowerCase().includes(termo) ||
      r.entity_id?.toLowerCase().includes(termo) ||
      nomes[r.actor_id || ""]?.toLowerCase().includes(termo) ||
      JSON.stringify(r.details || r.after || r.before || {}).toLowerCase().includes(termo)
    );
  }, [rows, q, nomes]);

  const acoes = useMemo(() => Array.from(new Set(rows.map((r) => r.action))).sort(), [rows]);
  const entidades = useMemo(() => Array.from(new Set(rows.map((r) => r.entity))).sort(), [rows]);

  const exportarCsv = () => {
    const header = ["quando", "responsavel", "papel", "acao", "entidade", "id", "severidade", "origem", "detalhes"];
    const linhas = filtrados.map((r) => [
      new Date(r.created_at).toLocaleString("pt-BR"),
      nomes[r.actor_id || ""] || r.actor_id || "sistema",
      r.actor_role || "",
      r.action,
      r.entity,
      r.entity_id || "",
      SEVERIDADE_LABEL[r.severity] || r.severity,
      r.source,
      JSON.stringify(r.details || r.after || r.before || {}),
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
    const csv = [header.join(","), ...linhas].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `eventos-plataforma-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tomSeveridade = (s: string) =>
    s === "error" ? "destructive" : s === "warning" ? "secondary" : "outline";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">
          Exclusões, convites, reservas, aceites, pagamentos e mudanças de permissão registrados automaticamente.
        </p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{filtrados.length} de {rows.length}</span>
          <Button size="sm" variant="outline" onClick={exportarCsv} disabled={!filtrados.length}>
            <Download className="h-4 w-4 mr-1" />CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-2 border rounded-lg p-3 bg-card">
        <Input placeholder="Buscar..." value={q} onChange={(e) => setQ(e.target.value)} className="md:col-span-2" />
        <Select value={acao} onValueChange={setAcao}>
          <SelectTrigger><SelectValue placeholder="Ação" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as ações</SelectItem>
            {acoes.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={entidade} onValueChange={setEntidade}>
          <SelectTrigger><SelectValue placeholder="Entidade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as entidades</SelectItem>
            {entidades.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={severidade} onValueChange={setSeveridade}>
          <SelectTrigger><SelectValue placeholder="Severidade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="info">Informação</SelectItem>
            <SelectItem value="warning">Atenção</SelectItem>
            <SelectItem value="error">Erro</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-1">
          <Input type="date" value={dataDe} onChange={(e) => setDataDe(e.target.value)} />
          <Input type="date" value={dataAte} onChange={(e) => setDataAte(e.target.value)} />
        </div>
        <div className="md:col-span-6 flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={() => {
            setQ(""); setAcao("all"); setEntidade("all"); setSeveridade("all"); setDataDe(""); setDataAte("");
          }}>Limpar filtros</Button>
          <Button size="sm" onClick={carregar} disabled={loading}>{loading ? "Carregando..." : "Aplicar"}</Button>
        </div>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="p-2 text-left">Quando</th>
              <th className="p-2 text-left">Responsável</th>
              <th className="p-2 text-left">Ação</th>
              <th className="p-2 text-left">Entidade</th>
              <th className="p-2 text-left">ID</th>
              <th className="p-2 text-left">Severidade</th>
              <th className="p-2 text-left">Detalhes</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((r) => (
              <tr key={r.id} className="border-t hover:bg-muted/40 align-top">
                <td className="p-2 whitespace-nowrap">{new Date(r.created_at).toLocaleString("pt-BR")}</td>
                <td className="p-2">
                  {nomes[r.actor_id || ""] || (r.actor_id ? <span className="font-mono text-xs">{r.actor_id.slice(0, 8)}</span> : "sistema")}
                  {r.actor_role && <span className="block text-xs text-muted-foreground">{r.actor_role}</span>}
                </td>
                <td className="p-2"><Badge variant="outline">{r.action}</Badge></td>
                <td className="p-2">{r.entity}</td>
                <td className="p-2 font-mono text-xs">{r.entity_id?.slice(0, 8) || "—"}</td>
                <td className="p-2"><Badge variant={tomSeveridade(r.severity) as any}>{SEVERIDADE_LABEL[r.severity] || r.severity}</Badge></td>
                <td className="p-2 max-w-md">
                  <button
                    type="button"
                    className="text-xs underline text-muted-foreground"
                    onClick={() => setExpandido(expandido === r.id ? null : r.id)}
                  >
                    {expandido === r.id ? "Ocultar" : "Ver dados"}
                  </button>
                  {expandido === r.id && (
                    <pre className="mt-2 text-xs whitespace-pre-wrap break-all bg-muted/50 p-2 rounded">
{JSON.stringify({ antes: r.before, depois: r.after, detalhes: r.details }, null, 2)}
                    </pre>
                  )}
                </td>
              </tr>
            ))}
            {!loading && filtrados.length === 0 && (
              <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Nenhum evento registrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
