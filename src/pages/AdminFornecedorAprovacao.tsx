import { traduzirErro } from "@/lib/errorMessages";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { SUPPLIER_COLS } from "@/lib/suppliers";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, MapPin, ExternalLink, Phone, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { semDemo } from "@/lib/demoScope";
import { AJUSTES, labelAjuste } from "@/lib/pendencias";
import { carregarRedes, linkRede, rotuloRede, REDES, type Redes } from "@/lib/redesSociais";

type Filtro = "pending" | "approved" | "rejected" | "blocked" | "all";
type Decisao = "approved" | "rejected" | "blocked";

const PRAZO_H = 24;
/** só para "Recusar definitivamente" (sem reenvio) */
const MOTIVOS_RECUSA = ["Perfil falso ou spam", "Serviço fora do escopo da plataforma", "Cadastro duplicado", "Conteúdo impróprio"];
const STATUS_LABEL: Record<string, string> = { pending: "Aguardando", approved: "Aprovado", rejected: "Ajustes pedidos", blocked: "Recusado" };
const STATUS_TOM: Record<string, string> = { pending: "cz-warn", approved: "cz-ok", rejected: "cz-warn", blocked: "cz-err" };
const ACAO_LABEL: Record<string, string> = {
  submitted: "Enviado para aprovação",
  resubmitted: "Reenviado depois dos ajustes",
  approved: "Aprovado",
  rejected: "Ajustes pedidos",
  blocked: "Recusado definitivamente",
};
/** preço abaixo disso numa faixa ou preço médio provavelmente foi digitado errado (ex.: 5,8 em vez de 5.800) */
const PRECO_SUSPEITO = 100;

function esperando(desde: string) {
  const h = Math.floor((Date.now() - new Date(desde).getTime()) / 3600000);
  if (h < 1) return "agora";
  if (h < 48) return `${h} h`;
  return `${Math.floor(h / 24)} dias`;
}
const normaliza = (s: string) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");

