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
import { ArrowLeft, Send, Search, Calendar, MapPin, Users, Wallet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function daysUntil(d?: string | null) {
  if (!d) return null;
  const diff = Math.ceil((new Date(d + "T00:00:00").getTime() - Date.now()) / 86400000);
  return diff;
}

function CoupleList() {
  const navigate = useNavigate();
  const [couples, setCouples] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [q, setQ] = useState("");

  useEffect(() => {
    Promise.all([
      supabase.from("couples").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*").eq("account_type", "couple"),
    ]).then(([c, p]) => {
      setCouples(c.data || []);
      setProfiles(Object.fromEntries((p.data || []).map((x: any) => [x.user_id, x])));
    });
  }, []);

  const filtered = couples.filter((c) => {
    if (!q) return true;
    const prof = profiles[c.user_id];
    return [c.partner_name, c.wedding_city, prof?.full_name].some((v) => String(v || "").toLowerCase().includes(q.toLowerCase()));
  });

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar casal..." className="pl-9" />
      </div>
      {filtered.map((c) => {
        const prof = profiles[c.user_id];
        const days = daysUntil(c.wedding_date);
        return (
          <Card key={c.id} className="cursor-pointer hover:bg-muted/40" onClick={() => navigate(`/admin/casais/${c.id}`)}>
            <CardContent className="p-3 flex justify-between flex-wrap gap-2 text-sm">
              <div>
                <p className="font-medium">{prof?.full_name || "Sem nome"} {c.partner_name && <span className="text-muted-foreground">& {c.partner_name}</span>}</p>
                <p className="text-xs text-muted-foreground">
                  {c.wedding_date ? new Date(c.wedding_date + "T00:00:00").toLocaleDateString("pt-BR") : "sem data"}
                  {c.wedding_city && ` · ${c.wedding_city}`}
                  {c.estimated_guests && ` · ${c.estimated_guests} conv.`}
                  {c.estimated_budget && ` · R$ ${Number(c.estimated_budget).toLocaleString("pt-BR")}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {days !== null && days >= 0 && <Badge>faltam {days}d</Badge>}
                {days !== null && days < 0 && <Badge variant="secondary">já casou</Badge>}
                {c.onboarding_completed ? <Badge variant="outline">onboarding ok</Badge> : <Badge variant="secondary">onboarding pend</Badge>}
              </div>
            </CardContent>
          </Card>
        );
      })}
      {filtered.length === 0 && <p className="text-sm text-muted-foreground">Nenhum casal.</p>}
    </div>
  );
}

function CoupleDetail({ coupleId }: { coupleId: string }) {
  const { toast } = useToast();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pushTitle, setPushTitle] = useState("");
  const [pushBody, setPushBody] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: couple } = await supabase.from("couples").select("*").eq("id", coupleId).maybeSingle();
      if (!couple) { setLoading(false); return; }
      const [prof, tasks, guests, budget, payments, cs, qz] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", couple.user_id).maybeSingle(),
        supabase.from("wedding_tasks").select("*").eq("couple_id", coupleId),
        supabase.from("wedding_guests").select("*").eq("couple_id", coupleId),
        supabase.from("budget_items").select("*, suppliers(company_name)").eq("couple_id", coupleId),
        supabase.from("budget_payments").select("*").eq("couple_id", coupleId),
        supabase.from("couple_suppliers").select("*, suppliers(company_name), categories(name)").eq("couple_id", coupleId),
        supabase.from("quotes").select("*, suppliers(company_name)").eq("couple_id", coupleId).order("created_at", { ascending: false }),
      ]);
      setData({ couple, profile: prof.data, tasks: tasks.data || [], guests: guests.data || [], budget: budget.data || [], payments: payments.data || [], cs: cs.data || [], quotes: qz.data || [] });
      setLoading(false);
    })();
  }, [coupleId]);

  const sendPush = async () => {
    if (!pushTitle.trim()) return;
    setSending(true);
    const { error } = await supabase.from("notifications").insert({
      user_id: data.couple.user_id,
      type: "admin_message",
      title: pushTitle,
      body: pushBody,
    });
    setSending(false);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: "Mensagem enviada!" }); setPushTitle(""); setPushBody(""); }
  };

  if (loading) return <p className="text-sm text-muted-foreground">Carregando...</p>;
  if (!data) return <p className="text-sm text-muted-foreground">Casal não encontrado.</p>;

  const { couple, profile, tasks, guests, budget, payments, cs, quotes } = data;
  const days = daysUntil(couple.wedding_date);
  const tasksDone = tasks.filter((t: any) => t.is_completed).length;
  const guestsConfirmed = guests.filter((g: any) => g.rsvp_status === "confirmed").length;
  const budgetTotal = budget.reduce((s: number, b: any) => s + Number(b.estimated_cost || 0), 0);
  const paid = payments.filter((p: any) => p.status === "paid").reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
  const contracted = cs.filter((c: any) => c.status === "contracted");

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <h2 className="text-lg font-semibold">{profile?.full_name || "Sem nome"} {couple.partner_name && `& ${couple.partner_name}`}</h2>
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-2">
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{couple.wedding_date ? new Date(couple.wedding_date + "T00:00:00").toLocaleDateString("pt-BR") : "sem data"}{days !== null && days >= 0 && ` · faltam ${days} dias`}</span>
            {couple.wedding_city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{couple.wedding_city}</span>}
            {couple.estimated_guests && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{couple.estimated_guests} convidados</span>}
            {couple.estimated_budget && <span className="flex items-center gap-1"><Wallet className="w-3 h-3" />R$ {Number(couple.estimated_budget).toLocaleString("pt-BR")}</span>}
          </div>
          {couple.contact_phone && <p className="text-xs text-muted-foreground mt-1">📞 {couple.contact_phone}</p>}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Tarefas</p><p className="text-xl font-bold">{tasksDone}/{tasks.length}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Convidados conf.</p><p className="text-xl font-bold">{guestsConfirmed}/{guests.length}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Orçamento</p><p className="text-xl font-bold">R$ {budgetTotal.toLocaleString("pt-BR")}</p><p className="text-xs text-muted-foreground">pago R$ {paid.toLocaleString("pt-BR")}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Contratados</p><p className="text-xl font-bold">{contracted.length}</p><p className="text-xs text-muted-foreground">{cs.length} no plano</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-4 space-y-2">
          <h3 className="font-semibold flex items-center gap-2"><Send className="w-4 h-4" />Enviar mensagem (push in-app)</h3>
          <Input placeholder="Título" value={pushTitle} onChange={(e) => setPushTitle(e.target.value)} />
          <Textarea placeholder="Mensagem" value={pushBody} onChange={(e) => setPushBody(e.target.value)} rows={3} />
          <Button onClick={sendPush} disabled={sending || !pushTitle.trim()}>{sending ? "Enviando..." : "Enviar para este casal"}</Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="suppliers">
        <TabsList>
          <TabsTrigger value="suppliers">Fornecedores ({cs.length})</TabsTrigger>
          <TabsTrigger value="quotes">Orçamentos ({quotes.length})</TabsTrigger>
          <TabsTrigger value="budget">Plano ({budget.length})</TabsTrigger>
          <TabsTrigger value="tasks">Tarefas ({tasks.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="suppliers" className="space-y-2">
          {cs.map((c: any) => (
            <Card key={c.id}><CardContent className="p-3 flex justify-between text-sm flex-wrap gap-2">
              <div>
                <p className="font-medium">{c.suppliers?.company_name || "—"}</p>
                <p className="text-xs text-muted-foreground">{c.categories?.name || "—"} · {c.kanban_status}</p>
              </div>
              <p className="font-semibold">R$ {Number(c.final_value || c.contract_value || c.proposed_value || c.estimated_value || 0).toLocaleString("pt-BR")}</p>
            </CardContent></Card>
          ))}
        </TabsContent>

        <TabsContent value="quotes" className="space-y-2">
          {quotes.map((q: any) => (
            <Card key={q.id}><CardContent className="p-3 text-sm">
              <div className="flex justify-between flex-wrap gap-2">
                <p className="font-medium">{q.suppliers?.company_name || "—"}</p>
                <Badge variant="outline">{q.kanban_status}</Badge>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{q.message}</p>
              <p className="text-xs text-muted-foreground">{new Date(q.created_at).toLocaleDateString("pt-BR")}</p>
            </CardContent></Card>
          ))}
        </TabsContent>

        <TabsContent value="budget" className="space-y-2">
          {budget.map((b: any) => (
            <Card key={b.id}><CardContent className="p-3 flex justify-between text-sm flex-wrap gap-2">
              <div>
                <p className="font-medium">{b.description}</p>
                <p className="text-xs text-muted-foreground">{b.category} · {b.status}</p>
              </div>
              <p className="font-semibold">R$ {Number(b.estimated_cost || 0).toLocaleString("pt-BR")}</p>
            </CardContent></Card>
          ))}
        </TabsContent>

        <TabsContent value="tasks" className="space-y-1">
          {tasks.slice(0, 30).map((t: any) => (
            <div key={t.id} className="text-sm flex justify-between p-2 border-b">
              <span className={t.is_completed ? "line-through text-muted-foreground" : ""}>{t.title}</span>
              <span className="text-xs text-muted-foreground">{t.due_period}</span>
            </div>
          ))}
          {tasks.length > 30 && <p className="text-xs text-muted-foreground">... +{tasks.length - 30} tarefas</p>}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function AdminCoupleCRM() {
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
          <h1 className="text-xl font-semibold">CRM de Casais</h1>
          <Button variant="ghost" size="sm" asChild>
            <Link to={id ? "/admin/casais" : "/admin"}><ArrowLeft className="w-4 h-4 mr-1" />{id ? "Voltar" : "Painel"}</Link>
          </Button>
        </div>
      </header>
      <div className="container py-6">{id ? <CoupleDetail coupleId={id} /> : <CoupleList />}</div>
    </div>
  );
}