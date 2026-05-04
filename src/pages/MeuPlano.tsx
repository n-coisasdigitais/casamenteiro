import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardHeader from "@/components/DashboardHeader";
import DashboardNav from "@/components/DashboardNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ExternalLink, Save, MessageSquare, ArrowLeft } from "lucide-react";

type Row = {
  id: string;
  supplier_id: string;
  status: string;
  estimated_value: number | null;
  proposed_value: number | null;
  final_value: number | null;
  contract_value: number | null;
  category_id: string | null;
  supplier?: { company_name: string; profile_photo_url: string | null; city: string | null };
};

const STATUS_LABEL: Record<string, string> = {
  saved: "Guardado",
  quoted: "Orçamento enviado",
  negotiating: "Negociando",
  contracted: "Contratado",
  declined: "Recusado",
};

export default function MeuPlano() {
  const { id: simId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [sim, setSim] = useState<any>(null);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [edits, setEdits] = useState<Record<string, { est?: string; status?: string }>>({});

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    (async () => {
      const { data: c } = await supabase.from("couples").select("id").eq("user_id", user.id).maybeSingle();
      if (!c) { navigate("/onboarding"); return; }
      setCoupleId(c.id);
      if (simId) {
        const { data: s } = await (supabase.from("home_simulacoes" as any).select("*").eq("id", simId).maybeSingle() as any);
        setSim(s);
      }
      await load(c.id);
    })();
    // eslint-disable-next-line
  }, [user, simId]);

  const load = async (cId: string) => {
    const query = supabase.from("couple_suppliers").select("*").eq("couple_id", cId);
    const { data } = await query;
    const list = (data || []) as any[];
    if (list.length) {
      const ids = list.map((r) => r.supplier_id);
      const { data: sups } = await supabase.from("suppliers").select("id, company_name, profile_photo_url, city").in("id", ids);
      const map = new Map((sups || []).map((s: any) => [s.id, s]));
      setRows(list.map((r) => ({ ...r, supplier: map.get(r.supplier_id) })));
    } else setRows([]);
  };

  const totalEstimated = rows.reduce((sum, r) => sum + Number(r.estimated_value || r.contract_value || 0), 0);
  const totalContracted = rows.filter((r) => r.status === "contracted").reduce((sum, r) => sum + Number(r.final_value || r.contract_value || 0), 0);
  const totalBudget = Number(sim?.orcamento_total || 0);

  const saveRow = async (r: Row) => {
    const e = edits[r.id] || {};
    const update: any = {};
    if (e.est !== undefined && e.est !== "") update.estimated_value = Number(e.est);
    if (e.status) update.status = e.status;
    if (Object.keys(update).length === 0) return;
    const { error } = await (supabase.from("couple_suppliers") as any).update(update).eq("id", r.id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: "Atualizado" }); if (coupleId) load(coupleId); setEdits((p) => ({ ...p, [r.id]: {} })); }
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <DashboardNav />
      <main className="container px-4 py-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <Button variant="ghost" size="sm" asChild className="mb-2">
              <Link to="/dashboard"><ArrowLeft className="w-4 h-4 mr-1" /> Painel</Link>
            </Button>
            <h1 className="text-3xl font-bold">Meu plano</h1>
            {sim && (
              <p className="text-muted-foreground text-sm">
                Orçamento {sim.cidade || ""} · R$ {Number(sim.orcamento_total).toLocaleString("pt-BR")} · {sim.num_convidados} convidados
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Orçamento</p><p className="text-2xl font-bold">R$ {totalBudget.toLocaleString("pt-BR")}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Estimado total</p><p className="text-2xl font-bold">R$ {totalEstimated.toLocaleString("pt-BR")}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Contratado</p><p className="text-2xl font-bold text-primary">R$ {totalContracted.toLocaleString("pt-BR")}</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Fornecedores ({rows.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {rows.length === 0 && <p className="text-sm text-muted-foreground">Nenhum fornecedor no seu plano ainda.</p>}
            {rows.map((r) => {
              const e = edits[r.id] || {};
              const currentEst = e.est !== undefined ? e.est : String(r.estimated_value ?? r.contract_value ?? "");
              const currentStatus = e.status ?? r.status;
              return (
                <div key={r.id} className="flex flex-wrap items-center gap-3 border border-border rounded-md p-3">
                  <div className="flex items-center gap-2 flex-1 min-w-[180px]">
                    <div className="w-10 h-10 rounded-md bg-secondary overflow-hidden flex-shrink-0">
                      {r.supplier?.profile_photo_url && <img src={r.supplier.profile_photo_url} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{r.supplier?.company_name || "Fornecedor"}</p>
                      <p className="text-xs text-muted-foreground">{r.supplier?.city}</p>
                    </div>
                  </div>
                  <div className="w-32">
                    <Input type="number" placeholder="Estimado" value={currentEst} onChange={(ev) => setEdits((p) => ({ ...p, [r.id]: { ...p[r.id], est: ev.target.value } }))} className="h-9 text-sm" />
                  </div>
                  {r.proposed_value && (
                    <Badge variant="outline" className="text-[11px]">Proposta R$ {Number(r.proposed_value).toLocaleString("pt-BR")}</Badge>
                  )}
                  <select
                    value={currentStatus}
                    onChange={(ev) => setEdits((p) => ({ ...p, [r.id]: { ...p[r.id], status: ev.target.value } }))}
                    className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                  >
                    {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => saveRow(r)}><Save className="w-3.5 h-3.5" /></Button>
                    <Button size="sm" variant="ghost" asChild>
                      <Link to={`/fornecedor/${r.supplier_id}`} target="_blank"><ExternalLink className="w-3.5 h-3.5" /></Link>
                    </Button>
                    <Button size="sm" variant="ghost" asChild>
                      <Link to="/dashboard"><MessageSquare className="w-3.5 h-3.5" /></Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}