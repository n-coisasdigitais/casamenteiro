import { Link } from "react-router-dom";
import { CalendarCheck, Gift, Heart, ListChecks, Mail, MessageCircle, PieChart, Users, UsersRound } from "lucide-react";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import { ChapterLabel } from "./parts";

type Card = {
  key: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  titulo: string;
  texto?: string;
  tom?: "escuro" | "pessego" | "salvia";
  largo?: boolean;
  extra?: React.ReactNode;
};

/**
 * Passo 3 · Celebrem — "Do sim ao sim, sem planilha": o que o casal ganha no painel.
 * Cada bloco respeita a feature flag do recurso (não promete o que está desligado).
 */
export default function CelebrateSection() {
  const rsvp = useFeatureFlag("rsvp_convidados", true);
  const pedidos = useFeatureFlag("pedido_orcamento", true);
  const reservas = useFeatureFlag("reserva_datas_ociosas", true);
  const perfil = useFeatureFlag("perfil_social_casal", false);
  const indicacoes = useFeatureFlag("indicacoes", false);

  const cards: Card[] = [
    {
      key: "orc",
      icon: PieChart,
      label: "Orçamento",
      titulo: "Quanto já foi, quanto falta.",
      texto: "Gráficos por categoria e exportação em PDF.",
      largo: true,
      extra: (
        <div aria-hidden="true" className="mt-auto flex h-[70px] items-end gap-2.5">
          {[80, 55, 95, 35, 60, 45].map((h, i) => (
            <span key={i} className="flex-1 rounded-lg" style={{ height: `${h}%`, background: ["#D9905A", "#4A7C6A", "#F2B98A", "#9FD3BE", "#CFC6BC", "#D9905A"][i] }} />
          ))}
        </div>
      ),
    },
    { key: "tar", icon: ListChecks, label: "Checklist", titulo: "Tarefas prontas, na ordem certa.", texto: "Do noivado à festa, com prazos sugeridos." },
    { key: "conv", icon: Users, label: "Convidados", titulo: "Lista organizada por grupo e mesa.", texto: "Quem vem, quem falta responder, quem leva acompanhante." },
    ...(rsvp ? [{ key: "rsvp", icon: Mail, label: "Convites com RSVP", titulo: "Mandem o link. A confirmação cai sozinha na lista.", tom: "pessego" as const }] : []),
    ...(pedidos ? [{ key: "msg", icon: MessageCircle, label: "Mensagens", titulo: "Um chat com cada fornecedor.", texto: "Adeus, 8 grupos de WhatsApp." }] : []),
    ...(reservas ? [{ key: "res", icon: CalendarCheck, label: "Reservas e pagamento", titulo: "Reservem a data e paguem com comprovante.", tom: "salvia" as const }] : []),
    { key: "forn", icon: Heart, label: "Meus fornecedores", titulo: "Favoritos, contratados e propostas num lugar." },
    ...(perfil ? [{ key: "perfil", icon: UsersRound, label: "Perfil do casal", titulo: "Contem a história de vocês e conheçam casais que casam no mesmo dia.", largo: true }] : []),
    ...(indicacoes ? [{ key: "ind", icon: Gift, label: "Indicações", titulo: "Indiquem amigos e ganhem benefícios." }] : []),
  ];

  return (
    <section id="celebrar" aria-labelledby="plan-title" className="relative scroll-mt-20 overflow-hidden px-6 py-28" style={{ background: "var(--hv-ink)", color: "var(--hv-cream)" }}>
      <div aria-hidden="true" className="hv-thread absolute left-1/2 top-0 -ml-0.5 h-[72px]" style={{ backgroundImage: "radial-gradient(circle, #F2B98A 2px, transparent 2.5px)", margin: 0 }} />
      <div aria-hidden="true" className="absolute -right-[200px] -top-[240px] h-[700px] w-[700px] rounded-full" style={{ background: "radial-gradient(circle, rgba(217,144,90,.32), transparent 65%)" }} />
      <div className="relative mx-auto flex max-w-[1200px] flex-col gap-12">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="flex max-w-[680px] flex-col gap-4">
            <ChapterLabel n="03" text="Passo 3 · Celebrem" color="var(--hv-peach)" onDark />
            <h2 id="plan-title" className="hv-display m-0" style={{ fontSize: "clamp(40px, 5vw, 64px)" }}>
              Do “sim” ao “sim”,
              <br />
              sem planilha.
            </h2>
            <p className="m-0 text-[19px] leading-normal" style={{ color: "#CFC6BC" }}>
              Tudo o que o casamento precisa, num painel só. Grátis para o casal.
            </p>
          </div>
          <Link to="/cadastro" className="hv-btn inline-flex min-h-[54px] items-center rounded-full px-7 text-[17px] font-bold" style={{ background: "var(--hv-peach)", color: "var(--hv-ink)" }}>
            Começar meu plano
          </Link>
        </div>

        <div className="grid auto-rows-[minmax(200px,auto)] grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c) => {
            const bg = c.tom === "pessego" ? "var(--hv-peach)" : c.tom === "salvia" ? "var(--hv-sage)" : "#2B2825";
            const fg = c.tom === "pessego" ? "var(--hv-ink)" : "#fff";
            const corLabel = c.tom === "pessego" ? "#7E3C12" : c.tom === "salvia" ? "#DDEBE5" : "var(--hv-peach)";
            const corIcone = c.tom === "pessego" ? "#7E3C12" : c.tom === "salvia" ? "#fff" : "var(--hv-peach)";
            const fundoIcone = c.tom === "pessego" ? "rgba(31,29,27,.08)" : c.tom === "salvia" ? "rgba(255,255,255,.15)" : "rgba(242,185,138,.14)";
            const Icon = c.icon;
            return (
              <div key={c.key} className={`hv-lift flex min-w-0 flex-col gap-2.5 rounded-[26px] p-7 ${c.largo ? "sm:col-span-2" : ""}`} style={{ background: bg, color: fg }}>
                <span aria-hidden="true" className="flex h-12 w-12 items-center justify-center rounded-[14px]" style={{ background: fundoIcone }}>
                  <Icon className="h-[26px] w-[26px]" style={{ color: corIcone }} />
                </span>
                <span className="text-[13px] font-bold uppercase" style={{ letterSpacing: ".06em", color: corLabel }}>
                  {c.label}
                </span>
                <span className="text-[22px] font-extrabold" style={{ letterSpacing: "-0.02em" }}>
                  {c.titulo}
                </span>
                {c.texto && (
                  <span className="text-[15px]" style={{ color: c.tom ? undefined : "#CFC6BC" }}>
                    {c.texto}
                  </span>
                )}
                {c.extra}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
