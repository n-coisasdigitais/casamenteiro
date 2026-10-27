import { traduzirErro } from "@/lib/errorMessages";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { SUPPLIER_COLS } from "@/lib/suppliers";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Send, Search, ExternalLink, Download, ChevronRight, Phone, Mail, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AdminPagination from "@/components/admin/AdminPagination";
import { baixarCsv } from "@/lib/csv";
import { semDemo } from "@/lib/demoScope";

const PAGE_SIZE = 25;
type Contato = { phone?: string | null; whatsapp?: string | null; email?: string | null };
type Rapido = "todos" | "pending" | "approved" | "teste" | "pagante" | "rejected" | "blocked";

const CORES = ["#a9551f", "#d9905a", "#4a7c6a", "#5b7fa6", "#8a6a9e", "#c46a5e"];
const iniciais = (s: string) =>
  (s || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
const dataBR = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString("pt-BR") : "—");
const emTeste = (s: any) => !!s.trial_ends_at && new Date(s.trial_ends_at).getTime() > Date.now();
const diasTeste = (s: any) => Math.max(0, Math.ceil((new Date(s.trial_ends_at).getTime() - Date.now()) / 864e5));

function Situacao({ s, pagante }: { s: any; pagante: boolean }) {
  if (s.status === "pending") return <span className="cz-st cz-warn">Aguardando aprovação</span>;
  if (s.status === "rejected") return <span className="cz-st cz-warn">Ajustes pedidos</span>;
  if (s.status === "blocked") return <span className="cz-st cz-err">Recusado</span>;
  if (pagante) return <span className="cz-st cz-ok">Pagante</span>;
  if (emTeste(s)) return <span className="cz-st cz-info">Teste · {diasTeste(s)} dias</span>;
  return <span className="cz-st cz-off">Plano grátis</span>;
}

