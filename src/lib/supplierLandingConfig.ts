export interface NavbarCfg { cta_label: string; cta_href: string }
export interface HeroCfg {
  video_src?: string;
  fallback_image?: string;
  eyebrow: string;
  title_pre: string;
  title_em: string;
  subtitle: string;
  cta_primary_label: string;
  cta_primary_href: string;
  cta_secondary_label: string;
}
export interface HowStep { label: string; title: string; description: string; emoji: string; preview: string }
export interface HowCfg { eyebrow: string; title: string; subtitle: string; steps: HowStep[] }
export interface WhyItem { label: string; title: string; description: string; imageSrc: string; imageAlt: string }
export interface WhyCfg { eyebrow: string; title_line1: string; title_line2: string; subtitle: string; items: WhyItem[] }
export interface TestimonialItem { id: string; name: string; role: string; city: string; text: string; rating: number; avatarUrl?: string; emoji?: string }
export interface TestimonialsCfg { eyebrow: string; title_pre: string; title_em: string; subtitle: string; rating_text: string; items: TestimonialItem[] }
export interface CtaCfg { eyebrow: string; title: string; subtitle: string; button_label: string; redirect_path: string; footnote: string }
export interface TrustPillar { id: string; icon: "gift" | "clock" | "target" | "calendar"; title: string; description: string }
export interface TrustCfg { eyebrow: string; title: string; subtitle: string; items: TrustPillar[] }

/* ---------- Seções da página v2 ---------- */
export interface LeadCfg { eyebrow: string; title_pre: string; title_em: string; subtitle: string; comum_titulo: string; comum_fala: string; comum_itens: string[]; nosso_titulo: string; nosso_itens: string[] }

/** Ícones disponíveis para as funcionalidades do painel (nomes do lucide-react). */
export const PAINEL_ICONES = [
  "inbox", "message", "kanban", "calendar", "calendar-heart", "users", "star", "wallet", "sparkles", "bar-chart", "refresh", "shield",
] as const;
export type PainelIcone = (typeof PAINEL_ICONES)[number];
export interface PainelItem {
  id: string;
  icone: PainelIcone;
  titulo: string;
  texto: string;
  /** chave da feature flag; vazio = sempre aparece */
  flag?: string;
  /** cor do bloco */
  tom?: "escuro" | "pessego" | "salvia";
  /** ocupa 2 colunas */
  largo?: boolean;
}
export interface PainelCfg { eyebrow: string; title: string; subtitle: string; items: PainelItem[] }
export interface PlanosCfg { eyebrow: string; title_pre: string; title_em: string; subtitle: string; destaques_titulo: string; destaques_texto: string; reserva_titulo: string; reserva_texto: string }
export interface FaqItem { id: string; q: string; a: string }
/** Respostas aceitam variáveis: {taxa_reserva} {carencia_dias} {teste_dias} {aprovacao_horas} */
export interface FaqCfg { title: string; items: FaqItem[] }

export interface SupplierLandingConfig {
  navbar: NavbarCfg;
  hero: HeroCfg;
  how: HowCfg;
  why: WhyCfg;
  trust: TrustCfg;
  testimonials: TestimonialsCfg;
  cta: CtaCfg;
  lead: LeadCfg;
  painel: PainelCfg;
  planos: PlanosCfg;
  faq: FaqCfg;
}

