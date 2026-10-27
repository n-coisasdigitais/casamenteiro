import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { isDemoSession } from "@/lib/demoScope";
import { ClipboardCheck, CalendarRange, AlertTriangle, Star, Hourglass, PartyPopper } from "lucide-react";

/**
 * Painel do admin: o que precisa de atenção agora (fila de trabalho) e como a plataforma está indo.
 * A lista de aprovação que ficava aqui continua em /admin/aprovacao (versão mais completa).
 */

type Periodo = 7 | 30 | 90;
type Fila = {
  aprovacao: { total: number; atrasados: number; nomes: string[] };
  reservas: number;
  webhooks: { total: number; ultimo: string | null };
  avaliacoes: number;
  testes: number;
};
type Numeros = {
  receita: number;
  receitaAnt: number;
  pagantes: number;
  emTeste: number;
  aprovados: number;
  pedidos: number;
  pedidosAnt: number;
  casais: number;
  casaisAnt: number;
  novosFornecedores: number;
};
type Funil = { cadastros: number; simularam: number; pediram: number; responderam: number; contrataram: number };

const reais = (v: number) => "R$ " + Number(v || 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 });
const haQuanto = (iso: string) => {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  return h < 24 ? `há ${h} h` : `há ${Math.floor(h / 24)} dias`;
};
function variacao(atual: number, anterior: number) {
  if (!anterior) return atual > 0 ? { txt: "novo no período", cls: "cz-ok" } : null;
  const pct = Math.round(((atual - anterior) / anterior) * 100);
  if (pct === 0) return { txt: "igual ao período anterior", cls: "cz-off" };
  return { txt: `${pct >= 0 ? "▲" : "▼"} ${Math.abs(pct)}% vs período anterior`, cls: pct >= 0 ? "cz-ok" : "cz-err" };
}

