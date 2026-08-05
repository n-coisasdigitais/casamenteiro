import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import SEO from "@/components/SEO";
import PaymentDisclaimer from "@/components/staff/PaymentDisclaimer";
import UserMenu from "@/components/UserMenu";
import ReviewSupplierDialog from "@/components/staff/ReviewSupplierDialog";
import { Input } from "@/components/ui/input";
import { appStatusLabel, buildJobWhatsAppLink, fetchStaffContact } from "@/lib/staff";
import { Heart, Calendar, Star, ShieldCheck, Search } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import StaffDocumentsTab, { verificacaoLabel } from "@/components/staff/StaffDocumentsTab";
import StaffChatDialog from "@/components/staff/StaffChatDialog";

/**
 * Deriva a tag exibida no card da candidatura.
 * IMPORTANTE: leva em conta o status da VAGA (a.job?.status), não só o da candidatura.
 * Se a vaga foi despublicada/cancelada, mostramos "Vaga encerrada" mesmo que a
 * candidatura ainda esteja "concluido"/"aceito" — o histórico continua visível.
 */
function statusTag(a: any): { label: string; variant: "default" | "secondary" | "destructive" | "outline" } {
  const jobStatus = a.job?.status;
  const appStatus = a.status;

  if (appStatus === "concluido") return { label: "Concluída", variant: "default" };
  if (appStatus === "retirada") return { label: "Candidatura retirada", variant: "outline" };
  if (appStatus === "recusado") return { label: "Recusada", variant: "outline" };
  if (appStatus === "no_show") return { label: "Não compareceu", variant: "destructive" };

  // A vaga sumiu da vitrine mas a candidatura ainda está "viva"
  if (jobStatus === "cancelada" || jobStatus === "encerrada") {
    return { label: "Vaga encerrada", variant: "outline" };
  }

  // fallback: usa o label padrão do lib/staff
  return { label: appStatusLabel(appStatus), variant: "secondary" };
}

/** Uma candidatura está "encerrada" (sem ações possíveis) quando a vaga saiu do ar
 *  e ela não chegou a concluir. */
function isEncerradaSemConclusao(a: any): boolean {
  const jobStatus = a.job?.status;
  return (jobStatus === "cancelada" || jobStatus === "encerrada") && a.status !== "concluido";
}