function SupplierList() {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [contatos, setContatos] = useState<Record<string, Contato>>({});
  const [pagantes, setPagantes] = useState<Set<string>>(new Set());
  const [instas, setInstas] = useState<Record<string, string>>({});
  const [carregando, setCarregando] = useState(true);
  const [q, setQ] = useState("");
  const [rapido, setRapido] = useState<Rapido>("todos");
  const [categoria, setCategoria] = useState("all");
  const [cidade, setCidade] = useState("all");
  const [page, setPage] = useState(0);

  useEffect(() => {
    (async () => {
      const [{ data }, ct, subs, rs] = await Promise.all([
        semDemo(supabase.from("suppliers").select(`${SUPPLIER_COLS}, categories(name)`)).order("created_at", { ascending: false }),
        (supabase.rpc as any)("admin_suppliers_contacts"),
        (supabase.from("supplier_subscriptions" as any) as any).select("supplier_id").eq("status", "ativa"),
        (supabase.from("supplier_redes_sociais" as any) as any).select("supplier_id, instagram"),
      ]);
      const ig: Record<string, string> = {};
      ((rs?.data || []) as any[]).forEach((r) => r.instagram && (ig[r.supplier_id] = r.instagram));
      setInstas(ig);
      setSuppliers(data || []);
      const m: Record<string, Contato> = {};
      ((ct?.data || []) as any[]).forEach((c) => (m[c.id] = c));
      setContatos(m);
      setPagantes(new Set(((subs?.data || []) as any[]).map((x) => x.supplier_id)));
      setCarregando(false);
    })();
  }, []);

  const categorias = useMemo(() => Array.from(new Set(suppliers.map((s) => s.categories?.name).filter(Boolean))).sort() as string[], [suppliers]);
  const cidades = useMemo(() => Array.from(new Set(suppliers.map((s) => s.city).filter(Boolean))).sort() as string[], [suppliers]);

  const passaRapido = (s: any, r: Rapido) => {
    if (r === "todos") return true;
    if (r === "pagante") return pagantes.has(s.id);
    if (r === "teste") return s.status === "approved" && emTeste(s) && !pagantes.has(s.id);
    return s.status === r;
  };

  const filtered = useMemo(
    () =>
      suppliers.filter((s) => {
        const c = contatos[s.id] || {};
        if (q && ![s.company_name, c.email, c.phone, c.whatsapp, s.city, instas[s.id]].some((v) => String(v || "").toLowerCase().includes(q.toLowerCase())))
          return false;
        if (!passaRapido(s, rapido)) return false;
        if (categoria !== "all" && s.categories?.name !== categoria) return false;
        if (cidade !== "all" && s.city !== cidade) return false;
        return true;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [suppliers, contatos, pagantes, instas, q, rapido, categoria, cidade],
  );

  useEffect(() => {
    setPage(0);
  }, [q, rapido, categoria, cidade]);

  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const conta = (r: Rapido) => suppliers.filter((s) => passaRapido(s, r)).length;

  const exportar = () =>
    baixarCsv(
      `fornecedores-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Empresa", "Categoria", "Cidade", "UF", "E-mail", "Telefone", "WhatsApp", "Status", "Pagante", "Teste até", "Nota", "Avaliações", "Cadastro"],
      filtered.map((s) => {
        const c = contatos[s.id] || {};
        return [
          s.company_name,
          s.categories?.name || "",
          s.city || "",
          s.state || "",
          c.email || "",
          c.phone || "",
          c.whatsapp || "",
          s.status,
          pagantes.has(s.id) ? "sim" : "não",
          s.trial_ends_at ? dataBR(s.trial_ends_at) : "",
          s.rating || "",
          s.review_count || 0,
          dataBR(s.created_at),
        ];
      }),
    );

  const rapidos: { k: Rapido; l: string }[] = [
    { k: "todos", l: "Todos" },
    { k: "pending", l: "Aguardando aprovação" },
    { k: "pagante", l: "Pagantes" },
    { k: "teste", l: "Em teste" },
    { k: "approved", l: "Aprovados" },
    { k: "rejected", l: "Ajustes pedidos" },
    { k: "blocked", l: "Recusados" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="m-0 text-2xl font-extrabold" style={{ letterSpacing: "-0.03em" }}>
            Fornecedores
          </h1>
          <p className="cz-num m-0 mt-1 text-sm" style={{ color: "var(--ad-body)" }}>
            {suppliers.length} cadastrados · {conta("pagante")} pagantes · {conta("teste")} em teste
          </p>
        </div>
        <button type="button" className="cz-btn" onClick={exportar} disabled={!filtered.length}>
          <Download className="h-3.5 w-3.5" /> Exportar CSV
        </button>
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="flex gap-1.5 overflow-x-auto" role="group" aria-label="Filtro rápido">
          {rapidos.map((r) => (
            <button
              key={r.k}
              type="button"
              aria-pressed={rapido === r.k}
              onClick={() => setRapido(r.k)}
              className="h-8 shrink-0 rounded-full border px-3 text-[12.5px] font-semibold"
              style={
                rapido === r.k
                  ? { background: "var(--ad-ink)", color: "#fff", borderColor: "var(--ad-ink)" }
                  : { background: "#fff", borderColor: "var(--ad-line-strong)", color: "var(--ad-ink)" }
              }
            >
              {r.l}
              <span className="cz-num ml-1.5 opacity-60">{conta(r.k)}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--ad-muted)" }} />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome, e-mail, telefone, cidade ou Instagram" className="h-9 bg-white pl-9" />
          </div>
          <select className="h-9 rounded-lg border bg-white px-2 text-[13px]" style={{ borderColor: "var(--ad-line-strong)" }} value={categoria} onChange={(e) => setCategoria(e.target.value)} aria-label="Categoria">
            <option value="all">Todas as categorias</option>
            {categorias.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select className="h-9 rounded-lg border bg-white px-2 text-[13px]" style={{ borderColor: "var(--ad-line-strong)" }} value={cidade} onChange={(e) => setCidade(e.target.value)} aria-label="Cidade">
            <option value="all">Todas as cidades</option>
            {cidades.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <section className="cz-card overflow-hidden">
        {carregando ? (
          <p className="m-0 p-5 text-sm" style={{ color: "var(--ad-muted)" }}>
            Carregando…
          </p>
        ) : filtered.length === 0 ? (
          <p className="m-0 p-8 text-center text-sm" style={{ color: "var(--ad-body)" }}>
            Nenhum fornecedor com esses filtros.
          </p>
        ) : (
          <>
            {/* computador: tabela */}
            <div className="hidden overflow-x-auto md:block">
              <table className="cz-num w-full border-collapse text-[13px]">
                <thead>
                  <tr style={{ background: "#fbfaf8" }}>
                    {["Fornecedor", "Situação", "Contato", "Nota", "Cadastro", ""].map((h) => (
                      <th key={h} className="whitespace-nowrap border-b px-3 py-2.5 text-left text-[11px] font-bold uppercase" style={{ letterSpacing: ".05em", color: "var(--ad-muted)", borderColor: "var(--ad-line)" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((s, i) => {
                    const c = contatos[s.id] || {};
                    return (
                      <tr
                        key={s.id}
                        className="cursor-pointer transition-colors hover:bg-[#fbf8f5]"
                        onClick={() => navigate(`/admin/fornecedor/${s.id}`)}
                      >
                        <td className="border-b px-3 py-2.5" style={{ borderColor: "var(--ad-line)" }}>
                          <div className="flex min-w-0 items-center gap-2.5">
                            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] text-xs font-extrabold text-white" style={{ background: CORES[i % CORES.length] }}>
                              {iniciais(s.company_name)}
                            </span>
                            <span className="min-w-0">
                              <b className="block truncate text-[13.5px]">{s.company_name}</b>
                              <span className="block truncate text-xs" style={{ color: "var(--ad-muted)" }}>
                                {[s.categories?.name, s.city && `${s.city}${s.state ? `/${s.state}` : ""}`].filter(Boolean).join(" · ") || "—"}
                              </span>
                            </span>
                          </div>
                        </td>
                        <td className="border-b px-3 py-2.5" style={{ borderColor: "var(--ad-line)" }}>
                          <Situacao s={s} pagante={pagantes.has(s.id)} />
                        </td>
                        <td className="border-b px-3 py-2.5 text-xs" style={{ borderColor: "var(--ad-line)", color: "var(--ad-body)" }}>
                          <span className="block truncate">{c.email || "—"}</span>
                          <span className="block truncate">{c.whatsapp || c.phone || ""}</span>
                        </td>
                        <td className="border-b px-3 py-2.5" style={{ borderColor: "var(--ad-line)" }}>
                          {s.rating ? (
                            <span className="inline-flex items-center gap-1">
                              <Star className="h-3 w-3" style={{ color: "var(--ad-terracota)", fill: "var(--ad-terracota)" }} />
                              {Number(s.rating).toFixed(1).replace(".", ",")}
                              <span style={{ color: "var(--ad-muted)" }}>({s.review_count || 0})</span>
                            </span>
                          ) : (
                            <span style={{ color: "var(--ad-muted)" }}>—</span>
                          )}
                        </td>
                        <td className="border-b px-3 py-2.5" style={{ borderColor: "var(--ad-line)", color: "var(--ad-body)" }}>
                          {dataBR(s.created_at)}
                        </td>
                        <td className="border-b px-3 py-2.5 text-right" style={{ borderColor: "var(--ad-line)" }}>
                          {s.status === "pending" ? (
                            <Link to="/admin/aprovacao" className="cz-btn pri" onClick={(e) => e.stopPropagation()}>
                              Revisar
                            </Link>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-bold" style={{ color: "var(--ad-clay)" }}>
                              Abrir <ChevronRight className="h-3.5 w-3.5" />
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* celular: lista */}
            <div className="md:hidden">
              {pageRows.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => navigate(`/admin/fornecedor/${s.id}`)}
                  className="cz-row flex w-full items-center gap-3 px-4 py-3 text-left"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] text-xs font-extrabold text-white" style={{ background: CORES[i % CORES.length] }}>
                    {iniciais(s.company_name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-[13.5px]">{s.company_name}</b>
                    <span className="block truncate text-xs" style={{ color: "var(--ad-muted)" }}>
                      {[s.categories?.name, s.city].filter(Boolean).join(" · ") || "—"}
                    </span>
                  </span>
                  <Situacao s={s} pagante={pagantes.has(s.id)} />
                </button>
              ))}
            </div>
          </>
        )}
      </section>
      <AdminPagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
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
      const { data: sup } = await semDemo(supabase.from("suppliers").select(`${SUPPLIER_COLS}, categories(name)`)).eq("id", supplierId).maybeSingle();
      if (!sup) {
        setLoading(false);
        return;
      }
      const [quotes, contracts, views, reviews, leads, ct, sub] = await Promise.all([
        supabase.from("quotes").select("*").eq("supplier_id", supplierId).order("created_at", { ascending: false }),
        supabase.from("couple_suppliers").select("*").eq("supplier_id", supplierId).eq("status", "contracted"),
        supabase.from("supplier_profile_views").select("id, viewed_at").eq("supplier_id", supplierId),
        supabase.from("reviews").select("*").eq("supplier_id", supplierId),
        supabase.from("supplier_leads").select("*").eq("supplier_id", supplierId).order("created_at", { ascending: false }),
        (supabase.rpc as any)("get_supplier_contact", { _supplier_id: supplierId }),
        (supabase.from("supplier_subscriptions" as any) as any).select("status, ciclo, valor, current_period_end").eq("supplier_id", supplierId).order("created_at", { ascending: false }).limit(1),
      ]);
      const contato = Array.isArray(ct?.data) ? ct.data[0] : ct?.data;
      setData({
        sup,
        contato: contato || {},
        assinatura: ((sub?.data || []) as any[])[0] || null,
        quotes: quotes.data || [],
        contracts: contracts.data || [],
        views: views.data || [],
        reviews: reviews.data || [],
        leads: leads.data || [],
      });
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
    if (error) toast({ title: "Erro", description: traduzirErro(error), variant: "destructive" });
    else {
      toast({ title: "Mensagem enviada!" });
      setPushTitle("");
      setPushBody("");
    }
  };

  if (loading)
    return (
      <p className="text-sm" style={{ color: "var(--ad-muted)" }}>
        Carregando…
      </p>
    );
  if (!data)
    return (
      <p className="text-sm" style={{ color: "var(--ad-muted)" }}>
        Fornecedor não encontrado.
      </p>
    );

  const { sup, contato, assinatura, quotes, contracts, views, reviews, leads } = data;
  const responded = quotes.filter((q: any) => q.kanban_status !== "enviado").length;
  const respRate = quotes.length ? Math.round((responded / quotes.length) * 100) : 0;
  const gmv = contracts.reduce((s: number, c: any) => s + Number(c.final_value || c.contract_value || 0), 0);
  const pagante = assinatura?.status === "ativa";

  const kpis: [string, string][] = [
    ["Visualizações", String(views.length)],
    ["Pedidos de orçamento", String(quotes.length)],
    ["Taxa de resposta", `${respRate}%`],
    ["Contratos", String(contracts.length)],
    ["Valor contratado", `R$ ${gmv.toLocaleString("pt-BR")}`],
  ];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link to="/admin/fornecedores-crm" className="mb-1 inline-flex items-center gap-1 text-xs font-semibold" style={{ color: "var(--ad-muted)" }}>
          <ArrowLeft className="h-3.5 w-3.5" /> Fornecedores
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="m-0 flex flex-wrap items-center gap-2 text-2xl font-extrabold" style={{ letterSpacing: "-0.03em" }}>
              {sup.company_name}
              <Situacao s={sup} pagante={pagante} />
            </h1>
            <p className="m-0 mt-1 text-[13px]" style={{ color: "var(--ad-body)" }}>
              {[sup.categories?.name, sup.city && `${sup.city}${sup.state ? `/${sup.state}` : ""}`].filter(Boolean).join(" · ") || "—"} · cadastrado em {dataBR(sup.created_at)}
            </p>
          </div>
          <Link to={`/fornecedor/${sup.id}`} target="_blank" className="cz-btn">
            <ExternalLink className="h-3.5 w-3.5" /> Ver perfil público
          </Link>
        </div>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="cz-num grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-5">
            {kpis.map(([l, v]) => (
              <div key={l} className="cz-card px-3.5 py-3">
                <small className="block text-[11.5px] font-semibold" style={{ color: "var(--ad-muted)" }}>
                  {l}
                </small>
                <b className="text-lg font-extrabold" style={{ letterSpacing: "-0.02em" }}>
                  {v}
                </b>
              </div>
            ))}
          </div>

          <Tabs defaultValue="quotes">
            <TabsList className="h-auto flex-wrap justify-start">
              <TabsTrigger value="quotes">Pedidos ({quotes.length})</TabsTrigger>
              <TabsTrigger value="leads">Leads ({leads.length})</TabsTrigger>
              <TabsTrigger value="reviews">Avaliações ({reviews.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="quotes">
              <section className="cz-card overflow-hidden">
                {quotes.length === 0 && (
                  <p className="m-0 p-5 text-sm" style={{ color: "var(--ad-muted)" }}>
                    Nenhum pedido.
                  </p>
                )}
                {quotes.map((q: any) => (
                  <div key={q.id} className="cz-row flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-[13px]">
                    <div className="min-w-0 flex-1">
                      <p className="m-0 line-clamp-2">{q.message || "—"}</p>
                      <p className="m-0 text-xs" style={{ color: "var(--ad-muted)" }}>
                        {dataBR(q.created_at)}
                      </p>
                    </div>
                    <span className={`cz-st ${q.kanban_status === "enviado" ? "cz-warn" : q.kanban_status === "fechado" ? "cz-ok" : "cz-off"}`}>{q.kanban_status || q.status}</span>
                  </div>
                ))}
              </section>
            </TabsContent>

            <TabsContent value="leads">
              <section className="cz-card overflow-hidden">
                {leads.length === 0 && (
                  <p className="m-0 p-5 text-sm" style={{ color: "var(--ad-muted)" }}>
                    Nenhum lead.
                  </p>
                )}
                {leads.map((l: any) => (
                  <div key={l.id} className="cz-row px-4 py-3 text-[13px]">
                    <b className="block">{l.nome_casal || "—"}</b>
                    <span className="block text-xs" style={{ color: "var(--ad-muted)" }}>
                      {l.cidade_evento || "—"} · {l.num_convidados || "?"} conv. · R$ {Number(l.orcamento_total || 0).toLocaleString("pt-BR")} · {l.status_lead} · {dataBR(l.created_at)}
                    </span>
                  </div>
                ))}
              </section>
            </TabsContent>

            <TabsContent value="reviews">
              <section className="cz-card overflow-hidden">
                {reviews.length === 0 && (
                  <p className="m-0 p-5 text-sm" style={{ color: "var(--ad-muted)" }}>
                    Nenhuma avaliação.
                  </p>
                )}
                {reviews.map((r: any) => (
                  <div key={r.id} className="cz-row px-4 py-3 text-[13px]">
                    <b className="block">
                      ★ {r.rating} {r.title}
                    </b>
                    <span className="block text-xs" style={{ color: "var(--ad-body)" }}>
                      {r.comment}
                    </span>
                  </div>
                ))}
              </section>
            </TabsContent>
          </Tabs>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <section className="cz-card p-4 text-[13px]">
            <h2 className="m-0 mb-2.5 text-[14px] font-bold">Contato e plano</h2>
            <div className="flex flex-col gap-1.5">
              <span className="inline-flex items-center gap-2">
                <Mail className="h-3.5 w-3.5" style={{ color: "var(--ad-muted)" }} />
                {contato.email || "—"}
              </span>
              <span className="inline-flex items-center gap-2">
                <Phone className="h-3.5 w-3.5" style={{ color: "var(--ad-muted)" }} />
                {contato.whatsapp || contato.phone || "—"}
              </span>
              <span className="mt-1.5 border-t pt-2.5" style={{ borderColor: "var(--ad-line)", color: "var(--ad-body)" }}>
                {pagante
                  ? `Plano pago (${assinatura.ciclo || "mensal"}) · R$ ${Number(assinatura.valor || 0).toLocaleString("pt-BR")} · renova em ${dataBR(assinatura.current_period_end)}`
                  : emTeste(sup)
                    ? `Teste grátis até ${dataBR(sup.trial_ends_at)} (${diasTeste(sup)} dias)`
                    : "Plano grátis"}
              </span>
            </div>
          </section>

          <section className="cz-card flex flex-col gap-2 p-4">
            <h2 className="m-0 flex items-center gap-2 text-[14px] font-bold">
              <Send className="h-4 w-4" /> Mensagem para o fornecedor
            </h2>
            <p className="m-0 text-xs" style={{ color: "var(--ad-muted)" }}>
              Aparece nos avisos do painel dele.
            </p>
            <Input placeholder="Título" value={pushTitle} onChange={(e) => setPushTitle(e.target.value)} className="bg-white" />
            <Textarea placeholder="Mensagem" value={pushBody} onChange={(e) => setPushBody(e.target.value)} rows={3} className="bg-white" />
            <button type="button" className="cz-btn pri self-end" onClick={sendPush} disabled={sending || !pushTitle.trim()}>
              {sending ? "Enviando…" : "Enviar"}
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}

/** O AdminLayout já confere se a pessoa é admin e mostra o menu; aqui só o conteúdo. */
export default function AdminSupplierCRM() {
  const { id } = useParams();
  return (
    <div className="cz-enter mx-auto max-w-[1280px] px-4 py-5 md:px-7 md:py-6">
      {id ? <SupplierDetail supplierId={id} /> : <SupplierList />}
    </div>
  );
}