export const DEFAULT_LANDING: SupplierLandingConfig = {
  navbar: { cta_label: "Anuncie grátis →", cta_href: "/fornecedor/cadastro" },
  hero: {
    video_src: "",
    fallback_image: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1920&q=80",
    eyebrow: "Para fornecedores",
    title_pre: "Leve seu negócio para quem quer",
    title_em: "casar.",
    subtitle: "Conecte seu serviço a casais que já simularam o orçamento e estão prontos para contratar.",
    cta_primary_label: "Quero me cadastrar →",
    cta_primary_href: "/fornecedor/cadastro",
    cta_secondary_label: "Como funciona",
  },
  how: {
    eyebrow: "Como funciona",
    title: "Comece a receber contatos em 3 passos simples",
    subtitle: "Nosso processo é rápido, sem burocracia e 100% gratuito para começar.",
    steps: [
      { label: "Passo 01", title: "Você se cadastra", description: "Preencha as informações do seu serviço em poucos minutos. Sem cartão de crédito.", emoji: "✏️", preview: "Complete seu perfil" },
      { label: "Passo 02", title: "A gente aprova", description: "Nossa equipe revisa e publica seu perfil na plataforma em até 24h.", emoji: "✅", preview: "Aprovação em 24h" },
      { label: "Passo 03", title: "Os casais te encontram", description: "Receba contatos de casais com orçamento definido e data já marcada.", emoji: "💌", preview: "Casais te encontram" },
    ],
  },
  why: {
    eyebrow: "Por que anunciar",
    title_line1: "Resultados reais,",
    title_line2: "sem jogo de azar",
    subtitle: "Cada funcionalidade foi pensada para você fechar mais contratos com menos esforço.",
    items: [
      { label: "01", title: "Leads qualificados", description: "Casais que já simularam o orçamento e estão prontos para contratar.", imageSrc: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=900&q=80", imageAlt: "Tela de leads qualificados" },
      { label: "02", title: "Datas ociosas = mais receita", description: "Preencha sua agenda em dias úteis com descontos que você define.", imageSrc: "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=900&q=80", imageAlt: "Agenda de datas" },
      { label: "03", title: "Zero risco para começar", description: "Seu cadastro é gratuito. Você só investe quando ver resultado.", imageSrc: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=900&q=80", imageAlt: "Planos e investimento" },
      { label: "04", title: "Visibilidade real", description: "Apareça para casais da sua cidade, na sua categoria, no seu preço.", imageSrc: "https://images.unsplash.com/photo-1521295121783-8a321d551ad2?w=900&q=80", imageAlt: "Busca por cidade" },
    ],
  },
  testimonials: {
    eyebrow: "Depoimentos",
    title_pre: "Depoimentos",
    title_em: "reais",
    subtitle: "Adicionamos aqui somente depoimentos verificados de fornecedores.",
    rating_text: "",
    items: [],
  },
  trust: {
    eyebrow: "Por que confiar",
    title: "Prova social honesta",
    subtitle: "Compromissos claros — sem números inventados nem depoimentos fabricados.",
    items: [
      { id: "1", icon: "gift",     title: "Cadastro gratuito",                    description: "Crie seu perfil sem cartão de crédito e sem mensalidade obrigatória." },
      { id: "2", icon: "clock",    title: "Aprovação em 24h",                     description: "Nossa equipe revisa e publica seu perfil em até um dia útil." },
      { id: "3", icon: "target",   title: "Leads com orçamento e data definidos", description: "Os pedidos chegam com valor esperado, cidade e data do casamento." },
      { id: "4", icon: "calendar", title: "Datas ociosas: encha sua agenda",      description: "Marque dias com pouca procura e receba pedidos de casais buscando data flexível." },
    ],
  },
  lead: {
    eyebrow: "Capítulo 01 · O pedido certo",
    title_pre: "Chega de orçamento para quem só está",
    title_em: "olhando.",
    subtitle: "Todo casal passa pelo simulador antes de pedir orçamento. Você recebe o contexto completo e decide em segundos se vale a pena responder.",
    comum_titulo: "Pedido comum (WhatsApp, Instagram)",
    comum_fala: "Oi, quanto custa?",
    comum_itens: ["Sem data, sem cidade", "Sem ideia de orçamento", "5 mensagens até saber se vale a pena"],
    nosso_titulo: "Pedido Casamenteiro",
    nosso_itens: ["Dados do casamento vindos do simulador", "Converse com o casal pelo chat, com proposta e anexos", "Tudo organizado no seu painel"],
  },
  painel: {
    eyebrow: "Capítulo 03 · Seu painel",
    title: "Do pedido ao contrato, sem planilha.",
    subtitle: "Um painel feito para quem vive de evento: organiza os pedidos, a agenda e a equipe.",
    items: [
      { id: "p1", icone: "inbox", titulo: "Pedidos com os dados do casamento", texto: "Data, cidade, convidados, estilo e orçamento chegam junto com o pedido, direto do simulador.", flag: "pedido_orcamento", tom: "escuro", largo: true },
      { id: "p2", icone: "message", titulo: "Mensagens com o casal", texto: "Responda, envie proposta e anexos pelo chat, sem expor seu WhatsApp.", flag: "pedido_orcamento" },
      { id: "p3", icone: "kanban", titulo: "Kanban de orçamentos", texto: "Cada pedido no estágio certo: novo, proposta, fechado.", flag: "crm_fornecedor" },
      { id: "p4", icone: "calendar", titulo: "Agenda", texto: "Bloqueie datas e receba pedidos só quando estiver livre.", flag: "painel_fornecedor" },
      { id: "p5", icone: "calendar-heart", titulo: "Datas ociosas", texto: "Encha a sexta e o domingo com desconto programado.", flag: "datas_ociosas", tom: "pessego" },
      { id: "p6", icone: "users", titulo: "Equipe e vagas", texto: "Garçom, apoio e limpeza para cada evento, com profissionais avaliados.", flag: "vagas", tom: "salvia" },
      { id: "p7", icone: "star", titulo: "Reputação", texto: "Avaliações só de quem contratou, com direito a resposta.", flag: "avaliacao_bidirecional" },
      { id: "p8", icone: "sparkles", titulo: "Destaques na Home", texto: "Sua foto onde o casal começa a planejar.", flag: "destaque_pago" },
      { id: "p9", icone: "refresh", titulo: "Agenda sincronizada", texto: "Integração com a agenda que você já usa.", flag: "agenda_integracao" },
    ],
  },
  planos: {
    eyebrow: "Capítulo 04 · Quanto custa",
    title_pre: "Comece grátis. Cresça quando",
    title_em: "fechar.",
    subtitle: "Comece no plano gratuito, sem mensalidade, e experimente o plano completo por {teste_dias} dias após a aprovação. Depois, continue no gratuito ou escolha um plano pago. Sem assinatura automática.",
    destaques_titulo: "Apareça na Home, onde o casal começa.",
    destaques_texto: "Sua foto com o selo “Patrocinado” e link para o seu perfil. Vagas limitadas que se revezam, com relatório de visualizações e cliques.",
    reserva_titulo: "Reserva de data ociosa",
    reserva_texto: "Você só paga quando aprova uma reserva de data ociosa feita por um casal. O casal pode cancelar sem custo em até {carencia_dias} dias; depois disso, o custo do cancelamento fica com o casal.",
  },
  faq: {
    title: "Dúvidas comuns",
    items: [
      { id: "f1", q: "Preciso pagar para anunciar?", a: "Não. O plano gratuito continua gratuito, sem mensalidade, e permite receber pedidos de orçamento. O fim do teste do plano completo não transforma seu cadastro em uma assinatura paga." },
      { id: "f2", q: "Por quanto tempo posso experimentar o plano completo?", a: "Após a aprovação do cadastro, você tem {teste_dias} dias para experimentar o plano completo sem custo. Esse prazo vale para o teste dos recursos pagos, não para o plano gratuito." },
      { id: "f7", q: "O que acontece quando o teste termina?", a: "Se você não contratar um plano pago, seu cadastro passa para o plano gratuito, sem cobrança. Os recursos exclusivos dos planos pagos deixam de ficar disponíveis, mas o plano gratuito continua sem mensalidade. Para manter os recursos completos, você pode escolher e contratar um plano pago." },
      { id: "f3", q: "A plataforma cobra comissão?", a: "Não. Não cobramos comissão sobre os seus contratos. A única taxa é de {taxa_reserva} quando você aprova a reserva de uma data ociosa." },
      { id: "f4", q: "E se o casal cancelar a reserva?", a: "O casal pode cancelar sem custo em até {carencia_dias} dias. Depois desse prazo, o custo do cancelamento fica com o casal, para não prejudicar a sua agenda." },
      { id: "f5", q: "Em quanto tempo meu perfil vai ao ar?", a: "Uma pessoa da equipe revisa seu cadastro em até {aprovacao_horas}h. Se faltar alguma informação, avisamos por e-mail." },
      { id: "f6", q: "Como os casais chegam até mim?", a: "Pela busca, pela sua categoria e pelo simulador: o casal informa data, cidade, convidados e orçamento, e mostramos fornecedores compatíveis." },
    ],
  },
  cta: {
    eyebrow: "Comece agora",
    title: "Anuncie grátis. Comece com o plano completo.",
    subtitle: "Experimente o plano completo por {teste_dias} dias após a aprovação. Depois, continue no plano gratuito, sem mensalidade, ou escolha um plano pago. Deixe seu e-mail e comece o cadastro.",
    button_label: "Garantir meu acesso →",
    redirect_path: "/fornecedor/cadastro",
    footnote: "✓ Sem cartão para começar  ·  ✓ Sem assinatura automática  ·  ✓ O gratuito continua grátis",
  },
};