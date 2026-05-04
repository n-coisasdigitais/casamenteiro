import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Send, Search, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function SupplierList() {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    supabase.from("suppliers").select("*, categories(name)").order("created_at", { ascending: false }).then(({ data }) => {
      setSuppliers(data || []);
    });
  }, []);

  const filtered = suppliers.filter((s) =>
    !q || [s.company_name, s.email, s.city].some((v) => String(v || "").toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar fornecedor..." className="pl-9" />
      </div>
      {filtered.map((s) => (
        <Card key={s.id} className="cursor-pointer hover:bg-muted/40" onClick={() => navigate(`/admin/fornecedor/${s.id}`)}>
          <CardContent className="p-3 flex justify-between flex-wrap gap-2 text-sm">
            <div>
              <p className="font-medium">{s.company_name}</p>
              <p className="text-xs text-muted-foreground">{s.categories?.name || "—"}{s.city && ` · ${s.city}/${s.state || ""}`} · ★ {s.rating || "—"} ({s.review_count || 0})</p>
            </div>
            <Badge variant={s.status === "approved" ? "default" : s.status === "rejected" ? "destructive" : "secondary"}>
              {s.status === "approved" ? "Aprovado" : s.status === "pending" ? "Pendente" : "Rejeitado"}
            </Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function SupplierDetail({ supplierId }: { supplierId: string }) {
  const { toast } = useToast();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pushTitle, setPushTitle] = useState("");
  const [pushBody, setPushBody] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: sup } = await supabase.from("suppliers").select("*, categories(name)").eq("id", supplierId).maybeSingle();
      if (!sup) { setLoading(false); return; }
      const [quotes, contracts, views, reviews, leads] = await Promise.all([
        supabase.from("quotes").select("*").eq("supplier_id", supplierId).order("created_at", { ascending: false }),
        supabase.from("couple_suppliers").select("*").eq("supplier_id", supplierId).eq("status", "contracted"),
        supabase.from("supplier_profile_views").select("id, viewed_at").eq("supplier_id", supplierId),
        supabase.from("reviews").select("*").eq("supplier_id", supplierId),
        supabase.from("supplier_leads").select("*").eq("supplier_id", supplierId).order("created_at", { ascending: false }),
      ]);
      setData({ sup, quotes: quotes.data || [], contracts: contracts.data || [], views: views.data || [], reviews: reviews.data || [], leads: leads.data || [] });
      setLoading(false);
    })();
  }, [supplierId]);

  const sendPush = async () => {
    if (!pushTitle.trim() || !data?.sup?.user_id) return;
    setSending(true);
    const { error } = await supabase.from("notifications").insert({
      user_id: data.sup.user_id,
      type: "admin_message",
      title: pushTitle,
      body: pushBody,
    });
    setSending(false);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: "Mensagem enviada!" }); setPushTitle(""); setPushBody(""); }
  };

  if (loading) return <p className="text-sm text-muted-foreground">Carregando...</p>;
  if (!data) return <p className="text-sm text-muted-foreground">Fornecedor não encontrado.</p>;

  const { sup, quotes, contracts, views, reviews, leads } = data;
  const responded = quotes.filter((q: any) => q.kanban_status !== "enviado").length;
  const respRate = quotes.length ? Math.round((responded / quotes.length) * 100) : 0;
  const gmv = contracts.reduce((s: number, c: any) => s + Number(c.final_value || c.contract_value || 0), 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between items-start gap-3 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold">{sup.company_name}</h2>
              <p className="text-xs text-muted-foreground">{sup.categories?.name || "—"}{sup.city && ` · ${sup.city}/${sup.state || ""}`}</p>
              <p className="text-xs text-muted-foreground mt-1">{sup.email} {sup.phone && `· ${sup.phone}`} {sup.whatsapp && `· wpp ${sup.whatsapp}`}</p>
            </div>
            <Button variant="outline" size="sm" asChild><Link to={`/fornecedor/${sup.id}`}><ExternalLink className="w-3 h-3 mr-1" />Ver perfil</Link></Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Visualizações</p><p className="text-xl font-bold">{views.length}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Orçamentos</p><p className="text-xl font-bold">{quotes.length}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Taxa resposta</p><p className="text-xl font-bold">{respRate}%</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Contratos</p><p className="text-xl font-bold">{contracts.length}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">GMV</p><p className="text-xl font-bold">R$ {gmv.toLocaleString("pt-BR")}</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-4 space-y-2">
          <h3 className="font-semibold flex items-center gap-2"><Send className="w-4 h-4" />Mensagem para o fornecedor</h3>
          <Input placeholder="Título" value={pushTitle} onChange={(e) => setPushTitle(e.target.value)} />
          <Textarea placeholder="Mensagem" value={pushBody} onChange={(e) => setPushBody(e.target.value)} rows={3} />
          <Button onClick={sendPush} disabled={sending || !pushTitle.trim()}>{sending ? "Enviando..." : "Enviar"}</Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="quotes">
        <TabsList>
          <TabsTrigger value="quotes">Orçamentos ({quotes.length})</TabsTrigger>
          <TabsTrigger value="leads">Leads ({leads.length})</TabsTrigger>
          <TabsTrigger value="reviews">Avaliações ({reviews.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="quotes" className="space-y-2">
          {quotes.map((q: any) => (
            <Card key={q.id}><CardContent className="p-3 text-sm flex justify-between flex-wrap gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground line-clamp-2">{q.message}</p>
                <p className="text-xs text-muted-foreground">{new Date(q.created_at).toLocaleDateString("pt-BR")}</p>
              </div>
              <Badge variant="outline">{q.kanban_status}</Badge>
            </CardContent></Card>
          ))}
        </TabsContent>

        <TabsContent value="leads" className="space-y-2">
          {leads.map((l: any) => (
            <Card key={l.id}><CardContent className="p-3 text-sm">
              <p className="font-medium">{l.nome_casal || "—"}</p>
              <p className="text-xs text-muted-foreground">{l.cidade_evento || "—"} · {l.num_convidados || "?"} conv. · R$ {Number(l.orcamento_total || 0).toLocaleString("pt-BR")}</p>
              <p className="text-xs text-muted-foreground">{l.status_lead} · {new Date(l.created_at).toLocaleDateString("pt-BR")}</p>
            </CardContent></Card>
          ))}
        </TabsContent>

        <TabsContent value="reviews" className="space-y-2">
          {reviews.map((r: any) => (
            <Card key={r.id}><CardContent className="p-3 text-sm">
              <p className="font-medium">★ {r.rating} {r.title}</p>
              <p className="text-xs text-muted-foreground">{r.comment}</p>
            </CardContent></Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function AdminSupplierCRM() {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login"); return; }
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }).then(({ data }) => {
      if (!data) navigate("/"); else setOk(true);
    });
  }, [user, authLoading, navigate]);

  if (!ok) return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">CRM de Fornecedores</h1>
          <Button variant="ghost" size="sm" asChild>
            <Link to={id ? "/admin/fornecedores-crm" : "/admin"}><ArrowLeft className="w-4 h-4 mr-1" />{id ? "Voltar" : "Painel"}</Link>
          </Button>
        </div>
      </header>
      <div className="container py-6">{id ? <SupplierDetail supplierId={id} /> : <SupplierList />}</div>
    </div>
  );
}