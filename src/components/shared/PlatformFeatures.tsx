import { motion } from "framer-motion";
import {
  Calculator, Search, Calendar, MessageCircle, Star, Users, Heart, Sparkles,
  TrendingUp, ShieldCheck, Inbox, MapPin, Tag,
} from "lucide-react";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";

type Variant = "couple" | "supplier";

const COUPLE_FEATURES = [
  { icon: Calculator, title: "Simulador inteligente", desc: "Descubra em 1 minuto quanto custa o seu casamento e veja fornecedores compatíveis." },
  { icon: Search, title: "Busca estilo Airbnb", desc: "Mapa + lista com filtros por cidade, categoria, preço e avaliação." },
  { icon: Calendar, title: "Planejamento completo", desc: "79 tarefas, lista de convidados com RSVP, orçamento com gráficos e PDF." },
  { icon: MessageCircle, title: "Orçamentos com chat", desc: "Negocie diretamente com fornecedores, com propostas e anexos." },
  { icon: Tag, title: "Datas com desconto", desc: "Economize casando em datas ociosas.", flag: null as null | string },
  { icon: Star, title: "Avaliações reais", desc: "Notas de outros casais e respostas dos fornecedores." },
  { icon: Users, title: "Perfil social do casal", desc: "Compartilhe sua história, fotos e conecte com casamentos no mesmo dia.", flag: "perfil_social_casal" as const },
  { icon: Heart, title: "Indicações que rendem", desc: "Seu link único leva benefícios para você e seus amigos.", flag: "indicacoes" as const },
  { icon: Sparkles, title: "Tudo em um lugar só", desc: "Da inspiração ao grande dia, sem planilhas espalhadas." },
];

const SUPPLIER_FEATURES = [
  { icon: TrendingUp, title: "Leads qualificados", desc: "Casais já passaram pelo simulador — chegam com orçamento e data." },
  { icon: Inbox, title: "Kanban de orçamentos", desc: "Organize pedidos, propostas, anexos e o chat por estágio." },
  { icon: Calendar, title: "Agenda e datas promocionais", desc: "Bloqueie dias indisponíveis e ofereça descontos em datas ociosas." },
  { icon: MapPin, title: "Áreas de atendimento", desc: "Apareça nas cidades certas, com mapa integrado." },
  { icon: Star, title: "Reputação ativa", desc: "Avaliações bidirecionais e métricas do seu perfil." },
  { icon: ShieldCheck, title: "Aprovação humana", desc: "Curadoria manual garante credibilidade na vitrine." },
];

export default function PlatformFeatures({ variant }: { variant: Variant }) {
  const isCouple = variant === "couple";
  const perfilSocialOn = useFeatureFlag("perfil_social_casal", true);
  const indicacoesOn = useFeatureFlag("indicacoes", true);
  const flagMap: Record<string, boolean> = {
    perfil_social_casal: perfilSocialOn,
    indicacoes: indicacoesOn,
  };
  const items = isCouple
    ? COUPLE_FEATURES.filter((f: any) => !f.flag || flagMap[f.flag])
    : SUPPLIER_FEATURES;
  const eyebrow = isCouple ? "Recursos da plataforma" : "Tudo o que você ganha";
  const title = isCouple
    ? "Como o Casamenteiro funciona pra você"
    : "Uma plataforma feita pra fechar mais contratos";
  const subtitle = isCouple
    ? "Tudo que você precisa pra planejar, decidir e celebrar — sem sair daqui."
    : "Cada funcionalidade pensada pra reduzir esforço e aumentar conversão.";

  const bg = isCouple ? "hsl(var(--color-bg))" : undefined;
  const cardBg = isCouple ? "hsl(var(--color-bg))" : "hsl(var(--background))";
  const border = isCouple ? "hsl(var(--color-border))" : "hsl(var(--border))";
  const ink = isCouple ? "hsl(var(--color-dark))" : "hsl(var(--foreground))";
  const muted = isCouple ? "hsl(var(--color-text-body))" : "hsl(var(--muted-foreground))";
  const primary = isCouple ? "hsl(var(--color-primary))" : "hsl(var(--primary))";

  return (
    <section
      className={isCouple ? "py-24 px-4" : "py-24 px-4 bg-background"}
      style={isCouple ? { background: bg } : undefined}
      id={isCouple ? "recursos" : "recursos-fornecedor"}
    >
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <span className="text-xs uppercase tracking-wider" style={{ color: muted }}>{eyebrow}</span>
          <h2 className="font-serif text-3xl md:text-4xl mt-3 mb-4" style={{ color: ink }}>{title}</h2>
          <p className="text-base max-w-2xl mx-auto" style={{ color: muted }}>{subtitle}</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {items.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10%" }}
              transition={{ duration: 0.4, delay: i * 0.04 }}
              className="rounded-2xl p-5 border transition-shadow hover:shadow-md"
              style={{ background: cardBg, borderColor: border }}
            >
              <div className="relative w-10 h-10 rounded-full flex items-center justify-center mb-4 overflow-hidden">
                <span className="absolute inset-0" style={{ background: primary, opacity: 0.12 }} />
                <f.icon className="w-5 h-5 relative" style={{ color: primary }} />
              </div>
              <h3 className="font-serif text-lg mb-1.5" style={{ color: ink }}>{f.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: muted }}>{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}