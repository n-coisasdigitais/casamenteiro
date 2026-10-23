import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import {
  BarChart3, Calendar, CalendarHeart, Clock, Inbox, KanbanSquare, MapPin, Menu, MessageCircle,
  RefreshCw, ShieldCheck, Sparkles, Star, Users, Wallet, X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useFeatureStatus, type FeatureStatus } from "@/contexts/FeatureFlagsContext";
import EmBreveBadge from "@/components/shared/EmBreveBadge";
import { FUNCOES_STAFF } from "@/lib/staff";
import { formatBRL } from "@/lib/platformPricing";
import type { PainelIcone } from "@/lib/supplierLandingConfig";
import type { ProfissionalLandingConfig } from "@/lib/profissionalLandingConfig";
import heroWedding from "@/assets/hero-wedding.jpg";

export type VagaPublica = {
  id: string;
  funcao: string;
  data: string;
  hora_inicio?: string | null;
  hora_fim?: string | null;
  cidade?: string | null;
  vagas?: number | null;
  valor_turno?: number | null;
  supplier?: { company_name?: string | null } | null;
};

export const linkCadastroProfissional = (email?: string) => `/profissional/cadastro${email ? `?email=${encodeURIComponent(email)}` : ""}`;

const Serif = ({ children, cor }: { children: React.ReactNode; cor: string }) => (
  <span className="hv-serif" style={{ color: cor }}>{children}</span>
);
const Eyebrow = ({ children, cor }: { children: React.ReactNode; cor: string }) => (
  <p className="hv-eyebrow m-0" style={{ color: cor }}>{children}</p>
);

const ICONES: Record<PainelIcone, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  inbox: Inbox, message: MessageCircle, kanban: KanbanSquare, calendar: Calendar, "calendar-heart": CalendarHeart,
  users: Users, star: Star, wallet: Wallet, sparkles: Sparkles, "bar-chart": BarChart3, refresh: RefreshCw, shield: ShieldCheck,
};

const fmtData = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "");
const fmtHora = (v?: string | null, f?: string | null) => (v ? `${String(v).slice(0, 5)}${f ? `–${String(f).slice(0, 5)}` : ""}` : null);

/* ------------------------------------------------------------------ */
/* Navegação + Hero                                                    */
/* ------------------------------------------------------------------ */
const ANCORAS = [
  { href: "#como", label: "Como funciona" },
  { href: "#funcoes", label: "Funções" },
  { href: "#recursos", label: "Painel" },
  { href: "#duvidas", label: "Dúvidas" },
];

