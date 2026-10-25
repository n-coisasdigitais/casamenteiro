import { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/* ------------------------------------------------------------------ */
/* Perfil completo (anel + próximos passos)                            */
/* ------------------------------------------------------------------ */
export type PassoPerfil = { key: string; label: string; feito: boolean; onClick: () => void };

export function PerfilCompleto({ passos }: { passos: PassoPerfil[] }) {
  const feitos = passos.filter((p) => p.feito).length;
  const pct = passos.length ? Math.round((feitos / passos.length) * 100) : 0;
  const [mostrar, setMostrar] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setMostrar(pct), 150);
    return () => clearTimeout(t);
  }, [pct]);
  const C = 2 * Math.PI * 42;
  const pendentes = passos.filter((p) => !p.feito);
  return (
    <section className="pv-panel pv-enter flex min-w-0 flex-col gap-3.5 p-5" aria-labelledby="pv-perfil" style={{ animationDelay: ".08s" }}>
      <div className="flex items-center justify-between gap-3">
        <h2 id="pv-perfil" className="m-0 text-base font-bold" style={{ color: "var(--pv-ink)" }}>Seu perfil</h2>
        <span className="text-[13px]" style={{ color: "var(--pv-muted)" }}>{pct === 100 ? "completo" : "mais completo, mais pedidos"}</span>
      </div>
      <div className="flex items-center gap-[18px]">
        <div className="relative h-24 w-24 shrink-0" role="img" aria-label={`Perfil ${pct}% completo`}>
          <svg viewBox="0 0 96 96" className="h-24 w-24 -rotate-90" aria-hidden="true">
            <circle cx="48" cy="48" r="42" fill="none" strokeWidth="9" stroke="var(--pv-sand)" />
            <circle cx="48" cy="48" r="42" fill="none" strokeWidth="9" stroke={pct === 100 ? "var(--pv-ok)" : "var(--pv-clay)"} strokeLinecap="round"
              className="pv-ring" strokeDasharray={C} strokeDashoffset={C - (C * mostrar) / 100} />
          </svg>
          <span className="pv-num absolute inset-0 grid place-items-center text-[22px] font-extrabold" style={{ letterSpacing: "-0.03em", color: "var(--pv-ink)" }}>{pct}%</span>
        </div>
        <ul className="m-0 flex min-w-0 list-none flex-col gap-2 p-0 text-sm">
          {passos.map((p) => (
            <li key={p.key} className="flex items-center gap-2.5">
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full" style={p.feito ? { background: "var(--pv-ok)", color: "#fff" } : { border: "1.5px solid #d9c9b8" }}>
                {p.feito && <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />}
              </span>
              {p.feito ? (
                <span style={{ color: "var(--pv-muted)" }}>{p.label}</span>
              ) : (
                <button type="button" onClick={p.onClick} className="text-left font-semibold hover:underline" style={{ color: "var(--pv-clay)" }}>{p.label}</button>
              )}
            </li>
          ))}
        </ul>
      </div>
      {pendentes.length === 0 && (
        <p className="m-0 text-[13px]" style={{ color: "var(--pv-body)" }}>Tudo preenchido. Perfis completos recebem mais pedidos.</p>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Agenda do mês (somente leitura)                                     */
/* ------------------------------------------------------------------ */
type Marca = "evento" | "bloqueada" | "oferta" | "reserva";
const ESTILO: Record<Marca, React.CSSProperties> = {
  evento: { background: "var(--pv-ink)", color: "#fff", fontWeight: 700 },
  bloqueada: { background: "#efe7dd", color: "var(--pv-body)", fontWeight: 600 },
  reserva: { background: "var(--pv-sage-soft)", color: "var(--pv-ok)", fontWeight: 700 },
  oferta: { border: "1.5px dashed var(--pv-terracota)", color: "var(--pv-clay)", fontWeight: 700 },
};
const NOME: Record<Marca, string> = {
  evento: "Evento fechado",
  bloqueada: "Data bloqueada",
  reserva: "Reserva de data ociosa",
  oferta: "Data com desconto",
};
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function AgendaMes({ supplierId, onGerenciar }: { supplierId: string; onGerenciar: () => void }) {
  const [ref, setRef] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [marcas, setMarcas] = useState<Record<string, Marca>>({});

  useEffect(() => {
    const ini = iso(ref);
    const fim = iso(new Date(ref.getFullYear(), ref.getMonth() + 1, 0));
    (async () => {
      const [{ data: bloq }, { data: promo }, { data: res }, { data: fech }] = await Promise.all([
        (supabase.from("supplier_blocked_dates" as any) as any).select("blocked_date").eq("supplier_id", supplierId).gte("blocked_date", ini).lte("blocked_date", fim),
        (supabase.from("supplier_promo_dates" as any) as any).select("promo_date").eq("supplier_id", supplierId).gte("promo_date", ini).lte("promo_date", fim),
        (supabase.from("idle_date_reservations" as any) as any).select("promo_date, status").eq("supplier_id", supplierId).in("status", ["solicitada", "pendente", "confirmada"]).gte("promo_date", ini).lte("promo_date", fim),
        supabase.from("quotes").select("event_date").eq("supplier_id", supplierId).eq("kanban_status", "fechado").gte("event_date", ini).lte("event_date", fim),
      ]);
      const m: Record<string, Marca> = {};
      ((promo as any[]) ?? []).forEach((r) => (m[String(r.promo_date).slice(0, 10)] = "oferta"));
      ((bloq as any[]) ?? []).forEach((r) => (m[String(r.blocked_date).slice(0, 10)] = "bloqueada"));
      ((res as any[]) ?? []).forEach((r) => (m[String(r.promo_date).slice(0, 10)] = "reserva"));
      ((fech as any[]) ?? []).forEach((r) => r.event_date && (m[String(r.event_date).slice(0, 10)] = "evento"));
      setMarcas(m);
    })();
  }, [supplierId, ref]);

  const dias = useMemo(() => {
    const total = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate();
    const vazio = ref.getDay();
    return [...Array(vazio).fill(null), ...Array.from({ length: total }, (_, i) => new Date(ref.getFullYear(), ref.getMonth(), i + 1))];
  }, [ref]);
  const hoje = iso(new Date());
  const titulo = ref.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const usadas = Array.from(new Set(Object.values(marcas)));

  return (
    <section className="pv-panel pv-enter flex min-w-0 flex-col gap-3.5 p-5" aria-labelledby="pv-agenda" style={{ animationDelay: ".2s" }}>
      <div className="flex items-center justify-between gap-3">
        <h2 id="pv-agenda" className="m-0 text-base font-bold first-letter:uppercase" style={{ color: "var(--pv-ink)" }}>Agenda de {titulo}</h2>
        <span className="flex items-center gap-1">
          <button type="button" aria-label="Mês anterior" onClick={() => setRef((r) => new Date(r.getFullYear(), r.getMonth() - 1, 1))} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-[var(--pv-sand)]"><ChevronLeft className="h-4 w-4" /></button>
          <button type="button" aria-label="Próximo mês" onClick={() => setRef((r) => new Date(r.getFullYear(), r.getMonth() + 1, 1))} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-[var(--pv-sand)]"><ChevronRight className="h-4 w-4" /></button>
        </span>
      </div>
      <div className="pv-num grid grid-cols-7 gap-1.5 text-center text-[13px]">
        {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
          <span key={i} className="text-[11.5px] font-semibold uppercase" style={{ color: "var(--pv-muted)" }}>{d}</span>
        ))}
        {dias.map((d, i) => {
          if (!d) return <span key={`v${i}`} />;
          const k = iso(d);
          const marca = marcas[k];
          return (
            <span key={k} title={marca ? NOME[marca] : undefined} className="grid h-9 place-items-center rounded-[10px]"
              style={{ ...(marca ? ESTILO[marca] : { color: "var(--pv-ink)" }), ...(k === hoje && !marca ? { boxShadow: "inset 0 0 0 1.5px var(--pv-line)" } : {}) }}>
              {d.getDate()}
            </span>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex flex-wrap gap-x-3.5 gap-y-1 text-[12.5px]" style={{ color: "var(--pv-muted)" }}>
          {(usadas.length ? usadas : (["evento", "oferta"] as Marca[])).map((m) => (
            <span key={m} className="inline-flex items-center gap-1.5"><i className="inline-block h-3 w-3 rounded" style={ESTILO[m]} />{NOME[m]}</span>
          ))}
        </span>
        <button type="button" onClick={onGerenciar} className="text-sm font-semibold hover:underline" style={{ color: "var(--pv-clay)" }}>Gerenciar agenda</button>
      </div>
    </section>
  );
}
