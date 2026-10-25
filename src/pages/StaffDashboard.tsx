import { traduzirErro } from "@/lib/errorMessages";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import WelcomeModal from "@/components/WelcomeModal";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import SEO from "@/components/SEO";
import UserMenu from "@/components/UserMenu";
import NotificationsBell from "@/components/NotificationsBell";
import ReviewSupplierDialog from "@/components/staff/ReviewSupplierDialog";
import StaffDocumentsTab, { verificacaoLabel } from "@/components/staff/StaffDocumentsTab";
import StaffChatDialog from "@/components/staff/StaffChatDialog";
import AjudaTab from "@/components/AjudaTab";
import { appStatusLabel } from "@/lib/staff";
import { buildWhatsAppLink } from "@/lib/phone";
import {
  Home,
  Briefcase,
  CalendarDays,
  UserRound,
  LifeBuoy,
  Search,
  ShieldCheck,
  Star,
  MapPin,
  Clock,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Check,
  MessageCircle,
} from "lucide-react";
import "@/components/staff/painel-prof.css";

type Destino = "inicio" | "vagas" | "agenda" | "perfil" | "ajuda";

/* ---------- ajudantes ---------- */

/** Data local no formato AAAA-MM-DD (sem passar por UTC, que muda o dia à noite). */
function isoLocal(d: Date) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${dia}`;
}
const dataBR = (iso?: string | null, opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" }) =>
  iso ? new Date(iso + "T00:00:00").toLocaleDateString("pt-BR", opts).replace(/\./g, "") : "";
const horaCurta = (h?: string | null) => (h ? h.slice(0, 5) : "");
const reais = (v?: number | null) =>
  "R$ " + Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

/** Tag da candidatura. Leva em conta o status da VAGA, não só o da candidatura. */
function statusTag(a: any): { label: string; tom: "ok" | "wait" | "off" | "err" } {
  const jobStatus = a.job?.status;
  const s = a.status;
  if (s === "concluido") return { label: "Concluída", tom: "off" };
  if (s === "retirada") return { label: "Candidatura retirada", tom: "off" };
  if (s === "recusado") return { label: "Recusada", tom: "off" };
  if (s === "no_show") return { label: "Não compareceu", tom: "err" };
  if (jobStatus === "cancelada" || jobStatus === "encerrada") return { label: "Vaga encerrada", tom: "off" };
  if (s === "aceito") return { label: "Confirmada", tom: "ok" };
  if (s === "convidado") return { label: "Convite para você", tom: "wait" };
  if (s === "candidato") return { label: "Candidatura enviada", tom: "wait" };
  return { label: appStatusLabel(s), tom: "off" };
}

/** Candidatura sem ações possíveis: a vaga saiu do ar e ela não chegou a concluir. */
function isEncerradaSemConclusao(a: any): boolean {
  const jobStatus = a.job?.status;
  return (jobStatus === "cancelada" || jobStatus === "encerrada") && a.status !== "concluido";
}

function grupoDa(a: any): "confirmadas" | "aguardando" | "encerradas" {
  if (isEncerradaSemConclusao(a)) return "encerradas";
  if (a.status === "aceito") return "confirmadas";
  if (a.status === "convidado" || a.status === "candidato") return "aguardando";
  return "encerradas";
}

const TAB_PARA_DESTINO: Record<string, Destino> = {
  inicio: "inicio",
  convites: "inicio",
  vagas: "vagas",
  feed: "vagas",
  agenda: "agenda",
  perfil: "perfil",
  avaliacoes: "perfil",
  documentos: "perfil",
  ajuda: "ajuda",
};

export default function StaffDashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [params, setParams] = useSearchParams();

  const [staff, setStaff] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [feed, setFeed] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [unav, setUnav] = useState<any[]>([]);
  const [reviewsGiven, setReviewsGiven] = useState<Record<string, boolean>>({});
  const [reviewApp, setReviewApp] = useState<any>(null);
  const [reviewNota, setReviewNota] = useState<number | undefined>(undefined);
  const [chatApp, setChatApp] = useState<any>(null);

  const [dest, setDest] = useState<Destino>(() => TAB_PARA_DESTINO[params.get("tab") || ""] || "inicio");
  const docsRef = useRef<HTMLDivElement>(null);

  // convites: confirmação de recusa na própria tela e animação de saída
  const [confirmRecusa, setConfirmRecusa] = useState<string | null>(null);
  const [saindo, setSaindo] = useState<Record<string, boolean>>({});
  const [ocupado, setOccupado] = useState<Record<string, boolean>>({});

  // agenda: bloqueio por intervalo
  const [blockStart, setBlockStart] = useState("");
  const [blockEnd, setBlockEnd] = useState("");
  const [blockMotivo, setBlockMotivo] = useState("");
  const [mesRef, setMesRef] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  // minhas vagas + feed
  const [filtro, setFiltro] = useState<"todas" | "confirmadas" | "aguardando" | "encerradas">("todas");
  const [feedBusca, setFeedBusca] = useState("");
  const [feedFuncao, setFeedFuncao] = useState("todas");
  const [feedOrder, setFeedOrder] = useState<"data" | "valor_desc" | "valor_asc">("data");

  // relógio para a contagem regressiva (atualiza a cada minuto)
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!user) return;
    if (profile && profile.account_type !== "profissional") navigate("/", { replace: true });
  }, [user, profile, navigate]);

  // links do menu da conta (?tab=vagas, ?tab=documentos) abrem a seção certa
  useEffect(() => {
    const tab = params.get("tab");
    if (!tab) return;
    const d = TAB_PARA_DESTINO[tab];
    if (d) setDest(d);
    if (tab === "documentos") setTimeout(() => docsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 250);
  }, [params]);

  const irPara = (d: Destino) => {
    setDest(d);
    if (params.get("tab")) {
      params.delete("tab");
      setParams(params, { replace: true });
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

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

  /* ---------- ações (mesma lógica de antes) ---------- */

  const responder = async (appId: string, status: "aceito" | "recusado") => {
    setOccupado((o) => ({ ...o, [appId]: true }));
    const { error } = await (supabase.from("staff_applications" as any) as any)
      .update({ status, respondido_em: new Date().toISOString() })
      .eq("id", appId);
    setOccupado((o) => ({ ...o, [appId]: false }));
    if (error) return toast({ title: "Erro", description: traduzirErro(error), variant: "destructive" });
    setConfirmRecusa(null);
    setSaindo((s) => ({ ...s, [appId]: true }));
    toast({
      title: status === "aceito" ? "Vaga aceita!" : "Convite recusado",
      description: status === "aceito" ? "A data foi bloqueada na sua agenda. O contato do fornecedor já está liberado." : undefined,
    });
    setTimeout(() => {
      setSaindo((s) => ({ ...s, [appId]: false }));
      load();
    }, 350);
  };

  const retirarCandidatura = async (appId: string) => {
    const { error } = await (supabase.from("staff_applications" as any) as any)
      .update({ status: "retirada", respondido_em: new Date().toISOString() })
      .eq("id", appId);
    if (error) return toast({ title: "Erro", description: traduzirErro(error), variant: "destructive" });
    toast({ title: "Candidatura retirada" });
    load();
  };

  const candidatar = async (jobId: string) => {
    if (!staff) return;
    const { error } = await (supabase.from("staff_applications" as any) as any).upsert(
      { job_id: jobId, staff_id: staff.id, origem: "candidatura", status: "candidato" },
      { onConflict: "job_id,staff_id", ignoreDuplicates: true },
    );
    if (error) return toast({ title: "Erro", description: traduzirErro(error), variant: "destructive" });
    toast({ title: "Candidatura enviada!", description: "O fornecedor responde por aqui." });
    load();
  };

  /** Abre o WhatsApp do FORNECEDOR (o contato só é liberado depois do aceite). */
  const abrirWhats = async (app: any) => {
    const supplierId = app.job?.supplier?.id || app.job?.supplier_id;
    const { data, error } = await (supabase.rpc as any)("get_supplier_contact", { _supplier_id: supplierId });
    const row = Array.isArray(data) ? data[0] : data;
    const fone = row?.whatsapp || row?.phone || "";
    if (error || !fone) {
      return toast({
        title: "Contato indisponível",
        description: "O fornecedor ainda não cadastrou um WhatsApp. Use a conversa aqui no painel.",
        variant: "destructive",
      });
    }
    const j = app.job;
    const linhas = [
      `Olá! Sou ${staff?.nome || "o(a) profissional"}, confirmado(a) pelo Casamenteiro para a vaga:`,
      `• Função: ${j.funcao}`,
      `• Data: ${new Date(j.data + "T00:00:00").toLocaleDateString("pt-BR")}`,
    ];
    if (j.hora_inicio) linhas.push(`• Horário: ${horaCurta(j.hora_inicio)}${j.hora_fim ? " às " + horaCurta(j.hora_fim) : ""}`);
    if (j.local) linhas.push(`• Local: ${j.local}`);
    const url = buildWhatsAppLink(fone, linhas.join("\n"));
    if (url) window.open(url, "_blank");
    else toast({ title: "Número de WhatsApp inválido", description: "Use a conversa aqui no painel.", variant: "destructive" });
  };

  const bloquearPeriodo = async () => {
    if (!staff || !blockStart) return;
    const start = new Date(blockStart + "T00:00:00");
    const end = new Date((blockEnd || blockStart) + "T00:00:00");
    if (end < start) {
      return toast({ title: "Período inválido", description: "A data final é anterior à inicial.", variant: "destructive" });
    }
    const dias: string[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) dias.push(isoLocal(d));
    const jaBloqueadas = new Set(unav.map((u) => u.data));
    const novos = dias
      .filter((data) => !jaBloqueadas.has(data))
      .map((data) => ({ staff_id: staff.id, data, motivo: blockMotivo || null }));
    if (novos.length === 0) return toast({ title: "Nada a bloquear", description: "Essas datas já estavam bloqueadas." });
    const { error } = await (supabase.from("staff_unavailability" as any) as any).insert(novos);
    if (error) return toast({ title: "Erro", description: traduzirErro(error), variant: "destructive" });
    toast({ title: novos.length === 1 ? "Data bloqueada" : `${novos.length} datas bloqueadas` });
    setBlockStart("");
    setBlockEnd("");
    setBlockMotivo("");
    load();
  };

  const desbloquear = async (id: string) => {
    const { error } = await (supabase.from("staff_unavailability" as any) as any).delete().eq("id", id);
    if (error) return toast({ title: "Erro", description: traduzirErro(error), variant: "destructive" });
    toast({ title: "Dia liberado" });
    load();
  };

  /** Toque num dia do calendário: livre → bloqueia; bloqueado → libera; com evento → avisa. */
  const tocarDia = async (data: string) => {
    if (!staff) return;
    if (datasEvento.has(data)) return toast({ title: "Você tem um evento confirmado nesse dia." });
    const bloqueio = unavPorData.get(data);
    if (bloqueio) return desbloquear(bloqueio.id);
    const { error } = await (supabase.from("staff_unavailability" as any) as any).insert({ staff_id: staff.id, data, motivo: null });
    if (error) return toast({ title: "Erro", description: traduzirErro(error), variant: "destructive" });
    toast({ title: "Dia bloqueado", description: "Você não recebe convites nessa data." });
    load();
  };

  const toggleDisponivel = async (v: boolean) => {
    setStaff((s: any) => ({ ...s, disponivel: v }));
    const { error } = await (supabase.from("staff_profiles" as any) as any).update({ disponivel: v }).eq("id", staff.id);
    if (error) return toast({ title: "Erro", description: traduzirErro(error), variant: "destructive" });
    toast({ title: v ? "Você está disponível para vagas" : "Pausado: você não recebe novos convites" });
  };

  const abrirAvaliacao = (app: any, nota?: number) => {
    setReviewNota(nota);
    setReviewApp(app);
  };

  /* ---------- dados derivados ---------- */

  const hoje = isoLocal(new Date());

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
    if (feedFuncao !== "todas") list = list.filter((j) => j.funcao === feedFuncao);
    if (feedOrder === "valor_desc") list.sort((a, b) => (b.valor_turno ?? 0) - (a.valor_turno ?? 0));
    else if (feedOrder === "valor_asc") list.sort((a, b) => (a.valor_turno ?? 0) - (b.valor_turno ?? 0));
    else list.sort((a, b) => (a.data > b.data ? 1 : -1));
    return list;
  }, [feed, feedBusca, feedFuncao, feedOrder]);

  const convites = useMemo(
    () =>
      applications
        .filter((a) => a.status === "convidado" && !isEncerradaSemConclusao(a))
        .sort((a, b) => ((a.job?.data || "") > (b.job?.data || "") ? 1 : -1)),
    [applications],
  );
  const paraAvaliar = applications.filter((a) => a.status === "concluido" && !reviewsGiven[a.job_id]);

  const confirmadas = useMemo(
    () =>
      applications
        .filter((a) => a.status === "aceito" && !isEncerradaSemConclusao(a) && a.job?.data >= hoje)
        .sort((a, b) => (a.job.data > b.job.data ? 1 : -1)),
    [applications, hoje],
  );
  const proximo = confirmadas[0];

  const datasEvento = useMemo(() => {
    const s = new Set<string>();
    applications.forEach((a) => {
      if ((a.status === "aceito" || a.status === "concluido") && !isEncerradaSemConclusao(a) && a.job?.data) s.add(a.job.data);
    });
    return s;
  }, [applications]);
  const unavPorData = useMemo(() => new Map(unav.map((u) => [u.data, u])), [unav]);

  const mesAtual = hoje.slice(0, 7);
  const doMes = applications.filter(
    (a) => (a.status === "aceito" || a.status === "concluido") && !isEncerradaSemConclusao(a) && (a.job?.data || "").startsWith(mesAtual),
  );
  const totalMes = doMes.reduce((s, a) => s + Number(a.job?.valor_turno || 0), 0);
  const jaAplicou = (jobId: string) => applications.some((a) => a.job_id === jobId && a.status !== "retirada");
  const sugestoes = feed.filter((j) => !jaAplicou(j.id)).slice(0, 3);

  const passosPerfil = staff
    ? [
        { ok: !!staff.foto_url, label: "Foto de perfil" },
        { ok: (staff.funcoes || []).length > 0, label: "Funções que você faz" },
        { ok: !!staff.cidade, label: "Cidade e raio de atendimento" },
        { ok: staff.valor_min_turno != null, label: "Valor mínimo por turno" },
        { ok: !!(staff.bio || "").trim(), label: "Apresentação curta" },
        { ok: staff.verificacao_status === "verificado", label: "Documentos verificados", docs: true },
      ]
    : [];
  const pctPerfil = passosPerfil.length ? Math.round((passosPerfil.filter((p) => p.ok).length / passosPerfil.length) * 100) : 0;

  if (!staff) return null;

  const h = new Date().getHours();
  const saudacao = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
  const primeiroNome = (staff.nome || "").split(" ")[0];
  const verif = staff.verificacao_status;

  const contagem = (() => {
    if (!proximo) return null;
    const inicio = new Date(`${proximo.job.data}T${proximo.job.hora_inicio ? horaCurta(proximo.job.hora_inicio) : "00:00"}:00`).getTime();
    const mins = Math.max(0, Math.floor((inicio - agora) / 60000));
    return { d: Math.floor(mins / 1440), h: Math.floor((mins % 1440) / 60), m: mins % 60 };
  })();

  /* ---------- pedaços de interface ---------- */

  const Fatos = ({ j, claro }: { j: any; claro?: boolean }) => (
    <div className="pp-num flex flex-wrap gap-x-3.5 gap-y-1 text-[13.5px]" style={{ color: claro ? "#e3f0ea" : "var(--pp-body)" }}>
      {j?.data && (
        <span className="inline-flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
          {dataBR(j.data)}
        </span>
      )}
      {j?.hora_inicio && (
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          {horaCurta(j.hora_inicio)}
          {j.hora_fim ? `–${horaCurta(j.hora_fim)}` : ""}
        </span>
      )}
      {(j?.cidade || j?.local) && (
        <span className="inline-flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
          {j.cidade || j.local}
        </span>
      )}
    </div>
  );

  const btn = "inline-flex h-11 items-center justify-center gap-1.5 rounded-full px-5 text-[15px] font-bold transition active:scale-[.97] disabled:opacity-60";
  const btnPri = `${btn} text-white hover:brightness-110`;
  const btnSec = `${btn} border bg-white`;
  const priStyle = { background: "var(--pp-sage)" };
  const secStyle = { borderColor: "var(--pp-line-strong)", color: "var(--pp-ink)" };
  const lnk = "text-sm font-bold";
  const lnkStyle = { color: "var(--pp-sage-dark)" };

  const CardVagaAberta = ({ j, compacto }: { j: any; compacto?: boolean }) => {
    const enviado = jaAplicou(j.id);
    return (
      <div className="flex flex-col gap-2 rounded-2xl border bg-white p-3.5" style={{ borderColor: "var(--pp-line)" }}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <b className="block text-[15.5px]">{j.funcao}</b>
            <span className="block truncate text-[13px]" style={{ color: "var(--pp-body)" }}>
              {j.supplier?.company_name}
            </span>
          </div>
          <span className="pp-num whitespace-nowrap text-[17px] font-extrabold">{reais(j.valor_turno)}</span>
        </div>
        <Fatos j={compacto ? { data: j.data, cidade: j.cidade || j.local } : j} />
        <div className="mt-auto pt-1">
          {enviado ? (
            <span className="inline-flex h-10 items-center gap-1.5 text-sm font-bold" role="status" style={{ color: "var(--pp-ok)" }}>
              <Check className="h-4 w-4" aria-hidden="true" /> Candidatura enviada
            </span>
          ) : (
            <button type="button" className={`${btnPri} h-10 w-full text-sm`} style={priStyle} onClick={() => candidatar(j.id)}>
              Candidatar-se
            </button>
          )}
        </div>
      </div>
    );
  };

  const Dia = ({ data, rotulo, mostrarDia }: { data: string; rotulo?: string; mostrarDia: number }) => {
    const ev = datasEvento.has(data);
    const bl = unavPorData.has(data);
    const passado = data < hoje;
    const cls = ["pp-day", ev ? "ev" : "", bl ? "bl" : "", data === hoje ? "today" : "", passado ? "past" : ""].join(" ");
    return (
      <button
        type="button"
        className={cls}
        onClick={() => tocarDia(data)}
        aria-label={`${dataBR(data, { day: "numeric", month: "long" })}: ${ev ? "evento confirmado" : bl ? "indisponível, toque para liberar" : "livre, toque para bloquear"}`}
        disabled={passado}
      >
        {rotulo}
        <b className="pp-num">{mostrarDia}</b>
        <i />
      </button>
    );
  };

  const semana = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });
  const letrasSemana = ["D", "S", "T", "Q", "Q", "S", "S"];

  const Legenda = () => (
    <div className="flex flex-wrap gap-3 text-xs" style={{ color: "var(--pp-muted)" }}>
      <span className="inline-flex items-center gap-1.5">
        <i className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: "var(--pp-sage)" }} /> Evento
      </span>
      <span className="inline-flex items-center gap-1.5">
        <i className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: "var(--pp-line-strong)" }} /> Indisponível
      </span>
      <span>Toque num dia livre para bloquear</span>
    </div>
  );

  const destinos: { key: Destino; label: string; curto: string; icon: any; badge?: number }[] = [
    { key: "inicio", label: "Início", curto: "Início", icon: Home, badge: convites.length },
    { key: "vagas", label: "Minhas vagas", curto: "Vagas", icon: Briefcase },
    { key: "agenda", label: "Agenda", curto: "Agenda", icon: CalendarDays },
    { key: "perfil", label: "Perfil e avaliações", curto: "Perfil", icon: UserRound },
  ];

  const Titulo = ({ children }: { children: React.ReactNode }) => (
    <h1 className="m-0 text-[26px] font-bold md:text-[30px]" style={{ letterSpacing: "-0.035em", lineHeight: 1.15, color: "var(--pp-ink)" }}>
      {children}
    </h1>
  );

  /* ---------- telas ---------- */

  const telaInicio = (
    <div className="flex flex-col gap-4">
      <div>
        <Titulo>
          {saudacao}, <em className="pp-serif">{primeiroNome}.</em>
        </Titulo>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className={`pp-chip ${verif === "verificado" ? "ok" : verif === "rejeitado" ? "err" : "warn"}`}>
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> {verificacaoLabel(verif)}
          </span>
          <span className="pp-chip pp-num">
            <Star className="h-3.5 w-3.5" style={{ color: "var(--pp-terracota)", fill: "var(--pp-terracota)" }} aria-hidden="true" />
            {staff.rating ? `${Number(staff.rating).toFixed(1).replace(".", ",")} · ${staff.review_count} avaliações` : "sem avaliações"}
          </span>
          {(staff.funcoes || []).length > 0 && <span className="pp-chip">{(staff.funcoes || []).slice(0, 2).join(" · ")}</span>}
        </div>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <label
            className="pp-avail flex cursor-pointer items-center justify-between gap-3 rounded-[18px] border bg-white px-4 py-3.5"
            data-on={staff.disponivel !== false}
            style={{ borderColor: "var(--pp-line)" }}
          >
            <span>
              <b className="block text-[15px]">{staff.disponivel !== false ? "Disponível para vagas" : "Pausado"}</b>
              <small className="text-[13px]" style={{ color: "var(--pp-body)" }}>
                {staff.disponivel !== false ? "Fornecedores da sua região podem te convidar." : "Você não recebe convites até religar."}
              </small>
            </span>
            <Switch checked={staff.disponivel !== false} onCheckedChange={toggleDisponivel} aria-label="Disponível para vagas" />
          </label>

          <section className="pp-card" aria-labelledby="h-agora">
            <div className="flex items-center justify-between gap-2">
              <h2 id="h-agora" className="m-0 text-base font-bold">
                Precisa de você
              </h2>
              <span className="pp-num text-[13px]" style={{ color: "var(--pp-muted)" }}>
                {convites.length ? `${convites.length} convite${convites.length > 1 ? "s" : ""}` : "tudo respondido"}
              </span>
            </div>
            {convites.length === 0 ? (
              <p className="m-0 rounded-2xl border border-dashed p-5 text-center text-sm" style={{ borderColor: "var(--pp-line-strong)", color: "var(--pp-body)" }}>
                Nenhum convite esperando resposta. Avisamos quando chegar.
                {sugestoes.length > 0 && (
                  <>
                    {" "}
                    <button type="button" className={lnk} style={lnkStyle} onClick={() => irPara("vagas")}>
                      Ver vagas abertas
                    </button>
                  </>
                )}
              </p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {convites.map((a, i) => (
                  <article
                    key={a.id}
                    className={`pp-inv flex flex-col gap-2.5 rounded-2xl border bg-white p-3.5 ${saindo[a.id] ? "out" : ""}`}
                    style={{
                      borderColor: i === 0 ? "var(--pp-terracota)" : "var(--pp-line)",
                      boxShadow: i === 0 ? "0 0 0 3px rgba(217,144,90,.12)" : undefined,
                    }}
                  >
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="min-w-0">
                        <b className="block text-base">{a.job?.funcao || "Vaga"}</b>
                        <span className="block text-[13.5px]" style={{ color: "var(--pp-body)" }}>
                          {a.job?.supplier?.company_name}
                        </span>
                      </div>
                      <span className="pp-num whitespace-nowrap text-right text-lg font-extrabold">
                        {reais(a.job?.valor_turno)}
                        <small className="block text-[11.5px] font-medium" style={{ color: "var(--pp-muted)" }}>
                          por turno
                        </small>
                      </span>
                    </div>
                    <Fatos j={a.job} />
                    {confirmRecusa === a.id ? (
                      <div className="flex flex-col gap-2 rounded-xl p-3 text-[13.5px]" style={{ background: "var(--pp-rose-soft)" }}>
                        <span>Recusar este convite? O fornecedor é avisado e pode chamar outra pessoa.</span>
                        <div className="flex gap-2">
                          <button type="button" className={btnSec} style={secStyle} disabled={ocupado[a.id]} onClick={() => responder(a.id, "recusado")}>
                            Sim, recusar
                          </button>
                          <button type="button" className={`${btn} px-3`} style={{ color: "var(--pp-body)" }} onClick={() => setConfirmRecusa(null)}>
                            Voltar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button type="button" className={`${btnPri} flex-1`} style={priStyle} disabled={ocupado[a.id]} onClick={() => responder(a.id, "aceito")}>
                          Aceitar
                        </button>
                        <button type="button" className={btnSec} style={secStyle} onClick={() => setConfirmRecusa(a.id)}>
                          Recusar
                        </button>
                        <button type="button" className={`${btnSec} w-11`} style={{ ...secStyle, padding: 0, flex: "none" }} aria-label="Conversar com o fornecedor" onClick={() => setChatApp(a)}>
                          <MessageCircle className="h-[18px] w-[18px]" aria-hidden="true" />
                        </button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="pp-card" aria-labelledby="h-sugestoes">
            <div className="flex items-center justify-between gap-2">
              <h2 id="h-sugestoes" className="m-0 text-base font-bold">
                Vagas para você
              </h2>
              <button type="button" className={lnk} style={lnkStyle} onClick={() => irPara("vagas")}>
                Ver todas
              </button>
            </div>
            {sugestoes.length === 0 ? (
              <p className="m-0 text-sm" style={{ color: "var(--pp-body)" }}>
                Nenhuma vaga aberta com as suas funções e cidade agora. Quanto mais completo o perfil, mais convites você recebe.
              </p>
            ) : (
              <div className="pp-rail">
                {sugestoes.map((j) => (
                  <CardVagaAberta key={j.id} j={j} compacto />
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          {proximo ? (
            <section className="pp-next" aria-labelledby="h-prox">
              <span className="text-xs font-extrabold uppercase" style={{ letterSpacing: ".08em", color: "#cfe6dc" }}>
                Próximo evento
              </span>
              <h3 id="h-prox" className="m-0 text-[22px] font-bold" style={{ letterSpacing: "-0.03em", color: "#fff" }}>
                {proximo.job.funcao}
              </h3>
              <Fatos j={proximo.job} claro />
              <div className="text-[13.5px]" style={{ color: "#e3f0ea" }}>
                {proximo.job.supplier?.company_name}
                {proximo.job.observacoes ? ` · ${proximo.job.observacoes}` : ""}
              </div>
              {contagem && (
                <div className="pp-count pp-num flex gap-2" aria-label={`Faltam ${contagem.d} dias e ${contagem.h} horas`}>
                  {[
                    [contagem.d, "dias"],
                    [contagem.h, "horas"],
                    [contagem.m, "min"],
                  ].map(([v, l]) => (
                    <div key={l as string}>
                      <b className="block text-[22px] font-extrabold" style={{ letterSpacing: "-0.03em" }}>
                        {v}
                      </b>
                      <small className="text-[11px] uppercase" style={{ color: "#cfe6dc", letterSpacing: ".06em" }}>
                        {l}
                      </small>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <button type="button" className={`${btn} flex-1 bg-white`} style={{ color: "#2f5446" }} onClick={() => abrirWhats(proximo)}>
                  WhatsApp
                </button>
                <button
                  type="button"
                  className={`${btn} border text-white`}
                  style={{ background: "rgba(255,255,255,.14)", borderColor: "rgba(255,255,255,.3)" }}
                  onClick={() => setChatApp(proximo)}
                >
                  Conversar
                </button>
              </div>
            </section>
          ) : (
            <section className="pp-card" aria-labelledby="h-prox-vazio">
              <h2 id="h-prox-vazio" className="m-0 text-base font-bold">
                Próximo evento
              </h2>
              <p className="m-0 text-sm" style={{ color: "var(--pp-body)" }}>
                Nenhum evento confirmado. Quando você aceitar uma vaga, ela aparece aqui com horário, local e contato.
              </p>
            </section>
          )}

          <section className="pp-card" aria-labelledby="h-mes">
            <div className="flex items-center justify-between gap-2">
              <h2 id="h-mes" className="m-0 text-base font-bold">
                Seu mês
              </h2>
              <span className="text-[13px]" style={{ color: "var(--pp-muted)" }}>
                {new Date().toLocaleDateString("pt-BR", { month: "long" })}
              </span>
            </div>
            <div className="pp-num grid grid-cols-2 gap-2.5">
              <div className="rounded-[14px] p-3" style={{ background: "var(--pp-bg)" }}>
                <small className="block text-[12.5px]" style={{ color: "var(--pp-muted)" }}>
                  Turnos confirmados
                </small>
                <b className="text-[22px] font-extrabold">{doMes.length}</b>
              </div>
              <div className="rounded-[14px] p-3" style={{ background: "var(--pp-bg)" }}>
                <small className="block text-[12.5px]" style={{ color: "var(--pp-muted)" }}>
                  A receber (combinado)
                </small>
                <b className="text-[22px] font-extrabold">{reais(totalMes)}</b>
              </div>
            </div>
            <p className="m-0 text-[12.5px]" style={{ color: "var(--pp-muted)" }}>
              Soma dos valores de turno das vagas aceitas. O pagamento é combinado e feito direto com o fornecedor; a plataforma só registra o valor.
            </p>
          </section>

          <section className="pp-card" aria-labelledby="h-semana">
            <div className="flex items-center justify-between gap-2">
              <h2 id="h-semana" className="m-0 text-base font-bold">
                Sua semana
              </h2>
              <button type="button" className={lnk} style={lnkStyle} onClick={() => irPara("agenda")}>
                Agenda
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1.5 text-center">
              {semana.map((d) => (
                <Dia key={isoLocal(d)} data={isoLocal(d)} rotulo={letrasSemana[d.getDay()]} mostrarDia={d.getDate()} />
              ))}
            </div>
            <Legenda />
          </section>

          {paraAvaliar.length > 0 && (
            <section className="pp-card" aria-labelledby="h-avaliar">
              <h2 id="h-avaliar" className="m-0 text-base font-bold">
                Avaliar quem contratou
              </h2>
              <p className="m-0 text-sm" style={{ color: "var(--pp-body)" }}>
                Como foi trabalhar com <b>{paraAvaliar[0].job?.supplier?.company_name || "o fornecedor"}</b>
                {paraAvaliar[0].job?.data ? ` em ${dataBR(paraAvaliar[0].job.data, { day: "numeric", month: "short" })}` : ""}?
                {paraAvaliar.length > 1 ? ` (mais ${paraAvaliar.length - 1} para avaliar)` : ""}
              </p>
              <div className="flex gap-2" role="group" aria-label="Escolha uma nota">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`${btnSec} flex-1`}
                    style={{ ...secStyle, padding: 0 }}
                    aria-label={`${n} estrela${n > 1 ? "s" : ""}`}
                    onClick={() => abrirAvaliacao(paraAvaliar[0], n)}
                  >
                    <Star className="h-[18px] w-[18px]" style={{ color: "var(--pp-terracota)" }} aria-hidden="true" />
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );

  const minhas = applications.filter((a) => filtro === "todas" || grupoDa(a) === filtro);
  const telaVagas = (
    <div className="flex flex-col gap-4">
      <Titulo>Minhas vagas</Titulo>
      <div className="pp-rail" role="group" aria-label="Filtrar vagas" style={{ gap: 8 }}>
        {(
          [
            ["todas", "Todas"],
            ["confirmadas", "Confirmadas"],
            ["aguardando", "Aguardando"],
            ["encerradas", "Encerradas"],
          ] as const
        ).map(([k, l]) => (
          <button
            key={k}
            type="button"
            aria-pressed={filtro === k}
            onClick={() => setFiltro(k)}
            className="h-9 rounded-full border px-3.5 text-[13.5px] font-semibold"
            style={{
              flex: "none",
              background: filtro === k ? "var(--pp-ink)" : "#fff",
              color: filtro === k ? "#fff" : "var(--pp-ink)",
              borderColor: filtro === k ? "var(--pp-ink)" : "var(--pp-line-strong)",
            }}
          >
            {l}
          </button>
        ))}
      </div>

      {minhas.length === 0 ? (
        <p className="m-0 rounded-2xl border border-dashed p-5 text-center text-sm" style={{ borderColor: "var(--pp-line-strong)", color: "var(--pp-body)" }}>
          {filtro === "todas" ? "Você ainda não tem convites nem candidaturas. Veja as vagas abertas abaixo." : "Nada por aqui."}
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {minhas.map((a) => {
            const tag = statusTag(a);
            const encerrada = isEncerradaSemConclusao(a);
            return (
              <article key={a.id} className="pp-card gap-2.5" style={{ padding: 14, opacity: encerrada ? 0.75 : 1 }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <b className="block text-[15px]">{a.job?.funcao || "Vaga"}</b>
                    <span className="block truncate text-[13px]" style={{ color: "var(--pp-body)" }}>
                      {a.job?.supplier?.company_name}
                    </span>
                  </div>
                  <span className={`pp-st ${tag.tom}`}>{tag.label}</span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Fatos j={a.job} />
                  <span className="pp-num text-sm font-bold">{reais(a.job?.valor_turno)} por turno</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {a.status === "convidado" && !encerrada && (
                    <>
                      <button type="button" className={`${btnPri} h-10 text-sm`} style={priStyle} disabled={ocupado[a.id]} onClick={() => responder(a.id, "aceito")}>
                        Aceitar
                      </button>
                      {confirmRecusa === a.id ? (
                        <button type="button" className={`${btnSec} h-10 text-sm`} style={{ ...secStyle, background: "var(--pp-rose-soft)" }} onClick={() => responder(a.id, "recusado")}>
                          Confirmar recusa
                        </button>
                      ) : (
                        <button type="button" className={`${btnSec} h-10 text-sm`} style={secStyle} onClick={() => setConfirmRecusa(a.id)}>
                          Recusar
                        </button>
                      )}
                    </>
                  )}
                  {(a.status === "aceito" || a.status === "concluido") && !encerrada && (
                    <button type="button" className={`${btnSec} h-10 text-sm`} style={secStyle} onClick={() => abrirWhats(a)}>
                      WhatsApp
                    </button>
                  )}
                  {/* a conversa continua disponível mesmo com a vaga encerrada: o histórico é preservado */}
                  <button type="button" className={`${btnSec} h-10 text-sm`} style={secStyle} onClick={() => setChatApp(a)}>
                    Conversar
                  </button>
                  {a.status === "candidato" && !encerrada && (
                    <button type="button" className={`${btn} h-10 px-3 text-sm`} style={{ color: "var(--pp-body)" }} onClick={() => retirarCandidatura(a.id)}>
                      Retirar candidatura
                    </button>
                  )}
                  {a.status === "concluido" && !reviewsGiven[a.job_id] && (
                    <button type="button" className={`${btnPri} h-10 text-sm`} style={priStyle} onClick={() => abrirAvaliacao(a)}>
                      Avaliar fornecedor
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <section className="pp-card" aria-labelledby="h-abertas">
        <div className="flex items-center justify-between gap-2">
          <h2 id="h-abertas" className="m-0 text-base font-bold">
            Vagas abertas na sua região
          </h2>
          <span className="pp-num text-[13px]" style={{ color: "var(--pp-muted)" }}>
            {feedView.length} {feedView.length === 1 ? "vaga" : "vagas"}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--pp-muted)" }} aria-hidden="true" />
            <Input
              placeholder="Buscar por função, fornecedor ou cidade"
              value={feedBusca}
              onChange={(e) => setFeedBusca(e.target.value)}
              className="h-11 rounded-xl pl-9"
              aria-label="Buscar vagas"
            />
          </div>
          <select
            value={feedFuncao}
            onChange={(e) => setFeedFuncao(e.target.value)}
            className="h-11 rounded-xl border border-input bg-background px-3 text-sm"
            aria-label="Função"
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
            className="h-11 rounded-xl border border-input bg-background px-3 text-sm"
            aria-label="Ordenar"
          >
            <option value="data">Data mais próxima</option>
            <option value="valor_desc">Maior valor</option>
            <option value="valor_asc">Menor valor</option>
          </select>
        </div>
        {feedView.length === 0 ? (
          <p className="m-0 text-sm" style={{ color: "var(--pp-body)" }}>
            Nenhuma vaga aberta compatível no momento.{" "}
            <Link to="/vagas" className={lnk} style={lnkStyle}>
              Ver todas as vagas
            </Link>
          </p>
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-2">
            {feedView.map((j) => (
              <CardVagaAberta key={j.id} j={j} />
            ))}
          </div>
        )}
      </section>
    </div>
  );

  const ano = mesRef.getFullYear();
  const mes = mesRef.getMonth();
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();
  const vazioInicio = new Date(ano, mes, 1).getDay();
  const mesMinimo = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const telaAgenda = (
    <div className="flex flex-col gap-4">
      <Titulo>Agenda</Titulo>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <section className="pp-card" aria-labelledby="h-mesagenda">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              className="grid h-10 w-10 place-items-center rounded-full border bg-white disabled:opacity-40"
              style={{ borderColor: "var(--pp-line)" }}
              aria-label="Mês anterior"
              disabled={mesRef <= mesMinimo}
              onClick={() => setMesRef(new Date(ano, mes - 1, 1))}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <h2 id="h-mesagenda" className="m-0 text-base font-bold">
              {(() => {
                const t = mesRef.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
                return t.charAt(0).toUpperCase() + t.slice(1);
              })()}
            </h2>
            <button
              type="button"
              className="grid h-10 w-10 place-items-center rounded-full border bg-white"
              style={{ borderColor: "var(--pp-line)" }}
              aria-label="Próximo mês"
              onClick={() => setMesRef(new Date(ano, mes + 1, 1))}
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1.5 text-center">
            {letrasSemana.map((l, i) => (
              <span key={i} className="text-[11.5px] font-bold" style={{ color: "var(--pp-muted)" }}>
                {l}
              </span>
            ))}
            {Array.from({ length: vazioInicio }).map((_, i) => (
              <span key={`v${i}`} />
            ))}
            {Array.from({ length: diasNoMes }, (_, i) => {
              const iso = isoLocal(new Date(ano, mes, i + 1));
              return <Dia key={iso} data={iso} mostrarDia={i + 1} />;
            })}
          </div>
          <Legenda />
        </section>

        <div className="flex min-w-0 flex-col gap-4">
          <section className="pp-card" aria-labelledby="h-bloquear">
            <h2 id="h-bloquear" className="m-0 text-base font-bold">
              Bloquear um período
            </h2>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[13px]" style={{ color: "var(--pp-muted)" }}>
                Início
                <Input type="date" value={blockStart} min={hoje} onChange={(e) => setBlockStart(e.target.value)} className="mt-1 h-11 rounded-xl" />
              </label>
              <label className="text-[13px]" style={{ color: "var(--pp-muted)" }}>
                Fim (opcional)
                <Input
                  type="date"
                  value={blockEnd}
                  min={blockStart || hoje}
                  onChange={(e) => setBlockEnd(e.target.value)}
                  className="mt-1 h-11 rounded-xl"
                />
              </label>
            </div>
            <Input placeholder="Motivo (opcional)" value={blockMotivo} onChange={(e) => setBlockMotivo(e.target.value)} className="h-11 rounded-xl" />
            <button type="button" className={btnPri} style={priStyle} onClick={bloquearPeriodo} disabled={!blockStart}>
              Bloquear período
            </button>
            <p className="m-0 text-xs" style={{ color: "var(--pp-muted)" }}>
              Deixe o "Fim" vazio para bloquear só um dia. Aceitar uma vaga já bloqueia a data automaticamente.
            </p>
          </section>

          <section className="pp-card" aria-labelledby="h-bloqueios">
            <h2 id="h-bloqueios" className="m-0 text-base font-bold">
              Dias indisponíveis
            </h2>
            {unav.filter((u) => u.data >= hoje).length === 0 ? (
              <p className="m-0 text-sm" style={{ color: "var(--pp-body)" }}>
                Nenhum dia bloqueado.
              </p>
            ) : (
              <ul className="m-0 flex list-none flex-col gap-1 p-0 text-sm">
                {unav
                  .filter((u) => u.data >= hoje)
                  .map((u) => (
                    <li key={u.id} className="flex items-center justify-between gap-2">
                      <span>
                        <b className="pp-num">{dataBR(u.data)}</b>
                        <span style={{ color: "var(--pp-muted)" }}> · {u.motivo || "bloqueio manual"}</span>
                      </span>
                      <button type="button" className="h-10 px-2 text-sm font-bold" style={lnkStyle} onClick={() => desbloquear(u.id)}>
                        Liberar
                      </button>
                    </li>
                  ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );

  const telaPerfil = (
    <div className="flex flex-col gap-4">
      <Titulo>Perfil e avaliações</Titulo>
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-4">
          <section className="pp-card" aria-labelledby="h-perfil">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="h-perfil" className="m-0 text-base font-bold">
                Seu perfil
              </h2>
              <div className="flex gap-3">
                <Link to="/profissional/onboarding" className={lnk} style={lnkStyle}>
                  Editar
                </Link>
                {staff.slug && (
                  <Link to={`/profissional/${staff.slug}`} target="_blank" className={`${lnk} inline-flex items-center gap-1`} style={lnkStyle}>
                    Ver como os fornecedores veem <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative h-[72px] w-[72px] flex-none">
                <svg viewBox="0 0 72 72" className="h-[72px] w-[72px] -rotate-90" aria-hidden="true">
                  <circle cx="36" cy="36" r="31" fill="none" strokeWidth="8" stroke="var(--pp-bg)" />
                  <circle
                    className="pp-ring"
                    cx="36"
                    cy="36"
                    r="31"
                    fill="none"
                    strokeWidth="8"
                    strokeLinecap="round"
                    stroke="var(--pp-sage)"
                    strokeDasharray="195"
                    strokeDashoffset={195 - (195 * pctPerfil) / 100}
                  />
                </svg>
                <span className="pp-num absolute inset-0 grid place-items-center text-[17px] font-extrabold">{pctPerfil}%</span>
              </div>
              <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-[13.5px]">
                {passosPerfil.map((p) => (
                  <li key={p.label} className="flex items-center gap-2" style={{ color: p.ok ? "var(--pp-muted)" : "var(--pp-body)" }}>
                    <i
                      className="grid h-[18px] w-[18px] flex-none place-items-center rounded-full border-[1.5px] not-italic text-white"
                      style={{ background: p.ok ? "var(--pp-ok)" : "transparent", borderColor: p.ok ? "var(--pp-ok)" : "var(--pp-line-strong)" }}
                    >
                      {p.ok && <Check className="h-3 w-3" aria-hidden="true" />}
                    </i>
                    {p.ok ? (
                      p.label
                    ) : p.docs ? (
                      <button type="button" className="font-bold" style={lnkStyle} onClick={() => docsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}>
                        {p.label}
                      </button>
                    ) : (
                      <Link to="/profissional/onboarding" className="font-bold" style={lnkStyle}>
                        {p.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
            {pctPerfil < 100 && (
              <p className="m-0 text-[12.5px]" style={{ color: "var(--pp-muted)" }}>
                Perfil completo e verificado passa mais confiança e recebe mais convites.
              </p>
            )}
          </section>

          <section className="pp-card" aria-labelledby="h-recebidas">
            <div className="flex items-center justify-between gap-2">
              <h2 id="h-recebidas" className="m-0 text-base font-bold">
                Avaliações recebidas
              </h2>
              {staff.rating ? (
                <span className="pp-num text-[13px]" style={{ color: "var(--pp-muted)" }}>
                  {Number(staff.rating).toFixed(1).replace(".", ",")} · {staff.review_count}
                </span>
              ) : null}
            </div>
            {reviews.length === 0 ? (
              <p className="m-0 text-sm" style={{ color: "var(--pp-body)" }}>
                Ainda sem avaliações. Depois de cada evento concluído, o fornecedor pode te avaliar.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {reviews.map((r) => (
                  <div key={r.id}>
                    <div className="flex items-center gap-0.5" aria-label={`${r.estrelas} estrelas`}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className="h-4 w-4"
                          style={{ color: "var(--pp-terracota)", fill: i < r.estrelas ? "var(--pp-terracota)" : "transparent" }}
                          aria-hidden="true"
                        />
                      ))}
                    </div>
                    {r.comentario && <p className="m-0 mt-1 text-sm">"{r.comentario}"</p>}
                    <p className="m-0 mt-0.5 text-xs" style={{ color: "var(--pp-muted)" }}>
                      {new Date(r.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div ref={docsRef} className="flex min-w-0 scroll-mt-24 flex-col gap-4">
          <StaffDocumentsTab staff={staff} onChanged={load} />
          <button type="button" className={`${btnSec} self-start`} style={secStyle} onClick={() => irPara("ajuda")}>
            <LifeBuoy className="h-4 w-4" aria-hidden="true" /> Ajuda e suporte
          </button>
        </div>
      </div>
    </div>
  );

  const telaAjuda = (
    <div className="flex flex-col gap-4">
      <Titulo>Ajuda</Titulo>
      <AjudaTab origem="profissional" />
    </div>
  );

  const telas: Record<Destino, React.ReactNode> = {
    inicio: telaInicio,
    vagas: telaVagas,
    agenda: telaAgenda,
    perfil: telaPerfil,
    ajuda: telaAjuda,
  };

  const navBtn =
    "pp-nav-btn relative flex h-[42px] w-full items-center gap-3 rounded-[11px] px-3 text-left text-[15px] font-medium transition-colors hover:bg-white/60";

  return (
    <div className="painel-prof min-h-screen">
      <SEO title="Painel do profissional — Casamenteiro" noIndex />
      <WelcomeModal tipo="profissional" />

      <header className="sticky top-0 z-40 border-b backdrop-blur" style={{ background: "rgba(227,238,232,.92)", borderColor: "var(--pp-line)" }}>
        <div className="flex h-16 items-center justify-between gap-3 px-4 md:px-6">
          <Link to="/" className="text-[20px] font-extrabold" style={{ letterSpacing: "-0.03em", color: "var(--pp-ink)" }}>
            casamenteiro<span style={{ color: "var(--pp-terracota)" }}>.</span>
          </Link>
          <div className="flex items-center gap-2">
            {staff.slug && (
              <Link
                to={`/profissional/${staff.slug}`}
                target="_blank"
                className="hidden h-10 items-center gap-2 rounded-full border bg-white px-4 text-sm font-semibold sm:inline-flex"
                style={{ borderColor: "var(--pp-line-strong)", color: "var(--pp-ink)" }}
              >
                Ver meu perfil <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            )}
            <NotificationsBell />
            <UserMenu />
          </div>
        </div>
      </header>

      <div className="flex items-start">
        {/* menu lateral (computador) */}
        <div className="hidden w-[240px] shrink-0 self-stretch border-r md:block" style={{ background: "var(--pp-side)", borderColor: "var(--pp-line)" }}>
          <aside className="sticky top-16 flex h-[calc(100dvh-4rem)] flex-col gap-1.5 overflow-y-auto px-3 pb-4 pt-4" aria-label="Menu do profissional">
            <div className="mb-2 flex items-center gap-2.5 rounded-[14px] border bg-white p-2.5" style={{ borderColor: "var(--pp-line)" }}>
              {staff.foto_url ? (
                <img src={staff.foto_url} alt="" className="h-9 w-9 rounded-full object-cover" />
              ) : (
                <span
                  className="grid h-9 w-9 place-items-center rounded-full text-sm font-extrabold text-white"
                  style={{ background: "linear-gradient(135deg,#9fd3be,#4a7c6a)" }}
                  aria-hidden="true"
                >
                  {(staff.nome || "?")
                    .split(" ")
                    .map((p: string) => p[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </span>
              )}
              <span className="min-w-0">
                <b className="block truncate text-sm">{staff.nome}</b>
                <small className="block truncate text-xs" style={{ color: "var(--pp-muted)" }}>
                  {[(staff.funcoes || [])[0], staff.cidade].filter(Boolean).join(" · ")}
                </small>
              </span>
            </div>
            <nav className="flex flex-col gap-0.5" aria-label="Seções">
              {[...destinos, { key: "ajuda" as Destino, label: "Ajuda", curto: "Ajuda", icon: LifeBuoy }].map((it) => {
                const Icon = it.icon;
                const ativo = dest === it.key;
                return (
                  <button
                    key={it.key}
                    type="button"
                    onClick={() => irPara(it.key)}
                    aria-current={ativo ? "page" : undefined}
                    className={navBtn}
                    style={
                      ativo
                        ? { background: "#fff", color: "var(--pp-ink)", fontWeight: 650, boxShadow: "0 0 0 1px var(--pp-line)" }
                        : { color: "var(--pp-body)" }
                    }
                  >
                    <Icon className="h-[19px] w-[19px] shrink-0" strokeWidth={1.8} aria-hidden="true" />
                    <span className="flex-1 truncate">{it.label}</span>
                    {"badge" in it && it.badge ? (
                      <span className="pp-num grid h-5 min-w-[22px] place-items-center rounded-full px-1.5 text-xs font-bold text-white" style={{ background: "var(--pp-clay)" }}>
                        {it.badge}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </nav>
          </aside>
        </div>

        <main className="min-w-0 flex-1 px-4 pb-28 pt-5 md:px-7 md:pb-10 md:pt-7">
          <div key={dest} className="pp-enter mx-auto max-w-[1040px]">
            {telas[dest]}
          </div>
        </main>
      </div>

      {/* barra inferior (celular) */}
      <nav
        aria-label="Seções"
        className="fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur md:hidden"
        style={{ background: "rgba(255,255,255,.94)", borderColor: "var(--pp-line)", paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="grid grid-cols-4 px-1">
          {destinos.map((it) => {
            const Icon = it.icon;
            const ativo = dest === it.key || (it.key === "perfil" && dest === "ajuda");
            return (
              <button
                key={it.key}
                type="button"
                onClick={() => irPara(it.key)}
                aria-current={ativo ? "page" : undefined}
                className="relative flex h-[58px] flex-col items-center justify-center gap-1 text-[11px] font-semibold"
                style={{ color: ativo ? "var(--pp-sage-dark)" : "var(--pp-muted)" }}
              >
                <span className="relative">
                  <Icon className="h-[22px] w-[22px]" strokeWidth={1.8} aria-hidden="true" />
                  {it.badge ? (
                    <span
                      className="pp-num absolute -right-2.5 -top-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full px-1 text-[10px] font-bold text-white"
                      style={{ background: "var(--pp-clay)" }}
                    >
                      {it.badge}
                    </span>
                  ) : null}
                </span>
                <span>{it.curto}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {reviewApp && (
        <ReviewSupplierDialog
          open={!!reviewApp}
          onOpenChange={(v) => !v && setReviewApp(null)}
          jobId={reviewApp.job_id}
          supplierId={reviewApp.job?.supplier?.id}
          staffId={staff.id}
          supplierName={reviewApp.job?.supplier?.company_name}
          estrelasIniciais={reviewNota}
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