export default function StaffDashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [staff, setStaff] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [feed, setFeed] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [unav, setUnav] = useState<any[]>([]);
  const [reviewsGiven, setReviewsGiven] = useState<Record<string, boolean>>({});
  const [reviewApp, setReviewApp] = useState<any>(null);
  const [chatApp, setChatApp] = useState<any>(null);

  // Agenda: bloqueio por intervalo (início/fim)
  const [blockStart, setBlockStart] = useState("");
  const [blockEnd, setBlockEnd] = useState("");
  const [blockMotivo, setBlockMotivo] = useState("");

  // Busca de vagas disponíveis (feed): nome, ordenação
  const [feedBusca, setFeedBusca] = useState("");
  const [feedFuncao, setFeedFuncao] = useState("todas");
  const [feedOrder, setFeedOrder] = useState<"data" | "valor_desc" | "valor_asc">("data");

  useEffect(() => {
    if (!user) return;
    if (profile && profile.account_type !== "profissional") {
      navigate("/", { replace: true });
    }
  }, [user, profile, navigate]);

  const load = async () => {
    if (!user) return;
    const { data: sp } = await (supabase.from("staff_profiles" as any) as any)
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!sp) return navigate("/profissional/onboarding");
    setStaff(sp);

    // Candidaturas: traz a vaga em QUALQUER status (a policy is_job_applicant garante a leitura).
    const { data: apps } = await (supabase.from("staff_applications" as any) as any)
      .select("*, job:staff_jobs(*, supplier:suppliers(id, company_name, city))")
      .eq("staff_id", sp.id)
      .order("created_at", { ascending: false });
    setApplications(apps || []);

    const { data: jobs } = await (supabase.from("staff_jobs" as any) as any)
      .select("*, supplier:suppliers(id, company_name)")
      .eq("status", "aberta")
      .eq("is_public", true)
      .in("funcao", sp.funcoes || [])
      .ilike("cidade", `%${sp.cidade || ""}%`)
      .order("data", { ascending: true });
    setFeed((jobs || []).filter((j: any) => (sp.valor_min_turno ?? 0) <= (j.valor_turno ?? 0)));

    const { data: rv } = await (supabase.from("staff_reviews" as any) as any)
      .select("*")
      .eq("avaliado_id", sp.id)
      .eq("autor_tipo", "fornecedor")
      .order("created_at", { ascending: false });
    setReviews(rv || []);

    const { data: un } = await (supabase.from("staff_unavailability" as any) as any)
      .select("*")
      .eq("staff_id", sp.id)
      .order("data");
    setUnav(un || []);

    const { data: given } = await (supabase.from("staff_reviews" as any) as any)
      .select("job_id")
      .eq("autor_id", sp.id)
      .eq("autor_tipo", "profissional");
    const map: Record<string, boolean> = {};
    (given || []).forEach((r: any) => {
      map[r.job_id] = true;
    });
    setReviewsGiven(map);
  };

  useEffect(() => {
    load(); /* eslint-disable-next-line */
  }, [user]);

  const responder = async (appId: string, status: "aceito" | "recusado") => {
    const { error } = await (supabase.from("staff_applications" as any) as any)
      .update({ status, respondido_em: new Date().toISOString() })
      .eq("id", appId);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: status === "aceito" ? "Vaga aceita!" : "Recusado" });
    load();
  };

  const retirarCandidatura = async (appId: string) => {
    const { error } = await (supabase.from("staff_applications" as any) as any)
      .update({ status: "retirada", respondido_em: new Date().toISOString() })
      .eq("id", appId);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Candidatura retirada" });
    load();
  };

  const candidatar = async (jobId: string) => {
    if (!staff) return;
    const { error } = await (supabase.from("staff_applications" as any) as any).upsert(
      {
        job_id: jobId,
        staff_id: staff.id,
        origem: "candidatura",
        status: "candidato",
      },
      { onConflict: "job_id,staff_id", ignoreDuplicates: true },
    );
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Candidatura enviada!" });
    load();
  };

  const abrirWhats = async (app: any) => {
    try {
      const contact = await fetchStaffContact(app.job_id, staff.id);
      const url = buildJobWhatsAppLink(contact.telefone || "", {
        funcao: app.job.funcao,
        data: app.job.data,
        horaInicio: app.job.hora_inicio,
        horaFim: app.job.hora_fim,
        local: app.job.local,
        valor: app.job.valor_turno,
        empresa: app.job.supplier?.company_name,
      });
      if (url) window.open(url, "_blank");
    } catch (e: any) {
      toast({ title: "Aguardando aceite", description: e.message, variant: "destructive" });
    }
  };

  // Bloqueio por intervalo: expande o range em datas discretas e faz batch-insert.
  const bloquearPeriodo = async () => {
    if (!staff || !blockStart) return;
    const start = new Date(blockStart + "T00:00:00");
    const end = new Date((blockEnd || blockStart) + "T00:00:00");
    if (end < start) {
      return toast({
        title: "Período inválido",
        description: "A data final é anterior à inicial.",
        variant: "destructive",
      });
    }

    // gera todas as datas do intervalo
    const dias: string[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dias.push(d.toISOString().slice(0, 10));
    }

    // evita duplicar datas já bloqueadas
    const jaBloqueadas = new Set(unav.map((u) => u.data));
    const novos = dias
      .filter((data) => !jaBloqueadas.has(data))
      .map((data) => ({ staff_id: staff.id, data, motivo: blockMotivo || null }));

    if (novos.length === 0) {
      return toast({ title: "Nada a bloquear", description: "Essas datas já estavam bloqueadas." });
    }

    const { error } = await (supabase.from("staff_unavailability" as any) as any).insert(novos);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: novos.length === 1 ? "Data bloqueada" : `${novos.length} datas bloqueadas` });
    setBlockStart("");
    setBlockEnd("");
    setBlockMotivo("");
    load();
  };

  const desbloquear = async (id: string) => {
    const { error } = await (supabase.from("staff_unavailability" as any) as any).delete().eq("id", id);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Bloqueio removido" });
    load();
  };

  const toggleDisponivel = async (v: boolean) => {
    setStaff((s: any) => ({ ...s, disponivel: v }));
    const { error } = await (supabase.from("staff_profiles" as any) as any)
      .update({ disponivel: v })
      .eq("id", staff.id);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: v ? "Você está disponível para vagas" : "Você não receberá novas vagas" });
  };

  // Feed filtrado/ordenado (busca por nome, função, ordenação)
  const feedView = useMemo(() => {
    let list = [...feed];
    const q = feedBusca.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (j) =>
          (j.funcao || "").toLowerCase().includes(q) ||
          (j.supplier?.company_name || "").toLowerCase().includes(q) ||
          (j.cidade || j.local || "").toLowerCase().includes(q),
      );
    }
    if (feedFuncao !== "todas") {
      list = list.filter((j) => j.funcao === feedFuncao);
    }
    if (feedOrder === "valor_desc") list.sort((a, b) => (b.valor_turno ?? 0) - (a.valor_turno ?? 0));
    else if (feedOrder === "valor_asc") list.sort((a, b) => (a.valor_turno ?? 0) - (b.valor_turno ?? 0));
    else list.sort((a, b) => (a.data > b.data ? 1 : -1));
    return list;
  }, [feed, feedBusca, feedFuncao, feedOrder]);

  if (!staff) return null;

  const concluidosParaAvaliar = applications.filter((a) => a.status === "concluido" && !reviewsGiven[a.job_id]);

  return (
    <div className="min-h-screen bg-muted/30">
      <SEO title="Painel do profissional — Casamenteiro" noIndex />
      <header className="border-b bg-white">
        <div className="container mx-auto flex items-center justify-between py-3 px-4">
          <Link to="/" className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary fill-primary" />
            <span className="font-bold">Casamenteiro</span>
          </Link>
          <UserMenu />
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-5xl space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">Olá, {staff.nome}</h1>
            <p className="text-sm text-muted-foreground">
              {staff.cidade} • {staff.funcoes?.length || 0} funções •{" "}
              {staff.rating ? `${staff.rating}★ (${staff.review_count})` : "sem avaliações"}
            </p>
            <div className="mt-1">
              <Badge
                variant={
                  staff.verificacao_status === "verificado"
                    ? "default"
                    : staff.verificacao_status === "rejeitado"
                      ? "destructive"
                      : "secondary"
                }
                className="gap-1"
              >
                <ShieldCheck className="h-3 w-3" /> {verificacaoLabel(staff.verificacao_status)}
              </Badge>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <label className="flex items-center gap-2 text-sm mr-2">
              <Switch checked={staff.disponivel !== false} onCheckedChange={toggleDisponivel} />
              Disponível para vagas
            </label>
            <Link to="/profissional/onboarding">
              <Button variant="outline">Editar perfil</Button>
            </Link>
            {staff.slug && (
              <Link to={`/profissional/${staff.slug}`}>
                <Button variant="outline">Ver perfil público</Button>
              </Link>
            )}
          </div>
        </div>

        <PaymentDisclaimer />

        {concluidosParaAvaliar.length > 0 && (
          <Card className="border-primary/40 bg-primary/5">
            <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="font-medium">Avaliações pendentes</p>
                <p className="text-sm text-muted-foreground">
                  Você tem {concluidosParaAvaliar.length} trabalho(s) concluído(s) para avaliar.
                </p>
              </div>
              <Button size="sm" onClick={() => setReviewApp(concluidosParaAvaliar[0])}>
                Avaliar agora
              </Button>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="convites">
          <TabsList className="flex-wrap">
            <TabsTrigger value="convites">Convites e vagas</TabsTrigger>
            <TabsTrigger value="feed">Vagas disponíveis</TabsTrigger>
            <TabsTrigger value="agenda">Minha agenda</TabsTrigger>
            <TabsTrigger value="avaliacoes">Avaliações</TabsTrigger>
            <TabsTrigger value="documentos">Documentos</TabsTrigger>
          </TabsList>

          <TabsContent value="convites" className="space-y-3">
            {applications.length === 0 && <p className="text-sm text-muted-foreground">Nenhum convite ainda.</p>}
            {applications.map((a) => {
              const tag = statusTag(a);
              const encerrada = isEncerradaSemConclusao(a);
              return (
                <Card key={a.id} className={encerrada ? "opacity-70" : ""}>
                  <CardContent className="p-4 flex flex-wrap items-center gap-3 justify-between">
                    <div>
                      <p className="font-medium">
                        {a.job?.funcao || "Vaga"}{" "}
                        {a.job?.supplier?.company_name ? `• ${a.job.supplier.company_name}` : ""}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {a.job?.data && new Date(a.job.data + "T00:00:00").toLocaleDateString("pt-BR")}
                        {a.job?.cidade || a.job?.local ? ` • ${a.job?.cidade || a.job?.local}` : ""}
                      </p>
                      <p className="text-sm">
                        R$ {Number(a.job?.valor_turno || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="flex gap-2 items-center flex-wrap justify-end">
                      <Badge variant={tag.variant}>{tag.label}</Badge>

                      {/* Conversar continua disponível mesmo com a vaga encerrada:
                          o histórico da conversa é preservado. */}
                      <Button size="sm" variant="outline" onClick={() => setChatApp(a)}>
                        Conversar
                      </Button>

                      {a.status === "convidado" && (
                        <>
                          <Button size="sm" onClick={() => responder(a.id, "aceito")}>
                            Aceitar
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => responder(a.id, "recusado")}>
                            Recusar
                          </Button>
                        </>
                      )}

                      {/* Profissional pode retirar a própria candidatura enquanto pendente */}
                      {a.status === "candidato" && (
                        <Button size="sm" variant="ghost" onClick={() => retirarCandidatura(a.id)}>
                          Retirar candidatura
                        </Button>
                      )}

                      {(a.status === "aceito" || a.status === "concluido") && (
                        <Button size="sm" variant="outline" onClick={() => abrirWhats(a)}>
                          WhatsApp
                        </Button>
                      )}

                      {a.status === "concluido" && !reviewsGiven[a.job_id] && (
                        <Button size="sm" onClick={() => setReviewApp(a)}>
                          Avaliar fornecedor
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="feed" className="space-y-3">
            {/* Filtros: busca por nome, função e ordenação */}
            <div className="flex flex-wrap gap-2 items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por função, fornecedor ou cidade"
                  value={feedBusca}
                  onChange={(e) => setFeedBusca(e.target.value)}
                  className="pl-9"
                />
              </div>
              <select
                value={feedFuncao}
                onChange={(e) => setFeedFuncao(e.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="todas">Todas as funções</option>
                {(staff.funcoes || []).map((f: string) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
              <select
                value={feedOrder}
                onChange={(e) => setFeedOrder(e.target.value as any)}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="data">Data (mais próxima)</option>
                <option value="valor_desc">Maior valor</option>
                <option value="valor_asc">Menor valor</option>
              </select>
            </div>

            {feedView.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma vaga aberta compatível no momento.</p>
            )}
            {feedView.map((j) => {
              const jaAplicou = applications.some((a) => a.job_id === j.id && a.status !== "retirada");
              return (
                <Card key={j.id}>
                  <CardContent className="p-4 flex flex-wrap items-center gap-3 justify-between">
                    <div>
                      <p className="font-medium">
                        {j.funcao} • {j.supplier?.company_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(j.data + "T00:00:00").toLocaleDateString("pt-BR")} • {j.cidade || j.local}
                      </p>
                      <p className="text-sm">
                        R$ {Number(j.valor_turno || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <Button size="sm" disabled={jaAplicou} onClick={() => candidatar(j.id)}>
                      {jaAplicou ? "Já enviado" : "Candidatar-se"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="agenda">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4" /> Datas bloqueadas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-1 items-end">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Início</label>
                    <Input
                      type="date"
                      value={blockStart}
                      onChange={(e) => setBlockStart(e.target.value)}
                      className="max-w-40"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Fim (opcional)</label>
                    <Input
                      type="date"
                      value={blockEnd}
                      min={blockStart || undefined}
                      onChange={(e) => setBlockEnd(e.target.value)}
                      className="max-w-40"
                    />
                  </div>
                  <Input
                    placeholder="Motivo (opcional)"
                    value={blockMotivo}
                    onChange={(e) => setBlockMotivo(e.target.value)}
                    className="max-w-xs"
                  />
                  <Button size="sm" onClick={bloquearPeriodo} disabled={!blockStart}>
                    Bloquear período
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  Deixe o "Fim" vazio para bloquear só um dia. Preencha para bloquear um intervalo inteiro.
                </p>
                {unav.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum bloqueio. Aceitar vagas bloqueia a data automaticamente.
                  </p>
                ) : (
                  <ul className="text-sm space-y-1">
                    {unav.map((u) => (
                      <li key={u.id} className="flex items-center gap-2 justify-between">
                        <span>
                          {new Date(u.data + "T00:00:00").toLocaleDateString("pt-BR")} — {u.motivo || "bloqueio manual"}
                        </span>
                        <Button size="sm" variant="ghost" onClick={() => desbloquear(u.id)}>
                          Remover
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="avaliacoes" className="space-y-3">
            {reviews.length === 0 && <p className="text-sm text-muted-foreground">Ainda sem avaliações.</p>}
            {reviews.map((r) => (
              <Card key={r.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-1 mb-1">
                    {Array.from({ length: r.estrelas }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                    ))}
                  </div>
                  {r.comentario && <p className="text-sm">{r.comentario}</p>}
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(r.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
          <TabsContent value="documentos">
            <StaffDocumentsTab staff={staff} onChanged={load} />
          </TabsContent>
        </Tabs>
      </div>

      {reviewApp && (
        <ReviewSupplierDialog
          open={!!reviewApp}
          onOpenChange={(v) => !v && setReviewApp(null)}
          jobId={reviewApp.job_id}
          supplierId={reviewApp.job?.supplier?.id}
          staffId={staff.id}
          supplierName={reviewApp.job?.supplier?.company_name}
          onSaved={() => {
            setReviewApp(null);
            load();
          }}
        />
      )}

      {chatApp && (
        <StaffChatDialog
          open={!!chatApp}
          onOpenChange={(v) => {
            if (!v) setChatApp(null);
          }}
          application={{ ...chatApp, staff_id: staff.id }}
          job={chatApp.job}
          currentUserId={user?.id || ""}
          isSupplier={false}
        />
      )}
    </div>
  );
}
