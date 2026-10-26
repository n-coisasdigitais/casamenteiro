import { traduzirErro } from "@/lib/errorMessages";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { Textarea } from "@/components/ui/textarea";
import { Star, Trash2, Pencil, Mail, Wallet, AlertCircle, Search, PartyPopper, Check, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import QuoteConversation from "@/components/QuoteConversation";
import DashboardHeader from "@/components/DashboardHeader";
import DashboardNav from "@/components/DashboardNav";
import CouplePhotoUpload from "@/components/CouplePhotoUpload";
import { dueStatus } from "@/lib/taskDueDate";

type CoupleData = {
  id: string;
  partner_name: string | null;
  couple_role: string | null;
  wedding_date: string | null;
  wedding_city?: string | null;
  estimated_guests: number | null;
  estimated_budget: number | null;
  invite_code: string | null;
  onboarding_completed: boolean;
  needed_services?: string[] | null;
  header_photo_url?: string | null;
  header_quote?: string | null;
};

type Categoria = { id: string; name: string; slug: string };
type Situacao = "ok" | "wip" | "todo";
type LinhaCategoria = { cat: Categoria; situacao: Situacao; detalhe: string };

/** categorias mostradas quando o casal ainda não escolheu nenhuma */
const CATEGORIAS_PADRAO = ["espaco", "buffet", "fotografia", "decoracao", "musica-dj", "cerimonialista", "video", "vestido-noiva", "bolos-doces"];

/* ---------- ajudantes ---------- */
function isoLocal(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
const dataCurta = (iso: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }) =>
  new Date(iso + "T00:00:00").toLocaleDateString("pt-BR", opts).replace(/\./g, "");
const reais = (v: number) => "R$ " + Number(v || 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 });
const reaisCurto = (v: number) =>
  v >= 1000 ? `R$ ${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil` : reais(v);
