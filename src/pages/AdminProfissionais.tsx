import { traduzirErro } from "@/lib/errorMessages";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import SEO from "@/components/SEO";
import { ArrowLeft, ExternalLink, FileText, Mail, Phone, Search, ShieldCheck, Star } from "lucide-react";
import { TIPOS_DOC, verificacaoLabel } from "@/components/staff/StaffDocumentsTab";
import { appStatusLabel } from "@/lib/staff";
import { semDemo } from "@/lib/demoScope";

type Filtro = "todos" | "em_analise" | "nao_enviado" | "verificado" | "rejeitado";

const TOM_VERIF: Record<string, string> = {
  verificado: "cz-ok",
  em_analise: "cz-warn",
  rejeitado: "cz-err",
  nao_enviado: "cz-off",
};
const CORES = ["#4a7c6a", "#5b7fa6", "#a9551f", "#8a6a9e", "#d9905a", "#c46a5e"];
const iniciais = (s: string) =>
  (s || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
const dataBR = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString("pt-BR") : "—");
const docTipo = (t: string) => TIPOS_DOC.find((x) => x.value === t)?.label || t;
const docStatus = (s: string) => (s === "aprovado" ? "Aprovado" : s === "rejeitado" ? "Recusado" : "Em análise");
const docTom = (s: string) => (s === "aprovado" ? "cz-ok" : s === "rejeitado" ? "cz-err" : "cz-warn");

function Avatar({ s, i, size = 36 }: { s: any; i: number; size?: number }) {
  if (s.foto_url)
    return <img src={s.foto_url} alt="" className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />;
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full text-xs font-extrabold text-white"
      style={{ width: size, height: size, background: CORES[i % CORES.length] }}
    >
      {iniciais(s.nome)}
    </span>
  );
}

