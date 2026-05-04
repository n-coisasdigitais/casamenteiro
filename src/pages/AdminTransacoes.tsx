import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function AdminTransacoes() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [sims, setSims] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [contracted, setContracted] = useState<any[]>([]);
  const [suppliersMap, setSuppliersMap] = useState<Record<string, any>>({});
  const [couplesMap, setCouplesMap] = useState<Record<string, any>>({});

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login"); return; }
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }).then(async ({ data }) => {
      if (!data) { navigate("/"); return; }
      const [simsRes, quotesRes, contractsRes, supRes, coupleRes] = await Promise.all([
        (supabase.from("home_simulacoes" as any) as any).select("*").order("criado_em", { ascending: false }),
        supabase.from("quotes").select("*").order("created_at", { ascending: false }),
        supabase.from("couple_suppliers").select("*").eq("status", "contracted").order("contracted_at", { ascending: false }),
        supabase.from("suppliers").select("id, company_name"),
        supabase.from("couples").select("id, partner_name, user_id"),
      ]);
      setSims(simsRes.data || []);
      setQuotes(quotesRes.data || []);
      setContracted(contractsRes.data || []);
      setSuppliersMap(Object.fromEntries((supRes.data || []).map((s: any) => [s.id, s])));
      setCouplesMap(Object.fromEntries((coupleRes.data || []).map((c: any) => [c.id, c])));
      setLoading(false);
    });
  }, [user, authLoading, navigate]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;

  const totalGmv = contracted.reduce((s, r) => s + Number(r.final_value || r.contract_value || 0), 0);
  const conversaoOrc = sims.length ? Math.round((quotes.length / sims.length) * 100) : 0;
  const conversaoFech = quotes.length ? Math.round((contracted.length / quotes.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Transações da plataforma</h1>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/admin"><ArrowLeft className="w-4 h-4 mr-1" /> Painel admin</Link>
          </Button>
        </div>
      </header>

      <div className="container py-8 space-y-6">
        {/* Métricas */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Simulações</p><p className="text-2xl font-bold">{sims.length}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Orçamentos</p><p className="text-2xl font-bold">{quotes.length}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Contratos</p><p className="text-2xl font-bold">{contracted.length}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Conversão sim→orc</p><p className="text-2xl font-bold">{conversaoOrc}%</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">GMV fechado</p><p className="text-2xl font-bold">R$ {totalGmv.toLocaleString("pt-BR")}</p></CardContent></Card>
        </div>
        <p className="text-xs text-muted-foreground">Conversão orçamento → contrato: <strong>{conversaoFech}%</strong></p>

        <Tabs defaultValue="contratos">
          <TabsList>
            <TabsTrigger value="contratos">Contratos ({contracted.length})</TabsTrigger>
            <TabsTrigger value="orcamentos">Orçamentos ({quotes.length})</TabsTrigger>
            <TabsTrigger value="simulacoes">Simulações ({sims.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="contratos" className="space-y-2">
            {contracted.length === 0 && <p className="text-sm text-muted-foreground">Nenhum contrato fechado ainda.</p>}
            {contracted.map((c) => (
              <Card key={c.id}><CardContent className="p-3 flex justify-between flex-wrap gap-2 text-sm">
                <div>
                  <p className="font-medium">{suppliersMap[c.supplier_id]?.company_name || "Fornecedor"}</p>
                  <p className="text-xs text-muted-foreground">Casal: {couplesMap[c.couple_id]?.partner_name || c.couple_id?.slice(0, 8)} · {c.contracted_at ? new Date(c.contracted_at).toLocaleDateString("pt-BR") : "—"}</p>
                </div>
                <p className="font-semibold">R$ {Number(c.final_value || c.contract_value || 0).toLocaleString("pt-BR")}</p>
              </CardContent></Card>
            ))}
          </TabsContent>

          <TabsContent value="orcamentos" className="space-y-2">
            {quotes.map((q) => (
              <Card key={q.id}><CardContent className="p-3 flex justify-between flex-wrap gap-2 text-sm">
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{suppliersMap[q.supplier_id]?.company_name || "Fornecedor"}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">{q.message}</p>
                  <p className="text-xs text-muted-foreground">{new Date(q.created_at).toLocaleString("pt-BR")}</p>
                </div>
                <Badge variant="outline">{q.status}</Badge>
              </CardContent></Card>
            ))}
          </TabsContent>

          <TabsContent value="simulacoes" className="space-y-2">
            {sims.map((s) => (
              <Card key={s.id}><CardContent className="p-3 flex justify-between flex-wrap gap-2 text-sm">
                <div>
                  <p className="font-medium">R$ {Number(s.orcamento_total).toLocaleString("pt-BR")} · {s.num_convidados} convidados</p>
                  <p className="text-xs text-muted-foreground">{s.cidade || "—"} · {new Date(s.criado_em).toLocaleString("pt-BR")}</p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/simulador/resultado?id=${s.id}`}>Ver</Link>
                </Button>
              </CardContent></Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}