export default function AdminPanel() {
  const { profile } = useAuth();
  const [periodo, setPeriodo] = useState<Periodo>(30);
  const [fila, setFila] = useState<Fila | null>(null);
  const [num, setNum] = useState<Numeros | null>(null);
  const [funil, setFunil] = useState<Funil | null>(null);
  const [barras, setBarras] = useState(false);

  // fila de trabalho (não depende do período)
  useEffect(() => {
    (async () => {
      const demo = isDemoSession();
      const agora = new Date();
      const em7 = new Date(Date.now() + 7 * 864e5).toISOString();
      const ha7 = new Date(Date.now() - 7 * 864e5).toISOString();
      const [pend, reservas, webhooks, rev, prev, testes] = await Promise.all([
        (supabase.from("suppliers") as any).select("id, company_name, created_at").eq("status", "pending").eq("is_demo", demo).order("created_at"),
        (supabase.from("idle_date_reservations" as any) as any).select("id", { count: "exact", head: true }).in("status", ["solicitada", "pendente"]),
        (supabase.from("webhook_events" as any) as any)
          .select("id, created_at")
          .gte("created_at", ha7)
          .or("erro.not.is.null,http_status.gte.400,resultado.ilike.%nao_encontrad%")
          .order("created_at", { ascending: false }),
        (supabase.from("reviews") as any).select("id", { count: "exact", head: true }).eq("aprovado", false),
        (supabase.from("platform_reviews" as any) as any).select("id", { count: "exact", head: true }).or("aprovado.is.null,aprovado.eq.false"),
        (supabase.from("suppliers") as any)
          .select("id", { count: "exact", head: true })
          .eq("is_demo", demo)
          .gte("trial_ends_at", agora.toISOString())
          .lte("trial_ends_at", em7),
      ]);

      // prazo de aprovação: 24 h desde o último envio para aprovação (ou desde o cadastro)
      const pendentes = (pend.data || []) as any[];
      let envio = new Map<string, string>();
      if (pendentes.length) {
        const { data: env } = await (supabase.from("fornecedor_aprovacoes" as any) as any)
          .select("supplier_id, created_at")
          .in(
            "supplier_id",
            pendentes.map((p) => p.id),
          )
          .eq("acao", "submitted")
          .order("created_at", { ascending: false });
        (env || []).forEach((e: any) => {
          if (!envio.has(e.supplier_id)) envio.set(e.supplier_id, e.created_at);
        });
      }
      const atrasados = pendentes.filter((p) => Date.now() - new Date(envio.get(p.id) || p.created_at).getTime() > 24 * 3600000).length;

      const wh = (webhooks.data || []) as any[];
      setFila({
        aprovacao: { total: pendentes.length, atrasados, nomes: pendentes.slice(0, 3).map((p) => p.company_name) },
        reservas: reservas.count || 0,
        webhooks: { total: wh.length, ultimo: wh[0]?.created_at || null },
        avaliacoes: (rev.count || 0) + (prev.count || 0),
        testes: testes.count || 0,
      });
    })();
  }, []);

  // números e funil do período
  useEffect(() => {
    setBarras(false);
    (async () => {
      const demo = isDemoSession();
      const ini = new Date(Date.now() - periodo * 864e5).toISOString();
      const iniAnt = new Date(Date.now() - 2 * periodo * 864e5).toISOString();
      const conta = (q: any) => q.then((r: any) => r.count || 0);

      const [pi, piAnt, pagantes, emTeste, aprovados, pedidos, pedidosAnt, casais, casaisAnt, novosForn] = await Promise.all([
        (supabase.from("payment_intents" as any) as any).select("tipo, valor, comissao").eq("status", "pago").gte("created_at", ini),
        (supabase.from("payment_intents" as any) as any).select("tipo, valor, comissao").eq("status", "pago").gte("created_at", iniAnt).lt("created_at", ini),
        conta((supabase.from("supplier_subscriptions" as any) as any).select("id", { count: "exact", head: true }).eq("status", "ativa")),
        conta((supabase.from("suppliers") as any).select("id", { count: "exact", head: true }).eq("is_demo", demo).gt("trial_ends_at", new Date().toISOString())),
        conta((supabase.from("suppliers") as any).select("id", { count: "exact", head: true }).eq("is_demo", demo).eq("status", "approved")),
        conta((supabase.from("quotes") as any).select("id", { count: "exact", head: true }).gte("created_at", ini)),
        conta((supabase.from("quotes") as any).select("id", { count: "exact", head: true }).gte("created_at", iniAnt).lt("created_at", ini)),
        conta((supabase.from("couples") as any).select("id", { count: "exact", head: true }).eq("is_demo", demo).gte("created_at", ini)),
        conta((supabase.from("couples") as any).select("id", { count: "exact", head: true }).eq("is_demo", demo).gte("created_at", iniAnt).lt("created_at", ini)),
        conta((supabase.from("suppliers") as any).select("id", { count: "exact", head: true }).eq("is_demo", demo).gte("created_at", ini)),
      ]);
      // receita da plataforma: assinaturas e destaques pelo valor; reservas só pela taxa (comissão)
      const soma = (r: any) =>
        ((r.data || []) as any[]).reduce((s, x) => s + Number((x.tipo === "reserva" ? x.comissao : x.valor) || 0), 0);
      setNum({
        receita: soma(pi),
        receitaAnt: soma(piAnt),
        pagantes,
        emTeste,
        aprovados,
        pedidos,
        pedidosAnt,
        casais,
        casaisAnt,
        novosFornecedores: novosForn,
      });

      // funil do casal no período (casais cadastrados no período)
      const { data: novos } = await (supabase.from("couples") as any).select("id, user_id").eq("is_demo", demo).gte("created_at", ini);
      const ids = ((novos || []) as any[]).map((c) => c.id);
      const users = ((novos || []) as any[]).map((c) => c.user_id).filter(Boolean);
      let simularam = 0,
        pediram = 0,
        responderam = 0,
        contrataram = 0;
      if (ids.length) {
        const lote = ids.slice(0, 900);
        const [sims, qs, cs] = await Promise.all([
          (supabase.from("home_simulacoes" as any) as any).select("couple_id, user_id").or(`couple_id.in.(${lote.join(",")}),user_id.in.(${users.slice(0, 900).join(",") || "00000000-0000-0000-0000-000000000000"})`),
          (supabase.from("quotes") as any).select("couple_id, status, kanban_status").in("couple_id", lote),
          (supabase.from("couple_suppliers") as any).select("couple_id").in("couple_id", lote).or("status.eq.contracted,kanban_status.eq.contratado"),
        ]);
        const porUser = new Map(((novos || []) as any[]).map((c) => [c.user_id, c.id]));
        simularam = new Set(((sims.data || []) as any[]).map((s) => s.couple_id || porUser.get(s.user_id)).filter(Boolean)).size;
        const q = (qs.data || []) as any[];
        pediram = new Set(q.map((x) => x.couple_id)).size;
        responderam = new Set(
          q.filter((x) => ["answered", "accepted"].includes(x.status) || (x.kanban_status && x.kanban_status !== "enviado")).map((x) => x.couple_id),
        ).size;
        contrataram = new Set(((cs.data || []) as any[]).map((x) => x.couple_id)).size;
      }
      setFunil({ cadastros: ids.length, simularam, pediram, responderam, contrataram });
      setTimeout(() => setBarras(true), 120);
    })();
  }, [periodo]);

  const h = new Date().getHours();
  const saudacao = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
  const nome = (profile?.full_name || "").split(" ")[0];

  const itensFila = fila
    ? [
        fila.aprovacao.total > 0 && {
          icone: ClipboardCheck,
          tom: "cz-warn",
          titulo: `${fila.aprovacao.total} ${fila.aprovacao.total === 1 ? "fornecedor aguardando" : "fornecedores aguardando"} aprovação`,
          texto: fila.aprovacao.nomes.join(", ") + (fila.aprovacao.total > 3 ? "…" : ""),
          alerta: fila.aprovacao.atrasados > 0 ? `${fila.aprovacao.atrasados} ${fila.aprovacao.atrasados === 1 ? "passou" : "passaram"} de 24 h` : null,
          acao: "Revisar",
          to: "/admin/aprovacao",
          pri: true,
        },
        fila.reservas > 0 && {
          icone: CalendarRange,
          tom: "cz-info",
          titulo: `${fila.reservas} ${fila.reservas === 1 ? "reserva de data ociosa" : "reservas de datas ociosas"} sem resposta`,
          texto: "O fornecedor precisa aceitar ou recusar a reserva do casal.",
          acao: "Ver",
          to: "/admin/reservas",
        },
        fila.webhooks.total > 0 && {
          icone: AlertTriangle,
          tom: "cz-err",
          titulo: `${fila.webhooks.total} ${fila.webhooks.total === 1 ? "aviso de pagamento com problema" : "avisos de pagamento com problema"}`,
          texto: `Últimos 7 dias${fila.webhooks.ultimo ? ` · último ${haQuanto(fila.webhooks.ultimo)}` : ""} · um pagamento pode estar sem baixa.`,
          acao: "Ver",
          to: "/admin/webhooks",
        },
        fila.avaliacoes > 0 && {
          icone: Star,
          tom: "cz-off",
          titulo: `${fila.avaliacoes} ${fila.avaliacoes === 1 ? "avaliação para moderar" : "avaliações para moderar"}`,
          texto: "Avaliações de fornecedores e da plataforma aguardando aprovação.",
          acao: "Moderar",
          to: "/admin/avaliacoes",
        },
        fila.testes > 0 && {
          icone: Hourglass,
          tom: "cz-warn",
          titulo: `${fila.testes} ${fila.testes === 1 ? "teste grátis acaba" : "testes grátis acabam"} em 7 dias`,
          texto: "Bom momento para a mensagem de conversão para o plano pago.",
          acao: "Avisar",
          to: "/admin/comunicacao",
        },
      ].filter(Boolean) as any[]
    : [];

  const vReceita = num ? variacao(num.receita, num.receitaAnt) : null;
  const vPedidos = num ? variacao(num.pedidos, num.pedidosAnt) : null;
  const vCasais = num ? variacao(num.casais, num.casaisAnt) : null;

  const etapas: [string, keyof Funil][] = [
    ["Cadastraram", "cadastros"],
    ["Simularam", "simularam"],
    ["Pediram orçamento", "pediram"],
    ["Receberam resposta", "responderam"],
    ["Contrataram", "contrataram"],
  ];
  const maiorQueda = (() => {
    if (!funil || !funil.cadastros) return null;
    let pior: { de: string; para: string; pct: number } | null = null;
    for (let i = 1; i < etapas.length; i++) {
      const a = funil[etapas[i - 1][1]];
      const b = funil[etapas[i][1]];
      if (!a) continue;
      const pct = Math.round(((a - b) / a) * 100);
      if (!pior || pct > pior.pct) pior = { de: etapas[i - 1][0], para: etapas[i][0], pct };
    }
    return pior;
  })();

  const Kpi = ({ titulo, valor, linha, sub }: { titulo: string; valor: string; linha?: { txt: string; cls: string } | null; sub?: string }) => (
    <div className="cz-card flex flex-col gap-1 px-4 py-3.5">
      <small className="text-xs font-semibold" style={{ color: "var(--ad-muted)" }}>
        {titulo}
      </small>
      <b className="cz-num text-[22px] font-extrabold" style={{ letterSpacing: "-0.03em" }}>
        {valor}
      </b>
      {linha && <span className={`cz-st ${linha.cls} self-start`}>{linha.txt}</span>}
      {sub && (
        <span className="text-xs" style={{ color: "var(--ad-muted)" }}>
          {sub}
        </span>
      )}
    </div>
  );

  return (
    <div className="cz-enter mx-auto flex max-w-[1180px] flex-col gap-4 px-4 py-5 md:px-7 md:py-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="m-0 text-2xl font-extrabold" style={{ letterSpacing: "-0.03em" }}>
            {saudacao}
            {nome ? `, ${nome}` : ""}
          </h1>
          <p className="m-0 mt-1 text-sm" style={{ color: "var(--ad-body)" }}>
            O que precisa de atenção agora e como a plataforma está indo.
          </p>
        </div>
        <select
          className="h-9 rounded-lg border bg-white px-2 text-sm"
          style={{ borderColor: "var(--ad-line-strong)" }}
          value={periodo}
          onChange={(e) => setPeriodo(Number(e.target.value) as Periodo)}
          aria-label="Período"
        >
          <option value={7}>Últimos 7 dias</option>
          <option value={30}>Últimos 30 dias</option>
          <option value={90}>Últimos 90 dias</option>
        </select>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <section className="cz-card" aria-labelledby="h-fila">
          <div className="flex items-center justify-between px-4 pt-3.5">
            <h2 id="h-fila" className="m-0 text-[14.5px] font-bold">
              Precisa de você
            </h2>
            <span className="text-xs" style={{ color: "var(--ad-muted)" }}>
              {fila ? `${itensFila.length} ${itensFila.length === 1 ? "item" : "itens"}` : "carregando…"}
            </span>
          </div>
          <div className="px-4 pb-3 pt-1">
            {fila && itensFila.length === 0 && (
              <div className="flex items-center gap-3 py-4 text-sm" style={{ color: "var(--ad-body)" }}>
                <PartyPopper className="h-5 w-5" style={{ color: "var(--ad-ok)" }} /> Nada pendente agora.
              </div>
            )}
            {itensFila.map((it: any) => (
              <div key={it.titulo} className="cz-row flex items-center gap-3 py-3">
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-[10px] ${it.tom}`}>
                  <it.icone className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <b className="block text-[13.5px]">{it.titulo}</b>
                  <span className="block truncate text-[12.5px]" style={{ color: "var(--ad-body)" }}>
                    {it.texto}
                  </span>
                </span>
                {it.alerta && (
                  <span className="hidden text-xs font-bold sm:inline" style={{ color: "var(--ad-err)" }}>
                    {it.alerta}
                  </span>
                )}
                <Link to={it.to} className={`cz-btn ${it.pri ? "pri" : ""}`}>
                  {it.acao}
                </Link>
              </div>
            ))}
          </div>
        </section>

        <section className="cz-card" aria-labelledby="h-funil">
          <div className="flex items-center justify-between px-4 pt-3.5">
            <h2 id="h-funil" className="m-0 text-[14.5px] font-bold">
              Funil do casal
            </h2>
            <span className="text-xs" style={{ color: "var(--ad-muted)" }}>
              casais que entraram nos últimos {periodo} dias
            </span>
          </div>
          <div className="cz-num flex flex-col gap-2.5 px-4 pb-4 pt-3">
            {etapas.map(([rotulo, k]) => {
              const v = funil ? funil[k] : 0;
              const pct = funil && funil.cadastros ? (v / funil.cadastros) * 100 : 0;
              return (
                <div key={k} className="grid items-center gap-2.5 text-[13px]" style={{ gridTemplateColumns: "130px 1fr 48px" }}>
                  <span>{rotulo}</span>
                  <div className="cz-bar">
                    <i style={{ width: barras ? `${pct}%` : 0 }} />
                  </div>
                  <b className="text-right">{funil ? v : "–"}</b>
                </div>
              );
            })}
            {maiorQueda && maiorQueda.pct > 0 && (
              <p className="m-0 mt-1 text-[12.5px]" style={{ color: "var(--ad-body)" }}>
                Maior queda:{" "}
                <b>
                  {maiorQueda.de.toLowerCase()} → {maiorQueda.para.toLowerCase()}
                </b>{" "}
                (−{maiorQueda.pct}%).
              </p>
            )}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-5">
        <Kpi titulo="Recebido no período" valor={num ? reais(num.receita) : "–"} linha={vReceita} sub="assinaturas, destaques e taxas de reserva" />
        <Kpi titulo="Fornecedores pagantes" valor={num ? String(num.pagantes) : "–"} sub={num ? `${num.emTeste} em teste · ${num.aprovados} aprovados` : undefined} />
        <Kpi titulo="Novos fornecedores" valor={num ? String(num.novosFornecedores) : "–"} sub={`cadastrados em ${periodo} dias`} />
        <Kpi titulo="Pedidos de orçamento" valor={num ? num.pedidos.toLocaleString("pt-BR") : "–"} linha={vPedidos} />
        <Kpi titulo="Casais novos" valor={num ? num.casais.toLocaleString("pt-BR") : "–"} linha={vCasais} />
      </div>
    </div>
  );
}
