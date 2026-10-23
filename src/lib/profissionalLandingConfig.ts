import type { PainelIcone } from "@/lib/supplierLandingConfig";

/** Textos da página /profissional (editáveis em Admin › Landing Profissional). */
export interface ProfRecurso {
  id: string;
  icone: PainelIcone;
  titulo: string;
  texto: string;
  /** feature flag; vazio = sempre aparece. Desligada = "Em breve" (ou some). */
  flag?: string;
  tom?: "escuro" | "pessego" | "salvia";
  largo?: boolean;
}
export interface ProfPasso { titulo: string; texto: string }
export interface ProfFaq { id: string; q: string; a: string }

export interface ProfissionalLandingConfig {
  hero: { eyebrow: string; title_pre: string; title_em: string; subtitle: string; cta_label: string; imagem: string };
  como: { eyebrow: string; title: string; passos: ProfPasso[] };
  funcoes: { eyebrow: string; title: string; subtitle: string };
  recursos: { eyebrow: string; title: string; subtitle: string; items: ProfRecurso[] };
  vagas: { eyebrow: string; title: string; subtitle: string; vazio_title: string; vazio_texto: string };
  combinado: { eyebrow: string; title: string; texto: string; itens: string[] };
  faq: { title: string; items: ProfFaq[] };
  cta: { title: string; subtitle: string; button_label: string; footnote: string; espera_title: string; espera_subtitle: string; espera_button: string };
}

