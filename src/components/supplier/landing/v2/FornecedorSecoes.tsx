import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import {
  BarChart3,
  Calendar,
  CalendarHeart,
  Inbox,
  KanbanSquare,
  Menu,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useFeatureStatus } from "@/contexts/FeatureFlagsContext";
import EmBreveBadge from "@/components/shared/EmBreveBadge";
import { formatBRL } from "@/lib/platformPricing";
import { preencher, type DadosFornecedor } from "@/lib/fornecedorLanding";
import type { PainelIcone, SupplierLandingConfig, TestimonialItem } from "@/lib/supplierLandingConfig";

/** Cadastro na aba Fornecedor, com o e-mail já preenchido quando houver. */
export const linkCadastro = (email?: string) =>
  `/cadastro?tipo=supplier${email ? `&email=${encodeURIComponent(email)}` : ""}`;

const Serif = ({ children, cor }: { children: React.ReactNode; cor: string }) => (
  <span className="hv-serif" style={{ color: cor }}>
    {children}
  </span>
);

const Eyebrow = ({ children, cor }: { children: React.ReactNode; cor: string }) => (
  <p className="hv-eyebrow m-0" style={{ color: cor }}>
    {children}
  </p>
);

/* ------------------------------------------------------------------ */
/* Navegação                                                           */
/* ------------------------------------------------------------------ */
const ANCORAS = [
  { href: "#como", label: "Como funciona" },
  { href: "#painel", label: "Painel" },
  { href: "#planos", label: "Planos" },
  { href: "#duvidas", label: "Dúvidas" },
];

