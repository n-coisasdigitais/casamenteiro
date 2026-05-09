import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Heart, Search, Calendar, Users, DollarSign, Copy, Share2,
  MessageSquare, Eye, CheckSquare, Store, ArrowRight, Calculator, Image as ImageIcon, Trash2
} from "lucide-react";
import { Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import QuoteThread from "@/components/QuoteThread";
import QuoteProposalPanel from "@/components/QuoteProposalPanel";
import DashboardHeader from "@/components/DashboardHeader";
import DashboardNav from "@/components/DashboardNav";
import CouplePhotoUpload from "@/components/CouplePhotoUpload";
import { Textarea } from "@/components/ui/textarea";

type CoupleData = {
  id: string;
  partner_name: string | null;
  couple_role: string | null;
  wedding_date: string | null;
  estimated_guests: number | null;
  estimated_budget: number | null;
  invite_code: string | null;
  onboarding_completed: boolean;
  header_photo_url?: string | null;
  header_quote?: string | null;
};

type TaskSummary = { total: number; completed: number };
type GuestSummary = { total: number; confirmed: number; pending: number; declined: number };
type BudgetSummary = { estimated: number; final: number };

export default function CoupleDashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [couple, setCouple] = useState<CoupleData | null>(null);
  const [favCount, setFavCount] = useState(0);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<any>(null);
  const [threadOpen, setThreadOpen] = useState(false);
  const [taskSummary, setTaskSummary] = useState<TaskSummary>({ total: 0, completed: 0 });
  const [guestSummary, setGuestSummary] = useState<GuestSummary>({ total: 0, confirmed: 0, pending: 0, declined: 0 });
  const [budgetSummary, setBudgetSummary] = useState<BudgetSummary>({ estimated: 0, final: 0 });
  const [supplierCount, setSupplierCount] = useState(0);
  const [urgentTasks, setUrgentTasks] = useState<any[]>([]);
  const [simulacoes, setSimulacoes] = useState<any[]>([]);
  const [coverOpen, setCoverOpen] = useState(false);
  const [coverPhoto, setCoverPhoto] = useState<string | null>(null);
  const [coverQuote, setCoverQuote] = useState<string>("");
  const [savingCover, setSavingCover] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("couples").select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (!data) return;
      if (!data.onboarding_completed) { navigate("/onboarding"); return; }
      setCouple(data);
      setCoverPhoto(data.header_photo_url || null);
      setCoverQuote(data.header_quote || "");
      loadDashboardData(data.id);
    });
  }, [user, navigate]);

  const loadDashboardData = async (coupleId: string) => {
    // All queries in parallel
    const [favRes, quotesRes, tasksRes, guestsRes, budgetRes, suppRes, urgentRes, simRes] = await Promise.all([
      supabase.from("couple_favorites").select("id", { count: "exact", head: true }).eq("couple_id", coupleId),
      supabase.from("quotes").select("*").eq("couple_id", coupleId).order("created_at", { ascending: false }),
      supabase.from("wedding_tasks").select("id, is_completed").eq("couple_id", coupleId),
      supabase.from("wedding_guests").select("id, rsvp_status").eq("couple_id", coupleId),
      supabase.from("budget_items").select("estimated_cost, final_cost").eq("couple_id", coupleId),
      supabase.from("couple_suppliers").select("id", { count: "exact", head: true }).eq("couple_id", coupleId).eq("status", "contracted"),
      supabase.from("wedding_tasks").select("id, title, category, is_completed").eq("couple_id", coupleId).eq("is_completed", false).order("sort_order", { ascending: true }).limit(3),
      (supabase.from("home_simulacoes" as any) as any).select("*").or(`couple_id.eq.${coupleId},user_id.eq.${user?.id}`).order("criado_em", { ascending: false }),
    ]);

    setFavCount(favRes.count || 0);
    setQuotes(quotesRes.data || []);
    
    const allTasks = tasksRes.data || [];
    setTaskSummary({ total: allTasks.length, completed: allTasks.filter((t) => t.is_completed).length });

    const allGuests = guestsRes.data || [];
    setGuestSummary({
      total: allGuests.length,
      confirmed: allGuests.filter((g) => g.rsvp_status === "confirmed").length,
      pending: allGuests.filter((g) => g.rsvp_status === "pending").length,
      declined: allGuests.filter((g) => g.rsvp_status === "declined").length,
    });

    const allBudget = budgetRes.data || [];
    setBudgetSummary({
      estimated: allBudget.reduce((s, b) => s + Number(b.estimated_cost || 0), 0),
      final: allBudget.reduce((s, b) => s + Number(b.final_cost || 0), 0),
    });

    setSupplierCount(suppRes.count || 0);
    setUrgentTasks(urgentRes.data || []);
    setSimulacoes((simRes as any).data || []);
  };

  const toggleUrgentTask = async (id: string) => {
    setUrgentTasks((prev) => prev.filter((t) => t.id !== id));
    setTaskSummary((prev) => ({ ...prev, completed: prev.completed + 1 }));
    await supabase.from("wedding_tasks").update({ is_completed: true, completed_at: new Date().toISOString() }).eq("id", id);
  };

  const daysUntilWedding = couple?.wedding_date
    ? Math.ceil((new Date(couple.wedding_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const copyInviteCode = () => {
    if (couple?.invite_code) {
      navigator.clipboard.writeText(couple.invite_code);
      toast({ title: "Código copiado!", description: "Compartilhe com seu(sua) parceiro(a)." });
    }
  };

  if (!couple) return <div className="min-h-screen flex items-center justify-center"><p>Carregando...</p></div>;

  const saveCover = async (overrides?: { photo?: string | null; quote?: string | null }) => {
    if (!couple) return;
    setSavingCover(true);
    const photo = overrides && "photo" in overrides ? overrides.photo : coverPhoto;
    const quote = overrides && "quote" in overrides ? overrides.quote : coverQuote;
    const { error } = await (supabase.from("couples") as any)
      .update({ header_photo_url: photo || null, header_quote: quote || null })
      .eq("id", couple.id);
    setSavingCover(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    setCouple({ ...couple, header_photo_url: photo || null, header_quote: quote || null } as CoupleData);
    setCoverPhoto(photo || null);
    setCoverQuote(quote || "");
    toast({ title: "Capa atualizada!" });
  };

  const taskPct = taskSummary.total > 0 ? Math.round((taskSummary.completed / taskSummary.total) * 100) : 0;
  const budgetPct = couple.estimated_budget && couple.estimated_budget > 0
    ? Math.round((budgetSummary.final / couple.estimated_budget) * 100)
    : 0;
  const guestPct = couple.estimated_guests && couple.estimated_guests > 0
    ? Math.round((guestSummary.confirmed / couple.estimated_guests) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <DashboardNav />

      <main className="container px-4 py-8">
        {/* Header personalizado do casal (foto + frase) */}
        <div className="relative rounded-2xl overflow-hidden mb-8 bg-gradient-to-br from-primary/15 to-secondary/40 min-h-[180px] md:min-h-[240px]">
          {couple.header_photo_url ? (
            <>
              <img src={couple.header_photo_url} alt="Capa do casal" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
            </>
          ) : (
            <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_top_left,theme(colors.primary/30),transparent_60%),radial-gradient(circle_at_bottom_right,theme(colors.secondary/40),transparent_60%)]" />
          )}
          <div className={`relative px-6 py-8 md:py-12 ${couple.header_photo_url ? "text-white" : "text-foreground"}`}>
            <p className="text-xs uppercase tracking-wider opacity-80">Meu casamento</p>
            <h1 className="text-3xl md:text-4xl font-serif mt-1">
              {profile?.full_name || "Casal"}
              {couple.partner_name && ` & ${couple.partner_name}`}
            </h1>
            {couple.header_quote ? (
              <p className="mt-2 italic max-w-xl text-sm md:text-base">"{couple.header_quote}"</p>
            ) : (
              !couple.header_photo_url && (
                <p className="mt-2 text-sm md:text-base text-muted-foreground max-w-xl">
                  Adicione uma foto e uma frase do casal para deixar este espaço com a sua cara.
                </p>
              )
            )}
            {daysUntilWedding !== null && daysUntilWedding > 0 && (
              <div className="flex items-center gap-2 mt-4">
                <Calendar className="h-5 w-5" />
                <span className="text-base md:text-lg">
                  <strong>{daysUntilWedding}</strong> dias para o grande dia!
                </span>
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={() => setCoverOpen(true)} variant={couple.header_photo_url ? "secondary" : "outline"} size="sm">
                <ImageIcon className="h-4 w-4 mr-1.5" />
                Personalizar capa
              </Button>
              {(couple.header_photo_url || couple.header_quote) && (
                <Button
                  onClick={() => saveCover({ photo: null, quote: null })}
                  variant={couple.header_photo_url ? "secondary" : "ghost"}
                  size="sm"
                  disabled={savingCover}
                >
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  Voltar ao padrão
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Dialog de personalização da capa */}
        <Dialog open={coverOpen} onOpenChange={setCoverOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Personalizar capa</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Foto de capa</label>
                <p className="text-xs text-muted-foreground mb-2">Use uma foto do casal ou um ambiente que represente vocês.</p>
                <CouplePhotoUpload
                  url={coverPhoto}
                  fileName="header"
                  label="Foto de capa"
                  aspect="aspect-[16/9]"
                  onUploaded={(u) => setCoverPhoto(u)}
                />
                {coverPhoto && (
                  <Button variant="ghost" size="sm" className="mt-1 text-destructive" onClick={() => setCoverPhoto(null)}>
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Remover foto
                  </Button>
                )}
              </div>
              <div>
                <label className="text-sm font-medium">Frase do casal</label>
                <Textarea value={coverQuote} onChange={(e) => setCoverQuote(e.target.value)} placeholder="Ex.: 'Onde você for, irei contigo'" rows={2} />
                {coverQuote && (
                  <Button variant="ghost" size="sm" className="mt-1 text-destructive" onClick={() => setCoverQuote("")}>
                    Limpar frase
                  </Button>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => setCoverOpen(false)}>Cancelar</Button>
                <Button disabled={savingCover} onClick={async () => { await saveCover(); setCoverOpen(false); }}>
                  Salvar capa
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckSquare className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Tarefas</span>
              </div>
              <p className="text-2xl font-bold">{taskSummary.completed}/{taskSummary.total}</p>
              <Progress value={taskPct} className="mt-2 h-1.5" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Orçamento</span>
              </div>
              <p className="text-2xl font-bold">
                {budgetPct}%
              </p>
              <Progress value={budgetPct} className="mt-2 h-1.5" />
              <p className="text-xs text-muted-foreground mt-1">
                R$ {budgetSummary.final.toLocaleString("pt-BR")} / {couple.estimated_budget ? `R$ ${couple.estimated_budget.toLocaleString("pt-BR")}` : "-"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Convidados</span>
              </div>
              <p className="text-2xl font-bold">{guestSummary.confirmed}/{guestSummary.total || couple.estimated_guests || 0}</p>
              <Progress value={guestPct} className="mt-2 h-1.5" />
              <p className="text-xs text-muted-foreground mt-1">confirmados</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Store className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Fornecedores</span>
              </div>
              <p className="text-2xl font-bold">{supplierCount}</p>
              <p className="text-xs text-muted-foreground mt-1">contratados</p>
              <p className="text-xs text-muted-foreground">{favCount} favoritos</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick actions + urgent tasks */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Urgent tasks */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckSquare className="h-5 w-5 text-primary" />
                  Próximas tarefas
                </CardTitle>
                <Link to="/tarefas" className="text-sm text-primary hover:underline flex items-center gap-1">
                  Ver todas <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {urgentTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma tarefa pendente 🎉</p>
              ) : (
                urgentTasks.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 py-2">
                    <Checkbox onCheckedChange={() => toggleUrgentTask(t.id)} />
                    <span className="text-sm">{t.title}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Quick actions */}
          <div className="grid grid-cols-2 gap-3">
            <Button size="lg" className="h-auto py-5" asChild>
              <Link to="/buscar">
                <Search className="mr-2 h-4 w-4" />
                Buscar fornecedores
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="h-auto py-5" asChild>
              <Link to="/tarefas">
                <CheckSquare className="mr-2 h-4 w-4" />
                Agenda de tarefas
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="h-auto py-5" asChild>
              <Link to="/convidados">
                <Users className="mr-2 h-4 w-4" />
                Convidados
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="h-auto py-5" asChild>
              <Link to="/orcamento">
                <DollarSign className="mr-2 h-4 w-4" />
                Orçamento
              </Link>
            </Button>
          </div>
        </div>

        {/* Budget + Guests widgets */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Meu Orçamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Estimado</p>
                  <p className="text-lg font-bold">R$ {budgetSummary.estimated.toLocaleString("pt-BR")}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Final</p>
                  <p className="text-lg font-bold">R$ {budgetSummary.final.toLocaleString("pt-BR")}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="mt-4 w-full" asChild>
                <Link to="/orcamento">Gerenciar orçamento</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Meus Convidados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-lg font-bold text-primary">{guestSummary.confirmed}</p>
                  <p className="text-xs text-muted-foreground">Confirmados</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-muted-foreground">{guestSummary.pending}</p>
                  <p className="text-xs text-muted-foreground">Pendentes</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-destructive">{guestSummary.declined}</p>
                  <p className="text-xs text-muted-foreground">Recusados</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="mt-4 w-full" asChild>
                <Link to="/convidados">Gerenciar convidados</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Minhas simulações */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              Minhas simulações ({simulacoes.length})
            </h2>
            <Button variant="outline" size="sm" asChild>
              <Link to="/#simulador">Nova simulação</Link>
            </Button>
          </div>
          {simulacoes.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-sm text-muted-foreground mb-3">
                  Você ainda não fez nenhuma simulação. Faça uma para descobrir os melhores fornecedores para seu orçamento.
                </p>
                <Button asChild>
                  <Link to="/#simulador">Simular meu casamento</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {simulacoes.map((s) => (
                <Card key={s.id} className="hover:shadow-md transition-shadow relative">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0 cursor-pointer flex-1" onClick={() => navigate(`/simulador/resultado?id=${s.id}`)}>
                        <p className="font-semibold text-sm truncate flex items-center gap-2">
                          {s.is_active_plan && (
                            <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[10px] h-5"><Star className="h-3 w-3 mr-0.5" /> Plano ativo</Badge>
                          )}
                          {s.cidade || "Sua cidade"} · {s.num_convidados} convidados
                        </p>
                        <p className="text-xs text-muted-foreground">
                          R$ {Number(s.orcamento_total).toLocaleString("pt-BR")} · {s.estilo || "—"}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          {new Date(s.criado_em).toLocaleDateString("pt-BR")}
                          {s.data_evento && ` · evento em ${new Date(s.data_evento + "T00:00:00").toLocaleDateString("pt-BR")}`}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <Eye className="h-4 w-4 text-muted-foreground" />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={async (e) => {
                            e.stopPropagation();
                            const msg = s.is_active_plan
                              ? "Esta é a simulação que virou seu PLANO ATIVO. Ao excluir, apenas a simulação será removida — seus fornecedores em orçamento, negociação ou contratados continuam no Kanban e devem ser descartados manualmente lá. Continuar?"
                              : "Excluir esta simulação? Esta ação não pode ser desfeita.";
                            if (!window.confirm(msg)) return;
                            const { error } = await (supabase.from("home_simulacoes" as any) as any).delete().eq("id", s.id);
                            if (error) {
                              toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
                              return;
                            }
                            setSimulacoes((prev) => prev.filter((x) => x.id !== s.id));
                            toast({ title: "Simulação excluída" });
                          }}
                          title="Excluir simulação"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Quotes */}
        {quotes.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Meus Orçamentos ({quotes.length})
            </h2>
            <div className="space-y-3">
              {quotes.map((q) => {
                const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
                  pending: { label: "Enviado", variant: "secondary" },
                  viewed: { label: "Visualizado", variant: "outline" },
                  answered: { label: "Respondido", variant: "default" },
                  accepted: { label: "Aceito ✓", variant: "default" },
                  rejected: { label: "Recusado", variant: "destructive" },
                  cancelled: { label: "Cancelado", variant: "secondary" },
                };
                const st = statusMap[q.status] || statusMap.pending;
                return (
                  <Card key={q.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setSelectedQuote(q); setThreadOpen(true); }}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={st.variant} className="text-xs">{st.label}</Badge>
                            <span className="text-xs text-muted-foreground">{new Date(q.created_at).toLocaleDateString("pt-BR")}</span>
                          </div>
                          <p className="text-sm line-clamp-2">{q.message}</p>
                        </div>
                        <Eye className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Quote Thread Dialog */}
        <Dialog open={threadOpen} onOpenChange={setThreadOpen}>
          <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col p-0 gap-0">
            <DialogHeader className="p-4 pb-2 border-b border-border">
              <DialogTitle className="text-base">Conversa sobre orçamento</DialogTitle>
            </DialogHeader>
            {selectedQuote && user && (
              <QuoteThread quoteId={selectedQuote.id} currentUserId={user.id} />
            )}
            {selectedQuote && user && couple && (
              <QuoteProposalPanel
                quoteId={selectedQuote.id}
                currentUserId={user.id}
                isSupplier={false}
                coupleId={couple.id}
                supplierId={selectedQuote.supplier_id}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Invite code */}
        {couple.invite_code && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Share2 className="h-5 w-5 text-primary" />
                Vincular conta do(a) parceiro(a)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Compartilhe este código para que seu(sua) parceiro(a) acesse o mesmo painel.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-4 py-2 bg-muted rounded-md font-mono text-lg tracking-widest text-center">
                  {couple.invite_code}
                </code>
                <Button variant="outline" size="icon" onClick={copyInviteCode}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
