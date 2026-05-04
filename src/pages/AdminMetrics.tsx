import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, ExternalLink, Search } from "lucide-react";

export default function AdminMetrics() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [couples, setCouples] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [sims, setSims] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login"); return; }
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }).then(async ({ data }) => {
      if (!data) { navigate("/"); return; }
      const [p, c, s, qz, cs, si, rv] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("couples").select("*").order("created_at", { ascending: false }),
        supabase.from("suppliers").select("id, company_name, email, phone, city, state, status, featured, rating, review_count, created_at, category_id, categories(name)").order("created_at", { ascending: false }),
        supabase.from("quotes").select("id, status, kanban_status, created_at"),
        supabase.from("couple_suppliers").select("id, final_value, contract_value, contracted_at").eq("status", "contracted"),
        (supabase.from("home_simulacoes" as any) as any).select("id, criado_em"),
        supabase.from("reviews").select("id, rating, created_at"),
      ]);
      setProfiles(p.data || []);
      setCouples(c.data || []);
      setSuppliers(s.data || []);
      setQuotes(qz.data || []);
      setContracts(cs.data || []);
      setSims(si.data || []);
      setReviews(rv.data || []);
      setLoading(false);
    });
  }, [user, authLoading, navigate]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;

  const profileById = Object.fromEntries(profiles.map((p) => [p.user_id, p]));
  const totalGmv = contracts.reduce((sum, r) => sum + Number(r.final_value || r.contract_value || 0), 0);
  const supplierApproved = suppliers.filter((s) => s.status === "approved").length;
  const supplierPending = suppliers.filter((s) => s.status === "pending").length;
  const avgRating = reviews.length ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1) : "—";

  const norm = (v: any) => String(v || "").toLowerCase();
  const filteredCouples = couples.filter((c) => {
    const prof = profileById[c.user_id];
    return !q || [c.partner_name, c.wedding_city, prof?.full_name].some((v) => norm(v).includes(q.toLowerCase()));
  });
  const filteredSuppliers = suppliers.filter((s) =>
    !q || [s.company_name, s.email, s.city, s.state].some((v) => norm(v).includes(q.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Métricas e Cadastros</h1>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/admin"><ArrowLeft className="w-4 h-4 mr-1" /> Painel admin</Link>
          </Button>
        </div>
      </header>

      <div className="container py-8 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Usuários</p><p className="text-2xl font-bold">{profiles.length}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Casais</p><p className="text-2xl font-bold">{couples.length}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Fornecedores</p><p className="text-2xl font-bold">{suppliers.length}</p><p className="text-xs text-muted-foreground mt-1">{supplierApproved} aprov · {supplierPending} pend</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Simulações</p><p className="text-2xl font-bold">{sims.length}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Orçamentos</p><p className="text-2xl font-bold">{quotes.length}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Contratos</p><p className="text-2xl font-bold">{contracts.length}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">GMV fechado</p><p className="text-2xl font-bold">R$ {totalGmv.toLocaleString("pt-BR")}</p><p className="text-xs text-muted-foreground mt-1">★ {avgRating} ({reviews.length} avaliações)</p></CardContent></Card>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome, e-mail, cidade..." className="pl-9" />
        </div>

        <Tabs defaultValue="couples">
          <TabsList>
            <TabsTrigger value="couples">Casais ({filteredCouples.length})</TabsTrigger>
            <TabsTrigger value="suppliers">Fornecedores ({filteredSuppliers.length})</TabsTrigger>
            <TabsTrigger value="users">Usuários ({profiles.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="couples" className="space-y-2">
            {filteredCouples.map((c) => {
              const prof = profileById[c.user_id];
              return (
                <Card key={c.id}><CardContent className="p-3 flex justify-between flex-wrap gap-2 text-sm">
                  <div>
                    <p className="font-medium">{prof?.full_name || "Sem nome"} {c.partner_name && <span className="text-muted-foreground">& {c.partner_name}</span>}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.wedding_date ? new Date(c.wedding_date + "T00:00:00").toLocaleDateString("pt-BR") : "sem data"}
                      {c.wedding_city && ` · ${c.wedding_city}`}
                      {c.estimated_guests && ` · ${c.estimated_guests} convidados`}
                      {c.estimated_budget && ` · R$ ${Number(c.estimated_budget).toLocaleString("pt-BR")}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {c.onboarding_completed ? <Badge>Onboarding ok</Badge> : <Badge variant="secondary">Onboarding pend</Badge>}
                    <span className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString("pt-BR")}</span>
                  </div>
                </CardContent></Card>
              );
            })}
            {filteredCouples.length === 0 && <p className="text-sm text-muted-foreground">Nenhum casal encontrado.</p>}
          </TabsContent>

          <TabsContent value="suppliers" className="space-y-2">
            {filteredSuppliers.map((s) => (
              <Card key={s.id}><CardContent className="p-3 flex justify-between flex-wrap gap-2 text-sm">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium">{s.company_name}</p>
                    <Badge variant={s.status === "approved" ? "default" : s.status === "rejected" ? "destructive" : "secondary"}>
                      {s.status === "approved" ? "Aprovado" : s.status === "pending" ? "Pendente" : "Rejeitado"}
                    </Badge>
                    {s.featured && <Badge variant="outline">⭐ destaque</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {(s.categories as any)?.name || "—"}
                    {s.city && ` · ${s.city}/${s.state || ""}`}
                    {s.email && ` · ${s.email}`}
                    {s.phone && ` · ${s.phone}`}
                  </p>
                  <p className="text-xs text-muted-foreground">★ {s.rating || "—"} ({s.review_count || 0}) · cadastrado em {new Date(s.created_at).toLocaleDateString("pt-BR")}</p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/fornecedor/${s.id}`}><ExternalLink className="w-3 h-3 mr-1" />Ver</Link>
                </Button>
              </CardContent></Card>
            ))}
            {filteredSuppliers.length === 0 && <p className="text-sm text-muted-foreground">Nenhum fornecedor encontrado.</p>}
          </TabsContent>

          <TabsContent value="users" className="space-y-2">
            {profiles.map((p) => (
              <Card key={p.id}><CardContent className="p-3 flex justify-between flex-wrap gap-2 text-sm">
                <div>
                  <p className="font-medium">{p.full_name || "Sem nome"}</p>
                  <p className="text-xs text-muted-foreground">{p.account_type} · cadastrado em {new Date(p.created_at).toLocaleDateString("pt-BR")}</p>
                </div>
                <Badge variant="outline">{p.account_type}</Badge>
              </CardContent></Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}