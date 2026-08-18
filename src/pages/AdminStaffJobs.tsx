import { traduzirErro } from "@/lib/errorMessages";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import SEO from "@/components/SEO";

const STATUS_LABEL: Record<string, string> = {
  aberta: "Publicada",
  rascunho: "Rascunho",
  preenchida: "Preenchida",
  expirada: "Expirada",
  bloqueada: "Bloqueada",
};

export default function AdminStaffJobs() {
  const { toast } = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("todos");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    let query = (supabase.from("staff_jobs" as any) as any)
      .select("*, supplier:suppliers(id, company_name, city), applications:staff_applications(id, status)")
      .order("created_at", { ascending: false })
      .limit(200);
    if (status !== "todos") query = query.eq("status", status);
    const { data, error } = await query;
    setLoading(false);
    if (error) return toast({ title: "Erro", description: traduzirErro(error), variant: "destructive" });
    setRows(data || []);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [status]);

  const filtered = rows.filter((r) => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return (
      r.funcao?.toLowerCase().includes(s) ||
      r.cidade?.toLowerCase().includes(s) ||
      r.local?.toLowerCase().includes(s) ||
      r.supplier?.company_name?.toLowerCase().includes(s)
    );
  });

  const setJobStatus = async (id: string, novo: string) => {
    const { error } = await (supabase.from("staff_jobs" as any) as any).update({ status: novo }).eq("id", id);
    if (error) return toast({ title: "Erro", description: traduzirErro(error), variant: "destructive" });
    toast({ title: "Status atualizado" });
    load();
  };

  return (
    <div className="space-y-4">
      <SEO title="Admin — Vagas" noIndex />
      <div>
        <h1 className="text-2xl font-bold">Vagas publicadas</h1>
        <p className="text-sm text-muted-foreground">Auditoria e ações administrativas.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Input placeholder="Buscar fornecedor, função, cidade..." value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="aberta">Publicadas</SelectItem>
            <SelectItem value="rascunho">Rascunho</SelectItem>
            <SelectItem value="preenchida">Preenchidas</SelectItem>
            <SelectItem value="expirada">Expiradas</SelectItem>
            <SelectItem value="bloqueada">Bloqueadas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Carregando...</p>}
      {!loading && filtered.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma vaga encontrada.</p>}

      <div className="space-y-2">
        {filtered.map((j) => (
          <Card key={j.id}>
            <CardContent className="p-4 flex flex-wrap items-center gap-3 justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium">{j.funcao} • {j.supplier?.company_name || "—"}</p>
                  <Badge variant="secondary">{STATUS_LABEL[j.status] || j.status}</Badge>
                  {j.is_public && <Badge variant="outline">Marketplace</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">
                  {j.data && new Date(j.data + "T00:00:00").toLocaleDateString("pt-BR")} • {j.cidade || j.local || "—"} • R$ {Number(j.valor_turno || 0).toLocaleString("pt-BR")}
                </p>
                <p className="text-xs text-muted-foreground">
                  Publicada em {j.published_at ? new Date(j.published_at).toLocaleString("pt-BR") : "—"} • {j.applications?.length || 0} candidaturas
                </p>
              </div>
              <div className="flex gap-2">
                {j.status !== "bloqueada" && (
                  <Button size="sm" variant="outline" onClick={() => setJobStatus(j.id, "bloqueada")}>Bloquear</Button>
                )}
                {j.status === "bloqueada" && (
                  <Button size="sm" variant="outline" onClick={() => setJobStatus(j.id, "aberta")}>Desbloquear</Button>
                )}
                {j.status !== "expirada" && (
                  <Button size="sm" variant="outline" onClick={() => setJobStatus(j.id, "expirada")}>Forçar expiração</Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}