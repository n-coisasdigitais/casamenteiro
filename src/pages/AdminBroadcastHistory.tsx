import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Heart, ArrowLeft, Search, Users } from "lucide-react";

type Row = {
  id: string;
  admin_id: string;
  segment: string;
  filters: any;
  title: string;
  body: string;
  link: string | null;
  recipients_count: number;
  channel: string;
  created_at: string;
};

const SEG_LABEL: Record<string, string> = { couples: "Casais", suppliers: "Fornecedores", all: "Todos" };

export default function AdminBroadcastHistory() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState("");
  const [segment, setSegment] = useState<string>("all");
  const [period, setPeriod] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login"); return; }
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }).then(async ({ data }) => {
      if (!data) { navigate("/"); return; }
      setChecked(true);
      const { data: hist } = await (supabase.from("broadcast_history" as any).select("*").order("created_at", { ascending: false }).limit(500) as any);
      setRows((hist as any) || []);
      setLoading(false);
    });
  }, [user, authLoading, navigate]);

  const filtered = useMemo(() => {
    const now = Date.now();
    return rows.filter(r => {
      if (segment !== "all" && r.segment !== segment) return false;
      if (search && !(`${r.title} ${r.body}`.toLowerCase().includes(search.toLowerCase()))) return false;
      if (period !== "all") {
        const days = period === "7" ? 7 : period === "30" ? 30 : 90;
        if (now - new Date(r.created_at).getTime() > days * 86400000) return false;
      }
      return true;
    });
  }, [rows, segment, search, period]);

  const totalSent = filtered.reduce((s, r) => s + (r.recipients_count || 0), 0);

  if (!checked) return <div className="min-h-screen flex items-center justify-center">Verificando...</div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b sticky top-0 z-40">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild><Link to="/admin"><ArrowLeft className="h-4 w-4" /></Link></Button>
            <Heart className="h-5 w-5 text-primary fill-primary" />
            <span className="font-bold">Histórico de comunicações</span>
          </div>
          <Button variant="outline" size="sm" asChild><Link to="/admin/comunicacao">Novo envio</Link></Button>
        </div>
      </header>

      <main className="container py-6 space-y-4">
        <div className="grid sm:grid-cols-3 gap-3">
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Envios listados</p><p className="text-2xl font-bold">{filtered.length}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Destinatários totais</p><p className="text-2xl font-bold">{totalSent.toLocaleString("pt-BR")}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Média por envio</p><p className="text-2xl font-bold">{filtered.length ? Math.round(totalSent / filtered.length) : 0}</p></CardContent></Card>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar título ou mensagem..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={segment} onValueChange={setSegment}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Segmento" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os segmentos</SelectItem>
              <SelectItem value="couples">Casais</SelectItem>
              <SelectItem value="suppliers">Fornecedores</SelectItem>
              <SelectItem value="all_users">Todos os usuários</SelectItem>
            </SelectContent>
          </Select>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Período" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo o período</SelectItem>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? <p className="text-muted-foreground">Carregando...</p> : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">Nenhum envio encontrado.</p>
        ) : (
          <div className="space-y-3">
            {filtered.map(r => {
              const f = r.filters || {};
              return (
                <Card key={r.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <Badge variant="default">{SEG_LABEL[r.segment] || r.segment}</Badge>
                          <Badge variant="outline">{r.channel === "in_app" ? "Push in-app" : r.channel}</Badge>
                          <Badge variant="secondary" className="gap-1"><Users className="h-3 w-3" />{r.recipients_count}</Badge>
                          <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("pt-BR")}</span>
                        </div>
                        <h3 className="font-semibold">{r.title}</h3>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{r.body}</p>
                        {r.link && <p className="text-xs text-primary mt-1">Link: {r.link}</p>}
                      </div>
                    </div>
                    {(f.city || f.category_id || f.days_max) && (
                      <div className="flex flex-wrap gap-1.5 pt-2 border-t mt-2">
                        <span className="text-xs text-muted-foreground">Filtros:</span>
                        {f.city && <Badge variant="outline" className="text-xs">Cidade: {f.city}</Badge>}
                        {f.category_id && <Badge variant="outline" className="text-xs">Categoria: {String(f.category_id).slice(0, 8)}</Badge>}
                        {f.days_max && <Badge variant="outline" className="text-xs">≤ {f.days_max} dias do casamento</Badge>}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}