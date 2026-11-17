/**
 * Regras puras da Central de Ajuda (sem acesso ao banco), usadas pela página,
 * pelo admin, pelo prerender e pelos testes.
 */
export type Publico = "casal" | "fornecedor" | "profissional";
export const PUBLICOS: { valor: Publico; rotulo: string }[] = [
  { valor: "casal", rotulo: "Casais" },
  { valor: "fornecedor", rotulo: "Fornecedores" },
  { valor: "profissional", rotulo: "Profissionais" },
];

export type FaqItem = {
  id: string;
  publico: Publico | "todos";
  categoria: string;
  pergunta: string;
  slug: string;
  resposta: string;
  feature_flag: string | null;
  ordem: number;
  ativo: boolean;
};

export type PlanoAjuda = { slug: string; nome: string; preco_mensal: number; preco_anual: number };

export type ValoresAjuda = {
  taxaReserva: number | null;
  carenciaDias: number;
  testeDias: number;
  aprovacaoHoras: number;
  planos: PlanoAjuda[];
};

export const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: v % 1 ? 2 : 0 });

/** Minúsculas e sem acento, para a busca. */
export const normalizar = (s: string) =>
  (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

/** % de economia do anual frente a 12 mensalidades (0 quando não há economia). */
export function economiaAnual(mensal: number, anual: number): number {
  if (!(mensal > 0) || !(anual > 0)) return 0;
  const pct = Math.round((1 - anual / (mensal * 12)) * 100);
  return pct > 0 ? pct : 0;
}

function precoPlano(v: ValoresAjuda, slug: string, campo: "preco_mensal" | "preco_anual"): string {
  const p = v.planos.find((x) => x.slug === slug);
  return p ? brl(p[campo]) : "consulte os planos";
}

/** Troca os placeholders pelos valores vigentes das tabelas. */
export function preencherAjuda(texto: string, v: ValoresAjuda): string {
  const mapa: Record<string, string> = {
    "{taxa_reserva}": v.taxaReserva != null ? brl(v.taxaReserva) : "um valor fixo",
    "{carencia_dias}": String(v.carenciaDias),
    "{teste_dias}": String(v.testeDias),
    "{aprovacao_horas}": String(v.aprovacaoHoras),
    "{preco_pro}": precoPlano(v, "pro", "preco_mensal"),
    "{preco_premium}": precoPlano(v, "premium", "preco_mensal"),
    "{preco_pro_anual}": precoPlano(v, "pro", "preco_anual"),
    "{preco_premium_anual}": precoPlano(v, "premium", "preco_anual"),
  };
  let out = texto || "";
  for (const [k, val] of Object.entries(mapa)) out = out.split(k).join(val);
  return out;
}

/** Flag ligada? Chave sem flag = sempre visível. Chave desconhecida = visível. */
export const flagLigada = (flags: Record<string, boolean>, key?: string | null) =>
  !key || flags[key] !== false;

/** Perguntas visíveis para um público: ativas, do público (ou "todos") e com flag ligada. */
export function perguntasVisiveis(itens: FaqItem[], publico: Publico, flags: Record<string, boolean>, busca = ""): FaqItem[] {
  const q = normalizar(busca);
  return itens
    .filter((i) => i.ativo && (i.publico === publico || i.publico === "todos") && flagLigada(flags, i.feature_flag))
    .filter((i) => !q || normalizar(i.pergunta + " " + i.resposta + " " + i.categoria).includes(q))
    .sort((a, b) => a.ordem - b.ordem);
}

/** Aba inicial: ?para= vence; senão perfil ativo; senão casal. */
export function abaInicial(para: string | null, accountType?: string | null): Publico {
  if (para === "casal" || para === "fornecedor" || para === "profissional") return para;
  if (accountType === "supplier") return "fornecedor";
  if (accountType === "profissional") return "profissional";
  return "casal";
}

/** Status público de um card (mesma regra da Home). */
export function statusCard(flags: Record<string, boolean>, emBreve: Record<string, boolean>, key?: string | null) {
  if (!key || flags[key] !== false) return "ativo" as const;
  return emBreve[key] === false ? ("oculto" as const) : ("em_breve" as const);
}

/* ------------------------------ conteúdo editável ------------------------------ */

export type Passo = { icone: string; titulo: string; texto: string };
export type Funcionalidade = { icone: string; titulo: string; texto: string; flag: string | null };
export type ConteudoAjuda = {
  hero: { titulo: string; texto: string };
  passos: Record<Publico, Passo[]>;
  funcionalidades: Record<Publico, Funcionalidade[]>;
};

export const CONTEUDO_PADRAO: ConteudoAjuda = {
  hero: {
    titulo: "O que é o Casamenteiro",
    texto:
      "O Casamenteiro conecta casais e fornecedores de casamento em BH e região: simule quanto custa, receba orçamentos, compare e organize tudo num lugar só — e fornecedores encontram clientes e equipe.",
  },
  passos: {
    casal: [
      { icone: "Calculator", titulo: "Simule", texto: "Descubra quanto custa o seu casamento em minutos." },
      { icone: "MessageSquare", titulo: "Receba orçamentos", texto: "Peça orçamentos grátis aos fornecedores." },
      { icone: "Scale", titulo: "Compare e contrate", texto: "Veja avaliações, fotos e preços lado a lado." },
      { icone: "ListChecks", titulo: "Organize", texto: "Convidados, confirmação de presença e orçamento num só lugar." },
    ],
    fornecedor: [
      { icone: "UserPlus", titulo: "Cadastre-se grátis", texto: "Monte seu perfil em poucos minutos." },
      { icone: "BadgeCheck", titulo: "Seja aprovado", texto: "Nossa equipe revisa seu perfil." },
      { icone: "CalendarDays", titulo: "Receba pedidos", texto: "Orçamentos de casais e venda das suas datas ociosas." },
      { icone: "Users", titulo: "Contrate equipe", texto: "Publique vagas para garçons, limpeza e mais." },
    ],
    profissional: [
      { icone: "UserPlus", titulo: "Crie seu perfil", texto: "Conte sua experiência e suas funções." },
      { icone: "Bell", titulo: "Receba vagas", texto: "Vagas de fornecedores da sua região." },
      { icone: "Send", titulo: "Candidate-se", texto: "Em poucos cliques." },
      { icone: "Star", titulo: "Trabalhe e seja avaliado", texto: "Boas avaliações trazem mais convites." },
    ],
  },
  funcionalidades: {
    casal: [
      { icone: "Calculator", titulo: "Simulador de orçamento", texto: "Estimativa por categoria com preços reais.", flag: "simulador" },
      { icone: "MessageSquare", titulo: "Pedido de orçamento", texto: "Converse com fornecedores sem expor seu contato.", flag: "pedido_orcamento" },
      { icone: "CalendarDays", titulo: "Datas ociosas", texto: "Datas com desconto direto dos fornecedores.", flag: "datas_ociosas" },
      { icone: "Mail", titulo: "Confirmação de presença", texto: "Convidados confirmam pelo link do convite.", flag: "rsvp_convidados" },
    ],
    fornecedor: [
      { icone: "Inbox", titulo: "Pedidos de orçamento", texto: "Receba casais interessados no seu painel.", flag: "pedido_orcamento" },
      { icone: "CalendarDays", titulo: "Datas ociosas", texto: "Venda as datas livres da sua agenda.", flag: "datas_ociosas" },
      { icone: "KanbanSquare", titulo: "Gestão de clientes", texto: "Acompanhe cada casal em etapas.", flag: "crm_fornecedor" },
      { icone: "Users", titulo: "Equipe e vagas", texto: "Contrate profissionais para seus eventos.", flag: "vagas" },
    ],
    profissional: [
      { icone: "Briefcase", titulo: "Vagas na sua região", texto: "Trabalhos publicados por fornecedores.", flag: "vagas" },
      { icone: "Star", titulo: "Avaliações", texto: "Seu histórico conta a seu favor.", flag: null },
    ],
  },
};

/** Junta o conteúdo salvo com o padrão, para nunca faltar campo. */
export function mesclarConteudo(salvo: any): ConteudoAjuda {
  const s = salvo && typeof salvo === "object" ? salvo : {};
  const pub = <T,>(campo: "passos" | "funcionalidades") =>
    Object.fromEntries(
      PUBLICOS.map(({ valor }) => [valor, Array.isArray(s?.[campo]?.[valor]) ? s[campo][valor] : (CONTEUDO_PADRAO[campo][valor] as T)]),
    ) as any;
  return {
    hero: { ...CONTEUDO_PADRAO.hero, ...(s.hero || {}) },
    passos: pub<Passo[]>("passos"),
    funcionalidades: pub<Funcionalidade[]>("funcionalidades"),
  };
}
