import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, ArrowLeft, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminFinance() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [checked, setChecked] = useState(false);
  const [leads, setLeads] = useState<any[]>([]);
  const [pct, setPct] = useState(10); // % comissão sugerida

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login"); return; }
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }).then(({ data }) => {
      if (!data) { navigate("/"); return; }
      setChecked(true); load();
    });
  }, [user, authLoading, navigate]);

  const load = async () => {
    const { data } = await supabase.from("supplier_leads")
      .select("*, suppliers(company_name)")
      .order("created_at", { ascending: false }).limit(200);
    setLeads((data as any) || []);
  };

  const markPaid = async (lead: any) => {
    const suggested = lead.valor_fechado ? Math.round(lead.valor_fechado * (pct / 100)) : 0;
    const input = prompt(`Valor da comissão recebida (R$):`, String(lead.comissao_gerada ?? suggested));
    if (input === null) return;
    const amt = Number(input.replace(",", "."));
    if (isNaN(amt)) return;
    const { error } = await (supabase.rpc as any)("admin_mark_commission_paid", { _lead_id: lead.id, _amount: amt });
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: "Comissão registrada" }); load(); }
  };

  const closed = leads.filter(l => l.status_lead === "fechado" || l.valor_fechado);
  const totalGmv = closed.reduce((s, l) => s + Number(l.valor_fechado || 0), 0);
  const totalCommission = leads.reduce((s, l) => s + Number(l.comissao_gerada || 0), 0);
  const pending = closed.filter(l => !l.comissao_gerada).length;

  if (!checked) return <div className="min-h-screen flex items-center justify-center">Verificando...</div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b sticky top-0 z-40">
        <div className="container flex items-center gap-3 h-16">
          <Button variant="ghost" size="icon" asChild><Link to="/admin"><ArrowLeft className="h-4 w-4" /></Link></Button>
          <Heart className="h-5 w-5 text-primary fill-primary" />
          <span className="font-bold">Financeiro · GMV & Comissões</span>
        </div>
      </header>
      <main className="container py-6 space-y-4">
        <div className="grid sm:grid-cols-3 gap-3">
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">GMV total</p><p className="text-2xl font-bold">R$ {totalGmv.toLocaleString("pt-BR")}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Comissão registrada</p><p className="text-2xl font-bold">R$ {totalCommission.toLocaleString("pt-BR")}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Pendentes de cobrança</p><p className="text-2xl font-bold">{pending}</p></CardContent></Card>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm">% comissão sugerida:</span>
          <Input type="number" value={pct} onChange={e => setPct(Number(e.target.value))} className="w-20 h-8" />
          <span className="text-sm">%</span>
        </div>

        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="p-2 text-left">Fornecedor</th>
                <th className="p-2 text-left">Casal</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-left">Fechado</th>
                <th className="p-2 text-left">Comissão</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {leads.map(l => (
                <tr key={l.id} className="border-t">
                  <td className="p-2">{l.suppliers?.company_name || "—"}</td>
                  <td className="p-2">{l.nome_casal || l.email_casal || "—"}</td>
                  <td className="p-2"><Badge variant={l.status_lead === "fechado" ? "default" : "secondary"}>{l.status_lead}</Badge></td>
                  <td className="p-2">R$ {Number(l.valor_fechado || 0).toLocaleString("pt-BR")}</td>
                  <td className="p-2">{l.comissao_gerada ? `R$ ${Number(l.comissao_gerada).toLocaleString("pt-BR")}` : <span className="text-muted-foreground">—</span>}</td>
                  <td className="p-2"><Button size="sm" variant="outline" onClick={() => markPaid(l)}><DollarSign className="h-3 w-3 mr-1" />Registrar</Button></td>
                </tr>
              ))}
              {leads.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhum lead.</td></tr>}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}