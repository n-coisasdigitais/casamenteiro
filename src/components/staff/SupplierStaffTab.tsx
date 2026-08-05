import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import PublishJobDialog from "./PublishJobDialog";
import PaymentDisclaimer from "./PaymentDisclaimer";
import StaffChatDialog from "./StaffChatDialog";
import { Star, MapPin, ShieldCheck, Search } from "lucide-react";
import { appStatusLabel, jobStatusLabel, buildJobWhatsAppLink, fetchStaffContact, maskPhone } from "@/lib/staff";

/* ------------------------------------------------------------------ */
/* Modal: perfil público do profissional (foto, dados, avaliações)     */
/* ------------------------------------------------------------------ */
type StaffReview = { id: string; estrelas: number; comentario: string | null; created_at: string };

function StaffProfileDialog({
  open,
  onOpenChange,
  staffId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  staffId: string | null;
}) {
  const [staff, setStaff] = useState<any>(null);
  const [reviews, setReviews] = useState<StaffReview[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !staffId) return;
    setLoading(true);
    (async () => {
      const { data: sp } = await (supabase.from("staff_profiles" as any) as any)
        .select("id, nome, cidade, funcoes, rating, review_count, foto_url, bio, verificacao_status")
        .eq("id", staffId)
        .maybeSingle();
      setStaff(sp);

      const { data: rv } = await (supabase.from("staff_reviews" as any) as any)
        .select("id, estrelas, comentario, created_at")
        .eq("avaliado_id", staffId)
        .eq("autor_tipo", "fornecedor")
        .order("created_at", { ascending: false });
      setReviews((rv || []) as StaffReview[]);
      setLoading(false);
    })();
  }, [open, staffId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Perfil do profissional</DialogTitle>
        </DialogHeader>

        {loading || !staff ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Carregando...</p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-16 w-16 rounded-full bg-muted overflow-hidden shrink-0">
                {staff.foto_url ? (
                  <img src={staff.foto_url} alt={staff.nome} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-lg font-bold text-muted-foreground">
                    {(staff.nome || "?").charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <p className="font-semibold">{staff.nome}</p>
                {staff.cidade && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {staff.cidade}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  {staff.rating ? (
                    <span className="text-xs flex items-center gap-1">
                      <Star className="h-3 w-3 fill-primary text-primary" />
                      {staff.rating} ({staff.review_count})
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Sem avaliações</span>
                  )}
                  {staff.verificacao_status === "verificado" && (
                    <Badge variant="default" className="gap-1 text-[10px]">
                      <ShieldCheck className="h-3 w-3" /> Verificado
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {(staff.funcoes || []).length > 0 && (
              <div className="flex flex-wrap gap-1">
                {staff.funcoes.map((f: string) => (
                  <Badge key={f} variant="secondary">
                    {f}
                  </Badge>
                ))}
              </div>
            )}

            {staff.bio && <p className="text-sm text-muted-foreground">{staff.bio}</p>}

            <div>
              <p className="text-sm font-medium mb-2">Avaliações de fornecedores</p>
              {reviews.length === 0 ? (
                <p className="text-xs text-muted-foreground">Ainda não recebeu avaliações.</p>
              ) : (
                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {reviews.map((r) => (
                    <div key={r.id} className="border rounded-md p-2">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star
                            key={n}
                            className={`h-3 w-3 ${n <= r.estrelas ? "fill-primary text-primary" : "text-muted-foreground"}`}
                          />
                        ))}
                        <span className="ml-1 text-[10px] text-muted-foreground">
                          {new Date(r.created_at).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                      {r.comentario && <p className="text-xs mt-1">{r.comentario}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Modal: fornecedor avalia o profissional (autor_tipo = fornecedor)   */
/* ------------------------------------------------------------------ */
function ReviewStaffDialog({
  open,
  onOpenChange,
  jobId,
  supplierId,
  staffId,
  staffName,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  jobId: string;
  supplierId: string;
  staffId: string;
  staffName?: string;
  onSaved?: () => void;
}) {
  const { toast } = useToast();
  const [estrelas, setEstrelas] = useState(5);
  const [comentario, setComentario] = useState("");
  const [loading, setLoading] = useState(false);

  const salvar = async () => {
    if (!jobId || !supplierId || !staffId) {
      return toast({ title: "Dados incompletos para avaliar", variant: "destructive" });
    }
    setLoading(true);
    const { error } = await (supabase.from("staff_reviews" as any) as any).insert({
      job_id: jobId,
      avaliado_id: staffId,
      autor_id: supplierId,
      autor_tipo: "fornecedor",
      estrelas,
      comentario: comentario || null,
    });
    setLoading(false);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Avaliação enviada. Obrigado!" });
    onOpenChange(false);
    setComentario("");
    setEstrelas(5);
    onSaved?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Avaliar {staffName || "profissional"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex justify-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => setEstrelas(n)} aria-label={`${n} estrelas`}>
                <Star className={`h-8 w-8 ${n <= estrelas ? "fill-primary text-primary" : "text-muted-foreground"}`} />
              </button>
            ))}
          </div>
          <Textarea
            rows={4}
            placeholder="Como foi o trabalho deste profissional? (opcional)"
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
          />
          <Button className="w-full" onClick={salvar} disabled={loading}>
            {loading ? "Enviando..." : "Enviar avaliação"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Componente principal                                                */
/* ------------------------------------------------------------------ */
export default function SupplierStaffTab({ supplierId, companyName }: { supplierId: string; companyName?: string }) {
  const { toast } = useToast();
  const [jobs, setJobs] = useState<any[]>([]);
  const [apps, setApps] = useState<Record<string, any[]>>({});
  const [staffs, setStaffs] = useState<any[]>([]);
  const [editJob, setEditJob] = useState<any | null>(null);
  const [chat, setChat] = useState<{ app: any; job: any } | null>(null);
  const [userId, setUserId] = useState<string>("");

  // #2 perfil clicável do profissional
  const [profileStaffId, setProfileStaffId] = useState<string | null>(null);
  // #6 avaliar profissional
  const [reviewTarget, setReviewTarget] = useState<{ jobId: string; staffId: string; staffName?: string } | null>(null);
  const [reviewedStaff, setReviewedStaff] = useState<Record<string, boolean>>({});

  // Busca de profissionais: nome, função, ordenação
  const [staffBusca, setStaffBusca] = useState("");
  const [staffFuncao, setStaffFuncao] = useState("todas");
  const [staffOrder, setStaffOrder] = useState<"rating" | "nome">("rating");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id || ""));
  }, []);

  const load = async () => {
    const { data: js } = await (supabase.from("staff_jobs" as any) as any)
      .select("*")
      .eq("supplier_id", supplierId)
      .order("data", { ascending: false });
    setJobs(js || []);
    if (js && js.length) {
      const ids = js.map((j: any) => j.id);
      const { data: apl } = await (supabase.from("staff_applications" as any) as any)
        .select("*, staff:staff_profiles(id, nome, cidade, funcoes, rating, review_count, foto_url)")
        .in("job_id", ids)
        .order("created_at", { ascending: false });
      const grouped: Record<string, any[]> = {};
      (apl || []).forEach((a: any) => {
        (grouped[a.job_id] = grouped[a.job_id] || []).push(a);
      });
      setApps(grouped);
    }
    const { data: sp } = await (supabase.from("staff_profiles" as any) as any)
      .select("id, nome, cidade, funcoes, rating, review_count, is_public")
      .eq("is_public", true)
      .limit(30);
    setStaffs(sp || []);

    // avaliações que ESTE fornecedor já deu (para esconder o botão de avaliar)
    const { data: given } = await (supabase.from("staff_reviews" as any) as any)
      .select("job_id, avaliado_id")
      .eq("autor_id", supplierId)
      .eq("autor_tipo", "fornecedor");
    const gmap: Record<string, boolean> = {};
    (given || []).forEach((r: any) => {
      gmap[`${r.job_id}:${r.avaliado_id}`] = true;
    });
    setReviewedStaff(gmap);
  };

  useEffect(() => {
    load(); /* eslint-disable-next-line */
  }, [supplierId]);

  // "clicou zera": ao abrir a conversa, marca as notificações de mensagem como lidas
  const abrirChat = async (app: any, job: any) => {
    setChat({ app, job });
    if (userId) {
      await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", userId)
        .eq("type", "staff_mensagem")
        .eq("read", false);
    }
  };

  const convidar = async (jobId: string, staffId: string) => {
    const { error } = await (supabase.from("staff_applications" as any) as any).upsert(
      { job_id: jobId, staff_id: staffId, origem: "convite", status: "convidado" },
      { onConflict: "job_id,staff_id", ignoreDuplicates: true },
    );
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Convite enviado!" });
    load();
  };

  const responder = async (appId: string, status: "aceito" | "recusado" | "concluido" | "no_show") => {
    const { error } = await (supabase.from("staff_applications" as any) as any)
      .update({ status, respondido_em: new Date().toISOString() })
      .eq("id", appId);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    load();
  };

  const abrirWhats = async (job: any, app: any) => {
    try {
      const contact = await fetchStaffContact(job.id, app.staff.id);
      const url = buildJobWhatsAppLink(contact.telefone || "", {
        funcao: job.funcao,
        data: job.data,
        horaInicio: job.hora_inicio,
        horaFim: job.hora_fim,
        local: job.local,
        valor: job.valor_turno,
        empresa: companyName,
      });
      if (url) window.open(url, "_blank");
    } catch (e: any) {
      toast({ title: "Contato liberado após aceite", description: e.message, variant: "destructive" });
    }
  };

  const alterarStatusVaga = async (job: any, status: "aberta" | "pausada" | "cancelada") => {
    const { error } = await (supabase.from("staff_jobs" as any) as any).update({ status }).eq("id", job.id);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({
      title: status === "aberta" ? "Vaga republicada" : status === "pausada" ? "Vaga despublicada" : "Vaga cancelada",
    });
    load();
  };

  // funções disponíveis para o filtro (deriva das funções dos profissionais carregados)
  const funcoesDisponiveis = useMemo(() => {
    const set = new Set<string>();
    staffs.forEach((s) => (s.funcoes || []).forEach((f: string) => set.add(f)));
    return Array.from(set).sort();
  }, [staffs]);

  // lista filtrada/ordenada de profissionais
  const staffsView = useMemo(() => {
    let list = [...staffs];
    const q = staffBusca.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (s) =>
          (s.nome || "").toLowerCase().includes(q) ||
          (s.cidade || "").toLowerCase().includes(q) ||
          (s.funcoes || []).some((f: string) => f.toLowerCase().includes(q)),
      );
    }
    if (staffFuncao !== "todas") {
      list = list.filter((s) => (s.funcoes || []).includes(staffFuncao));
    }
    if (staffOrder === "nome") {
      list.sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "pt-BR"));
    } else {
      list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    }
    return list;
  }, [staffs, staffBusca, staffFuncao, staffOrder]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold">Equipe e vagas</h2>
          <p className="text-sm text-muted-foreground">Convide profissionais ou publique vagas abertas.</p>
        </div>
        <PublishJobDialog supplierId={supplierId} onCreated={load} />
      </div>
      <PaymentDisclaimer />

      <Tabs defaultValue="vagas">
        <TabsList>
          <TabsTrigger value="vagas">Minhas vagas</TabsTrigger>
          <TabsTrigger value="buscar">Buscar profissionais</TabsTrigger>
        </TabsList>

        <TabsContent value="vagas" className="space-y-3">
          {jobs.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma vaga publicada ainda.</p>}
          {jobs.map((j) => (
            <Card key={j.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex justify-between items-center flex-wrap gap-2">
                  <span>
                    {j.funcao} • {new Date(j.data + "T00:00:00").toLocaleDateString("pt-BR")}
                  </span>
                  <Badge variant="secondary">{jobStatusLabel(j.status)}</Badge>
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {j.cidade || j.local} • R${" "}
                  {Number(j.valor_turno || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
                <div className="flex gap-2 flex-wrap pt-1">
                  <Button size="sm" variant="outline" onClick={() => setEditJob(j)}>
                    Editar
                  </Button>
                  {j.status === "aberta" ? (
                    <Button size="sm" variant="outline" onClick={() => alterarStatusVaga(j, "pausada")}>
                      Despublicar
                    </Button>
                  ) : j.status === "pausada" ? (
                    <Button size="sm" variant="outline" onClick={() => alterarStatusVaga(j, "aberta")}>
                      Republicar
                    </Button>
                  ) : null}
                  {j.status !== "cancelada" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => alterarStatusVaga(j, "cancelada")}
                    >
                      Cancelar vaga
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {(apps[j.id] || []).length === 0 && (
                  <p className="text-xs text-muted-foreground">Sem candidatos/convidados ainda.</p>
                )}
                {(apps[j.id] || []).map((a) => {
                  const jaAvaliado = reviewedStaff[`${a.job_id}:${a.staff_id}`];
                  return (
                    <div key={a.id} className="flex items-center justify-between border rounded-md p-2 flex-wrap gap-2">
                      <div className="text-sm">
                        {/* #2: nome clicável abre o perfil do profissional */}
                        <button
                          className="font-medium text-left hover:text-primary hover:underline"
                          onClick={() => setProfileStaffId(a.staff?.id || a.staff_id)}
                        >
                          {a.staff?.nome || "Profissional"}
                        </button>
                        <p className="text-xs text-muted-foreground">
                          {a.staff?.cidade} •{" "}
                          {a.staff?.rating ? `${a.staff.rating}★ (${a.staff.review_count})` : "sem avaliações"}
                        </p>
                        <p className="text-xs text-muted-foreground">{maskPhone(null)} — liberado após aceite</p>
                      </div>
                      <div className="flex gap-2 items-center flex-wrap justify-end">
                        <Badge variant="outline">{appStatusLabel(a.status)}</Badge>
                        <Button size="sm" variant="outline" onClick={() => abrirChat(a, j)}>
                          Conversar
                        </Button>
                        {a.status === "candidato" && (
                          <>
                            <Button size="sm" onClick={() => responder(a.id, "aceito")}>
                              Aceitar
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => responder(a.id, "recusado")}>
                              Recusar
                            </Button>
                          </>
                        )}
                        {a.status === "aceito" && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => abrirWhats(j, a)}>
                              WhatsApp
                            </Button>
                            <Button size="sm" onClick={() => responder(a.id, "concluido")}>
                              Concluir
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => responder(a.id, "no_show")}>
                              Não veio
                            </Button>
                          </>
                        )}
                        {/* #6: avaliar profissional em vaga concluída */}
                        {a.status === "concluido" && !jaAvaliado && (
                          <Button
                            size="sm"
                            onClick={() =>
                              setReviewTarget({ jobId: a.job_id, staffId: a.staff_id, staffName: a.staff?.nome })
                            }
                          >
                            Avaliar profissional
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="buscar" className="space-y-3">
          {jobs.length === 0 && (
            <p className="text-sm text-muted-foreground">Publique uma vaga primeiro para convidar profissionais.</p>
          )}

          {/* Filtros: busca por nome/função/cidade, filtro por função e ordenação */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, função ou cidade"
                value={staffBusca}
                onChange={(e) => setStaffBusca(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={staffFuncao}
              onChange={(e) => setStaffFuncao(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="todas">Todas as funções</option>
              {funcoesDisponiveis.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
            <select
              value={staffOrder}
              onChange={(e) => setStaffOrder(e.target.value as any)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="rating">Melhor avaliação</option>
              <option value="nome">Nome (A-Z)</option>
            </select>
          </div>

          {staffsView.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum profissional encontrado com esses filtros.</p>
          )}

          {staffsView.map((s) => (
            <Card key={s.id}>
              <CardContent className="p-4 flex items-center justify-between flex-wrap gap-2">
                <div>
                  {/* #2: nome clicável também na busca */}
                  <button
                    className="font-medium text-left hover:text-primary hover:underline"
                    onClick={() => setProfileStaffId(s.id)}
                  >
                    {s.nome}
                  </button>
                  <p className="text-xs text-muted-foreground">
                    {s.cidade} • {(s.funcoes || []).join(", ")}
                  </p>
                  {s.rating && (
                    <p className="text-xs">
                      {s.rating}★ ({s.review_count})
                    </p>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap items-center">
                  <Button size="sm" variant="ghost" onClick={() => setProfileStaffId(s.id)}>
                    Ver perfil
                  </Button>
                  {jobs
                    .filter((j) => j.status === "aberta")
                    .slice(0, 3)
                    .map((j) => (
                      <Button key={j.id} size="sm" variant="outline" onClick={() => convidar(j.id, s.id)}>
                        Convidar p/ {j.funcao}
                      </Button>
                    ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {editJob && (
        <PublishJobDialog
          supplierId={supplierId}
          job={editJob}
          open={!!editJob}
          onOpenChange={(v) => {
            if (!v) setEditJob(null);
          }}
          onCreated={() => {
            setEditJob(null);
            load();
          }}
        />
      )}

      {chat && (
        <StaffChatDialog
          open={!!chat}
          onOpenChange={(v) => {
            if (!v) setChat(null);
          }}
          application={{ ...chat.app, staff_id: chat.app.staff_id || chat.app.staff?.id }}
          job={chat.job}
          currentUserId={userId}
          isSupplier
        />
      )}

      <StaffProfileDialog
        open={!!profileStaffId}
        onOpenChange={(v) => {
          if (!v) setProfileStaffId(null);
        }}
        staffId={profileStaffId}
      />

      {reviewTarget && (
        <ReviewStaffDialog
          open={!!reviewTarget}
          onOpenChange={(v) => {
            if (!v) setReviewTarget(null);
          }}
          jobId={reviewTarget.jobId}
          supplierId={supplierId}
          staffId={reviewTarget.staffId}
          staffName={reviewTarget.staffName}
          onSaved={() => {
            setReviewTarget(null);
            load();
          }}
        />
      )}
    </div>
  );
}