function haQuanto(iso: string) {
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
  if (h < 1) return "agora";
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  return d === 1 ? "ontem" : `há ${d} dias`;
}
const iniciais = (s: string) =>
  (s || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
const CORES_LOGO = ["#c46a5e", "#d9905a", "#4a7c6a", "#a9551f", "#8a6a9e", "#5b7fa6"];

export default function CoupleDashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [couple, setCouple] = useState<CoupleData | null>(null);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [ultimaMsg, setUltimaMsg] = useState<Record<string, { sender_id: string; created_at: string }>>({});
  const [selectedQuote, setSelectedQuote] = useState<any>(null);
  const [threadOpen, setThreadOpen] = useState(false);
  const [tasks, setTasks] = useState<any[]>([]);
  const [saindo, setSaindo] = useState<Record<string, boolean>>({});
  const [guests, setGuests] = useState<{ total: number; confirmed: number }>({ total: 0, confirmed: 0 });
  const [budgetFinal, setBudgetFinal] = useState(0);
  const [coupleSuppliers, setCoupleSuppliers] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [pagamentos, setPagamentos] = useState<any[]>([]);
  const [simulacoes, setSimulacoes] = useState<any[]>([]);
  const [verTodasCats, setVerTodasCats] = useState(false);
  const [verTodosPedidos, setVerTodosPedidos] = useState(false);
  const [barras, setBarras] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const [avOpen, setAvOpen] = useState(false);
  const [avRating, setAvRating] = useState(5);
  const [avComentario, setAvComentario] = useState("");
  const [avSalvando, setAvSalvando] = useState(false);
  const [avEnviada, setAvEnviada] = useState(false);

  const [coverOpen, setCoverOpen] = useState(false);
  const [coverPhoto, setCoverPhoto] = useState<string | null>(null);
  const [coverQuote, setCoverQuote] = useState<string>("");
  const [savingCover, setSavingCover] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("couples")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        if (!data.onboarding_completed) {
          navigate("/onboarding");
          return;
        }
        setCouple(data as any);
        setCoverPhoto(data.header_photo_url || null);
        setCoverQuote(data.header_quote || "");
        loadDashboardData(data.id);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, navigate]);

  const loadDashboardData = async (coupleId: string) => {
    const [quotesRes, tasksRes, guestsRes, budgetRes, csRes, catRes, payRes, simRes] = await Promise.all([
      supabase
        .from("quotes")
        .select("*, supplier:suppliers(id, company_name, category_id)")
        .eq("couple_id", coupleId)
        .order("created_at", { ascending: false }),
      supabase
        .from("wedding_tasks")
        .select("id, title, due_date, is_completed, sort_order, created_at, seeded_as_backlog")
        .eq("couple_id", coupleId),
      supabase.from("wedding_guests").select("id, rsvp_status").eq("couple_id", coupleId),
      supabase.from("budget_items").select("final_cost").eq("couple_id", coupleId),
      supabase
        .from("couple_suppliers")
        .select("id, category_id, kanban_status, status, is_external, external_supplier_name, supplier:suppliers(company_name)")
        .eq("couple_id", coupleId),
      supabase.from("categories").select("id, name, slug").eq("active", true).order("name"),
      (supabase.from("budget_payments" as any) as any)
        .select("id, amount, due_date, status, description, item:budget_items(description, category)")
        .eq("couple_id", coupleId)
        .neq("status", "paid")
        .not("due_date", "is", null)
        .order("due_date", { ascending: true })
        .limit(6),
      (supabase.from("home_simulacoes" as any) as any)
        .select("*")
        .or(`couple_id.eq.${coupleId},user_id.eq.${user?.id}`)
        .order("criado_em", { ascending: false }),
    ]);

    const qs = quotesRes.data || [];
    setQuotes(qs);
    setTasks(tasksRes.data || []);
    const allGuests = guestsRes.data || [];
    setGuests({ total: allGuests.length, confirmed: allGuests.filter((g) => g.rsvp_status === "confirmed").length });
    setBudgetFinal((budgetRes.data || []).reduce((s, b) => s + Number(b.final_cost || 0), 0));
    setCoupleSuppliers(csRes.data || []);
    setCategorias((catRes.data || []) as Categoria[]);
    setPagamentos(((payRes as any).data || []) as any[]);
    setSimulacoes((simRes as any).data || []);

    // última mensagem de cada pedido: se não foi o casal que mandou, o fornecedor está esperando resposta
    if (qs.length) {
      const { data: msgs } = await supabase
        .from("quote_messages")
        .select("quote_id, sender_id, created_at")
        .in(
          "quote_id",
          qs.map((q: any) => q.id),
        )
        .order("created_at", { ascending: false });
      const mapa: Record<string, { sender_id: string; created_at: string }> = {};
      (msgs || []).forEach((m: any) => {
        if (!mapa[m.quote_id]) mapa[m.quote_id] = m;
      });
      setUltimaMsg(mapa);
    }
    setTimeout(() => setBarras(true), 150);
  };

  const concluirTarefa = async (id: string) => {
    setSaindo((s) => ({ ...s, [id]: true }));
    const { error } = await supabase
      .from("wedding_tasks")
      .update({ is_completed: true, completed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      setSaindo((s) => ({ ...s, [id]: false }));
      return toast({ title: "Erro", description: traduzirErro(error), variant: "destructive" });
    }
    setTimeout(() => setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, is_completed: true } : t))), 350);
    toast({ title: "Tarefa concluída" });
  };

  const enviarAvaliacaoPlataforma = async () => {
    if (!user) return;
    setAvSalvando(true);
    const { error } = await (supabase.from("platform_reviews" as any).insert({
      user_id: user.id,
      couple_id: couple?.id ?? null,
      autor_nome: profile?.full_name ?? null,
      rating: avRating,
      comentario: avComentario.trim() || null,
    }) as any);
    setAvSalvando(false);
    if (error) {
      toast({ title: "Erro", description: "Não foi possível enviar sua avaliação.", variant: "destructive" });
      return;
    }
    toast({ title: "Obrigado!", description: "Sua avaliação será publicada após revisão." });
    setAvOpen(false);
    setAvEnviada(true);
    setAvComentario("");
  };

  const copyInviteCode = () => {
    if (!couple?.invite_code) return;
    navigator.clipboard.writeText(couple.invite_code);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
    toast({ title: "Código copiado!", description: "Compartilhe com seu(sua) parceiro(a)." });
  };

  const abrirPedido = (q: any) => {
    setSelectedQuote(q);
    setThreadOpen(true);
  };

  /* ---------- dados derivados ---------- */
  const hoje = isoLocal(new Date());
  const em7dias = isoLocal(new Date(Date.now() + 7 * 864e5));

  const categoriaPorId = useMemo(() => new Map(categorias.map((c) => [c.id, c])), [categorias]);

  /** Fornecedores por categoria: contratado, em orçamento ou faltando. */
  const linhasCategorias: LinhaCategoria[] = useMemo(() => {
    const ids: string[] = [];
    const add = (id?: string | null) => {
      if (id && categoriaPorId.has(id) && !ids.includes(id)) ids.push(id);
    };
    coupleSuppliers.forEach((cs) => add(cs.category_id));
    (couple?.needed_services || []).forEach((id) => add(id));
    quotes.forEach((q) => add(q.supplier?.category_id));
    if (ids.length === 0) CATEGORIAS_PADRAO.forEach((slug) => add(categorias.find((c) => c.slug === slug)?.id));

    const linhas = ids.map((id): LinhaCategoria => {
      const cat = categoriaPorId.get(id)!;
      const doCat = coupleSuppliers.filter((cs) => cs.category_id === id);
      const contratado = doCat.find(
        (cs) => cs.kanban_status === "contratado" || cs.status === "contracted" || cs.kanban_status === "fora_da_plataforma",
      );
      if (contratado) {
        const nome = contratado.supplier?.company_name || contratado.external_supplier_name || "Fornecedor";
        return { cat, situacao: "ok", detalhe: `${nome} · ${contratado.kanban_status === "fora_da_plataforma" ? "fora da plataforma" : "contratado"}` };
      }
      const emAndamento = doCat.filter((cs) => cs.kanban_status === "em_orcamento" || cs.kanban_status === "negociando").length;
      const pedidos = quotes.filter((q) => q.supplier?.category_id === id && !["rejected", "cancelled"].includes(q.status));
      const n = Math.max(emAndamento, pedidos.length);
      if (n > 0) {
        const respondidos = pedidos.filter((q) => q.status === "answered" || (ultimaMsg[q.id] && ultimaMsg[q.id].sender_id !== user?.id)).length;
        return {
          cat,
          situacao: "wip",
          detalhe: `${n} ${n === 1 ? "orçamento" : "orçamentos"}${respondidos ? ` · ${respondidos} ${respondidos === 1 ? "respondido" : "respondidos"}` : ""}`,
        };
      }
      return { cat, situacao: "todo", detalhe: "Nenhum pedido ainda" };
    });
    const ordem: Record<Situacao, number> = { ok: 0, wip: 1, todo: 2 };
    return linhas.sort((a, b) => ordem[a.situacao] - ordem[b.situacao]);
  }, [coupleSuppliers, couple, quotes, categorias, categoriaPorId, ultimaMsg, user]);

  const contratados = linhasCategorias.filter((l) => l.situacao === "ok").length;
  const faltam = linhasCategorias.length - contratados;

  const pendentes = tasks.filter((t) => !t.is_completed);
  // mesma regra da tela de Tarefas: só é atrasada se venceu depois que o casal começou a usar
  const estaAtrasada = (t: any) =>
    dueStatus(t.due_date ? new Date(t.due_date) : null, !!t.is_completed, { createdAt: t.created_at ?? null, seededAsBacklog: !!t.seeded_as_backlog }) === "overdue";
  const atrasadas = pendentes.filter(estaAtrasada);
  const tarefasSemana = [...pendentes]
    .sort((a, b) => {
      const da = a.due_date || "9999-12-31";
      const db = b.due_date || "9999-12-31";
      if (da !== db) return da > db ? 1 : -1;
      return (a.sort_order ?? 0) - (b.sort_order ?? 0);
    })
    .slice(0, 3);
  const tarefasFeitas = tasks.length - pendentes.length;

  const aguardandoVoces = quotes.filter(
    (q) =>
      !["accepted", "rejected", "cancelled"].includes(q.status) && ultimaMsg[q.id] && ultimaMsg[q.id].sender_id !== user?.id,
  );
  const statusPedido = (q: any): { label: string; tom: "new" | "wait" | "ok" | "off" } => {
    if (q.status === "accepted") return { label: "Contratado", tom: "ok" };
    if (q.status === "rejected") return { label: "Recusado", tom: "off" };
    if (q.status === "cancelled") return { label: "Cancelado", tom: "off" };
    if (aguardandoVoces.some((x) => x.id === q.id)) return { label: "Nova resposta", tom: "new" };
    if (q.status === "answered") return { label: "Respondido", tom: "wait" };
    if (q.status === "viewed") return { label: "Visualizado", tom: "wait" };
    return { label: "Enviado", tom: "wait" };
  };

  const pagamentoProximo = pagamentos.find((p) => p.due_date <= em7dias);

  if (!couple)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Carregando...</p>
      </div>
    );

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
      toast({ title: "Erro ao salvar", description: traduzirErro(error), variant: "destructive" });
      return;
    }
    setCouple({ ...couple, header_photo_url: photo || null, header_quote: quote || null } as CoupleData);
    setCoverPhoto(photo || null);
    setCoverQuote(quote || "");
    toast({ title: "Capa atualizada!" });
  };

  const daysUntilWedding = couple.wedding_date
    ? Math.ceil((new Date(couple.wedding_date + "T00:00:00").getTime() - Date.now()) / 864e5)
    : null;
  const cidade = couple.wedding_city || "";
  const linkBusca = (slug: string) => `/buscar?cat=${slug}${cidade ? `&loc=${encodeURIComponent(cidade)}` : ""}`;

  const budgetPct =
    couple.estimated_budget && couple.estimated_budget > 0 ? Math.round((budgetFinal / couple.estimated_budget) * 100) : 0;
  const guestBase = guests.total || couple.estimated_guests || 0;
  const guestPct = guestBase > 0 ? Math.round((guests.confirmed / guestBase) * 100) : 0;
  const taskPct = tasks.length > 0 ? Math.round((tarefasFeitas / tasks.length) * 100) : 0;
  const fornPct = linhasCategorias.length > 0 ? Math.round((contratados / linhasCategorias.length) * 100) : 0;

  /* ---------- próximo passo: uma ação só, por ordem de prioridade ---------- */
  type Passo = { icone: any; titulo: string; texto: string; acao: string; onClick?: () => void; to?: string };
  const primeiraFaltando = linhasCategorias.find((l) => l.situacao === "todo");
  const passo: Passo | null = aguardandoVoces[0]
    ? {
        icone: Mail,
        titulo: `${aguardandoVoces[0].supplier?.company_name || "Um fornecedor"} respondeu seu pedido`,
        texto: `${categoriaPorId.get(aguardandoVoces[0].supplier?.category_id)?.name || "Orçamento"} · responder rápido ajuda a garantir a data.`,
        acao: "Ver",
        onClick: () => abrirPedido(aguardandoVoces[0]),
      }
    : pagamentoProximo
      ? {
          icone: Wallet,
          titulo: `Pagamento de ${reais(Number(pagamentoProximo.amount))} ${pagamentoProximo.due_date < hoje ? "atrasado" : `vence ${dataCurta(pagamentoProximo.due_date)}`}`,
          texto: pagamentoProximo.item?.description || pagamentoProximo.description || "Parcela cadastrada no seu orçamento.",
          acao: "Ver",
          to: "/orcamento",
        }
      : atrasadas[0]
        ? {
            icone: AlertCircle,
            titulo: atrasadas[0].title,
            texto: `Tarefa atrasada desde ${dataCurta(atrasadas[0].due_date)}.`,
            acao: "Tarefas",
            to: "/tarefas",
          }
        : primeiraFaltando
          ? {
              icone: Search,
              titulo: `Peça orçamentos de ${primeiraFaltando.cat.name.toLowerCase()}`,
              texto: cidade ? `Fornecedores que atendem ${cidade}.` : "Compare preços e disponibilidade para a sua data.",
              acao: "Buscar",
              to: linkBusca(primeiraFaltando.cat.slug),
            }
          : null;

  const nomes = `${profile?.full_name?.split(" ")[0] || "Casal"}${couple.partner_name ? ` & ${couple.partner_name.split(" ")[0]}` : ""}`;
  const pedidosVisiveis = verTodosPedidos ? quotes : quotes.slice(0, 3);
  const catsVisiveis = verTodasCats ? linhasCategorias : linhasCategorias.slice(0, 5);

  const tituloSecao = "m-0 text-base font-bold";
  const lnk = "text-sm font-bold whitespace-nowrap";
  const lnkStyle = { color: "var(--ca-clay)" };

  const Indicador = ({ titulo, valor, de, pct, rodape, to, alerta }: { titulo: string; valor: string | number; de?: string; pct: number; rodape: React.ReactNode; to: string; alerta?: boolean }) => (
    <Link to={to} className="ca-stat ca-card gap-1.5" style={{ padding: 14 }}>
      <small className="text-[12.5px] font-semibold" style={{ color: "var(--ca-muted)" }}>
        {titulo}
      </small>
      <b className="ca-num text-[22px] font-extrabold" style={{ letterSpacing: "-0.03em", color: "var(--ca-ink)" }}>
        {valor}
        {de && (
          <span className="text-sm font-semibold" style={{ color: "var(--ca-muted)" }}>
            {" "}
            {de}
          </span>
        )}
      </b>
      <div className="ca-bar">
        <i style={{ width: barras ? `${Math.min(100, pct)}%` : 0, background: alerta ? "var(--ca-warn)" : undefined }} />
      </div>
      <span className="text-xs" style={{ color: "var(--ca-body)" }}>
        {rodape}
      </span>
    </Link>
  );

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <DashboardNav />

      <main className="ca-enter mx-auto flex max-w-[1080px] flex-col gap-4 px-4 pb-10 pt-4 md:px-7 md:pt-6">
        {/* capa (clara) */}
        <section className="ca-hero flex items-stretch gap-4 p-[18px] md:p-6" aria-labelledby="nomes-casal">
          <div className="flex min-w-0 flex-1 flex-col justify-end gap-1.5">
            <span className="text-xs font-extrabold uppercase" style={{ letterSpacing: ".08em", color: "var(--ca-clay)" }}>
              Meu casamento
            </span>
            <h1 id="nomes-casal" className="ca-serif m-0 text-[30px] md:text-[40px]" style={{ letterSpacing: "-0.02em", lineHeight: 1.1, color: "var(--ca-ink)" }}>
              {nomes}
            </h1>
            {couple.header_quote && (
              <p className="m-0 text-sm italic" style={{ color: "var(--ca-body)" }}>
                "{couple.header_quote}"
              </p>
            )}
            <div className="ca-num flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm" style={{ color: "var(--ca-body)" }}>
              {daysUntilWedding !== null && daysUntilWedding > 0 && (
                <span>
                  <b className="text-[22px] font-extrabold" style={{ letterSpacing: "-0.03em", color: "var(--ca-clay)" }}>
                    {daysUntilWedding}
                  </b>{" "}
                  {daysUntilWedding === 1 ? "dia" : "dias"}
                </span>
              )}
              {daysUntilWedding === 0 && <b style={{ color: "var(--ca-clay)" }}>É hoje!</b>}
              <span>
                {couple.wedding_date
                  ? dataCurta(couple.wedding_date, { weekday: "short", day: "numeric", month: "long", year: "numeric" })
                  : "Data a definir"}
                {cidade ? ` · ${cidade}` : ""}
              </span>
            </div>
          </div>
          {couple.header_photo_url && (
            <img
              src={couple.header_photo_url}
              alt="Foto do casal"
              className="hidden h-auto w-[200px] shrink-0 rounded-2xl object-cover sm:block"
              style={{ maxHeight: 170 }}
            />
          )}
          <button
            type="button"
            onClick={() => setCoverOpen(true)}
            className="absolute right-3 top-3 inline-flex h-[34px] items-center gap-1.5 rounded-full border bg-white/80 px-3 text-[12.5px] font-bold backdrop-blur"
            style={{ borderColor: "var(--ca-line-strong)", color: "var(--ca-ink)" }}
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Capa
          </button>
        </section>

        {/* próximo passo */}
        {passo ? (
          <section className="ca-next ca-card flex-row items-center gap-3.5" aria-labelledby="h-passo">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px]" style={{ background: "var(--ca-rose-soft)", color: "var(--ca-clay)" }}>
              <passo.icone className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <small className="block text-xs font-extrabold uppercase" style={{ letterSpacing: ".06em", color: "var(--ca-clay)" }}>
                Próximo passo
              </small>
              <b id="h-passo" className="mt-0.5 block text-base" style={{ letterSpacing: "-0.01em" }}>
                {passo.titulo}
              </b>
              <span className="mt-0.5 block text-[13.5px]" style={{ color: "var(--ca-body)" }}>
                {passo.texto}
              </span>
            </span>
            {passo.to ? (
              <Link to={passo.to} className="ca-pill pri shrink-0">
                {passo.acao}
              </Link>
            ) : (
              <button type="button" onClick={passo.onClick} className="ca-pill pri shrink-0">
                {passo.acao}
              </button>
            )}
          </section>
        ) : (
          <section className="ca-card flex-row items-center gap-3.5">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px]" style={{ background: "var(--ca-sage-soft)", color: "var(--ca-ok)" }}>
              <PartyPopper className="h-5 w-5" aria-hidden="true" />
            </span>
            <span>
              <b className="block text-base">Tudo em dia!</b>
              <span className="text-[13.5px]" style={{ color: "var(--ca-body)" }}>
                Nenhuma resposta, pagamento ou tarefa esperando vocês agora.
              </span>
            </span>
          </section>
        )}

        {/* quatro indicadores, cada um leva para a sua tela */}
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          <Indicador titulo="Fornecedores" valor={contratados} de={`de ${linhasCategorias.length}`} pct={fornPct} rodape="contratados" to="/meus-fornecedores" />
          <Indicador
            titulo="Orçamento"
            valor={`${budgetPct}%`}
            pct={budgetPct}
            alerta={budgetPct > 100}
            rodape={couple.estimated_budget ? `${reaisCurto(budgetFinal)} de ${reaisCurto(couple.estimated_budget)}` : "defina o valor total"}
            to="/orcamento"
          />
          <Indicador
            titulo="Tarefas"
            valor={tarefasFeitas}
            de={`de ${tasks.length}`}
            pct={taskPct}
            rodape={
              atrasadas.length ? (
                <span className="font-bold" style={{ color: "var(--ca-err)" }}>
                  {atrasadas.length} {atrasadas.length === 1 ? "atrasada" : "atrasadas"}
                </span>
              ) : (
                "concluídas"
              )
            }
            to="/tarefas"
          />
          <Indicador titulo="Convidados" valor={guests.confirmed} de={`de ${guestBase}`} pct={guestPct} rodape="confirmados" to="/convidados" />
        </div>

        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
          <div className="flex min-w-0 flex-col gap-4">
            {/* fornecedores por categoria */}
            <section className="ca-card" aria-labelledby="h-forn">
              <div className="flex items-center justify-between gap-2">
                <h2 id="h-forn" className={tituloSecao}>
                  Seus fornecedores
                </h2>
                <span className="text-[13px]" style={{ color: "var(--ca-muted)" }}>
                  {faltam > 0 ? `faltam ${faltam}` : "tudo contratado"}
                </span>
              </div>
              <div className="flex flex-col">
                {catsVisiveis.map((l) => (
                  <div key={l.cat.id} className="ca-row flex items-center gap-3 py-2.5">
                    <span
                      className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[10px] text-sm font-extrabold"
                      style={
                        l.situacao === "ok"
                          ? { background: "var(--ca-sage-soft)", color: "var(--ca-ok)" }
                          : l.situacao === "wip"
                            ? { background: "var(--ca-amber-soft)", color: "var(--ca-warn)" }
                            : { background: "var(--ca-bg)", border: "1.5px dashed var(--ca-line-strong)" }
                      }
                      aria-hidden="true"
                    >
                      {l.situacao === "ok" ? <Check className="h-4 w-4" /> : l.situacao === "wip" ? "…" : ""}
                    </span>
                    <span className="min-w-0 flex-1">
                      <b className="block text-[14.5px]">{l.cat.name}</b>
                      <span className="block truncate text-[12.5px]" style={{ color: "var(--ca-body)" }}>
                        {l.detalhe}
                      </span>
                    </span>
                    {l.situacao === "todo" ? (
                      <Link to={linkBusca(l.cat.slug)} className="ca-pill pri">
                        Buscar
                      </Link>
                    ) : (
                      <Link to="/meus-fornecedores" className="ca-pill">
                        Ver
                      </Link>
                    )}
                  </div>
                ))}
              </div>
              {linhasCategorias.length > 5 && (
                <button type="button" className={`${lnk} self-start`} style={lnkStyle} onClick={() => setVerTodasCats((v) => !v)}>
                  {verTodasCats ? "Mostrar menos" : `Ver as outras ${linhasCategorias.length - 5} categorias`}
                </button>
              )}
            </section>

            {/* pedidos de orçamento */}
            <section className="ca-card" aria-labelledby="h-pedidos">
              <div className="flex items-center justify-between gap-2">
                <h2 id="h-pedidos" className={tituloSecao}>
                  Pedidos de orçamento
                </h2>
                {quotes.length > 3 && (
                  <button type="button" className={lnk} style={lnkStyle} onClick={() => setVerTodosPedidos((v) => !v)}>
                    {verTodosPedidos ? "Mostrar menos" : `Ver todos (${quotes.length})`}
                  </button>
                )}
              </div>
              {quotes.length === 0 ? (
                <p className="m-0 text-sm" style={{ color: "var(--ca-body)" }}>
                  Vocês ainda não pediram orçamentos.{" "}
                  <Link to="/buscar" className={lnk} style={lnkStyle}>
                    Buscar fornecedores
                  </Link>
                </p>
              ) : (
                <div className="flex flex-col">
                  {pedidosVisiveis.map((q, i) => {
                    const st = statusPedido(q);
                    const nome = q.supplier?.company_name || "Fornecedor";
                    const cat = categoriaPorId.get(q.supplier?.category_id)?.name;
                    const ultima = ultimaMsg[q.id];
                    return (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => abrirPedido(q)}
                        className="ca-row flex w-full items-center gap-3 py-2.5 text-left"
                      >
                        <span
                          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm font-extrabold text-white"
                          style={{ background: CORES_LOGO[i % CORES_LOGO.length] }}
                          aria-hidden="true"
                        >
                          {iniciais(nome)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <b className="block truncate text-[14.5px]">{nome}</b>
                          <span className="block truncate text-[12.5px]" style={{ color: "var(--ca-body)" }}>
                            {[cat, st.tom === "new" && ultima ? `respondeu ${haQuanto(ultima.created_at)}` : `enviado ${haQuanto(q.created_at)}`]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        </span>
                        <span className={`ca-st ${st.tom}`}>{st.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          <div className="flex min-w-0 flex-col gap-4">
            {/* tarefas */}
            <section className="ca-card" aria-labelledby="h-tarefas">
              <div className="flex items-center justify-between gap-2">
                <h2 id="h-tarefas" className={tituloSecao}>
                  Próximas tarefas
                </h2>
                <Link to="/tarefas" className={lnk} style={lnkStyle}>
                  Todas as tarefas
                </Link>
              </div>
              {tarefasSemana.length === 0 ? (
                <p className="m-0 text-sm" style={{ color: "var(--ca-body)" }}>
                  Nenhuma tarefa pendente. 🎉
                </p>
              ) : (
                <div className="flex flex-col">
                  {tarefasSemana.map((t) => {
                    const atrasada = estaAtrasada(t);
                    return (
                      <div key={t.id} className={`ca-row ca-task flex items-center gap-3 py-2.5 ${saindo[t.id] ? "out" : ""}`}>
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={!!saindo[t.id]}
                          aria-label={`Concluir: ${t.title}`}
                          onClick={() => !saindo[t.id] && concluirTarefa(t.id)}
                          className="grid h-6 w-6 shrink-0 place-items-center rounded-lg border-[1.5px] text-white transition-colors"
                          style={saindo[t.id] ? { background: "var(--ca-ok)", borderColor: "var(--ca-ok)" } : { borderColor: "var(--ca-line-strong)", background: "#fff" }}
                        >
                          {saindo[t.id] && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                        </button>
                        <span className="min-w-0 flex-1 text-[14.5px]">
                          {t.title}
                          {t.due_date && (
                            <small
                              className="block text-[12.5px]"
                              style={atrasada ? { color: "var(--ca-err)", fontWeight: 700 } : { color: "var(--ca-muted)" }}
                            >
                              {atrasada ? `atrasada · era para ${dataCurta(t.due_date)}` : `até ${dataCurta(t.due_date, { weekday: "short", day: "numeric", month: "short" })}`}
                            </small>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* pagamentos */}
            {pagamentos.length > 0 && (
              <section className="ca-card" aria-labelledby="h-pag">
                <div className="flex items-center justify-between gap-2">
                  <h2 id="h-pag" className={tituloSecao}>
                    Próximos pagamentos
                  </h2>
                  <Link to="/orcamento" className={lnk} style={lnkStyle}>
                    Ver todos
                  </Link>
                </div>
                <div className="flex flex-col">
                  {pagamentos.slice(0, 3).map((p) => {
                    const atrasado = p.due_date < hoje;
                    return (
                      <div key={p.id} className="ca-row ca-num flex items-center gap-3 py-2.5">
                        <span className="w-11 shrink-0 rounded-xl py-1.5 text-center" style={{ background: atrasado ? "var(--ca-rose-soft)" : "var(--ca-bg)" }}>
                          <b className="block text-[17px] leading-none" style={{ color: atrasado ? "var(--ca-err)" : undefined }}>
                            {new Date(p.due_date + "T00:00:00").getDate()}
                          </b>
                          <small className="text-[10.5px] font-bold uppercase" style={{ color: "var(--ca-muted)" }}>
                            {dataCurta(p.due_date, { month: "short" })}
                          </small>
                        </span>
                        <span className="min-w-0 flex-1 text-sm">
                          <span className="block truncate">{p.item?.description || p.description || "Pagamento"}</span>
                          <small className="block text-[12.5px]" style={atrasado ? { color: "var(--ca-err)", fontWeight: 700 } : { color: "var(--ca-muted)" }}>
                            {atrasado ? "atrasado" : p.item?.category || p.description || "parcela"}
                          </small>
                        </span>
                        <span className="whitespace-nowrap font-extrabold">{reais(Number(p.amount))}</span>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* simulações (recolhido) */}
            <details className="ca-ex">
              <summary>
                Simulações
                <span className="ml-auto mr-2.5 text-[13px] font-medium" style={{ color: "var(--ca-muted)" }}>
                  {simulacoes.length}
                </span>
              </summary>
              <div className="flex flex-col gap-2.5 pb-4">
                {simulacoes.length === 0 && (
                  <p className="m-0 text-sm" style={{ color: "var(--ca-body)" }}>
                    Faça uma simulação para descobrir os melhores fornecedores para o seu orçamento.
                  </p>
                )}
                {simulacoes.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-2 rounded-xl px-3 py-2.5" style={{ background: "var(--ca-bg)" }}>
                    <button type="button" className="min-w-0 flex-1 text-left" onClick={() => navigate(`/simulador/resultado?id=${s.id}`)}>
                      <b className="text-sm">
                        {s.cidade || "Sua cidade"} · {s.num_convidados} convidados
                      </b>
                      {s.is_active_plan && (
                        <span className="ml-1.5 rounded-full px-2 py-0.5 text-[11px] font-extrabold" style={{ background: "var(--ca-sage-soft)", color: "var(--ca-ok)" }}>
                          Plano ativo
                        </span>
                      )}
                      <span className="block text-xs" style={{ color: "var(--ca-body)" }}>
                        {reais(Number(s.orcamento_total))} · {s.estilo || "—"} · {new Date(s.criado_em).toLocaleDateString("pt-BR")}
                      </span>
                    </button>
                    <div className="flex shrink-0 items-center gap-0.5">
                      {!s.is_active_plan && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9"
                          style={{ color: "var(--ca-ok)" }}
                          title="Tornar este o plano ativo"
                          aria-label="Tornar este o plano ativo"
                          onClick={async () => {
                            if (!couple?.id) return;
                            if (
                              !window.confirm(
                                "Tornar esta simulação o seu plano ativo? A anterior deixará de ser marcada como ativa, mas seus fornecedores em andamento permanecem no Kanban e devem ser descartados manualmente, se desejar.",
                              )
                            )
                              return;
                            await (supabase.from("home_simulacoes" as any) as any)
                              .update({ is_active_plan: false })
                              .or(`couple_id.eq.${couple.id},user_id.eq.${user?.id}`);
                            const { data: upd, error } = await (supabase.from("home_simulacoes" as any) as any)
                              .update({ is_active_plan: true, couple_id: couple.id })
                              .eq("id", s.id)
                              .select();
                            if (error || !upd || upd.length === 0) {
                              toast({
                                title: "Erro",
                                description: traduzirErro(error) || "Não foi possível atualizar (verifique permissões).",
                                variant: "destructive",
                              });
                              return;
                            }
                            setSimulacoes((prev) => prev.map((x) => ({ ...x, is_active_plan: x.id === s.id })));
                            toast({ title: "Plano ativo atualizado" });
                          }}
                        >
                          <Star className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-destructive hover:text-destructive"
                        title="Excluir simulação"
                        aria-label="Excluir simulação"
                        onClick={async () => {
                          const msg = s.is_active_plan
                            ? "Esta é a simulação que virou seu PLANO ATIVO. Ao excluir, apenas a simulação será removida — seus fornecedores em orçamento, negociação ou contratados continuam no Kanban e devem ser descartados manualmente lá. Continuar?"
                            : "Excluir esta simulação? Esta ação não pode ser desfeita.";
                          if (!window.confirm(msg)) return;
                          const { error } = await (supabase.from("home_simulacoes" as any) as any).delete().eq("id", s.id);
                          if (error) {
                            toast({ title: "Erro ao excluir", description: traduzirErro(error), variant: "destructive" });
                            return;
                          }
                          setSimulacoes((prev) => prev.filter((x) => x.id !== s.id));
                          toast({ title: "Simulação excluída" });
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                <Link to="/#simulador" className="ca-pill self-start">
                  Nova simulação
                </Link>
              </div>
            </details>

            {/* planejar a dois (recolhido) */}
            {couple.invite_code && (
              <details className="ca-ex">
                <summary>
                  Planejar a dois
                  <span className="ml-auto mr-2.5 text-[13px] font-medium" style={{ color: "var(--ca-muted)" }}>
                    código
                  </span>
                </summary>
                <div className="flex flex-col gap-2.5 pb-4 text-sm" style={{ color: "var(--ca-body)" }}>
                  Mande este código para o(a) parceiro(a) entrar no mesmo painel.
                  <div className="flex items-center gap-2">
                    <code
                      className="grid h-11 flex-1 place-items-center rounded-xl text-lg font-bold"
                      style={{ background: "var(--ca-bg)", letterSpacing: ".2em", color: "var(--ca-ink)" }}
                    >
                      {couple.invite_code}
                    </code>
                    <button type="button" className="ca-pill" style={{ height: 44 }} onClick={copyInviteCode}>
                      {copiado ? (
                        "Copiado ✓"
                      ) : (
                        <>
                          <Copy className="mr-1.5 h-4 w-4" aria-hidden="true" /> Copiar
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </details>
            )}

            {/* avaliação da plataforma: só depois do primeiro fornecedor contratado */}
            {contratados > 0 && !avEnviada && (
              <div className="ca-card flex-row flex-wrap items-center justify-between gap-3" style={{ padding: 14 }}>
                <span className="text-sm">
                  <b className="block">Está gostando do Casamenteiro?</b>
                  <span style={{ color: "var(--ca-body)" }}>Sua avaliação ajuda outros casais.</span>
                </span>
                <button type="button" className="ca-pill" onClick={() => setAvOpen(true)}>
                  Avaliar
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* personalizar capa */}
      <Dialog open={coverOpen} onOpenChange={setCoverOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Personalizar capa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Foto do casal</label>
              <p className="mb-2 text-xs text-muted-foreground">Aparece ao lado dos nomes, no topo do painel.</p>
              <CouplePhotoUpload url={coverPhoto} fileName="header" label="Foto de capa" aspect="aspect-[16/9]" onUploaded={(u) => setCoverPhoto(u)} />
              {coverPhoto && (
                <Button variant="ghost" size="sm" className="mt-1 text-destructive" onClick={() => setCoverPhoto(null)}>
                  <Trash2 className="mr-1 h-3.5 w-3.5" /> Remover foto
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
              <Button variant="ghost" onClick={() => setCoverOpen(false)}>
                Cancelar
              </Button>
              <Button
                disabled={savingCover}
                onClick={async () => {
                  await saveCover();
                  setCoverOpen(false);
                }}
              >
                Salvar capa
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* avaliação da plataforma */}
      <Dialog open={avOpen} onOpenChange={setAvOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Como foi sua experiência?</DialogTitle>
          </DialogHeader>
          <div className="flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <button key={i} type="button" onClick={() => setAvRating(i + 1)} aria-label={`${i + 1} estrelas`}>
                <Star className={`h-7 w-7 ${i < avRating ? "fill-primary text-primary" : "text-muted-foreground"}`} />
              </button>
            ))}
          </div>
          <Textarea
            placeholder="Conte o que mais te ajudou no planejamento…"
            value={avComentario}
            onChange={(e) => setAvComentario(e.target.value)}
            maxLength={600}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAvOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={enviarAvaliacaoPlataforma} disabled={avSalvando}>
              {avSalvando ? "Enviando…" : "Enviar avaliação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* conversa de orçamento */}
      {isMobile ? (
        <Sheet open={threadOpen} onOpenChange={setThreadOpen}>
          <SheetContent side="bottom" className="flex h-[100dvh] flex-col gap-0 rounded-none p-0">
            <SheetHeader className="border-b border-border px-4 py-3 text-left">
              <SheetTitle className="text-base">
                {selectedQuote?.supplier?.company_name ? `Conversa com ${selectedQuote.supplier.company_name}` : "Conversa sobre orçamento"}
              </SheetTitle>
            </SheetHeader>
            {selectedQuote && user && couple && (
              <QuoteConversation
                quoteId={selectedQuote.id}
                currentUserId={user.id}
                isSupplier={false}
                coupleId={couple.id}
                supplierId={selectedQuote.supplier_id}
                onContracted={() => setThreadOpen(false)}
              />
            )}
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={threadOpen} onOpenChange={setThreadOpen}>
          <DialogContent className="flex h-[85vh] flex-col gap-0 p-0 sm:max-w-2xl">
            <DialogHeader className="border-b border-border px-4 py-3">
              <DialogTitle className="text-base">
                {selectedQuote?.supplier?.company_name ? `Conversa com ${selectedQuote.supplier.company_name}` : "Conversa sobre orçamento"}
              </DialogTitle>
            </DialogHeader>
            {selectedQuote && user && couple && (
              <QuoteConversation
                quoteId={selectedQuote.id}
                currentUserId={user.id}
                isSupplier={false}
                coupleId={couple.id}
                supplierId={selectedQuote.supplier_id}
                onContracted={() => setThreadOpen(false)}
              />
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
