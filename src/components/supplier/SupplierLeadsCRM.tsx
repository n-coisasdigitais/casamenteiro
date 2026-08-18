import { traduzirErro } from "@/lib/errorMessages";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Eye, StickyNote, Calendar as CalendarIcon, Users as UsersIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import LeadNoteDialog from "./LeadNoteDialog";
import { cn } from "@/lib/utils";

type Props = {
  supplierId: string;
  supplierUserId: string;
  companyName?: string;
  onOpenQuote: (q: any) => void;
};

function hoursSince(iso?: string | null) {
  if (!iso) return Infinity;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
}
function fmtWait(h: number) {
  if (!isFinite(h)) return "—";
  if (h < 1) return "agora";
  if (h < 48) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

const STATUS_LABELS: Record<string, string> = {
  enviado: "Novo",
  respondido: "Respondido",
  negociando: "Negociando",
  fechado: "Fechado",
  recusado: "Recusado",
};

export default function SupplierLeadsCRM({ supplierId, supplierUserId, companyName, onOpenQuote }: Props) {
  const { toast } = useToast();
  const [quotes, setQuotes] = useState<any[]>([]);
  const [proposals, setProposals] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [couples, setCouples] = useState<Record<string, any>>({});
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [filterCat, setFilterCat] = useState<string>("todas");
  const [filterUrg, setFilterUrg] = useState<string>("todas");
  const [query, setQuery] = useState("");
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteFor, setNoteFor] = useState<{ quoteId: string; existing?: any } | null>(null);
  const [page, setPage] = useState(1);
  const PER_PAGE = 20;

  const load = async () => {
    const [{ data: qs }, { data: cats }] = await Promise.all([
      supabase.from("quotes").select("*").eq("supplier_id", supplierId).order("created_at", { ascending: false }),
      supabase.from("categories").select("id, name, slug"),
    ]);
    setCategories(cats || []);
    const list = qs || [];
    setQuotes(list);
    if (list.length) {
      const ids = list.map((q: any) => q.id);
      const coupleIds = Array.from(new Set(list.map((q: any) => q.couple_id).filter(Boolean)));
      const [{ data: pr }, { data: msg }, { data: ln }, { data: cp }] = await Promise.all([
        supabase.from("quote_proposals").select("id, quote_id, sender_id, amount, created_at, kind, status").in("quote_id", ids).order("created_at", { ascending: false }),
        supabase.from("quote_messages").select("id, quote_id, sender_id, created_at").in("quote_id", ids).order("created_at", { ascending: false }),
        supabase.from("lead_notes" as any).select("*").eq("supplier_id", supplierId).order("updated_at", { ascending: false }),
        supabase.from("couples").select("id, partner1_name, partner2_name, city, category_id, user_id, partner2_user_id").in("id", coupleIds as string[]),
      ]);
      setProposals(pr || []);
      setMessages(msg || []);
      setNotes(((ln as any) || []) as any[]);
      const map: Record<string, any> = {};
      (cp || []).forEach((c: any) => { map[c.id] = c; });
      setCouples(map);
    } else {
      setProposals([]); setMessages([]); setNotes([]); setCouples({});
    }
  };

  useEffect(() => { if (supplierId) load(); /* eslint-disable-next-line */ }, [supplierId]);

  const leads = useMemo(() => {
    const lastByQuote = new Map<string, { at: string; from: string }>();
    [...proposals, ...messages].forEach((e: any) => {
      const cur = lastByQuote.get(e.quote_id);
      if (!cur || new Date(e.created_at) > new Date(cur.at)) {
        lastByQuote.set(e.quote_id, { at: e.created_at, from: e.sender_id });
      }
    });
    const supplierProposalsByQuote = new Map<string, any>();
    proposals
      .filter((p) => p.sender_id === supplierUserId)
      .forEach((p) => {
        if (!supplierProposalsByQuote.has(p.quote_id)) supplierProposalsByQuote.set(p.quote_id, p);
      });
    const notesByQuote = new Map<string, any>();
    notes.forEach((n: any) => {
      if (!notesByQuote.has(n.quote_id)) notesByQuote.set(n.quote_id, n);
    });

    return quotes.map((q) => {
      const last = lastByQuote.get(q.id);
      const supplierActed = last?.from === supplierUserId;
      const referenceIso = supplierActed ? last!.at : q.created_at; // usado para semáforo
      const waitH = hoursSince(referenceIso);
      let sem: "verde" | "amarelo" | "vermelho";
      let status: "aguardando" | "respondido" | "sem_retorno";
      if (!supplierActed) {
        status = "aguardando";
        sem = waitH < 24 ? "amarelo" : waitH < 48 ? "amarelo" : "vermelho";
        if (waitH < 1) sem = "verde";
      } else {
        const proposalAge = hoursSince(referenceIso);
        if (proposalAge >= 72) { status = "sem_retorno"; sem = "vermelho"; }
        else { status = "respondido"; sem = "verde"; }
      }
      const sp = supplierProposalsByQuote.get(q.id);
      const couple = couples[q.couple_id];
      const nomeCasal = couple ? [couple.partner1_name, couple.partner2_name].filter(Boolean).join(" & ") : "Casal";
      const cat = categories.find((c) => c.id === couple?.category_id);
      return {
        quote: q,
        couple,
        nomeCasal,
        cidade: couple?.city,
        catName: cat?.name || "—",
        catId: couple?.category_id,
        lastActivity: last?.at || q.created_at,
        waitH,
        sem,
        statusFlow: status,
        supplierProposalAmount: sp?.amount ?? null,
        note: notesByQuote.get(q.id),
      };
    });
  }, [quotes, proposals, messages, notes, couples, categories, supplierUserId]);

  const filtered = useMemo(() => {
    let l = leads;
    if (filterStatus !== "todos") l = l.filter((x) => (x.quote.kanban_status || "enviado") === filterStatus);
    if (filterCat !== "todas") l = l.filter((x) => x.catId === filterCat);
    if (filterUrg !== "todas") l = l.filter((x) => x.sem === filterUrg);
    if (query.trim()) {
      const q = query.toLowerCase();
      l = l.filter((x) => (x.nomeCasal || "").toLowerCase().includes(q) || (x.quote.message || "").toLowerCase().includes(q));
    }
    return [...l].sort((a, b) => {
      const rank: any = { vermelho: 0, amarelo: 1, verde: 2 };
      if (rank[a.sem] !== rank[b.sem]) return rank[a.sem] - rank[b.sem];
      return b.waitH - a.waitH;
    });
  }, [leads, filterStatus, filterCat, filterUrg, query]);

  const metrics = useMemo(() => {
    const total = leads.length;
    const responded = leads.filter((l) => l.statusFlow !== "aguardando").length;
    const closed = leads.filter((l) => (l.quote.kanban_status || "") === "fechado");
    const amounts = closed.map((l) => Number(l.supplierProposalAmount || 0)).filter((n) => n > 0);
    const avg = amounts.length ? amounts.reduce((s, n) => s + n, 0) / amounts.length : 0;
    return {
      responseRate: total ? Math.round((responded / total) * 100) : 0,
      closeRate: total ? Math.round((closed.length / total) * 100) : 0,
      avgClosed: avg,
    };
  }, [leads]);

  const lembrar = async (lead: any) => {
    const couple = lead.couple;
    const targetIds = [couple?.user_id, couple?.partner2_user_id].filter(Boolean) as string[];
    if (!targetIds.length) return toast({ title: "Casal sem contato registrado", variant: "destructive" });
    const rows = targetIds.map((uid) => ({
      user_id: uid,
      type: "quote_reminder",
      title: `Lembrete: ${companyName || "um fornecedor"} está aguardando seu retorno`,
      body: "Você recebeu uma proposta e ainda não respondeu. Que tal continuar a conversa?",
      link: `/painel?quote=${lead.quote.id}`,
    }));
    const { error } = await supabase.from("notifications").insert(rows);
    if (error) return toast({ title: "Erro", description: traduzirErro(error), variant: "destructive" });
    await supabase.from("lead_notes" as any).insert({
      quote_id: lead.quote.id, supplier_id: supplierId, author_id: supplierUserId,
      note: `Lembrete enviado em ${new Date().toLocaleString("pt-BR")}`,
    });
    await supabase.from("lead_events" as any).insert({
      quote_id: lead.quote.id, supplier_id: supplierId, tipo: "lembrete",
      created_by: supplierUserId,
      payload: { canal: "in_app+email" },
    });
    // tenta e-mail (não bloqueia se falhar)
    try {
      const emails: string[] = [];
      for (const uid of targetIds) {
        const { data } = await supabase.from("profiles").select("full_name").eq("user_id", uid).maybeSingle();
        if (data) { /* profiles não tem email; melhor pegar de auth via edge function futura */ }
      }
      if (couple?.email) emails.push(couple.email);
      if (emails.length) {
        await supabase.functions.invoke("send-transactional-email", {
          body: {
            to: emails,
            subject: `${companyName || "Um fornecedor"} está aguardando seu retorno`,
            html: `<p>Olá!</p><p><strong>${companyName || "Um fornecedor"}</strong> enviou uma proposta e ainda aguarda seu retorno.</p><p>Acesse seu painel para responder.</p>`,
          },
        });
      }
    } catch { /* silencioso */ }
    toast({ title: "Lembrete enviado ao casal" });
    load();
  };

  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <MetricTile label="Taxa de resposta" value={`${metrics.responseRate}%`} />
        <MetricTile label="Taxa de fechamento" value={`${metrics.closeRate}%`} />
        <MetricTile label="Ticket médio fechado" value={metrics.avgClosed ? `R$ ${metrics.avgClosed.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}` : "—"} />
      </div>

      <Card>
        <CardContent className="p-3 flex flex-wrap gap-2 items-center">
          <Input placeholder="Buscar casal ou mensagem" value={query} onChange={(e) => setQuery(e.target.value)} className="w-full sm:w-56" />
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterCat} onValueChange={setFilterCat}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as categorias</SelectItem>
              {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterUrg} onValueChange={setFilterUrg}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Urgência" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas urgências</SelectItem>
              <SelectItem value="vermelho">Vermelho</SelectItem>
              <SelectItem value="amarelo">Amarelo</SelectItem>
              <SelectItem value="verde">Verde</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Nenhum lead encontrado com esses filtros.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {paged.map((l) => (
            <Card key={l.quote.id} className="hover:shadow-sm transition">
              <CardContent className="p-4 flex flex-wrap gap-3 items-start">
                <span className={cn("h-3 w-3 rounded-full mt-1.5 shrink-0",
                  l.sem === "vermelho" && "bg-destructive",
                  l.sem === "amarelo" && "bg-amber-500",
                  l.sem === "verde" && "bg-emerald-500")} />
                <div className="flex-1 min-w-[220px]">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{l.nomeCasal}</p>
                    <Badge variant="secondary" className="text-xs">{STATUS_LABELS[l.quote.kanban_status || "enviado"]}</Badge>
                    {l.statusFlow === "aguardando" && <Badge variant="destructive" className="text-xs">Responder</Badge>}
                    {l.statusFlow === "sem_retorno" && <Badge className="text-xs bg-amber-500 hover:bg-amber-500">Aguardando casal</Badge>}
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-1">
                    {l.quote.event_date && (
                      <span className="flex items-center gap-1"><CalendarIcon className="h-3 w-3" />{new Date(l.quote.event_date).toLocaleDateString("pt-BR")}</span>
                    )}
                    {l.quote.guest_count && (
                      <span className="flex items-center gap-1"><UsersIcon className="h-3 w-3" />{l.quote.guest_count} convidados</span>
                    )}
                    <span>{l.catName}</span>
                    <span>último contato: {fmtWait(l.waitH)}</span>
                    {l.supplierProposalAmount != null && (
                      <span>proposta: R$ {Number(l.supplierProposalAmount).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</span>
                    )}
                  </div>
                  {l.note?.note && (
                    <p className="text-xs mt-2 italic text-muted-foreground line-clamp-2">
                      <StickyNote className="h-3 w-3 inline mr-1" />{l.note.note}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 justify-end">
                  <Button size="sm" variant="outline" onClick={() => onOpenQuote(l.quote)}>
                    <Eye className="h-3.5 w-3.5 mr-1" /> Abrir
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setNoteFor({ quoteId: l.quote.id, existing: l.note }); setNoteOpen(true); }}>
                    <StickyNote className="h-3.5 w-3.5 mr-1" /> Nota
                  </Button>
                  {l.statusFlow === "sem_retorno" && (
                    <Button size="sm" onClick={() => lembrar(l)}>
                      <Bell className="h-3.5 w-3.5 mr-1" /> Lembrar
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {filtered.length > PER_PAGE && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Página {page} de {totalPages} · {filtered.length} leads
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
            <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Próxima</Button>
          </div>
        </div>
      )}

      {noteFor && (
        <LeadNoteDialog
          open={noteOpen}
          onOpenChange={setNoteOpen}
          quoteId={noteFor.quoteId}
          supplierId={supplierId}
          authorId={supplierUserId}
          existing={noteFor.existing}
          onSaved={load}
        />
      )}
    </div>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}