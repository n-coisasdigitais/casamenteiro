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
import { Star, MapPin, ShieldCheck, Search, CheckCircle2, AlertTriangle, Copy } from "lucide-react";
import { appStatusLabel, jobStatusLabel, buildJobWhatsAppLink, fetchStaffContact, maskPhone } from "@/lib/staff";
import { traduzirErro } from "@/lib/errorMessages";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
function jobStatusTag(status: string): { label: string; variant: "default" | "secondary" | "destructive" | "outline" } {
  if (status === "aberta") return { label: "Aberta", variant: "default" };
  if (status === "preenchida") return { label: "Preenchida", variant: "secondary" };
  if (status === "pausada") return { label: "Despublicada", variant: "outline" };
  if (status === "cancelada") return { label: "Cancelada", variant: "outline" };
  return { label: jobStatusLabel(status), variant: "secondary" };
}

/* ------------------------------------------------------------------ */
/* Modal: perfil público do profissional (foto, dados, avaliações)     */
/* ------------------------------------------------------------------ */
type StaffReview = {
  id: string;
  estrelas: number;
  comentario: string | null;
  created_at: string;
  resposta: string | null;
};

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
        .select(
          "id, nome, cidade, funcoes, rating, review_count, foto_url, bio, verificacao_status, eventos_concluidos, eventos_aceitos",
        )
        .eq("id", staffId)
        .maybeSingle();
      setStaff(sp);

      const { data: rv } = await (supabase.from("staff_reviews" as any) as any)
        .select("id, estrelas, comentario, created_at, resposta")
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

            {/* Sinais de confiabilidade */}
            <div className="flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1 text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {staff.eventos_concluidos ?? 0} trabalho(s) concluído(s)
              </span>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">{staff.eventos_aceitos ?? 0} aceito(s)</span>
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
                      {r.resposta && (
                        <div className="mt-1 pl-2 border-l-2 border-muted">
                          <p className="text-[10px] font-medium text-muted-foreground">Resposta do profissional</p>
                          <p className="text-xs">{r.resposta}</p>
                        </div>
                      )}
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
    if (error) return toast({ title: "Erro", description: traduzirErro(error), variant: "destructive" });
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
/* Card de um profissional (reutilizado em Buscar e Minha equipe)      */
/* ------------------------------------------------------------------ */
function StaffRow({
  s,
  isFav,
  onToggleFav,
  onOpenProfile,
  vagasAbertas,
  onConvidar,
  noShowByStaff,
}: {
  s: any;
  isFav: boolean;
  onToggleFav: (staffId: string) => void;
  onOpenProfile: (staffId: string) => void;
  vagasAbertas: any[];
  onConvidar: (jobId: string, staffId: string) => void;
  noShowByStaff: Record<string, number>;
}) {
  const faltas = noShowByStaff[s.id] || 0;
  return (
    <Card>
      <CardContent className="p-4 flex items-center justify-between flex-wrap gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <button
              className="font-medium text-left hover:text-primary hover:underline"
              onClick={() => onOpenProfile(s.id)}
            >
              {s.nome}
            </button>
            <button
              onClick={() => onToggleFav(s.id)}
              aria-label={isFav ? "Remover da equipe" : "Adicionar à equipe"}
              title={isFav ? "Remover da minha equipe" : "Salvar na minha equipe"}
            >
              <Star
                className={`h-4 w-4 ${isFav ? "fill-amber-400 text-amber-400" : "text-muted-foreground hover:text-amber-300"}`}
              />
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            {s.cidade} • {(s.funcoes || []).join(", ")}
          </p>
          <div className="flex items-center gap-2 text-xs mt-0.5">
            {s.rating ? (
              <span className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-primary text-primary" />
                {s.rating} ({s.review_count})
              </span>
            ) : (
              <span className="text-muted-foreground">Sem avaliações</span>
            )}
            <span className="text-emerald-700 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              {s.eventos_concluidos ?? 0} concluído(s)
            </span>
            {faltas > 0 && (
              <span className="text-destructive flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {faltas} falta(s)
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap items-center justify-end">
          <Button size="sm" variant="ghost" onClick={() => onOpenProfile(s.id)}>
            Ver perfil
          </Button>
          {vagasAbertas.slice(0, 3).map((j) => (
            <Button key={j.id} size="sm" variant="outline" onClick={() => onConvidar(j.id, s.id)}>
              Convidar p/ {j.funcao}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
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
  const [dupJob, setDupJob] = useState<any | null>(null);
  const [chat, setChat] = useState<{ app: any; job: any } | null>(null);
  const [userId, setUserId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const [profileStaffId, setProfileStaffId] = useState<string | null>(null);
  const [reviewTarget, setReviewTarget] = useState<{ jobId: string; staffId: string; staffName?: string } | null>(null);
  const [reviewedStaff, setReviewedStaff] = useState<Record<string, boolean>>({});

  // equipe de confiança (favoritos)
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // filtros da busca de profissionais
  const [staffBusca, setStaffBusca] = useState("");
  const [staffFuncao, setStaffFuncao] = useState("todas");
  const [staffOrder, setStaffOrder] = useState<"rating" | "nome" | "concluidos">("rating");
  const [jobFiltro, setJobFiltro] = useState<"ativas" | "todas">("ativas");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id || ""));
  }, []);

  const load = async () => {
    setLoading(true);
    const { data: js } = await (supabase.from("staff_jobs" as any) as any)
      .select("*")
      .eq("supplier_id", supplierId)
      .order("data", { ascending: false });
    setJobs(js || []);

    let apl: any[] = [];
    if (js && js.length) {
      const ids = js.map((j: any) => j.id);
      const res = await (supabase.from("staff_applications" as any) as any)
        .select(
          "*, staff:staff_profiles(id, nome, cidade, funcoes, rating, review_count, foto_url, eventos_concluidos)",
        )
        .in("job_id", ids)
        .order("created_at", { ascending: false });
      apl = res.data || [];
      const grouped: Record<string, any[]> = {};
      apl.forEach((a: any) => {
        (grouped[a.job_id] = grouped[a.job_id] || []).push(a);
      });
      setApps(grouped);
    } else {
      setApps({});
    }

    const { data: sp } = await (supabase.from("staff_profiles" as any) as any)
      .select("id, nome, cidade, funcoes, rating, review_count, is_public, eventos_concluidos, eventos_aceitos")
      .eq("is_public", true)
      .limit(50);
    setStaffs(sp || []);

    const { data: given } = await (supabase.from("staff_reviews" as any) as any)
      .select("job_id, avaliado_id")
      .eq("autor_id", supplierId)
      .eq("autor_tipo", "fornecedor");
    const gmap: Record<string, boolean> = {};
    (given || []).forEach((r: any) => {
      gmap[`${r.job_id}:${r.avaliado_id}`] = true;
    });
    setReviewedStaff(gmap);

    const { data: favs } = await (supabase.from("supplier_staff_favorites" as any) as any)
      .select("staff_id")
      .eq("supplier_id", supplierId);
    setFavorites(new Set((favs || []).map((f: any) => f.staff_id)));

    setLoading(false);
  };

  useEffect(() => {
    load(); /* eslint-disable-next-line */
  }, [supplierId]);

  // faltas (no-show) por profissional, das vagas deste fornecedor
  const noShowByStaff = useMemo(() => {
    const m: Record<string, number> = {};
    Object.values(apps)
      .flat()
      .forEach((a: any) => {
        if (a.status === "no_show" && a.staff_id) m[a.staff_id] = (m[a.staff_id] || 0) + 1;
      });
    return m;
  }, [apps]);

  const toggleFavorite = async (staffId: string) => {
    const isFav = favorites.has(staffId);
    setFavorites((prev) => {
      const n = new Set(prev);
      if (isFav) n.delete(staffId);
      else n.add(staffId);
      return n;
    });
    if (isFav) {
      const { error } = await (supabase.from("supplier_staff_favorites" as any) as any)
        .delete()
        .eq("supplier_id", supplierId)
        .eq("staff_id", staffId);
      if (error) {
        toast({ title: "Erro", description: traduzirErro(error), variant: "destructive" });
        load();
        return;
      }
      toast({ title: "Removido da sua equipe" });
    } else {
      const { error } = await (supabase.from("supplier_staff_favorites" as any) as any).insert({
        supplier_id: supplierId,
        staff_id: staffId,
      });
      if (error) {
        toast({ title: "Erro", description: traduzirErro(error), variant: "destructive" });
        load();
        return;
      }
      toast({ title: "Salvo na sua equipe!" });
    }
  };

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
    if (error) return toast({ title: "Erro", description: traduzirErro(error), variant: "destructive" });
    toast({ title: "Convite enviado!" });
    load();
  };

  const convidarEquipe = async (jobId: string) => {
    const alvo = Array.from(favorites);
    if (alvo.length === 0)
      return toast({ title: "Sua equipe está vazia", description: "Favorite profissionais com a estrela." });
    const rows = alvo.map((staffId) => ({ job_id: jobId, staff_id: staffId, origem: "convite", status: "convidado" }));
    const { error } = await (supabase.from("staff_applications" as any) as any).upsert(rows, {
      onConflict: "job_id,staff_id",
      ignoreDuplicates: true,
    });
    if (error) return toast({ title: "Erro", description: traduzirErro(error), variant: "destructive" });
    toast({ title: `Convite enviado para ${alvo.length} da sua equipe` });
    load();
  };

  const responder = async (appId: string, status: "aceito" | "recusado" | "concluido" | "no_show") => {
    const { error } = await (supabase.from("staff_applications" as any) as any)
      .update({ status, respondido_em: new Date().toISOString() })
      .eq("id", appId);
    if (error) return toast({ title: "Erro", description: traduzirErro(error), variant: "destructive" });
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
      toast({ title: "Contato liberado após aceite", description: traduzirErro(e), variant: "destructive" });
    }
  };

  const alterarStatusVaga = async (job: any, status: "aberta" | "pausada" | "cancelada") => {
    const { error } = await (supabase.from("staff_jobs" as any) as any).update({ status }).eq("id", job.id);
    if (error) return toast({ title: "Erro", description: traduzirErro(error), variant: "destructive" });
    toast({
      title: status === "aberta" ? "Vaga republicada" : status === "pausada" ? "Vaga despublicada" : "Vaga cancelada",
    });
    load();
  };

  // duplicar vaga: abre o PublishJobDialog pré-preenchido, sem id (cria nova)
  const duplicarVaga = (job: any) => {
    const { id, status, created_at, updated_at, ...resto } = job;
    setDupJob({ ...resto, data: "" });
  };

  const funcoesDisponiveis = useMemo(() => {
    const set = new Set<string>();
    staffs.forEach((s) => (s.funcoes || []).forEach((f: string) => set.add(f)));
    return Array.from(set).sort();
  }, [staffs]);

  const applyStaffFilters = (list: any[]) => {
    let out = [...list];
    const q = staffBusca.trim().toLowerCase();
    if (q) {
      out = out.filter(
        (s) =>
          (s.nome || "").toLowerCase().includes(q) ||
          (s.cidade || "").toLowerCase().includes(q) ||
          (s.funcoes || []).some((f: string) => f.toLowerCase().includes(q)),
      );
    }
    if (staffFuncao !== "todas") out = out.filter((s) => (s.funcoes || []).includes(staffFuncao));
    if (staffOrder === "nome") out.sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "pt-BR"));
    else if (staffOrder === "concluidos") out.sort((a, b) => (b.eventos_concluidos ?? 0) - (a.eventos_concluidos ?? 0));
    else out.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    return out;
  };

  const staffsView = useMemo(() => applyStaffFilters(staffs), [staffs, staffBusca, staffFuncao, staffOrder]);
  const equipe = useMemo(() => staffs.filter((s) => favorites.has(s.id)), [staffs, favorites]);

  const jobsView = useMemo(() => {
    if (jobFiltro === "todas") return jobs;
    return jobs.filter((j) => j.status === "aberta" || j.status === "preenchida" || j.status === "pausada");
  }, [jobs, jobFiltro]);

  const vagasAbertas = useMemo(() => jobs.filter((j) => j.status === "aberta"), [jobs]);
  const totalCandidatos = useMemo(
    () =>
      Object.values(apps)
        .flat()
        .filter((a: any) => a.status === "candidato").length,
    [apps],
  );

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

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
        <TabsList className="flex-wrap">
          <TabsTrigger value="vagas">Minhas vagas{totalCandidatos > 0 ? ` (${totalCandidatos})` : ""}</TabsTrigger>
          <TabsTrigger value="equipe">Minha equipe{equipe.length > 0 ? ` (${equipe.length})` : ""}</TabsTrigger>
          <TabsTrigger value="buscar">Buscar profissionais</TabsTrigger>
        </TabsList>

        {/* ---------------- MINHAS VAGAS ---------------- */}
        <TabsContent value="vagas" className="space-y-3">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={jobFiltro === "ativas" ? "default" : "outline"}
              onClick={() => setJobFiltro("ativas")}
            >
              Ativas
            </Button>
            <Button
              size="sm"
              variant={jobFiltro === "todas" ? "default" : "outline"}
              onClick={() => setJobFiltro("todas")}
            >
              Todas
            </Button>
          </div>

          {jobsView.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma vaga nesse filtro.</p>}
          {jobsView.map((j) => {
            const lista = apps[j.id] || [];
            const aceitos = lista.filter((a) => a.status === "aceito" || a.status === "concluido").length;
            const tag = jobStatusTag(j.status);
            return (
              <Card key={j.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex justify-between items-center flex-wrap gap-2">
                    <span>
                      {j.funcao} • {new Date(j.data + "T00:00:00").toLocaleDateString("pt-BR")}
                    </span>
                    <div className="flex items-center gap-2">
                      {j.vagas ? (
                        <Badge variant="outline">
                          {aceitos}/{j.vagas} vagas
                        </Badge>
                      ) : null}
                      <Badge variant={tag.variant}>{tag.label}</Badge>
                    </div>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {j.cidade || j.local} • R${" "}
                    {Number(j.valor_turno || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    {lista.length > 0 ? ` • ${lista.length} candidato(s)/convidado(s)` : ""}
                  </p>
                  <div className="flex gap-2 flex-wrap pt-1">
                    <Button size="sm" variant="outline" onClick={() => setEditJob(j)}>
                      Editar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => duplicarVaga(j)}>
                      <Copy className="h-3.5 w-3.5 mr-1" />
                      Duplicar
                    </Button>
                    {favorites.size > 0 && j.status === "aberta" && (
                      <Button size="sm" variant="outline" onClick={() => convidarEquipe(j.id)}>
                        Convidar minha equipe
                      </Button>
                    )}
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
                  {lista.length === 0 && (
                    <p className="text-xs text-muted-foreground">Sem candidatos/convidados ainda.</p>
                  )}
                  {lista.map((a) => {
                    const jaAvaliado = reviewedStaff[`${a.job_id}:${a.staff_id}`];
                    const isFav = favorites.has(a.staff_id);
                    const faltas = noShowByStaff[a.staff_id] || 0;
                    return (
                      <div
                        key={a.id}
                        className="flex items-center justify-between border rounded-md p-2 flex-wrap gap-2"
                      >
                        <div className="text-sm min-w-0">
                          <div className="flex items-center gap-2">
                            <button
                              className="font-medium text-left hover:text-primary hover:underline"
                              onClick={() => setProfileStaffId(a.staff?.id || a.staff_id)}
                            >
                              {a.staff?.nome || "Profissional"}
                            </button>
                            <button
                              onClick={() => toggleFavorite(a.staff_id)}
                              title={isFav ? "Remover da equipe" : "Salvar na equipe"}
                            >
                              <Star
                                className={`h-3.5 w-3.5 ${isFav ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`}
                              />
                            </button>
                          </div>
                          <p className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                            <span>{a.staff?.cidade}</span>
                            <span className="flex items-center gap-1 text-emerald-700">
                              <CheckCircle2 className="h-3 w-3" />
                              {a.staff?.eventos_concluidos ?? 0}
                            </span>
                            {faltas > 0 && (
                              <span className="flex items-center gap-1 text-destructive">
                                <AlertTriangle className="h-3 w-3" />
                                {faltas} falta(s)
                              </span>
                            )}
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
            );
          })}
        </TabsContent>

        {/* ---------------- MINHA EQUIPE ---------------- */}
        <TabsContent value="equipe" className="space-y-3">
          {equipe.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sua equipe está vazia. Toque na estrela ao lado de um profissional para salvá-lo aqui e convidá-lo
              rapidamente nas próximas vagas.
            </p>
          ) : (
            <>
              {vagasAbertas.length > 0 && (
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-sm text-muted-foreground">Convidar equipe inteira para:</span>
                  {vagasAbertas.slice(0, 4).map((j) => (
                    <Button key={j.id} size="sm" variant="outline" onClick={() => convidarEquipe(j.id)}>
                      {j.funcao} • {new Date(j.data + "T00:00:00").toLocaleDateString("pt-BR")}
                    </Button>
                  ))}
                </div>
              )}
              {equipe.map((s) => (
                <StaffRow
                  key={s.id}
                  s={s}
                  isFav
                  onToggleFav={toggleFavorite}
                  onOpenProfile={setProfileStaffId}
                  vagasAbertas={vagasAbertas}
                  onConvidar={convidar}
                  noShowByStaff={noShowByStaff}
                />
              ))}
            </>
          )}
        </TabsContent>

        {/* ---------------- BUSCAR PROFISSIONAIS ---------------- */}
        <TabsContent value="buscar" className="space-y-3">
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
              <option value="concluidos">Mais experiente</option>
              <option value="nome">Nome (A-Z)</option>
            </select>
          </div>

          {staffsView.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum profissional encontrado com esses filtros.</p>
          )}
          {staffsView.map((s) => (
            <StaffRow
              key={s.id}
              s={s}
              isFav={favorites.has(s.id)}
              onToggleFav={toggleFavorite}
              onOpenProfile={setProfileStaffId}
              vagasAbertas={vagasAbertas}
              onConvidar={convidar}
              noShowByStaff={noShowByStaff}
            />
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

      {dupJob && (
        <PublishJobDialog
          supplierId={supplierId}
          job={dupJob}
          open={!!dupJob}
          onOpenChange={(v) => {
            if (!v) setDupJob(null);
          }}
          onCreated={() => {
            setDupJob(null);
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