export default function AdminProfissionais() {
  const { toast } = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [docs, setDocs] = useState<Record<string, any[]>>({});
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [selId, setSelId] = useState<string | null>(null);
  const [extra, setExtra] = useState<{ apps: any[]; reviews: any[] } | null>(null);
  const [obs, setObs] = useState("");
  const [salvando, setSalvando] = useState(false);

  const load = async () => {
    const [{ data }, { data: profiles }] = await Promise.all([
      (supabase.from("staff_profiles" as any) as any).select("*").order("created_at", { ascending: false }),
      semDemo(supabase.from("profiles").select("user_id, is_demo")),
    ]);
    const userIds = new Set((profiles || []).map((p: any) => p.user_id));
    const scopedRows = (data || []).filter((row: any) => userIds.has(row.user_id));
    setRows(scopedRows);
    const { data: dd } = await (supabase.from("staff_documents" as any) as any).select("*").order("created_at", { ascending: false });
    const map: Record<string, any[]> = {};
    const staffIds = new Set(scopedRows.map((row: any) => row.id));
    (dd || []).filter((d: any) => staffIds.has(d.staff_id)).forEach((d: any) => {
      (map[d.staff_id] ||= []).push(d);
    });
    setDocs(map);
    setCarregando(false);
  };

  useEffect(() => {
    load();
  }, []);

  const sel = useMemo(() => rows.find((r) => r.id === selId) || null, [rows, selId]);

  // ao abrir um profissional: candidaturas e avaliações
  useEffect(() => {
    if (!selId) return;
    setExtra(null);
    setObs(rows.find((r) => r.id === selId)?.verificacao_obs || "");
    (async () => {
      const [apps, revs] = await Promise.all([
        (supabase.from("staff_applications" as any) as any)
          .select("id, status, origem, created_at, staff_jobs(funcao, data, cidade, suppliers(company_name))")
          .eq("staff_id", selId)
          .order("created_at", { ascending: false })
          .limit(20),
        (supabase.from("staff_reviews" as any) as any)
          .select("id, estrelas, comentario, created_at")
          .eq("avaliado_id", selId)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);
      setExtra({ apps: apps?.data || [], reviews: revs?.data || [] });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selId]);

  const abrir = async (d: any) => {
    const { data, error } = await supabase.storage.from("staff-docs").createSignedUrl(d.file_path, 60);
    if (error || !data) return toast({ title: "Erro ao abrir arquivo", variant: "destructive" });
    window.open(data.signedUrl, "_blank");
  };

  const decidirDoc = async (d: any, novo: "aprovado" | "rejeitado") => {
    const { error } = await (supabase.from("staff_documents" as any) as any).update({ status: novo }).eq("id", d.id);
    if (error) return toast({ title: "Erro", description: traduzirErro(error), variant: "destructive" });
    load();
  };

  const decidirPerfil = async (novo: "verificado" | "rejeitado") => {
    if (!sel) return;
    setSalvando(true);
    const { error } = await (supabase.from("staff_profiles" as any) as any)
      .update({
        verificacao_status: novo,
        verificado_em: novo === "verificado" ? new Date().toISOString() : null,
        verificacao_obs: obs.trim() || null,
      })
      .eq("id", sel.id);
    setSalvando(false);
    if (error) return toast({ title: "Erro", description: traduzirErro(error), variant: "destructive" });
    toast({ title: novo === "verificado" ? "Profissional verificado" : "Verificação recusada" });
    load();
  };

  const statusDe = (r: any) => r.verificacao_status || "nao_enviado";
  const conta = (f: Filtro) => (f === "todos" ? rows.length : rows.filter((r) => statusDe(r) === f).length);
  const filtradas = rows.filter((r) => {
    const t = busca.toLowerCase();
    const okBusca =
      !t || [r.nome, r.cidade, r.email, r.telefone, ...(r.funcoes || [])].some((v) => String(v || "").toLowerCase().includes(t));
    return okBusca && (filtro === "todos" || statusDe(r) === filtro);
  });

  const filtros: { k: Filtro; l: string }[] = [
    { k: "todos", l: "Todos" },
    { k: "em_analise", l: "Em análise" },
    { k: "nao_enviado", l: "Não verificados" },
    { k: "verificado", l: "Verificados" },
    { k: "rejeitado", l: "Recusados" },
  ];

  const docsSel = sel ? docs[sel.id] || [] : [];
  const idxSel = sel ? rows.findIndex((r) => r.id === sel.id) : 0;

  return (
    <div className="cz-enter mx-auto flex max-w-[1280px] flex-col gap-4 px-4 py-5 md:px-7 md:py-6">
      <SEO title="Profissionais — Admin" noIndex />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="m-0 text-2xl font-extrabold" style={{ letterSpacing: "-0.03em" }}>
            Profissionais
          </h1>
          <p className="cz-num m-0 mt-1 text-sm" style={{ color: "var(--ad-body)" }}>
            {rows.length} cadastrados · {conta("em_analise")} aguardando verificação
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="flex gap-1.5 overflow-x-auto" role="group" aria-label="Filtro">
          {filtros.map((f) => (
            <button
              key={f.k}
              type="button"
              aria-pressed={filtro === f.k}
              onClick={() => setFiltro(f.k)}
              className="h-8 shrink-0 rounded-full border px-3 text-[12.5px] font-semibold"
              style={
                filtro === f.k
                  ? { background: "var(--ad-ink)", color: "#fff", borderColor: "var(--ad-ink)" }
                  : { background: "#fff", borderColor: "var(--ad-line-strong)", color: "var(--ad-ink)" }
              }
            >
              {f.l}
              <span className="cz-num ml-1.5 opacity-60">{conta(f.k)}</span>
            </button>
          ))}
        </div>
        <div className="relative max-w-[480px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--ad-muted)" }} />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, cidade, função, e-mail ou telefone"
            className="h-9 bg-white pl-9"
          />
        </div>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        {/* lista */}
        <section className={`cz-card overflow-hidden ${sel ? "hidden lg:block" : ""}`}>
          {carregando ? (
            <p className="m-0 p-5 text-sm" style={{ color: "var(--ad-muted)" }}>
              Carregando…
            </p>
          ) : filtradas.length === 0 ? (
            <p className="m-0 p-6 text-center text-sm" style={{ color: "var(--ad-body)" }}>
              Nenhum profissional encontrado.
            </p>
          ) : (
            filtradas.map((s, i) => {
              const nd = (docs[s.id] || []).length;
              const ativo = sel?.id === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelId(s.id)}
                  className="cz-row flex w-full items-center gap-3 px-4 py-3 text-left transition-colors"
                  style={{ background: ativo ? "#fbf3ec" : undefined, boxShadow: ativo ? "inset 3px 0 0 var(--ad-clay)" : undefined }}
                >
                  <Avatar s={s} i={i} />
                  <span className="min-w-0 flex-1">
                    <b className="flex items-center gap-1.5 truncate text-[13.5px]">
                      {s.nome}
                      {statusDe(s) === "verificado" && <ShieldCheck className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--ad-ok)" }} />}
                    </b>
                    <span className="block truncate text-xs" style={{ color: "var(--ad-muted)" }}>
                      {[s.cidade && `${s.cidade}${s.estado ? `/${s.estado}` : ""}`, (s.funcoes || []).slice(0, 2).join(", ")]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </span>
                    <span className="block text-[11.5px]" style={{ color: "var(--ad-muted)" }}>
                      {nd ? `${nd} documento${nd > 1 ? "s" : ""}` : "sem documentos"} · desde {dataBR(s.created_at)}
                    </span>
                  </span>
                  <span className={`cz-st ${TOM_VERIF[statusDe(s)] || "cz-off"}`}>
                    {statusDe(s) === "em_analise" ? "Em análise" : statusDe(s) === "verificado" ? "Verificado" : statusDe(s) === "rejeitado" ? "Recusado" : "Não verificado"}
                  </span>
                </button>
              );
            })
          )}
        </section>

        {/* ficha */}
        {!sel ? (
          <section className="cz-card hidden p-8 text-center text-sm lg:block" style={{ color: "var(--ad-muted)" }}>
            Escolha um profissional na lista para ver os dados, documentos e histórico.
          </section>
        ) : (
          <div className="flex min-w-0 flex-col gap-4">
            <button
              type="button"
              onClick={() => setSelId(null)}
              className="inline-flex items-center gap-1 self-start text-xs font-semibold lg:hidden"
              style={{ color: "var(--ad-muted)" }}
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Voltar para a lista
            </button>

            <section className="cz-card p-4 md:p-5">
              <div className="flex flex-wrap items-start gap-4">
                <Avatar s={sel} i={idxSel} size={64} />
                <div className="min-w-0 flex-1">
                  <h2 className="m-0 flex flex-wrap items-center gap-2 text-xl font-extrabold" style={{ letterSpacing: "-0.02em" }}>
                    {sel.nome}
                    <span className={`cz-st ${TOM_VERIF[statusDe(sel)] || "cz-off"}`}>{verificacaoLabel(sel.verificacao_status)}</span>
                  </h2>
                  <p className="m-0 mt-1 text-[13px]" style={{ color: "var(--ad-body)" }}>
                    {[sel.cidade && `${sel.cidade}${sel.estado ? `/${sel.estado}` : ""}`, `atende até ${sel.raio_km ?? "?"} km`]
                      .filter(Boolean)
                      .join(" · ")}{" "}
                    · cadastrado em {dataBR(sel.created_at)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(sel.funcoes || []).map((f: string) => (
                      <span key={f} className="cz-st cz-off">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
                {sel.slug && sel.is_public && (
                  <Link to={`/profissional/${sel.slug}`} target="_blank" className="cz-btn">
                    <ExternalLink className="h-3.5 w-3.5" /> Perfil público
                  </Link>
                )}
              </div>

              <div className="cz-num mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {[
                  ["Eventos aceitos", String(sel.eventos_aceitos ?? 0)],
                  ["Eventos concluídos", String(sel.eventos_concluidos ?? 0)],
                  ["Nota", sel.rating ? `${Number(sel.rating).toFixed(1).replace(".", ",")} (${sel.review_count || 0})` : "—"],
                  ["Valor mínimo/turno", sel.valor_min_turno ? `R$ ${Number(sel.valor_min_turno).toLocaleString("pt-BR")}` : "—"],
                ].map(([l, v]) => (
                  <div key={l} className="rounded-xl border px-3 py-2.5" style={{ borderColor: "var(--ad-line)" }}>
                    <small className="block text-[11.5px] font-semibold" style={{ color: "var(--ad-muted)" }}>
                      {l}
                    </small>
                    <b className="text-[15px] font-extrabold">{v}</b>
                  </div>
                ))}
              </div>
            </section>

            <div className="grid items-start gap-4 xl:grid-cols-2">
              <section className="cz-card p-4 text-[13px]">
                <h3 className="m-0 mb-2.5 text-[14px] font-bold">Dados de contato</h3>
                <div className="flex flex-col gap-1.5">
                  <span className="inline-flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5" style={{ color: "var(--ad-muted)" }} />
                    {sel.email || "—"}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5" style={{ color: "var(--ad-muted)" }} />
                    {sel.telefone || "—"}
                  </span>
                  <span className="mt-1.5 border-t pt-2.5" style={{ borderColor: "var(--ad-line)", color: "var(--ad-body)" }}>
                    {sel.disponivel ? "Disponível para convites" : "Indisponível no momento"} · perfil {sel.is_public ? "público" : "oculto"} ·
                    LGPD {sel.consentimento_lgpd ? "aceita" : "não aceita"}
                  </span>
                </div>
                <h3 className="m-0 mb-1.5 mt-4 text-[14px] font-bold">Sobre</h3>
                <p className="m-0 whitespace-pre-line" style={{ color: "var(--ad-body)" }}>
                  {sel.bio || "Sem descrição."}
                </p>
              </section>

              <section className="cz-card overflow-hidden">
                <h3 className="m-0 px-4 pb-2 pt-4 text-[14px] font-bold">Documentos ({docsSel.length})</h3>
                {docsSel.length === 0 ? (
                  <p className="m-0 px-4 pb-4 text-[13px]" style={{ color: "var(--ad-muted)" }}>
                    Nenhum documento enviado ainda.
                  </p>
                ) : (
                  docsSel.map((d) => (
                    <div key={d.id} className="cz-row flex flex-wrap items-center gap-2 px-4 py-3 text-[13px]">
                      <button type="button" onClick={() => abrir(d)} className="flex min-w-0 flex-1 basis-[220px] items-center gap-2 text-left hover:underline">
                        <FileText className="h-4 w-4 shrink-0" style={{ color: "var(--ad-clay)" }} />
                        <span className="min-w-0">
                          <b className="block">{docTipo(d.tipo)}</b>
                          <span className="block truncate text-xs" style={{ color: "var(--ad-muted)" }}>
                            {d.file_name || "arquivo"} · {dataBR(d.created_at)} · clique para abrir
                          </span>
                        </span>
                      </button>
                      <span className={`cz-st ${docTom(d.status)}`}>{docStatus(d.status)}</span>
                      {d.status !== "aprovado" && (
                        <button type="button" className="cz-btn" onClick={() => decidirDoc(d, "aprovado")}>
                          Aprovar
                        </button>
                      )}
                      {d.status !== "rejeitado" && (
                        <button type="button" className="cz-btn" onClick={() => decidirDoc(d, "rejeitado")}>
                          Recusar
                        </button>
                      )}
                    </div>
                  ))
                )}
              </section>
            </div>

            <div className="grid items-start gap-4 xl:grid-cols-2">
              <section className="cz-card overflow-hidden">
                <h3 className="m-0 px-4 pb-2 pt-4 text-[14px] font-bold">Convites e candidaturas</h3>
                {!extra ? (
                  <p className="m-0 px-4 pb-4 text-[13px]" style={{ color: "var(--ad-muted)" }}>
                    Carregando…
                  </p>
                ) : extra.apps.length === 0 ? (
                  <p className="m-0 px-4 pb-4 text-[13px]" style={{ color: "var(--ad-muted)" }}>
                    Ainda não participou de vagas.
                  </p>
                ) : (
                  extra.apps.map((a) => (
                    <div key={a.id} className="cz-row flex items-center justify-between gap-2 px-4 py-2.5 text-[13px]">
                      <span className="min-w-0">
                        <b className="block truncate">
                          {a.staff_jobs?.funcao || "Vaga"} · {a.staff_jobs?.suppliers?.company_name || "fornecedor"}
                        </b>
                        <span className="block text-xs" style={{ color: "var(--ad-muted)" }}>
                          {dataBR(a.staff_jobs?.data)} {a.staff_jobs?.cidade ? `· ${a.staff_jobs.cidade}` : ""}
                        </span>
                      </span>
                      <span className="cz-st cz-off">{appStatusLabel(a.status)}</span>
                    </div>
                  ))
                )}
              </section>

              <section className="cz-card overflow-hidden">
                <h3 className="m-0 px-4 pb-2 pt-4 text-[14px] font-bold">Avaliações recebidas</h3>
                {!extra ? (
                  <p className="m-0 px-4 pb-4 text-[13px]" style={{ color: "var(--ad-muted)" }}>
                    Carregando…
                  </p>
                ) : extra.reviews.length === 0 ? (
                  <p className="m-0 px-4 pb-4 text-[13px]" style={{ color: "var(--ad-muted)" }}>
                    Nenhuma avaliação ainda.
                  </p>
                ) : (
                  extra.reviews.map((r) => (
                    <div key={r.id} className="cz-row px-4 py-2.5 text-[13px]">
                      <b className="inline-flex items-center gap-1">
                        <Star className="h-3 w-3" style={{ color: "var(--ad-terracota)", fill: "var(--ad-terracota)" }} />
                        {r.estrelas} · {dataBR(r.created_at)}
                      </b>
                      {r.comentario && (
                        <span className="block text-xs" style={{ color: "var(--ad-body)" }}>
                          {r.comentario}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </section>
            </div>

            <section className="cz-card flex flex-col gap-2.5 p-4">
              <h3 className="m-0 text-[14px] font-bold">Decisão da verificação</h3>
              <p className="m-0 text-xs" style={{ color: "var(--ad-muted)" }}>
                Confira os documentos acima. A observação aparece para o profissional no painel dele.
              </p>
              <Input
                placeholder="Observação para o profissional (opcional)"
                className="bg-white"
                value={obs}
                onChange={(e) => setObs(e.target.value)}
              />
              <div className="flex flex-wrap justify-end gap-2">
                <button type="button" className="cz-btn" disabled={salvando} onClick={() => decidirPerfil("rejeitado")}>
                  Recusar verificação
                </button>
                <button type="button" className="cz-btn pri" disabled={salvando} onClick={() => decidirPerfil("verificado")}>
                  <ShieldCheck className="h-3.5 w-3.5" /> Verificar profissional
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
