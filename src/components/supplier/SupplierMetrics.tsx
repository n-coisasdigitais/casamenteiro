import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Serie = { atual: number; anterior: number; dias: number[] };
type Metrics = { views: Serie; quotes: Serie; proposals: Serie; contracted: Serie };

const DIA = 24 * 60 * 60 * 1000;
const vazia: Serie = { atual: 0, anterior: 0, dias: Array(30).fill(0) };

/** Agrupa datas por dia nos últimos 30 dias (índice 0 = 30 dias atrás). */
function porDia(datas: (string | null | undefined)[]) {
  const dias = Array(30).fill(0);
  const agora = Date.now();
  datas.forEach((d) => {
    if (!d) return;
    const i = 29 - Math.floor((agora - new Date(d).getTime()) / DIA);
    if (i >= 0 && i < 30) dias[i]++;
  });
  return dias;
}

/** Junta os 30 dias em 10 pontos de 3 dias, para o gráfico ficar legível. */
function agrupar(dias: number[]) {
  const out: number[] = [];
  for (let i = 0; i < 30; i += 3) out.push(dias[i] + dias[i + 1] + dias[i + 2]);
  return out;
}

export default function SupplierMetrics({ supplierId }: { supplierId: string }) {
  const [m, setM] = useState<Metrics>({ views: vazia, quotes: vazia, proposals: vazia, contracted: vazia });
  const [recentLeads, setRecentLeads] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [cliquesRedes, setCliquesRedes] = useState<number | null>(null);

  useEffect(() => {
    if (!supplierId) return;
    const since = new Date(Date.now() - 30 * DIA).toISOString();
    const before = new Date(Date.now() - 60 * DIA).toISOString();

    (async () => {
      const { data: supplierData } = await supabase.from("suppliers").select("user_id").eq("id", supplierId).maybeSingle();
      const uid = supplierData?.user_id ?? "00000000-0000-0000-0000-000000000000";

      const [
        { data: views }, { count: viewsPrev },
        { data: quotes }, { count: quotesPrev },
        { data: contracted }, { count: contractedPrev },
        { data: proposals }, { count: proposalsPrev },
        { data: leads },
        { data: cliques },
      ] = await Promise.all([
        supabase.from("supplier_profile_views").select("viewed_at").eq("supplier_id", supplierId).gte("viewed_at", since).limit(5000),
        supabase.from("supplier_profile_views").select("id", { count: "exact", head: true }).eq("supplier_id", supplierId).gte("viewed_at", before).lt("viewed_at", since),
        supabase.from("quotes").select("created_at").eq("supplier_id", supplierId).gte("created_at", since).limit(5000),
        supabase.from("quotes").select("id", { count: "exact", head: true }).eq("supplier_id", supplierId).gte("created_at", before).lt("created_at", since),
        supabase.from("couple_suppliers").select("updated_at").eq("supplier_id", supplierId).eq("kanban_status", "contratado").gte("updated_at", since).limit(5000),
        supabase.from("couple_suppliers").select("id", { count: "exact", head: true }).eq("supplier_id", supplierId).eq("kanban_status", "contratado").gte("updated_at", before).lt("updated_at", since),
        // propostas enviadas: mensagens com valor enviadas pelo fornecedor
        supabase.from("quote_messages").select("created_at").eq("sender_id", uid).not("amount", "is", null).gte("created_at", since).limit(5000),
        supabase.from("quote_messages").select("id", { count: "exact", head: true }).eq("sender_id", uid).not("amount", "is", null).gte("created_at", before).lt("created_at", since),
        supabase.from("supplier_leads").select("id, nome_casal, cidade_evento, data_evento, created_at, status_lead")
          .eq("supplier_id", supplierId).order("created_at", { ascending: false }).limit(5),
        (supabase.from("supplier_redes_cliques" as any) as any).select("user_id").eq("supplier_id", supplierId).gte("created_at", since).limit(5000),
      ]);

      const serie = (rows: any[] | null, campo: string, prev: number | null): Serie => ({
        atual: rows?.length ?? 0,
        anterior: prev ?? 0,
        dias: porDia((rows ?? []).map((r) => r[campo])),
      });
      setM({
        views: serie(views as any[], "viewed_at", viewsPrev),
        quotes: serie(quotes as any[], "created_at", quotesPrev),
        proposals: serie(proposals as any[], "created_at", proposalsPrev),
        contracted: serie(contracted as any[], "updated_at", contractedPrev),
      });
      setRecentLeads(leads || []);
      // pessoas diferentes que abriram alguma rede social
      setCliquesRedes(new Set(((cliques as any[]) || []).map((c) => c.user_id)).size);
      setCarregando(false);
    })();
  }, [supplierId]);

  const cards: { label: string; s: Serie }[] = [
    { label: "Visitas no perfil", s: m.views },
    { label: "Pedidos de orçamento", s: m.quotes },
    { label: "Propostas enviadas", s: m.proposals },
    { label: "Contratos fechados", s: m.contracted },
  ];

  return (
    <div className="flex flex-col gap-4">
      <section aria-label="Últimos 30 dias" className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {cards.map((c, i) => (
          <Indicador key={c.label} rotulo={c.label} serie={c.s} carregando={carregando} atraso={0.08 + i * 0.06} />
        ))}
      </section>

      {!!cliquesRedes && (
        <p className="m-0 -mt-1 text-[13px] text-muted-foreground">
          <b className="text-foreground">{cliquesRedes}</b> {cliquesRedes === 1 ? "casal abriu" : "casais abriram"} suas redes sociais nos últimos 30 dias.
        </p>
      )}

      {recentLeads.length > 0 && (
        <section className="pv-panel pv-enter flex flex-col gap-3 p-5" aria-labelledby="pv-leads" style={{ animationDelay: ".3s" }}>
          <h2 id="pv-leads" className="m-0 text-base font-bold" style={{ color: "var(--pv-ink)" }}>Últimos interessados</h2>
          <ul className="m-0 flex list-none flex-col p-0">
            {recentLeads.map((l, i) => (
              <li key={l.id} className="flex items-center justify-between gap-3 py-2.5 text-sm" style={{ borderTop: i ? "1px solid var(--pv-line)" : undefined }}>
                <span className="min-w-0">
                  <b className="block truncate font-semibold" style={{ color: "var(--pv-ink)" }}>{l.nome_casal || "Casal interessado"}</b>
                  <span className="pv-num block truncate text-[13px]" style={{ color: "var(--pv-muted)" }}>
                    {l.cidade_evento || "—"}
                    {l.data_evento ? ` · ${new Date(l.data_evento).toLocaleDateString("pt-BR")}` : ""}
                  </span>
                </span>
                {l.status_lead && (
                  <span className="shrink-0 rounded-full px-2.5 py-0.5 text-[11.5px] font-bold" style={{ background: "var(--pv-sand)", color: "var(--pv-clay)" }}>
                    {String(l.status_lead).replace(/_/g, " ")}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Indicador({ rotulo, serie, carregando, atraso }: { rotulo: string; serie: Serie; carregando: boolean; atraso: number }) {
  const delta = serie.atual - serie.anterior;
  const pct = serie.anterior > 0 ? Math.round((delta / serie.anterior) * 100) : null;
  const valor = useContagem(carregando ? 0 : serie.atual);
  const pontos = agrupar(serie.dias);
  return (
    <div className="pv-panel pv-enter flex min-w-0 flex-col gap-1.5 p-4" style={{ animationDelay: `${atraso}s` }}>
      <span className="text-[13px] font-medium" style={{ color: "var(--pv-muted)" }}>{rotulo}</span>
      {carregando ? (
        <span className="pv-skel block h-8 w-16" />
      ) : (
        <span className="pv-num text-[30px] font-extrabold leading-none" style={{ letterSpacing: "-0.04em", color: "var(--pv-ink)" }}>{valor.toLocaleString("pt-BR")}</span>
      )}
      <span className="pv-num text-[12.5px] font-semibold" style={{ color: delta > 0 ? "var(--pv-ok)" : delta < 0 ? "var(--pv-err)" : "var(--pv-muted)" }}>
        {carregando ? " " : delta === 0 ? "igual aos 30 dias anteriores" : `${delta > 0 ? "+" : "−"}${pct != null ? `${Math.abs(pct)}%` : Math.abs(delta)} vs. 30 dias anteriores`}
      </span>
      {!carregando && <Sparkline pontos={pontos} />}
    </div>
  );
}

function Sparkline({ pontos }: { pontos: number[] }) {
  const w = 200, h = 38;
  const mx = Math.max(...pontos, 1);
  const xy = pontos.map((v, i) => [(i * w) / (pontos.length - 1), h - 4 - (v / mx) * (h - 10)] as const);
  const d = xy.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const fim = xy[xy.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="mt-1 h-[38px] w-full overflow-visible" aria-hidden="true">
      <path d={`${d} L${w} ${h} L0 ${h}Z`} fill="var(--pv-clay)" opacity={0.08} />
      <path d={d} className="pv-spark-line" fill="none" stroke="var(--pv-clay)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx={fim[0]} cy={fim[1]} r={3} fill="var(--pv-clay)" />
    </svg>
  );
}

/** Conta de 0 até o valor (900 ms), respeitando "reduzir movimento". */
function useContagem(alvo: number) {
  const [v, setV] = useState(0);
  const feito = useRef(false);
  useEffect(() => {
    if (alvo === 0) { setV(0); return; }
    const reduz = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduz || feito.current) { setV(alvo); return; }
    feito.current = true;
    const t0 = performance.now();
    let raf = 0;
    const passo = (t: number) => {
      const p = Math.min(1, (t - t0) / 900);
      setV(Math.round(alvo * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(passo);
    };
    raf = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(raf);
  }, [alvo]);
  return v;
}
