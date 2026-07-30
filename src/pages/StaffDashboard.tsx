import { useEffect, useState } from "react";
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
import { Heart, Calendar, Star, ShieldCheck } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import StaffDocumentsTab, { verificacaoLabel } from "@/components/staff/StaffDocumentsTab";

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
  const [blockDate, setBlockDate] = useState("");
  const [blockMotivo, setBlockMotivo] = useState("");

  useEffect(() => {
    if (!user) return;
    if (profile && profile.account_type !== "profissional") {
      navigate("/", { replace: true });
    }
  }, [user, profile, navigate]);

  const load = async () => {
    if (!user) return;
    const { data: sp } = await (supabase.from("staff_profiles" as any) as any)
      .select("*").eq("user_id", user.id).maybeSingle();
    if (!sp) return navigate("/profissional/onboarding");
    setStaff(sp);

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
    setFeed((jobs || []).filter((j: any) =>
      (sp.valor_min_turno ?? 0) <= (j.valor_turno ?? 0)
    ));

    const { data: rv } = await (supabase.from("staff_reviews" as any) as any)
      .select("*").eq("avaliado_id", sp.id).eq("autor_tipo", "fornecedor")
      .order("created_at", { ascending: false });
    setReviews(rv || []);

    const { data: un } = await (supabase.from("staff_unavailability" as any) as any)
      .select("*").eq("staff_id", sp.id).order("data");
    setUnav(un || []);

    const { data: given } = await (supabase.from("staff_reviews" as any) as any)
      .select("job_id").eq("autor_id", sp.id).eq("autor_tipo", "profissional");
    const map: Record<string, boolean> = {};
    (given || []).forEach((r: any) => { map[r.job_id] = true; });
    setReviewsGiven(map);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  const responder = async (appId: string, status: "aceito" | "recusado") => {
    const { error } = await (supabase.from("staff_applications" as any) as any)
      .update({ status, respondido_em: new Date().toISOString() }).eq("id", appId);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: status === "aceito" ? "Vaga aceita!" : "Recusado" });
    load();
  };

  const candidatar = async (jobId: string) => {
    if (!staff) return;
    const { error } = await (supabase.from("staff_applications" as any) as any).insert({
      job_id: jobId, staff_id: staff.id, origem: "candidatura", status: "candidato",
    });
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Candidatura enviada!" });
    load();
  };

  const abrirWhats = async (app: any) => {
    try {
      const contact = await fetchStaffContact(app.job_id, staff.id);
      const url = buildJobWhatsAppLink(contact.telefone || "", {
        funcao: app.job.funcao, data: app.job.data,
        horaInicio: app.job.hora_inicio, horaFim: app.job.hora_fim,
        local: app.job.local, valor: app.job.valor_turno,
        empresa: app.job.supplier?.company_name,
      });
      if (url) window.open(url, "_blank");
    } catch (e: any) {
      toast({ title: "Aguardando aceite", description: e.message, variant: "destructive" });
    }
  };

  const bloquearData = async () => {
    if (!staff || !blockDate) return;
    const { error } = await (supabase.from("staff_unavailability" as any) as any).insert({
      staff_id: staff.id, data: blockDate, motivo: blockMotivo || null,
    });
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Data bloqueada" });
    setBlockDate(""); setBlockMotivo("");
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
      .update({ disponivel: v }).eq("id", staff.id);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: v ? "Você está disponível para vagas" : "Você não receberá novas vagas" });
  };

  if (!staff) return null;

  const concluidosParaAvaliar = applications.filter(
    (a) => a.status === "concluido" && !reviewsGiven[a.job_id]
  );

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
                variant={staff.verificacao_status === "verificado" ? "default" : staff.verificacao_status === "rejeitado" ? "destructive" : "secondary"}
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
            <Link to="/profissional/onboarding"><Button variant="outline">Editar perfil</Button></Link>
            {staff.slug && (
              <Link to={`/profissional/${staff.slug}`}><Button variant="outline">Ver perfil público</Button></Link>
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
            {applications.map((a) => (
              <Card key={a.id}>
                <CardContent className="p-4 flex flex-wrap items-center gap-3 justify-between">
                  <div>
                    <p className="font-medium">{a.job?.funcao} • {a.job?.supplier?.company_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {a.job?.data && new Date(a.job.data + "T00:00:00").toLocaleDateString("pt-BR")} • {a.job?.cidade || a.job?.local}
                    </p>
                    <p className="text-sm">
                      R$ {Number(a.job?.valor_turno || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Badge variant="secondary">{appStatusLabel(a.status)}</Badge>
                    {a.status === "convidado" && (
                      <>
                        <Button size="sm" onClick={() => responder(a.id, "aceito")}>Aceitar</Button>
                        <Button size="sm" variant="outline" onClick={() => responder(a.id, "recusado")}>Recusar</Button>
                      </>
                    )}
                    {(a.status === "aceito" || a.status === "concluido") && (
                      <Button size="sm" variant="outline" onClick={() => abrirWhats(a)}>WhatsApp</Button>
                    )}
                    {a.status === "concluido" && !reviewsGiven[a.job_id] && (
                      <Button size="sm" onClick={() => setReviewApp(a)}>Avaliar fornecedor</Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="feed" className="space-y-3">
            {feed.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma vaga aberta compatível no momento.</p>}
            {feed.map((j) => {
              const jaAplicou = applications.some((a) => a.job_id === j.id);
              return (
                <Card key={j.id}>
                  <CardContent className="p-4 flex flex-wrap items-center gap-3 justify-between">
                    <div>
                      <p className="font-medium">{j.funcao} • {j.supplier?.company_name}</p>
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
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Calendar className="h-4 w-4" /> Datas bloqueadas</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-4">
                  <Input type="date" value={blockDate} onChange={(e) => setBlockDate(e.target.value)} className="max-w-40" />
                  <Input placeholder="Motivo (opcional)" value={blockMotivo} onChange={(e) => setBlockMotivo(e.target.value)} className="max-w-xs" />
                  <Button size="sm" onClick={bloquearData} disabled={!blockDate}>Bloquear data</Button>
                </div>
                {unav.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum bloqueio. Aceitar vagas bloqueia a data automaticamente.</p>
                ) : (
                  <ul className="text-sm space-y-1">
                    {unav.map((u) => (
                      <li key={u.id} className="flex items-center gap-2 justify-between">
                        <span>
                        {new Date(u.data + "T00:00:00").toLocaleDateString("pt-BR")} — {u.motivo || "bloqueio manual"}
                        </span>
                        <Button size="sm" variant="ghost" onClick={() => desbloquear(u.id)}>Remover</Button>
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
        </Tabs>

        <div className="hidden" />
      </div>

      {reviewApp && (
        <ReviewSupplierDialog
          open={!!reviewApp}
          onOpenChange={(v) => !v && setReviewApp(null)}
          jobId={reviewApp.job_id}
          supplierId={reviewApp.job?.supplier?.id}
          staffId={staff.id}
          supplierName={reviewApp.job?.supplier?.company_name}
          onSaved={() => { setReviewApp(null); load(); }}
        />
      )}
    </div>
  );
}