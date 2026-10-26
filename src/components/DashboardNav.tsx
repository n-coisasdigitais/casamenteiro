import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Heart,
  CheckSquare,
  Store,
  Users,
  Wallet,
  User,
  Globe,
  MessageSquare,
  Gift,
  CalendarRange,
  MoreHorizontal,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useFeatureFlags } from "@/contexts/FeatureFlagsContext";
import "@/components/casal/casal.css";

type Item = { label: string; curto?: string; path: string; icon: any; flag?: string; extra?: string[] };

const principais: Item[] = [
  { label: "Meu casamento", curto: "Início", path: "/dashboard", icon: Heart },
  { label: "Fornecedores", path: "/meus-fornecedores", icon: Store },
  { label: "Orçamento", path: "/orcamento", icon: Wallet, extra: ["/meu-casamento/plano"] },
  { label: "Tarefas", path: "/tarefas", icon: CheckSquare },
  { label: "Convidados", path: "/convidados", icon: Users, flag: "rsvp_convidados" },
];

const mais: Item[] = [
  { label: "Mensagens", path: "/mensagens", icon: MessageSquare, flag: "mensagens_casais" },
  { label: "Reservas de datas", path: "/meu-casamento/reservas", icon: CalendarRange, flag: "reserva_datas_ociosas" },
  { label: "Perfil público", path: "/meu-casamento/perfil", icon: Globe, flag: "perfil_social_casal" },
  { label: "Indique e ganhe", path: "/meu-casamento/indicacoes", icon: Gift, flag: "indicacoes" },
  { label: "Minha conta", path: "/perfil", icon: User },
];

/**
 * Menu da área do casal.
 * Computador: menu lateral fixo. Celular: barra inferior com 4 destinos + "Mais".
 * Adiciona a classe .casal-app no <body> para reservar o espaço do menu em todas as telas.
 */
export default function DashboardNav() {
  const { pathname } = useLocation();
  const flags = useFeatureFlags();
  const [maisAberto, setMaisAberto] = useState(false);

  useEffect(() => {
    document.body.classList.add("casal-app");
    return () => document.body.classList.remove("casal-app");
  }, []);

  useEffect(() => setMaisAberto(false), [pathname]);

  const visivel = (it: Item) => !it.flag || flags[it.flag];
  const ativo = (it: Item) => pathname === it.path || (it.extra || []).includes(pathname);
  const lista = principais.filter(visivel);
  const listaMais = mais.filter(visivel);

  // celular: Início, Fornecedores, Orçamento, Tarefas + Mais (Convidados e o resto)
  const barra = lista.filter((i) => i.path !== "/convidados");
  const naFolha = [...lista.filter((i) => i.path === "/convidados"), ...listaMais];
  const maisAtivo = naFolha.some(ativo);

  const linkCls =
    "ca-nav-link relative flex h-[42px] w-full items-center gap-3 rounded-[11px] px-3 text-[15px] font-medium transition-colors hover:bg-white/60";

  const LinkLateral = ({ it }: { it: Item }) => {
    const on = ativo(it);
    const Icon = it.icon;
    return (
      <Link
        to={it.path}
        aria-current={on ? "page" : undefined}
        className={linkCls}
        style={on ? { background: "#fff", color: "var(--ca-ink)", fontWeight: 650, boxShadow: "0 0 0 1px var(--ca-line)" } : { color: "var(--ca-body)" }}
      >
        <Icon className="h-[19px] w-[19px] shrink-0" strokeWidth={1.8} aria-hidden="true" />
        <span className="truncate">{it.label}</span>
      </Link>
    );
  };

  return (
    <>
      {/* menu lateral (computador) */}
      <aside
        className="fixed inset-y-0 left-0 z-30 hidden w-[240px] flex-col gap-0.5 overflow-y-auto border-r px-3 pb-4 pt-4 md:flex"
        style={{ background: "var(--ca-side)", borderColor: "var(--ca-line)" }}
        aria-label="Menu do casal"
      >
        <Link to="/" className="mb-3 px-2.5 text-[20px] font-extrabold" style={{ letterSpacing: "-0.03em", color: "var(--ca-ink)" }}>
          casamenteiro<span style={{ color: "var(--ca-terracota)" }}>.</span>
        </Link>
        <nav className="flex flex-col gap-0.5" aria-label="Seções">
          {lista.map((it) => (
            <LinkLateral key={it.path} it={it} />
          ))}
          {listaMais.length > 0 && (
            <div className="px-3 pb-1 pt-3 text-[11.5px] font-extrabold uppercase" style={{ letterSpacing: ".08em", color: "var(--ca-muted)" }}>
              Mais
            </div>
          )}
          {listaMais.map((it) => (
            <LinkLateral key={it.path} it={it} />
          ))}
        </nav>
      </aside>

      {/* barra inferior (celular) */}
      <nav
        aria-label="Seções"
        className="fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur md:hidden"
        style={{ background: "rgba(255,255,255,.95)", borderColor: "var(--ca-line)", paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="grid px-1" style={{ gridTemplateColumns: `repeat(${barra.length + 1}, minmax(0, 1fr))` }}>
          {barra.map((it) => {
            const on = ativo(it);
            const Icon = it.icon;
            return (
              <Link
                key={it.path}
                to={it.path}
                aria-current={on ? "page" : undefined}
                className="flex h-[58px] flex-col items-center justify-center gap-1 text-[11px] font-semibold"
                style={{ color: on ? "var(--ca-clay)" : "var(--ca-muted)" }}
              >
                <Icon className="h-[22px] w-[22px]" strokeWidth={1.8} aria-hidden="true" />
                <span className="max-w-full truncate">{it.curto || it.label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMaisAberto(true)}
            aria-haspopup="dialog"
            aria-current={maisAtivo ? "page" : undefined}
            className="flex h-[58px] flex-col items-center justify-center gap-1 text-[11px] font-semibold"
            style={{ color: maisAtivo ? "var(--ca-clay)" : "var(--ca-muted)" }}
          >
            <MoreHorizontal className="h-[22px] w-[22px]" strokeWidth={1.8} aria-hidden="true" />
            <span>Mais</span>
          </button>
        </div>
      </nav>

      <Sheet open={maisAberto} onOpenChange={setMaisAberto}>
        <SheetContent side="bottom" className="rounded-t-[22px] px-4 pb-[calc(18px+env(safe-area-inset-bottom))] pt-5">
          <SheetHeader className="text-left">
            <SheetTitle className="text-base">Mais</SheetTitle>
          </SheetHeader>
          <div className="mt-2 flex flex-col">
            {naFolha.map((it) => {
              const Icon = it.icon;
              const on = ativo(it);
              return (
                <Link
                  key={it.path}
                  to={it.path}
                  className="flex min-h-[52px] items-center gap-3 rounded-xl px-2 text-[15px] font-semibold hover:bg-[var(--ca-bg)]"
                  style={{ color: on ? "var(--ca-clay)" : "var(--ca-ink)" }}
                >
                  <Icon className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
                  {it.label}
                </Link>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