export function FornecedorNav({ cfg }: { cfg: SupplierLandingConfig }) {
  const { user } = useAuth();
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <nav aria-label="Navegação" className="relative z-10 mx-auto flex max-w-[1200px] items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 text-[19px] font-extrabold text-white sm:text-[22px]" style={{ letterSpacing: "-0.03em" }}>
          casamenteiro<span style={{ color: "var(--hv-peach)" }}>.</span>
          <span className="hidden rounded-full border px-2.5 py-1 text-[12px] font-semibold sm:inline" style={{ letterSpacing: 0, color: "var(--hv-peach)", borderColor: "rgba(242,185,138,.5)" }}>
            para fornecedores
          </span>
        </Link>
        <span className="hidden gap-7 text-[15px] font-medium lg:flex">
          {ANCORAS.map((a) => (
            <a key={a.href} href={a.href} className="text-white hover:opacity-80">
              {a.label}
            </a>
          ))}
        </span>
        <span className="flex items-center gap-1.5 sm:gap-2.5">
          <Link to={user ? "/fornecedor/painel" : "/fornecedor/login"} className="inline-flex min-h-[44px] items-center px-2 text-[15px] font-semibold text-white">
            {user ? "Meu painel" : "Entrar"}
          </Link>
          <Link to={linkCadastro()} className="hv-btn inline-flex min-h-[44px] items-center rounded-full bg-white px-4 text-[15px] font-bold sm:px-5" style={{ color: "var(--hv-ink)" }}>
            {cfg.navbar.cta_label.replace("→", "").trim() || "Anunciar grátis"}
          </Link>
          <button type="button" onClick={() => setAberto(true)} aria-label="Abrir menu" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-white lg:hidden" style={{ borderColor: "rgba(255,255,255,.45)", background: "rgba(255,255,255,.12)" }}>
            <Menu className="h-5 w-5" />
          </button>
        </span>
      </nav>
      {aberto && (
        <div role="dialog" aria-modal="true" aria-label="Menu" className="fixed inset-0 z-[60] lg:hidden" style={{ background: "rgba(20,14,10,.45)" }} onClick={() => setAberto(false)}>
          <div className="flex flex-col rounded-b-[28px] bg-white px-6 pb-7 pt-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex min-h-[56px] items-center justify-between">
              <span className="text-[20px] font-extrabold">casamenteiro<span style={{ color: "var(--hv-terracota)" }}>.</span></span>
              <button type="button" onClick={() => setAberto(false)} aria-label="Fechar menu" className="inline-flex h-11 w-11 items-center justify-center rounded-full border" style={{ borderColor: "var(--hv-line)" }}>
                <X className="h-5 w-5" />
              </button>
            </div>
            {ANCORAS.map((a) => (
              <a key={a.href} href={a.href} onClick={() => setAberto(false)} className="flex min-h-[56px] items-center border-b text-[20px] font-bold" style={{ borderColor: "#f2eee8", color: "var(--hv-ink)" }}>
                {a.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */
export function HeroFornecedor({ cfg, dados }: { cfg: SupplierLandingConfig; dados: DadosFornecedor }) {
  const h = cfg.hero;
  const chips = ["Plano gratuito, sem mensalidade", `${dados.testeDias} dias de plano pago grátis`, `Aprovação em até ${dados.aprovacaoHoras}h`];
  return (
    <section className="relative overflow-hidden text-white" style={{ background: "var(--hv-ink)" }}>
      {h.video_src ? (
        <video src={h.video_src} autoPlay muted loop playsInline className="absolute inset-0 h-full w-full object-cover" style={{ opacity: 0.5 }} />
      ) : (
        h.fallback_image && <img src={h.fallback_image} alt="" className="hv-kb absolute inset-0 h-full w-full object-cover" style={{ opacity: 0.55 }} />
      )}
      <div aria-hidden="true" className="absolute inset-0" style={{ background: "linear-gradient(100deg, rgba(20,14,10,.92) 0%, rgba(20,14,10,.7) 45%, rgba(20,14,10,.35) 100%)" }} />
      <FornecedorNav cfg={cfg} />

      <div className="relative mx-auto flex max-w-[1200px] flex-wrap items-center gap-14 px-6 pb-24 pt-14">
        <div className="flex min-w-0 flex-1 basis-[520px] flex-col gap-5">
          <p className="hv-up m-0 inline-flex items-center gap-2.5 self-start rounded-full px-3.5 py-2 text-sm font-semibold" style={{ background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.3)" }}>
            <span className="hv-pulse h-2 w-2 rounded-full" style={{ background: "var(--hv-peach)" }} />
            {h.eyebrow || "Para fornecedores"}
          </p>
          <h1 className="hv-up hv-d1 m-0" style={{ fontSize: "clamp(44px, 6.4vw, 88px)", lineHeight: 0.98, fontWeight: 800, letterSpacing: "-0.045em" }}>
            {h.title_pre} <Serif cor="#F7C9A1">{h.title_em}</Serif>
          </h1>
          <p className="hv-up hv-d2 m-0 max-w-[560px] text-[19px] leading-normal" style={{ color: "#F4E7DC" }}>
            {h.subtitle}
          </p>
          <div className="hv-up hv-d3 mt-1.5 flex flex-wrap gap-3">
            <Link to={linkCadastro()} className="hv-btn inline-flex min-h-[58px] items-center rounded-full bg-white px-8 text-[17px] font-bold" style={{ color: "var(--hv-ink)" }}>
              {h.cta_primary_label}
            </Link>
            <a href="#como" className="hv-btn inline-flex min-h-[58px] items-center rounded-full px-7 text-[17px] font-semibold text-white" style={{ border: "1px solid rgba(255,255,255,.55)", background: "rgba(255,255,255,.1)" }}>
              {h.cta_secondary_label}
            </a>
          </div>
          <p className="hv-up hv-d3 m-0 flex flex-wrap gap-x-5 gap-y-2 text-sm" style={{ color: "#E9DDD2" }}>
            {chips.map((c) => (
              <span key={c}>✓ {c}</span>
            ))}
          </p>
        </div>

        <div aria-label="Ilustração de pedidos chegando no painel" className="flex min-w-0 flex-[0_1_400px] flex-col gap-3">
          {[
            { cls: "", inicial: "♥", bg: "var(--hv-sand)", fg: "var(--hv-clay)", t: "Novo pedido de orçamento", s: "Com data, cidade, convidados e orçamento", ping: true },
            { cls: "fv-lead-2 ml-7", inicial: "✓", bg: "#E7EFEB", fg: "var(--hv-sage)", t: "Casal respondeu sua proposta", s: "Pelo chat, com a proposta anexada" },
            { cls: "fv-lead-3", inicial: "★", bg: "var(--hv-ink)", fg: "var(--hv-peach)", t: "Data ociosa reservada", s: "Sua sexta livre foi preenchida" },
          ].map((n) => (
            <div key={n.t} className={`fv-lead flex items-start gap-3.5 rounded-[20px] bg-white px-[18px] py-4 ${n.cls}`} style={{ color: "var(--hv-ink)", boxShadow: "0 24px 50px rgba(0,0,0,.35)" }}>
              <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-extrabold" style={{ background: n.bg, color: n.fg }}>
                {n.inicial}
                {n.ping && <span className="fv-ping absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full" style={{ background: "var(--hv-terracota)" }} />}
              </span>
              <span className="flex min-w-0 flex-col gap-1">
                <strong className="text-[15px]">{n.t}</strong>
                <span className="text-[13px]" style={{ color: "var(--hv-body)" }}>
                  {n.s}
                </span>
              </span>
            </div>
          ))}
          <p className="m-0 ml-1 text-xs" style={{ color: "#CFC6BC" }}>
            Ilustração do painel
          </p>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Capítulo 01 · O pedido certo                                        */
/* ------------------------------------------------------------------ */
export function PedidoCerto({ cfg }: { cfg: SupplierLandingConfig }) {
  const l = cfg.lead;
  const campos = [
    ["Data", "dd/mm/aaaa"],
    ["Cidade", "Belo Horizonte"],
    ["Convidados", "101 a 200"],
    ["Orçamento total", "R$ ••••"],
    ["Estilo", "Elegante"],
    ["Prazo", "Entre 6 e 12 meses"],
  ];
  return (
    <section aria-labelledby="lead-title" className="px-6 py-28">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-12">
        <div className="flex max-w-[720px] flex-col gap-3.5">
          <Eyebrow cor="var(--hv-clay)">{l.eyebrow}</Eyebrow>
          <h2 id="lead-title" className="hv-display m-0" style={{ fontSize: "clamp(40px, 5vw, 64px)" }}>
            {l.title_pre} <Serif cor="var(--hv-clay)">{l.title_em}</Serif>
          </h2>
          <p className="m-0 text-[19px] leading-normal" style={{ color: "var(--hv-body)" }}>
            {l.subtitle}
          </p>
        </div>
        <div className="grid items-stretch gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))" }}>
          <div className="flex flex-col gap-4 rounded-[28px] p-8" style={{ background: "#F2EEE8" }}>
            <span className="text-[13px] font-bold uppercase" style={{ letterSpacing: ".06em", color: "#8A8178" }}>
              {l.comum_titulo}
            </span>
            <div className="rounded-[18px] bg-white p-[18px] text-[17px]" style={{ color: "var(--hv-body)", boxShadow: "0 6px 20px rgba(31,29,27,.06)" }}>
              “{l.comum_fala}”
            </div>
            <ul className="m-0 flex list-none flex-col gap-2.5 p-0 text-base" style={{ color: "var(--hv-body)" }}>
              {l.comum_itens.map((t) => (
                <li key={t}>✕ {t}</li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-4 rounded-[28px] p-8" style={{ background: "var(--hv-ink)", color: "var(--hv-cream)", boxShadow: "0 30px 60px rgba(31,29,27,.2)" }}>
            <span className="text-[13px] font-bold uppercase" style={{ letterSpacing: ".06em", color: "var(--hv-peach)" }}>
              {l.nosso_titulo}
            </span>
            <div className="grid grid-cols-2 gap-3.5 rounded-[18px] p-[18px]" style={{ background: "#2B2825" }} aria-label="Exemplo dos dados que chegam com o pedido">
              {campos.map(([k, v]) => (
                <span key={k} className="flex flex-col gap-0.5">
                  <span className="text-xs" style={{ color: "#CFC6BC" }}>
                    {k}
                  </span>
                  <strong>{v}</strong>
                </span>
              ))}
            </div>
            <ul className="m-0 flex list-none flex-col gap-2.5 p-0 text-base" style={{ color: "#E9DDD2" }}>
              {l.nosso_itens.map((t) => (
                <li key={t}>✓ {t}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Capítulo 02 · Como funciona                                         */
/* ------------------------------------------------------------------ */
export function ComoFunciona({ cfg, dados }: { cfg: SupplierLandingConfig; dados: DadosFornecedor }) {
  const cores = [
    { bg: "var(--hv-sand)", num: "var(--hv-clay)", numFg: "#fff", fg: "var(--hv-ink)", sub: "var(--hv-body)" },
    { bg: "#E7EFEB", num: "var(--hv-sage)", numFg: "#fff", fg: "var(--hv-ink)", sub: "#4D5A54" },
    { bg: "var(--hv-ink)", num: "var(--hv-peach)", numFg: "var(--hv-ink)", fg: "var(--hv-cream)", sub: "#CFC6BC" },
  ];
  return (
    <section id="como" aria-labelledby="como-title" className="scroll-mt-6 px-6 pb-28 pt-6">
      <div className="mx-auto flex max-w-[1152px] flex-col gap-14">
        <div className="flex flex-col items-center gap-3.5 text-center">
          <Eyebrow cor="var(--hv-clay)">Capítulo 02 · {cfg.how.eyebrow}</Eyebrow>
          <h2 id="como-title" className="hv-display m-0" style={{ fontSize: "clamp(40px, 5vw, 64px)" }}>
            {cfg.how.title}
          </h2>
          {cfg.how.subtitle && (
            <p className="m-0 max-w-[620px] text-[19px]" style={{ color: "var(--hv-body)" }}>
              {preencher(cfg.how.subtitle, dados)}
            </p>
          )}
        </div>
        <ol className="m-0 grid list-none gap-4 p-0" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
          {cfg.how.steps.map((st, i) => {
            const c = cores[i % cores.length];
            return (
              <li key={i} className="hv-lift flex flex-col gap-3 rounded-[28px] p-8" style={{ background: c.bg, color: c.fg }}>
                <span className="flex h-14 w-14 items-center justify-center rounded-full text-[22px] font-extrabold" style={{ background: c.num, color: c.numFg }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-[26px] font-extrabold" style={{ letterSpacing: "-0.03em" }}>
                  {st.title}
                </span>
                <span className="text-[17px] leading-normal" style={{ color: c.sub }}>
                  {preencher(st.description, dados)}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Capítulo 03 · Painel                                                */
/* ------------------------------------------------------------------ */
const ICONES: Record<PainelIcone, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  inbox: Inbox,
  message: MessageCircle,
  kanban: KanbanSquare,
  calendar: Calendar,
  "calendar-heart": CalendarHeart,
  users: Users,
  star: Star,
  wallet: Wallet,
  sparkles: Sparkles,
  "bar-chart": BarChart3,
  refresh: RefreshCw,
  shield: ShieldCheck,
};

export function PainelFornecedor({ cfg }: { cfg: SupplierLandingConfig }) {
  const status = useFeatureStatus();
  const itens = cfg.painel.items.map((it) => ({ ...it, st: status(it.flag) })).filter((it) => it.st !== "oculto");
  return (
    <section id="painel" aria-labelledby="painel-title" className="relative scroll-mt-6 overflow-hidden px-6 py-28" style={{ background: "var(--hv-ink)", color: "var(--hv-cream)" }}>
      <div aria-hidden="true" className="absolute -right-[200px] -top-[240px] h-[700px] w-[700px] rounded-full" style={{ background: "radial-gradient(circle, rgba(217,144,90,.3), transparent 65%)" }} />
      <div className="relative mx-auto flex max-w-[1200px] flex-col gap-12">
        <div className="flex max-w-[720px] flex-col gap-3.5">
          <Eyebrow cor="var(--hv-peach)">{cfg.painel.eyebrow}</Eyebrow>
          <h2 id="painel-title" className="hv-display m-0" style={{ fontSize: "clamp(40px, 5vw, 64px)" }}>
            {cfg.painel.title}
          </h2>
          <p className="m-0 text-[19px] leading-normal" style={{ color: "#CFC6BC" }}>
            {cfg.painel.subtitle}
          </p>
        </div>
        <div className="grid auto-rows-[minmax(190px,auto)] grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {itens.map((it) => {
            const Icon = ICONES[it.icone] ?? Sparkles;
            const pessego = it.tom === "pessego";
            const salvia = it.tom === "salvia";
            const bg = pessego ? "var(--hv-peach)" : salvia ? "var(--hv-sage)" : "#2B2825";
            const fg = pessego ? "var(--hv-ink)" : "#fff";
            const corIcone = pessego ? "#7E3C12" : salvia ? "#fff" : "var(--hv-peach)";
            const fundoIcone = pessego ? "rgba(31,29,27,.08)" : salvia ? "rgba(255,255,255,.15)" : "rgba(242,185,138,.14)";
            return (
              <div key={it.id} className={`hv-lift flex min-w-0 flex-col gap-2.5 rounded-[26px] p-7 ${it.largo ? "sm:col-span-2" : ""}`} style={{ background: bg, color: fg, opacity: it.st === "em_breve" ? 0.92 : 1 }}>
                <span className="flex items-start justify-between gap-3">
                  <span aria-hidden="true" className="flex h-12 w-12 items-center justify-center rounded-[14px]" style={{ background: fundoIcone }}>
                    <Icon className="h-[26px] w-[26px]" style={{ color: corIcone }} />
                  </span>
                  {it.st === "em_breve" && <EmBreveBadge escuro={!pessego} />}
                </span>
                <span className="text-[22px] font-extrabold" style={{ letterSpacing: "-0.02em" }}>
                  {it.titulo}
                </span>
                {it.texto && (
                  <span className="text-[15px] leading-normal" style={{ color: pessego ? "#3B2414" : salvia ? "#DDEBE5" : "#CFC6BC" }}>
                    {it.texto}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Capítulo 04 · Planos, reserva de data ociosa e destaques            */
/* ------------------------------------------------------------------ */
export function PlanosFornecedor({ cfg, dados }: { cfg: SupplierLandingConfig; dados: DadosFornecedor }) {
  const p = cfg.planos;
  const status = useFeatureStatus();
  const stReserva = status("reserva_datas_ociosas");
  const stDestaque = status("destaque_pago");
  return (
    <section id="planos" aria-labelledby="planos-title" className="scroll-mt-6 px-6 py-28">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-12">
        <div className="flex flex-col items-center gap-3.5 text-center">
          <Eyebrow cor="var(--hv-sage)">{p.eyebrow}</Eyebrow>
          <h2 id="planos-title" className="hv-display m-0" style={{ fontSize: "clamp(40px, 5vw, 64px)" }}>
            {p.title_pre} <Serif cor="var(--hv-sage)">{p.title_em}</Serif>
          </h2>
          <p className="m-0 max-w-[640px] text-[19px] leading-normal" style={{ color: "var(--hv-body)" }}>
            {preencher(p.subtitle, dados)}
          </p>
        </div>

        {dados.planos.length > 0 && (
          <div className="grid items-stretch gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 290px), 1fr))" }}>
            {dados.planos.map((pl) => {
              const gratis = pl.preco_mensal === 0;
              const top = pl.destaque_busca;
              return (
                <div
                  key={pl.slug}
                  className="hv-lift flex flex-col gap-3.5 rounded-[26px] p-8"
                  style={top ? { background: "var(--hv-ink)", color: "var(--hv-cream)", outline: "3px solid var(--hv-peach)" } : { background: "#fff", border: "1px solid var(--hv-line)" }}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-[18px] font-bold">{pl.nome}</span>
                    {top && (
                      <span className="rounded-full px-2.5 py-1 text-xs font-extrabold uppercase" style={{ letterSpacing: ".06em", background: "var(--hv-peach)", color: "var(--hv-ink)" }}>
                        Mais completo
                      </span>
                    )}
                  </span>
                  <span className="text-[44px] font-extrabold" style={{ letterSpacing: "-0.04em" }}>
                    {gratis ? "Grátis" : formatBRL(pl.preco_mensal)}
                    {!gratis && (
                      <span className="text-base font-medium" style={{ color: top ? "#CFC6BC" : "var(--hv-body)" }}>
                        /mês
                      </span>
                    )}
                  </span>
                  {gratis && (
                    <span className="text-sm font-semibold" style={{ color: "var(--hv-sage)" }}>
                      Sem mensalidade. Nada é cobrado sem você clicar em “Assinar”.
                    </span>
                  )}
                  {pl.descricao && (
                    <span className="text-[15px]" style={{ color: top ? "#CFC6BC" : "var(--hv-body)" }}>
                      {pl.descricao}
                    </span>
                  )}
                  <ul className="m-0 flex flex-1 list-none flex-col gap-1.5 p-0 text-[15px] leading-relaxed" style={{ color: top ? "#CFC6BC" : "var(--hv-body)" }}>
                    {pl.beneficios.map((b) => (
                      <li key={b}>✓ {b}</li>
                    ))}
                  </ul>
                  <Link
                    to={linkCadastro()}
                    className="hv-btn mt-auto inline-flex min-h-[50px] items-center justify-center rounded-full font-bold"
                    style={top ? { background: "var(--hv-terracota)", color: "var(--hv-ink)" } : { border: "1px solid #D9C9B8", color: "var(--hv-ink)" }}
                  >
                    {gratis ? "Começar grátis" : `${dados.testeDias} dias grátis após a aprovação`}
                  </Link>
                </div>
              );
            })}
          </div>
        )}

        {/* Reserva de data ociosa: única taxa sobre o negócio */}
        {stReserva !== "oculto" && (
          <div className="flex flex-wrap items-center gap-x-10 gap-y-6 rounded-[32px] px-9 py-8" style={{ background: "#E7EFEB" }}>
            <div className="flex flex-1 basis-[340px] flex-col gap-2">
              <span className="flex flex-wrap items-center gap-2">
                <span className="hv-eyebrow" style={{ color: "var(--hv-sage)" }}>
                  Sem comissão
                </span>
                {stReserva === "em_breve" && <EmBreveBadge />}
              </span>
              <h3 className="m-0 text-[30px] font-extrabold" style={{ letterSpacing: "-0.03em" }}>
                {p.reserva_titulo}
              </h3>
              <p className="m-0 text-base leading-relaxed" style={{ color: "#4D5A54" }}>
                {preencher(p.reserva_texto, dados)}
              </p>
            </div>
            {dados.taxaReserva != null && (
              <div className="flex flex-col items-start gap-1 rounded-[22px] bg-white px-7 py-5">
                <span className="text-sm" style={{ color: "var(--hv-body)" }}>
                  por reserva aprovada
                </span>
                <span className="text-[40px] font-extrabold" style={{ letterSpacing: "-0.04em" }}>
                  {formatBRL(dados.taxaReserva)}
                </span>
                <span className="text-xs" style={{ color: "var(--hv-body)" }}>
                  Cancelamento grátis para o casal em até {dados.carenciaDias} dias
                </span>
              </div>
            )}
          </div>
        )}

        {/* Destaques da Home */}
        {stDestaque !== "oculto" && dados.destaques.length > 0 && (
          <div className="flex flex-wrap items-center gap-8 rounded-[32px] p-10" style={{ background: "var(--hv-sand)" }}>
            <div className="flex min-w-0 flex-1 basis-[340px] flex-col gap-3">
              <span className="flex items-center gap-2">
                <span className="rounded-full px-2.5 py-1 text-xs font-extrabold uppercase text-white" style={{ letterSpacing: ".08em", background: "var(--hv-clay)" }}>
                  Novo
                </span>
                {stDestaque === "em_breve" && <EmBreveBadge />}
              </span>
              <h3 className="m-0 text-[34px] font-extrabold leading-[1.08]" style={{ letterSpacing: "-0.035em" }}>
                {p.destaques_titulo}
              </h3>
              <p className="m-0 text-[17px] leading-relaxed" style={{ color: "var(--hv-body)" }}>
                {p.destaques_texto}
              </p>
            </div>
            <div className="grid min-w-0 flex-[1.3] basis-[460px] gap-2.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
              {dados.destaques.map((d) => (
                <div key={d.escopo} className="flex flex-col gap-1 rounded-[18px] bg-white p-4">
                  <strong>{d.nome}</strong>
                  <span className="text-[13px]" style={{ color: "var(--hv-body)" }}>
                    {d.descricao}
                    {d.vagas ? ` · ${d.vagas} vagas` : ""}
                  </span>
                  <span className="text-[20px] font-extrabold">
                    {formatBRL(d.valor)}
                    <span className="text-[13px] font-medium" style={{ color: "var(--hv-body)" }}>
                      {" "}
                      / {d.dias} dias
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Depoimentos (só com mais de 3)                                      */
/* ------------------------------------------------------------------ */
export function DepoimentosFornecedor({ cfg, dados }: { cfg: SupplierLandingConfig; dados: DadosFornecedor }) {
  const manuais = (cfg.testimonials.items ?? []).filter((t: TestimonialItem) => (t.text ?? "").trim());
  const todos = [
    ...manuais.map((t) => ({ id: `cfg-${t.id}`, nome: t.name, detalhe: [t.role, t.city].filter(Boolean).join(" · "), texto: t.text, nota: t.rating || 5 })),
    ...dados.depoimentos,
  ];
  if (todos.length <= 3) return null;
  return (
    <section aria-labelledby="dep-title" className="px-6 pb-28">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-8 rounded-[32px] px-8 py-12 text-white md:px-10" style={{ background: "var(--hv-sage)" }}>
        <div className="flex flex-col gap-2.5">
          <Eyebrow cor="#F7C9A1">{cfg.testimonials.eyebrow || "Quem já anuncia"}</Eyebrow>
          <h2 id="dep-title" className="m-0 text-[40px] font-extrabold leading-[1.05]" style={{ letterSpacing: "-0.04em" }}>
            {cfg.testimonials.title_pre} <Serif cor="#F7C9A1">{cfg.testimonials.title_em}</Serif>
          </h2>
        </div>
        <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))" }}>
          {todos.slice(0, 6).map((d) => (
            <figure key={d.id} className="m-0 flex flex-col gap-3.5 rounded-[24px] p-7" style={{ background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.25)" }}>
              <span role="img" aria-label={`${d.nota} de 5 estrelas`} style={{ color: "var(--hv-peach)", letterSpacing: 2 }}>
                {"★".repeat(Math.max(1, Math.min(5, Math.round(d.nota))))}
              </span>
              <blockquote className="hv-serif m-0 text-[21px] leading-snug">“{d.texto}”</blockquote>
              <figcaption className="text-[15px]" style={{ color: "#DDEBE5" }}>
                {d.nome}
                {d.detalhe ? ` · ${d.detalhe}` : ""}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Dúvidas                                                             */
/* ------------------------------------------------------------------ */
export function DuvidasFornecedor({ cfg, dados }: { cfg: SupplierLandingConfig; dados: DadosFornecedor }) {
  const [aberto, setAberto] = useState<string | null>(cfg.faq.items[0]?.id ?? null);
  if (!cfg.faq.items.length) return null;
  return (
    <section id="duvidas" aria-labelledby="faq-title" className="scroll-mt-6 px-6 pb-28">
      <div className="mx-auto flex max-w-[860px] flex-col gap-7">
        <h2 id="faq-title" className="hv-display m-0 text-center" style={{ fontSize: "clamp(36px, 4.4vw, 52px)" }}>
          {cfg.faq.title}
        </h2>
        <div className="flex flex-col gap-2.5">
          {cfg.faq.items.map((f) => {
            const on = aberto === f.id;
            return (
              <div key={f.id} className="overflow-hidden rounded-[20px] border bg-white" style={{ borderColor: "var(--hv-line)" }}>
                <button
                  type="button"
                  onClick={() => setAberto(on ? null : f.id)}
                  aria-expanded={on}
                  aria-controls={`faq-${f.id}`}
                  className="flex min-h-[64px] w-full items-center justify-between gap-4 bg-transparent px-6 text-left text-[18px] font-bold"
                  style={{ color: "var(--hv-ink)" }}
                >
                  {f.q}
                  <span aria-hidden="true" className="shrink-0 text-[26px] font-normal transition-transform duration-200" style={{ color: "var(--hv-clay)", transform: on ? "rotate(45deg)" : "none" }}>
                    +
                  </span>
                </button>
                {on && (
                  <p id={`faq-${f.id}`} className="m-0 px-6 pb-[22px] text-base leading-relaxed" style={{ color: "var(--hv-body)" }}>
                    {preencher(f.a, dados)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* CTA final: grava o e-mail e abre o cadastro (aba Fornecedor) já preenchido */
/* ------------------------------------------------------------------ */
const emailSchema = z.string().trim().min(1, "Informe seu e-mail.").max(254).email("E-mail inválido.");

export function CtaFornecedor({ cfg, dados }: { cfg: SupplierLandingConfig; dados: DadosFornecedor }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = emailSchema.safeParse(email);
    if (!ok.success) {
      setErro(ok.error.issues[0]?.message || "E-mail inválido.");
      return;
    }
    setErro("");
    setEnviando(true);
    const limpo = ok.data.toLowerCase();
    // guarda o lead mesmo que a pessoa desista do cadastro (falha aqui não impede seguir)
    await (supabase.from("fornecedor_landing_emails" as any) as any)
      .insert({ email: limpo, origem: "cta_fornecedor", user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 500) : null })
      .then(
        () => {},
        () => {},
      );
    setEnviando(false);
    navigate(linkCadastro(limpo));
  };

  return (
    <section id="comecar" className="px-6 pb-28">
      <div className="relative mx-auto flex max-w-[1200px] flex-col items-center gap-5 overflow-hidden rounded-[36px] px-8 py-[72px] text-center" style={{ background: "var(--hv-ink)", color: "var(--hv-cream)" }}>
        <div aria-hidden="true" className="absolute -bottom-[280px] -left-[160px] h-[520px] w-[520px] rounded-full" style={{ background: "radial-gradient(circle, rgba(217,144,90,.35), transparent 65%)" }} />
        <h2 className="relative m-0" style={{ fontSize: "clamp(40px, 5.6vw, 72px)", lineHeight: 1, fontWeight: 800, letterSpacing: "-0.045em" }}>
          {cfg.cta.title}
        </h2>
        <p className="relative m-0 max-w-[560px] text-[19px]" style={{ color: "#CFC6BC" }}>
          {preencher(cfg.cta.subtitle, dados)}
        </p>
        <form onSubmit={enviar} noValidate className="relative flex w-full max-w-[560px] flex-wrap justify-center gap-2.5" aria-label="Começar cadastro de fornecedor">
          <label className="flex flex-1 basis-[260px]">
            <span className="sr-only">E-mail</span>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              aria-invalid={!!erro}
              aria-describedby="cta-erro"
              className="min-h-[58px] flex-1 rounded-full border px-5 text-[17px] outline-none focus:ring-4"
              style={{ background: "#2B2825", borderColor: erro ? "#F2B98A" : "#3A3632", color: "var(--hv-cream)" }}
            />
          </label>
          <button type="submit" disabled={enviando} className="hv-btn min-h-[58px] rounded-full px-7 text-[17px] font-bold disabled:opacity-60" style={{ background: "var(--hv-peach)", color: "var(--hv-ink)" }}>
            {enviando ? "Abrindo cadastro..." : cfg.cta.button_label}
          </button>
        </form>
        <p id="cta-erro" role="alert" className="relative m-0 min-h-[20px] text-sm" style={{ color: "var(--hv-peach)" }}>
          {erro}
        </p>
        <p className="relative m-0 text-sm" style={{ color: "#A39A90" }}>
          {preencher(cfg.cta.footnote, dados)}
        </p>
      </div>
    </section>
  );
}