function NavProfissional({ status }: { status: FeatureStatus }) {
  const { user } = useAuth();
  const [aberto, setAberto] = useState(false);
  const ativo = status === "ativo";
  return (
    <>
      <nav aria-label="Navegação" className="relative z-10 mx-auto flex max-w-[1200px] items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 text-[19px] font-extrabold text-white sm:text-[22px]" style={{ letterSpacing: "-0.03em" }}>
          casamenteiro<span style={{ color: "var(--hv-peach)" }}>.</span>
          <span className="hidden rounded-full border px-2.5 py-1 text-[12px] font-semibold sm:inline" style={{ letterSpacing: 0, color: "var(--hv-peach)", borderColor: "rgba(242,185,138,.5)" }}>
            para profissionais
          </span>
        </Link>
        <span className="hidden gap-7 text-[15px] font-medium lg:flex">
          {ANCORAS.map((a) => (
            <a key={a.href} href={a.href} className="text-white hover:opacity-80">{a.label}</a>
          ))}
        </span>
        <span className="flex items-center gap-1.5 sm:gap-2.5">
          {ativo && (
            <Link to={user ? "/profissional/painel" : "/profissional/login"} className="inline-flex min-h-[44px] items-center px-2 text-[15px] font-semibold text-white">
              {user ? "Meu painel" : "Entrar"}
            </Link>
          )}
          <a href="#comecar" className="hv-btn inline-flex whitespace-nowrap min-h-[44px] items-center rounded-full bg-white px-4 text-[15px] font-bold sm:px-5" style={{ color: "var(--hv-ink)" }}>
            {ativo ? "Criar perfil" : "Avise-me"}
          </a>
          <button type="button" onClick={() => setAberto(true)} aria-label="Abrir menu" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-white lg:hidden" style={{ borderColor: "rgba(255,255,255,.45)", background: "rgba(255,255,255,.12)" }}>
            <Menu className="h-5 w-5" />
          </button>
        </span>
      </nav>
      {aberto && (
        <div role="dialog" aria-modal="true" aria-label="Menu" className="fixed inset-0 z-[60] lg:hidden" style={{ background: "rgba(20,14,10,.45)" }} onClick={() => setAberto(false)}>
          <div className="flex flex-col rounded-b-[28px] bg-white px-6 pb-7 pt-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex min-h-[56px] items-center justify-between">
              <Link to="/" onClick={() => setAberto(false)} className="text-[20px] font-extrabold" style={{ color: "var(--hv-ink)" }}>casamenteiro<span style={{ color: "var(--hv-terracota)" }}>.</span></Link>
              <button type="button" onClick={() => setAberto(false)} aria-label="Fechar menu" className="inline-flex h-11 w-11 items-center justify-center rounded-full border" style={{ borderColor: "var(--hv-line)", color: "var(--hv-ink)" }}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <Link to="/" onClick={() => setAberto(false)} className="flex min-h-[56px] items-center border-b text-[20px] font-bold" style={{ borderColor: "#f2eee8", color: "var(--hv-ink)" }}>Página inicial</Link>
            {ANCORAS.map((a) => (
              <a key={a.href} href={a.href} onClick={() => setAberto(false)} className="flex min-h-[56px] items-center border-b text-[20px] font-bold" style={{ borderColor: "#f2eee8", color: "var(--hv-ink)" }}>{a.label}</a>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

export function HeroProfissional({ cfg, status, vagas }: { cfg: ProfissionalLandingConfig; status: FeatureStatus; vagas: VagaPublica[] }) {
  const h = cfg.hero;
  const ativo = status === "ativo";
  // cards do hero: vagas reais quando houver; senão, ilustração (rotulada)
  const reais = ativo && vagas.length > 0;
  const cards = reais
    ? vagas.slice(0, 3).map((v) => ({
        t: v.funcao,
        s: [fmtData(v.data), v.cidade, v.valor_turno ? `${formatBRL(Number(v.valor_turno))} o turno` : null].filter(Boolean).join(" · "),
      }))
    : [
        { t: "Convite: Garçom", s: "Sábado · Belo Horizonte · valor do turno combinado" },
        { t: "Vaga aberta: Barman", s: "Festa de formatura · candidate-se" },
        { t: "Você foi avaliado ★★★★★", s: "Buffet parceiro · evento concluído" },
      ];

  return (
    <section className="relative overflow-hidden text-white" style={{ background: "var(--hv-ink)" }}>
      <img src={h.imagem || heroWedding} alt="" className="hv-kb absolute inset-0 h-full w-full object-cover" style={{ opacity: 0.45 }} />
      <div aria-hidden="true" className="absolute inset-0" style={{ background: "linear-gradient(100deg, rgba(20,14,10,.94) 0%, rgba(20,14,10,.72) 45%, rgba(20,14,10,.35) 100%)" }} />
      <NavProfissional status={status} />

      <div className="relative mx-auto flex max-w-[1200px] flex-wrap items-center gap-14 px-6 pb-24 pt-14">
        <div className="flex min-w-0 flex-1 basis-[520px] flex-col gap-5">
          <p className="hv-up m-0 inline-flex flex-wrap items-center gap-2.5 self-start rounded-full px-3.5 py-2 text-sm font-semibold" style={{ background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.3)" }}>
            <span className="hv-pulse h-2 w-2 rounded-full" style={{ background: "var(--hv-peach)" }} />
            {h.eyebrow}
            {!ativo && <EmBreveBadge escuro />}
          </p>
          <h1 className="hv-up hv-d1 m-0" style={{ fontSize: "clamp(44px, 6.4vw, 88px)", lineHeight: 0.98, fontWeight: 800, letterSpacing: "-0.045em" }}>
            {h.title_pre} <Serif cor="#F7C9A1">{h.title_em}</Serif>
          </h1>
          <p className="hv-up hv-d2 m-0 max-w-[560px] text-[19px] leading-normal" style={{ color: "#F4E7DC" }}>{h.subtitle}</p>
          <div className="hv-up hv-d3 mt-1.5 flex flex-wrap gap-3">
            <a href="#comecar" className="hv-btn inline-flex min-h-[58px] items-center rounded-full bg-white px-8 text-[17px] font-bold" style={{ color: "var(--hv-ink)" }}>
              {ativo ? h.cta_label : cfg.cta.espera_button}
            </a>
            <a href="#como" className="hv-btn inline-flex min-h-[58px] items-center rounded-full px-7 text-[17px] font-semibold text-white" style={{ border: "1px solid rgba(255,255,255,.55)", background: "rgba(255,255,255,.1)" }}>
              Como funciona
            </a>
          </div>
          <p className="hv-up hv-d3 m-0 flex flex-wrap gap-x-5 gap-y-2 text-sm" style={{ color: "#E9DDD2" }}>
            {cfg.combinado.itens.map((c) => <span key={c}>✓ {c}</span>)}
          </p>
        </div>

        <div aria-label={reais ? "Vagas abertas agora" : "Ilustração do painel do profissional"} className="flex min-w-0 flex-[0_1_400px] flex-col gap-3">
          {cards.map((n, i) => (
            <div key={n.t + i} className={`fv-lead flex items-start gap-3.5 rounded-[20px] bg-white px-[18px] py-4 ${i === 1 ? "fv-lead-2 ml-7" : i === 2 ? "fv-lead-3" : ""}`} style={{ color: "var(--hv-ink)", boxShadow: "0 24px 50px rgba(0,0,0,.35)" }}>
              <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-extrabold" style={{ background: ["var(--hv-sand)", "#E7EFEB", "var(--hv-ink)"][i], color: ["var(--hv-clay)", "var(--hv-sage)", "var(--hv-peach)"][i] }}>
                {["✉", "★", "✓"][i]}
                {i === 0 && <span className="fv-ping absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full" style={{ background: "var(--hv-terracota)" }} />}
              </span>
              <span className="flex min-w-0 flex-col gap-1">
                <strong className="text-[15px]">{n.t}</strong>
                <span className="text-[13px]" style={{ color: "var(--hv-body)" }}>{n.s}</span>
              </span>
            </div>
          ))}
          {!reais && <p className="m-0 ml-1 text-xs" style={{ color: "#CFC6BC" }}>Ilustração do painel</p>}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 01 Como funciona                                                    */
/* ------------------------------------------------------------------ */
export function ComoProfissional({ cfg }: { cfg: ProfissionalLandingConfig }) {
  const cores = [
    { bg: "var(--hv-sand)", num: "var(--hv-clay)", numFg: "#fff", fg: "var(--hv-ink)", sub: "var(--hv-body)" },
    { bg: "#E7EFEB", num: "var(--hv-sage)", numFg: "#fff", fg: "var(--hv-ink)", sub: "#4D5A54" },
    { bg: "var(--hv-ink)", num: "var(--hv-peach)", numFg: "var(--hv-ink)", fg: "var(--hv-cream)", sub: "#CFC6BC" },
  ];
  return (
    <section id="como" aria-labelledby="como-title" className="scroll-mt-6 px-6 py-28">
      <div className="mx-auto flex max-w-[1152px] flex-col gap-14">
        <div className="flex flex-col items-center gap-3.5 text-center">
          <Eyebrow cor="var(--hv-clay)">{cfg.como.eyebrow}</Eyebrow>
          <h2 id="como-title" className="hv-display m-0" style={{ fontSize: "clamp(40px, 5vw, 64px)" }}>{cfg.como.title}</h2>
        </div>
        <ol className="m-0 grid list-none gap-4 p-0" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
          {cfg.como.passos.map((p, i) => {
            const c = cores[i % cores.length];
            return (
              <li key={i} className="hv-lift flex flex-col gap-3 rounded-[28px] p-8" style={{ background: c.bg, color: c.fg }}>
                <span className="flex h-14 w-14 items-center justify-center rounded-full text-[22px] font-extrabold" style={{ background: c.num, color: c.numFg }}>{String(i + 1).padStart(2, "0")}</span>
                <span className="text-[26px] font-extrabold" style={{ letterSpacing: "-0.03em" }}>{p.titulo}</span>
                <span className="text-[17px] leading-normal" style={{ color: c.sub }}>{p.texto}</span>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 02 Funções                                                          */
/* ------------------------------------------------------------------ */
export function FuncoesProfissional({ cfg, vagas }: { cfg: ProfissionalLandingConfig; vagas: VagaPublica[] }) {
  const comVaga = new Set(vagas.map((v) => v.funcao));
  return (
    <section id="funcoes" aria-labelledby="funcoes-title" className="scroll-mt-6 px-6 pb-28">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-10 rounded-[36px] px-8 py-14 md:px-12" style={{ background: "var(--hv-sand)" }}>
        <div className="flex max-w-[720px] flex-col gap-3.5">
          <Eyebrow cor="var(--hv-clay)">{cfg.funcoes.eyebrow}</Eyebrow>
          <h2 id="funcoes-title" className="hv-display m-0" style={{ fontSize: "clamp(36px, 4.4vw, 56px)" }}>{cfg.funcoes.title}</h2>
          <p className="m-0 text-[19px] leading-normal" style={{ color: "var(--hv-body)" }}>{cfg.funcoes.subtitle}</p>
        </div>
        <ul className="m-0 flex list-none flex-wrap gap-2.5 p-0">
          {FUNCOES_STAFF.map((f) => (
            <li key={f} className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-[18px] text-[16px] font-semibold" style={{ border: "1px solid #EADBCB" }}>
              {f}
              {comVaga.has(f) && (
                <span className="rounded-full px-2 py-0.5 text-[11px] font-extrabold uppercase" style={{ letterSpacing: ".05em", background: "#E7EFEB", color: "#3B6656" }}>vaga aberta</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 03 Recursos (com ícone e flag)                                      */
/* ------------------------------------------------------------------ */
export function RecursosProfissional({ cfg }: { cfg: ProfissionalLandingConfig }) {
  const status = useFeatureStatus();
  const itens = cfg.recursos.items.map((it) => ({ ...it, st: status(it.flag) })).filter((it) => it.st !== "oculto");
  return (
    <section id="recursos" aria-labelledby="rec-title" className="relative scroll-mt-6 overflow-hidden px-6 py-28" style={{ background: "var(--hv-ink)", color: "var(--hv-cream)" }}>
      <div aria-hidden="true" className="absolute -right-[200px] -top-[240px] h-[700px] w-[700px] rounded-full" style={{ background: "radial-gradient(circle, rgba(217,144,90,.3), transparent 65%)" }} />
      <div className="relative mx-auto flex max-w-[1200px] flex-col gap-12">
        <div className="flex max-w-[720px] flex-col gap-3.5">
          <Eyebrow cor="var(--hv-peach)">{cfg.recursos.eyebrow}</Eyebrow>
          <h2 id="rec-title" className="hv-display m-0" style={{ fontSize: "clamp(40px, 5vw, 64px)" }}>{cfg.recursos.title}</h2>
          <p className="m-0 text-[19px] leading-normal" style={{ color: "#CFC6BC" }}>{cfg.recursos.subtitle}</p>
        </div>
        <div className="grid auto-rows-[minmax(190px,auto)] grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {itens.map((it) => {
            const Icon = ICONES[it.icone] ?? Sparkles;
            const pessego = it.tom === "pessego";
            const salvia = it.tom === "salvia";
            return (
              <div key={it.id} className={`hv-lift flex min-w-0 flex-col gap-2.5 rounded-[26px] p-7 ${it.largo ? "sm:col-span-2" : ""}`} style={{ background: pessego ? "var(--hv-peach)" : salvia ? "var(--hv-sage)" : "#2B2825", color: pessego ? "var(--hv-ink)" : "#fff" }}>
                <span className="flex items-start justify-between gap-3">
                  <span aria-hidden="true" className="flex h-12 w-12 items-center justify-center rounded-[14px]" style={{ background: pessego ? "rgba(31,29,27,.08)" : salvia ? "rgba(255,255,255,.15)" : "rgba(242,185,138,.14)" }}>
                    <Icon className="h-[26px] w-[26px]" style={{ color: pessego ? "#7E3C12" : salvia ? "#fff" : "var(--hv-peach)" }} />
                  </span>
                  {it.st === "em_breve" && <EmBreveBadge escuro={!pessego} />}
                </span>
                <span className="text-[22px] font-extrabold" style={{ letterSpacing: "-0.02em" }}>{it.titulo}</span>
                {it.texto && <span className="text-[15px] leading-normal" style={{ color: pessego ? "#3B2414" : salvia ? "#DDEBE5" : "#CFC6BC" }}>{it.texto}</span>}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 04 Vagas abertas (só com vagas reais e recurso ligado)              */
/* ------------------------------------------------------------------ */
export function VagasProfissional({ cfg, vagas, status }: { cfg: ProfissionalLandingConfig; vagas: VagaPublica[]; status: FeatureStatus }) {
  if (status !== "ativo") return null;
  // recurso ligado, mas nenhuma vaga publicada ainda: estado vazio honesto, com convite para criar o perfil
  if (vagas.length === 0)
    return (
      <section aria-labelledby="vagas-title" className="px-6 pt-28">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-6 rounded-[32px] border border-dashed px-8 py-10 md:px-12" style={{ borderColor: "#D9C7B4", background: "#fff" }}>
          <div className="flex max-w-[640px] flex-col gap-3">
            <Eyebrow cor="var(--hv-sage)">{cfg.vagas.eyebrow}</Eyebrow>
            <h2 id="vagas-title" className="m-0 text-[clamp(28px,3.4vw,40px)] font-extrabold leading-[1.05]" style={{ letterSpacing: "-0.035em" }}>{cfg.vagas.vazio_title}</h2>
            <p className="m-0 text-[17px] leading-relaxed" style={{ color: "var(--hv-body)" }}>{cfg.vagas.vazio_texto}</p>
          </div>
          <a href="#comecar" className="hv-btn inline-flex min-h-[54px] items-center rounded-full px-7 text-[16px] font-bold text-white" style={{ background: "var(--hv-ink)" }}>
            {cfg.hero.cta_label}
          </a>
        </div>
      </section>
    );
  return (
    <section aria-labelledby="vagas-title" className="px-6 pt-28">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-10">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div className="flex max-w-[640px] flex-col gap-3.5">
            <Eyebrow cor="var(--hv-sage)">{cfg.vagas.eyebrow}</Eyebrow>
            <h2 id="vagas-title" className="hv-display m-0" style={{ fontSize: "clamp(40px, 5vw, 64px)" }}>{cfg.vagas.title}</h2>
            <p className="m-0 text-[19px]" style={{ color: "var(--hv-body)" }}>{cfg.vagas.subtitle}</p>
          </div>
          <Link to="/vagas" className="text-[17px] font-semibold" style={{ color: "var(--hv-clay)" }}>Ver todas as vagas ›</Link>
        </div>
        <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))" }}>
          {vagas.slice(0, 6).map((v) => (
            <Link key={v.id} to={`/vagas?vaga=${v.id}`} className="hv-lift flex flex-col gap-3 rounded-[24px] border bg-white p-6" style={{ borderColor: "var(--hv-line)", color: "var(--hv-ink)" }}>
              <span className="flex items-center justify-between gap-2">
                <strong className="text-[20px]" style={{ letterSpacing: "-0.02em" }}>{v.funcao}</strong>
                {v.vagas && v.vagas > 1 ? <span className="rounded-full px-2.5 py-1 text-xs font-bold" style={{ background: "var(--hv-sand)", color: "var(--hv-clay)" }}>{v.vagas} vagas</span> : null}
              </span>
              <span className="flex flex-col gap-1.5 text-[15px]" style={{ color: "var(--hv-body)" }}>
                <span className="inline-flex items-center gap-2"><Calendar className="h-4 w-4" aria-hidden="true" />{fmtData(v.data)}{fmtHora(v.hora_inicio, v.hora_fim) ? <><Clock className="ml-2 h-4 w-4" aria-hidden="true" />{fmtHora(v.hora_inicio, v.hora_fim)}</> : null}</span>
                {v.cidade && <span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4" aria-hidden="true" />{v.cidade}</span>}
                {v.supplier?.company_name && <span>{v.supplier.company_name}</span>}
              </span>
              <span className="mt-auto flex items-center justify-between">
                <span className="text-[20px] font-extrabold">{v.valor_turno ? formatBRL(Number(v.valor_turno)) : "A combinar"}<span className="text-[13px] font-medium" style={{ color: "var(--hv-body)" }}>{v.valor_turno ? " / turno" : ""}</span></span>
                <span className="text-sm font-bold" style={{ color: "var(--hv-clay)" }}>Ver vaga ›</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Combinado (transparência) + Dúvidas                                 */
/* ------------------------------------------------------------------ */
export function CombinadoProfissional({ cfg }: { cfg: ProfissionalLandingConfig }) {
  const c = cfg.combinado;
  return (
    <section aria-labelledby="comb-title" className="px-6 py-28">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-12 gap-y-8 rounded-[32px] px-8 py-12 text-white md:px-12" style={{ background: "var(--hv-sage)" }}>
        <div className="flex flex-1 basis-[380px] flex-col gap-3">
          <Eyebrow cor="#F7C9A1">{c.eyebrow}</Eyebrow>
          <h2 id="comb-title" className="m-0 text-[clamp(30px,3.6vw,44px)] font-extrabold leading-[1.05]" style={{ letterSpacing: "-0.04em" }}>{c.title}</h2>
          <p className="m-0 text-[17px] leading-relaxed" style={{ color: "#DDEBE5" }}>{c.texto}</p>
        </div>
        <ul className="m-0 flex flex-1 basis-[300px] list-none flex-col gap-3 p-0">
          {c.itens.map((t) => (
            <li key={t} className="flex min-h-[56px] items-center gap-3 rounded-[18px] px-5 text-[17px] font-semibold" style={{ background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.25)" }}>
              <span aria-hidden="true" className="flex h-7 w-7 items-center justify-center rounded-full text-sm" style={{ background: "#fff", color: "var(--hv-sage)" }}>✓</span>
              {t}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function DuvidasProfissional({ cfg }: { cfg: ProfissionalLandingConfig }) {
  const [aberto, setAberto] = useState<string | null>(cfg.faq.items[0]?.id ?? null);
  useEffect(() => setAberto(cfg.faq.items[0]?.id ?? null), [cfg.faq.items]);
  if (!cfg.faq.items.length) return null;
  return (
    <section id="duvidas" aria-labelledby="faq-title" className="scroll-mt-6 px-6 pb-28">
      <div className="mx-auto flex max-w-[860px] flex-col gap-7">
        <h2 id="faq-title" className="hv-display m-0 text-center" style={{ fontSize: "clamp(36px, 4.4vw, 52px)" }}>{cfg.faq.title}</h2>
        <div className="flex flex-col gap-2.5">
          {cfg.faq.items.map((f) => {
            const on = aberto === f.id;
            return (
              <div key={f.id} className="overflow-hidden rounded-[20px] border bg-white" style={{ borderColor: "var(--hv-line)" }}>
                <button type="button" onClick={() => setAberto(on ? null : f.id)} aria-expanded={on} aria-controls={`pq-${f.id}`} className="flex min-h-[64px] w-full items-center justify-between gap-4 bg-transparent px-6 text-left text-[18px] font-bold" style={{ color: "var(--hv-ink)" }}>
                  {f.q}
                  <span aria-hidden="true" className="shrink-0 text-[26px] font-normal transition-transform duration-200" style={{ color: "var(--hv-clay)", transform: on ? "rotate(45deg)" : "none" }}>+</span>
                </button>
                {on && <p id={`pq-${f.id}`} className="m-0 px-6 pb-[22px] text-base leading-relaxed" style={{ color: "var(--hv-body)" }}>{f.a}</p>}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* CTA: ativo → cadastro com e-mail; em breve → lista de espera        */
/* ------------------------------------------------------------------ */
const emailSchema = z.string().trim().min(1, "Informe seu e-mail.").max(254).email("E-mail inválido.");

export function CtaProfissional({ cfg, status }: { cfg: ProfissionalLandingConfig; status: FeatureStatus }) {
  const navigate = useNavigate();
  const ativo = status === "ativo";
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = emailSchema.safeParse(email);
    if (!r.success) return setErro(r.error.issues[0]?.message || "E-mail inválido.");
    setErro("");
    setEnviando(true);
    const limpo = r.data.toLowerCase();
    const { error } = await (supabase.from("fornecedor_landing_emails" as any) as any).insert({
      email: limpo,
      origem: ativo ? "cta_profissional" : "espera_profissional",
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 500) : null,
    });
    setEnviando(false);
    if (ativo) return navigate(linkCadastroProfissional(limpo));
    if (error) return setErro("Não conseguimos registrar agora. Tente de novo em instantes.");
    setOk(true);
    setEmail("");
  };

  return (
    <section id="comecar" className="px-6 pb-28">
      <div className="relative mx-auto flex max-w-[1200px] flex-col items-center gap-5 overflow-hidden rounded-[36px] px-8 py-[72px] text-center" style={{ background: "var(--hv-ink)", color: "var(--hv-cream)" }}>
        <div aria-hidden="true" className="absolute -bottom-[280px] -left-[160px] h-[520px] w-[520px] rounded-full" style={{ background: "radial-gradient(circle, rgba(217,144,90,.35), transparent 65%)" }} />
        {!ativo && <span className="relative"><EmBreveBadge escuro /></span>}
        <h2 className="relative m-0" style={{ fontSize: "clamp(40px, 5.6vw, 72px)", lineHeight: 1, fontWeight: 800, letterSpacing: "-0.045em" }}>
          {ativo ? cfg.cta.title : cfg.cta.espera_title}
        </h2>
        <p className="relative m-0 max-w-[560px] text-[19px]" style={{ color: "#CFC6BC" }}>{ativo ? cfg.cta.subtitle : cfg.cta.espera_subtitle}</p>
        {ok ? (
          <p role="status" className="relative m-0 rounded-full px-6 py-4 text-[17px] font-semibold" style={{ background: "rgba(159,211,190,.15)", color: "var(--hv-sage-light)" }}>
            Pronto! Avisamos você por e-mail assim que as vagas abrirem.
          </p>
        ) : (
          <form onSubmit={enviar} noValidate className="relative flex w-full max-w-[560px] flex-wrap justify-center gap-2.5" aria-label={ativo ? "Começar cadastro de profissional" : "Entrar na lista de espera"}>
            <label className="flex flex-1 basis-[260px]">
              <span className="sr-only">E-mail</span>
              <input type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" aria-invalid={!!erro} aria-describedby="prof-cta-erro" className="min-h-[58px] flex-1 rounded-full border px-5 text-[17px] outline-none focus:ring-4" style={{ background: "#2B2825", borderColor: erro ? "#F2B98A" : "#3A3632", color: "var(--hv-cream)" }} />
            </label>
            <button type="submit" disabled={enviando} className="hv-btn min-h-[58px] rounded-full px-7 text-[17px] font-bold disabled:opacity-60" style={{ background: "var(--hv-peach)", color: "var(--hv-ink)" }}>
              {enviando ? "Enviando..." : ativo ? cfg.cta.button_label : cfg.cta.espera_button}
            </button>
          </form>
        )}
        <p id="prof-cta-erro" role="alert" className="relative m-0 min-h-[20px] text-sm" style={{ color: "var(--hv-peach)" }}>{erro}</p>
        <p className="relative m-0 text-sm" style={{ color: "#A39A90" }}>{cfg.cta.footnote}</p>
      </div>
    </section>
  );
}