export default function AdminFornecedorAprovacao() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [envios, setEnvios] = useState<Record<string, { em: string; reenviado: boolean }>>({});
  const [filter, setFilter] = useState<Filtro>("pending");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [campos, setCampos] = useState<any[]>([]);
  const [respostas, setRespostas] = useState<any[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [historico, setHistorico] = useState<any[]>([]);
  const [contato, setContato] = useState<{ phone?: string | null; whatsapp?: string | null; email?: string | null } | null>(null);
  const [redes, setRedes] = useState<Redes | null>(null);
  const [modo, setModo] = useState<null | "ajustes" | "recusar">(null);
  const [itensAjuste, setItensAjuste] = useState<string[]>([]);
  const [motivo, setMotivo] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = async (abrirPrimeiro = false) => {
    setLoading(true);
    const { data } = await semDemo(supabase.from("suppliers").select(`${SUPPLIER_COLS}, categories(name)`)).order("created_at", { ascending: true });
    const lista = data || [];
    setSuppliers(lista);
    // quando cada um foi enviado para aprovação (para o prazo de 24 h)
    const pend = lista.filter((s: any) => s.status === "pending").map((s: any) => s.id);
    if (pend.length) {
      const { data: env } = await (supabase.from("fornecedor_aprovacoes" as any) as any)
        .select("supplier_id, created_at, acao")
        .in("supplier_id", pend)
        .in("acao", ["submitted", "resubmitted"])
        .order("created_at", { ascending: false });
      const m: Record<string, { em: string; reenviado: boolean }> = {};
      (env || []).forEach((e: any) => {
        if (!m[e.supplier_id]) m[e.supplier_id] = { em: e.created_at, reenviado: e.acao === "resubmitted" };
      });
      setEnvios(m);
    }
    setLoading(false);
    // no computador já abre o primeiro da fila
    if (abrirPrimeiro && window.innerWidth >= 768) {
      const primeiro = lista.find((s: any) => s.status === "pending");
      if (primeiro) openSupplier(primeiro);
    }
  };

  const openSupplier = async (sup: any) => {
    setSelected(sup);
    setModo(null);
    setMotivo("");
    setItensAjuste([]);
    setContato(null);
    setRedes(null);
    carregarRedes(sup.id).then((r) => setRedes(r || {}));
    const [{ data: cs }, { data: rs }, { data: ph }, { data: hi }, ct] = await Promise.all([
      supabase.from("campos_categoria").select("*").eq("category_id", sup.category_id).order("ordem"),
      supabase.from("fornecedor_campos").select("*").eq("supplier_id", sup.id),
      supabase.from("supplier_photos").select("*").eq("supplier_id", sup.id).order("display_order"),
      supabase.from("fornecedor_aprovacoes").select("*").eq("supplier_id", sup.id).order("created_at", { ascending: false }),
      (supabase.rpc as any)("get_supplier_contact", { _supplier_id: sup.id }),
    ]);
    setCampos(cs || []);
    setRespostas(rs || []);
    setPhotos(ph || []);
    setHistorico(hi || []);
    const row = Array.isArray(ct?.data) ? ct.data[0] : ct?.data;
    setContato(row || {});
  };

  const decide = async (status: Decisao, motivoTxt?: string, itens?: string[]) => {
    if (!selected) return;
    setSalvando(true);
    const { error } = await supabase.from("suppliers").update({ status } as any).eq("id", selected.id);
    if (error) {
      setSalvando(false);
      toast({ title: "Erro", description: traduzirErro(error), variant: "destructive" });
      return;
    }
    await (supabase.from("fornecedor_aprovacoes") as any).insert({
      supplier_id: selected.id,
      admin_id: user?.id,
      acao: status,
      motivo: motivoTxt || null,
      itens: itens && itens.length ? itens : null,
    });
    await supabase.from("admin_audit_log").insert({
      admin_id: user?.id,
      action: status === "approved" ? "supplier_approved" : status === "rejected" ? "supplier_changes_requested" : "supplier_rejected",
      target_table: "suppliers",
      target_id: selected.id,
      details: { company_name: selected.company_name, motivo: motivoTxt || null, itens: itens || null },
    });
    const listaItens = (itens || []).map((c) => `• ${labelAjuste(c)}`).join("\n");
    await supabase.from("notifications").insert({
      user_id: selected.user_id,
      type: status === "approved" ? "supplier_approved" : "supplier_rejected",
      title:
        status === "approved" ? "Seu perfil foi aprovado!" : status === "rejected" ? "Faltam alguns ajustes no seu perfil" : "Seu cadastro não foi aprovado",
      body:
        status === "approved"
          ? "Você já está visível para os casais."
          : status === "rejected"
            ? [listaItens, motivoTxt].filter(Boolean).join("\n\n") || "Confira no painel o que ajustar."
            : motivoTxt || "Confira o painel para mais detalhes.",
      link: "/fornecedor/painel",
    });
    setSalvando(false);
    toast({
      title:
        status === "approved"
          ? `${selected.company_name} aprovado`
          : status === "rejected"
            ? `Ajustes pedidos para ${selected.company_name}`
            : `${selected.company_name} recusado`,
      description: "O fornecedor foi avisado no painel.",
    });
    // segue para o próximo da fila
    const proximo = pendentes.find((s) => s.id !== selected.id);
    setSuppliers((prev) => prev.map((s) => (s.id === selected.id ? { ...s, status } : s)));
    if (proximo && filter === "pending") openSupplier(proximo);
    else setSelected(null);
  };

  const pendentes = useMemo(() => suppliers.filter((s) => s.status === "pending"), [suppliers]);
  const filtered = filter === "all" ? [...suppliers].reverse() : suppliers.filter((s) => s.status === filter);
  const ordenada = filter === "pending" ? filtered : [...filtered].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  const desde = (s: any) => envios[s.id]?.em || s.created_at;
  const atrasado = (s: any) => s.status === "pending" && Date.now() - new Date(desde(s)).getTime() > PRAZO_H * 3600000;
  const atrasados = pendentes.filter(atrasado).length;

  /** checklist automático com o que já existe no cadastro */
  const checklist = useMemo(() => {
    if (!selected) return [];
    const obrigatorios = campos.filter((c) => c.obrigatorio && c.ativo !== false);
    const respondido = (c: any) => {
      const v = respostas.find((r) => r.campo_id === c.id)?.valor;
      if (v === null || v === undefined || v === "") return false;
      if (Array.isArray(v)) return v.length > 0;
      return true;
    };
    const faltando = obrigatorios.filter((c) => !respondido(c));
    const desc = (selected.description || "").trim().length;
    const nome = normaliza(selected.company_name);
    const duplicado = suppliers.find((s) => s.id !== selected.id && nome && normaliza(s.company_name) === nome);
    const temContato = !!(contato?.whatsapp || contato?.phone);
    // preços digitados errado (ex.: 5,8 querendo dizer 5.800)
    const precosSuspeitos: string[] = [];
    campos.forEach((c) => {
      const v = respostas.find((r) => r.campo_id === c.id)?.valor;
      if (c.tipo === "faixa" && v && typeof v === "object") {
        const min = Number(v.min), max = Number(v.max);
        if ((min > 0 && min < PRECO_SUSPEITO) || (max > 0 && max < PRECO_SUSPEITO))
          precosSuspeitos.push(`${c.label}: R$ ${min.toLocaleString("pt-BR")} a R$ ${max.toLocaleString("pt-BR")}`);
      } else if (c.tipo === "numero" && /pre[cç]o/i.test(c.label) && Number(v) > 0 && Number(v) < PRECO_SUSPEITO) {
        precosSuspeitos.push(`${c.label}: R$ ${Number(v).toLocaleString("pt-BR")}`);
      }
    });
    return [
      { ok: !!selected.category_id && !!selected.city, rotulo: "Categoria e cidade preenchidas" },
      { ok: !!selected.profile_photo_url, rotulo: "Foto de perfil", ajuste: "foto_perfil" },
      { ok: photos.length >= 4, rotulo: "Pelo menos 4 fotos do trabalho", det: `${photos.length} ${photos.length === 1 ? "enviada" : "enviadas"}`, ajuste: "fotos_trabalho" },
      { ok: desc >= 80, rotulo: "Descrição com 80+ caracteres", det: `${desc} caracteres`, ajuste: "descricao" },
      { ok: temContato, rotulo: "Telefone ou WhatsApp", det: contato === null ? "verificando…" : undefined, ajuste: "contato" },
      {
        ok: faltando.length === 0,
        rotulo: "Informações obrigatórias da categoria",
        det: faltando.length ? `faltam: ${faltando.map((c) => c.label).slice(0, 3).join(", ")}${faltando.length > 3 ? "…" : ""}` : `${obrigatorios.length} respondidas`,
        ajuste: "obrigatorios",
      },
      { ok: precosSuspeitos.length === 0, rotulo: "Preços parecem corretos", det: precosSuspeitos.join(" · ") || undefined, ajuste: "preco" },
      { ok: !duplicado, rotulo: "Sem cadastro com o mesmo nome", det: duplicado ? `parecido com "${duplicado.company_name}"` : undefined },
    ] as { ok: boolean; rotulo: string; det?: string; ajuste?: string }[];
  }, [selected, campos, respostas, photos, suppliers, contato]);
  const okCount = checklist.filter((c) => c.ok).length;

  const renderValor = (valor: any) => {
    if (valor === null || valor === undefined || valor === "") return <span className="italic" style={{ color: "var(--ad-muted)" }}>vazio</span>;
    if (typeof valor === "boolean") return valor ? "Sim" : "Não";
    if (Array.isArray(valor)) return valor.join(", ");
    if (typeof valor === "object" && ("min" in valor || "max" in valor))
      return `R$ ${Number(valor.min || 0).toLocaleString("pt-BR")} a R$ ${Number(valor.max || 0).toLocaleString("pt-BR")}`;
    if (typeof valor === "object") return JSON.stringify(valor);
    return String(valor);
  };

  const filtros: { k: Filtro; l: string; n?: number }[] = [
    { k: "pending", l: "Aguardando", n: pendentes.length },
    { k: "approved", l: "Aprovados", n: suppliers.filter((s) => s.status === "approved").length },
    { k: "rejected", l: "Ajustes pedidos", n: suppliers.filter((s) => s.status === "rejected").length },
    { k: "blocked", l: "Recusados", n: suppliers.filter((s) => s.status === "blocked").length },
    { k: "all", l: "Todos" },
  ];

  const idx = selected ? pendentes.findIndex((s) => s.id === selected.id) : -1;

  return (
    <div className="cz-enter mx-auto flex max-w-[1280px] flex-col gap-4 px-4 py-5 md:px-7 md:py-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="m-0 text-2xl font-extrabold" style={{ letterSpacing: "-0.03em" }}>
            Aprovar fornecedores
          </h1>
          <p className="m-0 mt-1 text-sm" style={{ color: "var(--ad-body)" }}>
            {pendentes.length} aguardando · prazo de {PRAZO_H} h
            {atrasados > 0 && (
              <b style={{ color: "var(--ad-err)" }}>
                {" "}
                · {atrasados} {atrasados === 1 ? "atrasado" : "atrasados"}
              </b>
            )}
          </p>
        </div>
        <div className="flex gap-1.5 overflow-x-auto" role="group" aria-label="Filtrar">
          {filtros.map((f) => (
            <button
              key={f.k}
              type="button"
              aria-pressed={filter === f.k}
              onClick={() => {
                setFilter(f.k);
                setSelected(null);
              }}
              className="h-8 shrink-0 rounded-full border px-3 text-[12.5px] font-semibold"
              style={
                filter === f.k
                  ? { background: "var(--ad-ink)", color: "#fff", borderColor: "var(--ad-ink)" }
                  : { background: "#fff", borderColor: "var(--ad-line-strong)", color: "var(--ad-ink)" }
              }
            >
              {f.l}
              {f.n !== undefined && <span className="ml-1.5 opacity-60">{f.n}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="grid items-start gap-4 md:grid-cols-[320px_minmax(0,1fr)]">
        {/* fila */}
        <section className={`cz-card overflow-hidden ${selected ? "hidden md:block" : ""}`} aria-label="Fila">
          {loading ? (
            <p className="m-0 p-5 text-sm" style={{ color: "var(--ad-muted)" }}>
              Carregando…
            </p>
          ) : ordenada.length === 0 ? (
            <p className="m-0 p-6 text-center text-sm" style={{ color: "var(--ad-body)" }}>
              {filter === "pending" ? "Nenhum cadastro aguardando. 🎉" : "Nenhum fornecedor."}
            </p>
          ) : (
            <div className="max-h-[70vh] overflow-y-auto">
              {ordenada.map((s) => {
                const ativo = selected?.id === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => openSupplier(s)}
                    className="cz-row flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#fbf8f5]"
                    style={ativo ? { background: "#fbf3ec", boxShadow: "inset 3px 0 0 var(--ad-clay)" } : undefined}
                  >
                    <span className="min-w-0 flex-1">
                      <b className="block truncate text-[13.5px]">{s.company_name}</b>
                      <span className="block truncate text-xs" style={{ color: "var(--ad-muted)" }}>
                        {[s.categories?.name, s.city].filter(Boolean).join(" · ") || "sem categoria"}
                      </span>
                    </span>
                    {s.status === "pending" ? (
                      <span className="flex shrink-0 flex-col items-end gap-1">
                        <span className={`cz-st ${atrasado(s) ? "cz-err" : "cz-off"}`}>{esperando(desde(s))}</span>
                        {envios[s.id]?.reenviado && <span className="cz-st cz-info">Reenviado</span>}
                      </span>
                    ) : (
                      <span className={`cz-st ${STATUS_TOM[s.status] || "cz-off"}`}>{STATUS_LABEL[s.status] || s.status}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* detalhe */}
        {selected ? (
          <div className="flex min-w-0 flex-col gap-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <button type="button" className="mb-1 inline-flex items-center gap-1 text-xs font-semibold md:hidden" style={{ color: "var(--ad-muted)" }} onClick={() => setSelected(null)}>
                  <ChevronLeft className="h-3.5 w-3.5" /> Voltar para a fila
                </button>
                <h2 className="m-0 flex flex-wrap items-center gap-2 text-xl font-extrabold" style={{ letterSpacing: "-0.02em" }}>
                  {selected.company_name}
                  <span className={`cz-st ${STATUS_TOM[selected.status] || "cz-off"}`}>{STATUS_LABEL[selected.status] || selected.status}</span>
                </h2>
                <p className="m-0 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]" style={{ color: "var(--ad-body)" }}>
                  <span>{selected.categories?.name || "sem categoria"}</span>
                  {(selected.city || selected.state) && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {[selected.city, selected.state].filter(Boolean).join(", ")}
                    </span>
                  )}
                  <span>cadastrado em {new Date(selected.created_at).toLocaleDateString("pt-BR")}</span>
                </p>
              </div>
              <div className="flex gap-2">
                <Link to={`/fornecedor/${selected.id}`} target="_blank" className="cz-btn">
                  <ExternalLink className="h-3.5 w-3.5" /> Ver como o casal vê
                </Link>
                {filter === "pending" && pendentes.length > 1 && (
                  <button type="button" className="cz-btn" onClick={() => openSupplier(pendentes[(idx + 1) % pendentes.length])}>
                    Próximo <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
              <div className="flex min-w-0 flex-col gap-4">
                <section className="cz-card p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="m-0 text-[14px] font-bold">Fotos</h3>
                    <span className="text-xs" style={{ color: "var(--ad-muted)" }}>
                      {photos.length} {photos.length === 1 ? "enviada" : "enviadas"} · mínimo 4
                    </span>
                  </div>
                  {photos.length === 0 ? (
                    <p className="m-0 text-sm" style={{ color: "var(--ad-body)" }}>
                      Nenhuma foto enviada.
                    </p>
                  ) : (
                    <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
                      {photos.map((p) => (
                        <a key={p.id} href={p.photo_url} target="_blank" rel="noreferrer">
                          <img src={p.photo_url} alt="" className="aspect-[4/3] w-full rounded-lg object-cover" />
                        </a>
                      ))}
                    </div>
                  )}
                </section>

                <section className="cz-card p-4">
                  <h3 className="m-0 mb-3 text-[14px] font-bold">Dados do cadastro</h3>
                  <dl className="m-0 grid gap-x-5 gap-y-3 text-[13px] sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <dt className="text-[11px] font-bold uppercase" style={{ letterSpacing: ".04em", color: "var(--ad-muted)" }}>
                        Descrição
                      </dt>
                      <dd className="m-0 mt-0.5">{selected.description || renderValor(null)}</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-bold uppercase" style={{ letterSpacing: ".04em", color: "var(--ad-muted)" }}>
                        Contato
                      </dt>
                      <dd className="m-0 mt-0.5 flex flex-col gap-0.5">
                        {contato?.whatsapp || contato?.phone ? (
                          <span className="inline-flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {contato?.whatsapp || contato?.phone}
                          </span>
                        ) : (
                          renderValor(null)
                        )}
                        {contato?.email && <span>{contato.email}</span>}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-bold uppercase" style={{ letterSpacing: ".04em", color: "var(--ad-muted)" }}>
                        Redes sociais
                      </dt>
                      <dd className="m-0 mt-0.5 flex flex-col gap-0.5">
                        {redes === null ? (
                          <span style={{ color: "var(--ad-muted)" }}>carregando…</span>
                        ) : REDES.some((r) => redes[r.chave]) ? (
                          REDES.filter((r) => redes[r.chave]).map((r) => (
                            <a key={r.chave} href={linkRede(r.chave, redes[r.chave])!} target="_blank" rel="noreferrer" className="hover:underline">
                              {r.nome}: {rotuloRede(r.chave, redes[r.chave])}
                            </a>
                          ))
                        ) : (
                          renderValor(null)
                        )}
                      </dd>
                    </div>
                    {(selected.cidades_atendidas || []).length > 0 && (
                      <div>
                        <dt className="text-[11px] font-bold uppercase" style={{ letterSpacing: ".04em", color: "var(--ad-muted)" }}>
                          Cidades atendidas
                        </dt>
                        <dd className="m-0 mt-0.5">{(selected.cidades_atendidas || []).join(", ")}</dd>
                      </div>
                    )}
                    {(selected.price_min || selected.guest_min || selected.guest_max) && (
                      <div>
                        <dt className="text-[11px] font-bold uppercase" style={{ letterSpacing: ".04em", color: "var(--ad-muted)" }}>
                          Preço e capacidade
                        </dt>
                        <dd className="cz-num m-0 mt-0.5">
                          {selected.price_min ? `a partir de R$ ${Number(selected.price_min).toLocaleString("pt-BR")}` : ""}
                          {selected.guest_min || selected.guest_max ? ` · ${selected.guest_min || "?"} a ${selected.guest_max || "?"} convidados` : ""}
                        </dd>
                      </div>
                    )}
                  </dl>
                </section>

                {campos.length > 0 && (
                  <section className="cz-card p-4">
                    <h3 className="m-0 mb-2 text-[14px] font-bold">Respostas do cadastro da categoria</h3>
                    <div className="text-[13px]">
                      {campos.map((c) => {
                        const r = respostas.find((x) => x.campo_id === c.id);
                        return (
                          <div key={c.id} className="cz-row grid gap-3 py-2" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,1.6fr)" }}>
                            <span style={{ color: "var(--ad-muted)" }}>
                              {c.label}
                              {c.obrigatorio && <span style={{ color: "var(--ad-err)" }}> *</span>}
                            </span>
                            <span>{renderValor(r?.valor)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}
              </div>

              <div className="flex min-w-0 flex-col gap-4">
                <section className="cz-card overflow-hidden" aria-label="Checklist e decisão">
                  <div className="flex items-center justify-between px-4 pt-3.5">
                    <h3 className="m-0 text-[14px] font-bold">Checklist</h3>
                    <span className="text-xs" style={{ color: "var(--ad-muted)" }}>
                      {okCount} de {checklist.length} ok
                    </span>
                  </div>
                  <div className="px-4 pb-2 pt-1">
                    {checklist.map((c) => (
                      <div key={c.rotulo} className="cz-row flex items-start gap-2.5 py-2.5 text-[13px]">
                        <span className={`mt-px grid h-5 w-5 shrink-0 place-items-center rounded-full ${c.ok ? "cz-ok" : "cz-warn"}`}>
                          {c.ok ? <Check className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                        </span>
                        <span>
                          {c.rotulo}
                          {c.det && (
                            <small className="block text-xs" style={{ color: "var(--ad-muted)" }}>
                              {c.det}
                            </small>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>

                  {modo === "ajustes" ? (
                    <div className="border-t px-4 pb-4 pt-3" style={{ borderColor: "var(--ad-line)" }}>
                      <p className="m-0 text-[13px] font-bold">O que o fornecedor precisa corrigir</p>
                      <p className="m-0 mb-2 text-xs" style={{ color: "var(--ad-muted)" }}>
                        Os itens reprovados no checklist já vêm marcados. Toque para incluir ou tirar.
                      </p>
                      <div className="mb-2.5 flex flex-wrap gap-1.5">
                        {AJUSTES.map((a) => {
                          const on = itensAjuste.includes(a.codigo);
                          return (
                            <button
                              key={a.codigo}
                              type="button"
                              aria-pressed={on}
                              className="min-h-7 rounded-full border px-2.5 py-1 text-left text-xs font-semibold"
                              style={
                                on
                                  ? { background: "var(--ad-warn-soft)", borderColor: "#ecd3a5", color: "#7a4c0a" }
                                  : { borderColor: "var(--ad-line-strong)", background: "#fff" }
                              }
                              onClick={() => setItensAjuste((l) => (on ? l.filter((x) => x !== a.codigo) : [...l, a.codigo]))}
                            >
                              {on ? "✓ " : "+ "}
                              {a.label}
                            </button>
                          );
                        })}
                      </div>
                      <Textarea
                        rows={3}
                        value={motivo}
                        onChange={(e) => setMotivo(e.target.value)}
                        placeholder="Comentário para o fornecedor (opcional). Ex.: acho que você quis dizer R$ 5.800 a R$ 10.000."
                      />
                      <p className="m-0 mt-1.5 text-xs" style={{ color: "var(--ad-muted)" }}>
                        Ele recebe a lista no painel, corrige e reenvia. O cadastro sai da vitrine até lá.
                      </p>
                      <div className="mt-2.5 flex justify-end gap-2">
                        <button type="button" className="cz-btn" onClick={() => setModo(null)}>
                          Voltar
                        </button>
                        <button
                          type="button"
                          className="cz-btn pri"
                          disabled={(!itensAjuste.length && !motivo.trim()) || salvando}
                          onClick={() => decide("rejected", motivo.trim(), itensAjuste)}
                        >
                          Enviar pedido de ajustes
                        </button>
                      </div>
                    </div>
                  ) : modo === "recusar" ? (
                    <div className="border-t px-4 pb-4 pt-3" style={{ borderColor: "var(--ad-line)", background: "#fffaf8" }}>
                      <p className="m-0 text-[13px] font-bold">Recusar definitivamente</p>
                      <p className="m-0 mb-2 text-xs" style={{ color: "var(--ad-err)" }}>
                        O fornecedor não poderá reenviar. Use só quando não houver ajuste possível.
                      </p>
                      <div className="mb-2 flex flex-wrap gap-1.5">
                        {MOTIVOS_RECUSA.map((m) => (
                          <button
                            key={m}
                            type="button"
                            className="h-7 rounded-full border px-2.5 text-xs font-semibold"
                            style={{ borderColor: "var(--ad-line-strong)", background: "#fff" }}
                            onClick={() => setMotivo((t) => (t.includes(m) ? t : `${t ? t.trim() + " " : ""}${m}.`))}
                          >
                            + {m}
                          </button>
                        ))}
                      </div>
                      <Textarea rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo que o fornecedor vai ver." />
                      <div className="mt-2.5 flex justify-end gap-2">
                        <button type="button" className="cz-btn" onClick={() => setModo(null)}>
                          Voltar
                        </button>
                        <button
                          type="button"
                          className="cz-btn"
                          style={{ background: "var(--ad-err)", borderColor: "var(--ad-err)", color: "#fff" }}
                          disabled={!motivo.trim() || salvando}
                          onClick={() => decide("blocked", motivo.trim())}
                        >
                          <X className="h-3.5 w-3.5" /> Recusar definitivamente
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="flex flex-wrap items-center justify-end gap-2 border-t px-4 py-3"
                      style={{ borderColor: "var(--ad-line)", background: "#fcfbf9" }}
                    >
                      {selected.status === "pending" && (
                        <span className="w-full text-xs font-bold" style={{ color: atrasado(selected) ? "var(--ad-err)" : "var(--ad-muted)" }}>
                          Na fila há {esperando(desde(selected))} · prazo {PRAZO_H} h
                        </span>
                      )}
                      {selected.status !== "blocked" && (
                        <button
                          type="button"
                          className="cz-btn"
                          style={{ color: "var(--ad-err)", borderColor: "#efc9c0" }}
                          onClick={() => {
                            setMotivo("");
                            setModo("recusar");
                          }}
                          disabled={salvando}
                        >
                          Recusar
                        </button>
                      )}
                      {selected.status !== "rejected" && selected.status !== "blocked" && (
                        <button
                          type="button"
                          className="cz-btn"
                          onClick={() => {
                            setItensAjuste(checklist.filter((c) => !c.ok && c.ajuste).map((c) => c.ajuste!));
                            setMotivo("");
                            setModo("ajustes");
                          }}
                          disabled={salvando}
                        >
                          Pedir ajustes
                        </button>
                      )}
                      {selected.status !== "approved" && (
                        <button
                          type="button"
                          className="cz-btn"
                          style={{ background: "var(--ad-ok)", borderColor: "var(--ad-ok)", color: "#fff" }}
                          onClick={() => decide("approved")}
                          disabled={salvando}
                        >
                          <Check className="h-3.5 w-3.5" /> Aprovar
                        </button>
                      )}
                    </div>
                  )}
                </section>

                <section className="cz-card p-4">
                  <h3 className="m-0 mb-2 text-[14px] font-bold">Histórico</h3>
                  {historico.length === 0 ? (
                    <p className="m-0 text-[13px]" style={{ color: "var(--ad-muted)" }}>
                      Sem registros.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2.5 text-[13px]">
                      {historico.map((h) => (
                        <div key={h.id} className="flex gap-2.5">
                          <i className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: "var(--ad-line-strong)" }} />
                          <span>
                            {ACAO_LABEL[h.acao] || h.acao}
                            <small className="block text-xs" style={{ color: "var(--ad-muted)" }}>
                              {new Date(h.created_at).toLocaleString("pt-BR")}
                            </small>
                            {(h.itens || []).length > 0 && (
                              <small className="block whitespace-pre-line text-xs" style={{ color: "var(--ad-body)" }}>
                                {(h.itens as string[]).map((c) => `• ${labelAjuste(c)}`).join("\n")}
                              </small>
                            )}
                            {h.motivo && (
                              <small className="block whitespace-pre-line text-xs" style={{ color: "var(--ad-body)" }}>
                                {h.motivo}
                              </small>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </div>
          </div>
        ) : (
          <div className="cz-card hidden p-10 text-center text-sm md:block" style={{ color: "var(--ad-body)" }}>
            Escolha um cadastro na fila para revisar.
          </div>
        )}
      </div>
    </div>
  );
}