export const DEFAULT_PROFISSIONAL: ProfissionalLandingConfig = {
  hero: {
    eyebrow: "Para equipe de eventos",
    title_pre: "Trabalhe nos melhores eventos da",
    title_em: "sua cidade.",
    subtitle: "Casamentos, aniversários, formaturas e eventos corporativos. Garçom, cozinha, bar, recepção, som, limpeza: monte seu perfil uma vez e receba convites de buffets, espaços e cerimoniais perto de você.",
    cta_label: "Criar meu perfil grátis →",
    imagem: "",
  },
  como: {
    eyebrow: "Capítulo 01 · Como funciona",
    title: "Do perfil ao primeiro evento em três passos.",
    passos: [
      { titulo: "Monte seu perfil", texto: "Escolha suas funções, a cidade, até onde você vai e o valor mínimo por turno." },
      { titulo: "Receba convites e vagas", texto: "Fornecedores convidam você direto, e você se candidata às vagas abertas da sua região." },
      { titulo: "Trabalhe e seja avaliado", texto: "Cada evento concluído vira avaliação no seu perfil e abre portas para os próximos." },
    ],
  },
  funcoes: {
    eyebrow: "Capítulo 02 · Para quem é",
    title: "Tem lugar para a sua função.",
    subtitle: "Escolha uma ou várias. Os fornecedores filtram por função, cidade e valor.",
  },
  recursos: {
    eyebrow: "Capítulo 03 · Seu painel",
    title: "Sua agenda de eventos num lugar só.",
    subtitle: "Sem grupo de WhatsApp lotado, sem perder data.",
    items: [
      { id: "r1", icone: "inbox", titulo: "Convites diretos", texto: "Buffets e espaços encontram você por função, cidade e valor, e convidam para o evento.", flag: "vagas", tom: "escuro" },
      { id: "r2", icone: "sparkles", titulo: "Vagas abertas", texto: "Veja as vagas da sua região e candidate-se com um toque.", flag: "vagas", tom: "pessego" },
      { id: "r3", icone: "calendar", titulo: "Agenda sem conflito", texto: "Ao aceitar uma vaga, a data fica bloqueada na sua agenda." },
      { id: "r4", icone: "message", titulo: "Chat com o fornecedor", texto: "Combine horário, uniforme e detalhes antes do evento." },
      { id: "r5", icone: "star", titulo: "Avaliação dos dois lados", texto: "Você avalia o fornecedor e é avaliado. Reputação que acompanha você.", flag: "avaliacao_bidirecional", tom: "salvia" },
      { id: "r6", icone: "users", titulo: "Perfil público", texto: "Um link com suas funções, fotos e avaliações para mandar a quem quiser." },
      { id: "r7", icone: "shield", titulo: "Documentos guardados", texto: "Seus documentos ficam no perfil, prontos para quando o fornecedor pedir." },
      { id: "r8", icone: "refresh", titulo: "Aviso de vaga nova", texto: "Receba um e-mail quando abrir vaga com a sua função e na sua região." },
    ],
  },
  vagas: {
    eyebrow: "Capítulo 04 · Agora",
    title: "Vagas abertas agora",
    subtitle: "Vagas publicadas por fornecedores da plataforma. Para se candidatar, crie seu perfil.",
    vazio_title: "As primeiras vagas estão chegando.",
    vazio_texto: "Crie seu perfil agora: quando um buffet, espaço ou cerimonial da sua região publicar uma vaga na sua função, você é avisado por e-mail.",
  },
  combinado: {
    eyebrow: "Transparência",
    title: "Grátis para você. Combinado direto com quem contrata.",
    texto: "O pagamento é combinado e feito diretamente entre você e o fornecedor; a plataforma apenas registra o valor do turno.",
    itens: ["Sem taxa para o profissional", "Vagas só de fornecedores com plano ativo", "Valor do turno visível antes de aceitar", "Avaliação depois de cada evento"],
  },
  faq: {
    title: "Dúvidas comuns",
    items: [
      { id: "q1", q: "Preciso pagar alguma coisa?", a: "Não. Criar o perfil, receber convites e se candidatar a vagas é grátis para o profissional." },
      { id: "q2", q: "Como recebo pelo trabalho?", a: "O pagamento é combinado e feito diretamente entre você e o fornecedor. A plataforma registra o valor do turno para os dois terem o mesmo combinado." },
      { id: "q6", q: "Quem publica as vagas?", a: "Buffets, espaços, cerimoniais e outros fornecedores de festas e eventos com plano ativo no Casamenteiro. Toda vaga mostra quem está contratando, a data, o horário e o valor do turno." },
      { id: "q3", q: "Preciso ter experiência?", a: "Não necessariamente. Conte no perfil o que você já fez; as avaliações dos primeiros eventos ajudam a conseguir os próximos." },
      { id: "q4", q: "Posso trabalhar em mais de uma função?", a: "Sim. Escolha todas as funções que você faz; os fornecedores filtram por elas." },
      { id: "q5", q: "Meu telefone fica público?", a: "Não. O fornecedor só vê seu contato quando vocês confirmam uma vaga juntos." },
    ],
  },
  cta: {
    title: "Bora pro próximo evento?",
    subtitle: "Deixe seu e-mail e termine o cadastro em poucos minutos.",
    button_label: "Criar meu perfil →",
    footnote: "✓ Grátis para o profissional · ✓ Sem taxa · ✓ Você escolhe as vagas",
    espera_title: "As vagas abrem em breve.",
    espera_subtitle: "Deixe seu e-mail e avisamos assim que você puder criar o perfil e receber convites.",
    espera_button: "Avise-me quando abrir →",
  },
};

/** Mescla o que foi salvo no admin com o padrão (seções novas sempre têm valor). */
export function mesclarProfissional(salvo: Partial<ProfissionalLandingConfig> | null | undefined): ProfissionalLandingConfig {
  const s = salvo ?? {};
  const d = DEFAULT_PROFISSIONAL;
  return {
    hero: { ...d.hero, ...(s.hero ?? {}) },
    como: { ...d.como, ...(s.como ?? {}) },
    funcoes: { ...d.funcoes, ...(s.funcoes ?? {}) },
    recursos: { ...d.recursos, ...(s.recursos ?? {}) },
    vagas: { ...d.vagas, ...(s.vagas ?? {}) },
    combinado: { ...d.combinado, ...(s.combinado ?? {}) },
    faq: { ...d.faq, ...(s.faq ?? {}) },
    cta: { ...d.cta, ...(s.cta ?? {}) },
  };
}
