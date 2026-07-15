// ─────────────────────────────────────────────────────────────
// Casamenteiro — Simulador v2 (adaptado ao schema atual)
// Usa: suppliers, categories, home_simulacoes, couples,
//      couple_suppliers, budget_items
// ─────────────────────────────────────────────────────────────
import { supabase } from "@/integrations/supabase/client";
import { buildWhatsAppLink } from "@/lib/phone";

export type Estilo = "intimista" | "elegante" | "grandioso";

// ── Cache de coordenadas para Haversine ──
let _coordCache: Map<string, { lat: number; lng: number; estado: string }> | null = null;
async function getCoordCache() {
  if (_coordCache) return _coordCache;
  const { data } = await supabase
    .from("cidades_coordenadas")
    .select("cidade, estado, lat, lng");
  _coordCache = new Map();
  for (const r of data || []) {
    _coordCache.set((r as any).cidade.toLowerCase(), {
      lat: Number((r as any).lat),
      lng: Number((r as any).lng),
      estado: (r as any).estado,
    });
  }
  return _coordCache;
}

// Distância em km entre dois pontos lat/lng (Haversine)
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Categorias internas do simulador → slugs reais do banco `categories`
// Algumas categorias são compartilhadas (ex: espaco/buffet → espacos-buffet)
const CATEGORIA_SLUG: Record<string, string> = {
  espaco: "espacos-buffet",
  buffet: "espacos-buffet",
  fotografo: "fotografia",
  decoracao: "decoracao",
  banda: "musica-dj",
  cerimonialista: "cerimonialista",
  trajes: "vestido-noiva",
  maquiagem: "beleza-maquiagem",
  convites: "convites",
};

const CATEGORIAS_LABELS: Record<string, string> = {
  espaco: "Espaço",
  buffet: "Buffet",
  fotografo: "Fotógrafo",
  decoracao: "Decoração",
  banda: "Banda / Música",
  cerimonialista: "Cerimonialista",
  trajes: "Trajes",
  maquiagem: "Maquiagem & Cabelo",
  convites: "Convites",
};

const CATEGORIAS_ICONS: Record<string, string> = {
  espaco: "🏛️",
  buffet: "🍽️",
  fotografo: "📸",
  decoracao: "🌸",
  banda: "🎵",
  cerimonialista: "💍",
  trajes: "👗",
  maquiagem: "💄",
  convites: "✉️",
};

const DISTRIBUICAO: Record<Estilo, Record<string, number>> = {
  intimista: {
    espaco: 0.18, buffet: 0.32, fotografo: 0.12, decoracao: 0.10,
    banda: 0.10, cerimonialista: 0.06, trajes: 0.06, maquiagem: 0.04, convites: 0.02,
  },
  elegante: {
    espaco: 0.20, buffet: 0.30, fotografo: 0.11, decoracao: 0.12,
    banda: 0.10, cerimonialista: 0.07, trajes: 0.05, maquiagem: 0.03, convites: 0.02,
  },
  grandioso: {
    espaco: 0.22, buffet: 0.28, fotografo: 0.10, decoracao: 0.13,
    banda: 0.12, cerimonialista: 0.07, trajes: 0.04, maquiagem: 0.02, convites: 0.02,
  },
};

export type FornecedorSugerido = {
  id: string;
  nome: string;
  cidade: string | null;
  whatsapp: string | null;
  foto_perfil_url: string | null;
  faixa_preco: "$" | "$$" | "$$$";
  destaque: boolean;
  rating: number | null;
  preco_base: number | null;
  temDesconto: boolean;
  desconto: number;
  economiaEstimada: number;
  linkWhatsApp: string;
  aceita_datas_ociosas: boolean;
  pricing_model: "fixo" | "por_pessoa";
  preco_por_convidado: number | null;
};

export type CategoriaPlano = {
  key: string;
  label: string;
  icon: string;
  slug: string;
  verba: number;
  percentual: number;
  fornecedores: FornecedorSugerido[];
  encontrou: boolean;
};

export type Alerta = {
  tipo: "aviso" | "oportunidade" | "dica";
  mensagem: string;
  acao?: { label: string; codigo: "ATIVAR_OCIOSAS" } | null;
  sugestoes?: string[];
};

export type SimuladorResultado = {
  simulacaoId: string | null;
  resumo: {
    orcamentoTotal: number;
    totalAlocado: number;
    sobraOrcamento: number;
    convidados: number;
    cidade: string;
    estilo: Estilo;
    aceitaOciosas: boolean;
    categoriasComFornecedor: number;
    totalCategorias: number;
    cobertura: number;
  };
  plano: Record<string, CategoriaPlano>;
  alertas: Alerta[];
};

export function formatarReais(valor: number): string {
  return (valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function faixaPreco(s: any, convidados: number): "$" | "$$" | "$$$" {
  let p = Number(s.price_min ?? s.price_max ?? 0);
  if (s.pricing_model === "por_pessoa") p = p * Math.max(1, convidados);
  if (p < 5000) return "$";
  if (p < 20000) return "$$";
  return "$$$";
}

function precoBase(s: any, convidados: number): number {
  const a = s.price_min;
  const b = s.price_max;
  let unit = a != null && b != null
    ? (Number(a) + Number(b)) / 2
    : Number(a ?? b ?? 0);
  if (s.pricing_model === "por_pessoa") unit = unit * Math.max(1, convidados);
  return Math.round(unit);
}

function enriquecer(s: any, verba: number, convidados: number, aceitaOciosas: boolean): FornecedorSugerido {
  const tem = !!(aceitaOciosas && s.accepts_idle_dates && (s.idle_discount_pct || 0) > 0);
  const desconto = tem ? Number(s.idle_discount_pct) : 0;
  const base = precoBase(s, convidados);
  const economiaEstimada = tem && base ? Math.round(base * (desconto / 100)) : 0;
  const isPorPessoa = s.pricing_model === "por_pessoa";
  const unitario = isPorPessoa
    ? Math.round(
        s.price_min != null && s.price_max != null
          ? (Number(s.price_min) + Number(s.price_max)) / 2
          : Number(s.price_min ?? s.price_max ?? 0)
      )
    : null;
  const fone = (s.whatsapp || s.phone || "");
  const msg =
    `Olá! Vim pela plataforma Casamenteiro e tenho interesse no seu serviço. ` +
    `Orçamento estimado: R$ ${verba.toLocaleString("pt-BR")} para ${convidados} convidados.`;
  return {
    id: s.id,
    nome: s.company_name,
    cidade: s.city,
    whatsapp: s.whatsapp || s.phone || null,
    foto_perfil_url: s.profile_photo_url,
    faixa_preco: faixaPreco(s, convidados),
    destaque: !!s.featured,
    rating: s.rating,
    preco_base: base || null,
    temDesconto: tem,
    desconto,
    economiaEstimada,
    linkWhatsApp: buildWhatsAppLink(fone, msg) || "",
    aceita_datas_ociosas: !!s.accepts_idle_dates,
    pricing_model: isPorPessoa ? "por_pessoa" : "fixo",
    preco_por_convidado: unitario,
  };
}

async function buscarFornecedores(
  slug: string,
  verba: number,
  convidados: number,
  cidade: string,
  aceitaOciosas: boolean,
  catIdMap: Map<string, string>,
): Promise<FornecedorSugerido[]> {
  const catId = catIdMap.get(slug);
  if (!catId) return [];

  // Busca todos os fornecedores aprovados da categoria; filtramos depois
  // (cidade exata, cidades_atendidas ou raio).
  const { data, error } = await supabase
    .from("suppliers")
    .select(
      "id, company_name, city, state, whatsapp, phone, profile_photo_url, price_min, price_max, featured, rating, accepts_idle_dates, idle_discount_pct, status, category_id, guest_min, guest_max, cidades_atendidas, raio_atendimento_km, lat, lng, pricing_model",
    )
    .eq("status", "approved")
    .eq("category_id", catId)
    .limit(100);

  if (error || !data) return [];

  const cidadeBusca = (cidade || "").trim().toLowerCase();
  let buscaCoord: { lat: number; lng: number; estado: string } | null = null;
  if (cidadeBusca) {
    const cache = await getCoordCache();
    buscaCoord = cache.get(cidadeBusca) || null;
  }

  const matchCidade = (s: any): boolean => {
    if (!cidadeBusca) return true;
    // 1) cidade exata
    if ((s.city || "").toLowerCase().includes(cidadeBusca)) return true;
    // 2) cidades_atendidas (jsonb array de strings)
    const atendidas: string[] = Array.isArray(s.cidades_atendidas) ? s.cidades_atendidas : [];
    if (atendidas.some((c) => (c || "").toLowerCase().includes(cidadeBusca))) return true;
    // 3) raio via Haversine
    if (buscaCoord && s.lat && s.lng && s.raio_atendimento_km > 0) {
      const d = haversineKm(buscaCoord.lat, buscaCoord.lng, Number(s.lat), Number(s.lng));
      if (d <= s.raio_atendimento_km) return true;
    }
    // 4) fallback: mesmo estado se fornecedor declara raio
    if (buscaCoord && s.state === buscaCoord.estado && s.raio_atendimento_km > 0) {
      return true;
    }
    return false;
  };

  const filtrados = data.filter((s: any) => {
    if (!matchCidade(s)) return false;
    if (s.guest_min && convidados < s.guest_min) return false;
    if (s.guest_max && convidados > s.guest_max) return false;
    const fator = aceitaOciosas && s.accepts_idle_dates && (s.idle_discount_pct || 0) > 0
      ? 1 - Number(s.idle_discount_pct) / 100
      : 1;
    const base = precoBase(s, convidados);
    if (base > 0 && Math.round(base * fator) > verba * 1.15) return false;
    return true;
  });

  filtrados.sort((a: any, b: any) => {
    if ((b.featured ? 1 : 0) !== (a.featured ? 1 : 0)) return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
    if (aceitaOciosas) {
      const av = a.accepts_idle_dates ? 1 : 0;
      const bv = b.accepts_idle_dates ? 1 : 0;
      if (av !== bv) return bv - av;
    }
    return Number(b.rating || 0) - Number(a.rating || 0);
  });

  return filtrados.slice(0, 3).map((s: any) => enriquecer(s, verba, convidados, aceitaOciosas));
}

function gerarAlertas(plano: Record<string, CategoriaPlano>, semFornecedor: string[], sobra: number, aceitaOciosas: boolean): Alerta[] {
  const alertas: Alerta[] = [];

  if (semFornecedor.length > 0) {
    alertas.push({
      tipo: "aviso",
      mensagem:
        `Não encontramos fornecedores para: ${semFornecedor.join(", ")}. ` +
        `O orçamento dessas categorias pode estar abaixo do disponível na sua cidade.`,
      acao: aceitaOciosas ? null : { label: "Ver opções com desconto em datas ociosas", codigo: "ATIVAR_OCIOSAS" },
    });
  }

  if (sobra > 1000) {
    alertas.push({
      tipo: "oportunidade",
      mensagem: `Você tem ${formatarReais(sobra)} de margem no orçamento.`,
      sugestoes: [
        sobra >= 2000 ? "Adicionar videografia" : null,
        sobra >= 1500 ? "Upgrade no álbum de fotos" : null,
        sobra >= 3000 ? "Adicionar open bar" : null,
        sobra >= 5000 ? "Pacote de lua de mel" : null,
      ].filter(Boolean) as string[],
    });
  }

  const cobertura = Object.values(plano).filter((c) => c.encontrou).length / Object.keys(plano).length;
  if (cobertura < 0.7 && !aceitaOciosas) {
    alertas.push({
      tipo: "dica",
      mensagem:
        "Casamentos em dias úteis costumam ter até 35% de desconto nos fornecedores. " +
        "Isso pode viabilizar um casamento bem mais completo.",
      acao: { label: "Recalcular com datas ociosas", codigo: "ATIVAR_OCIOSAS" },
    });
  }

  return alertas;
}

async function salvarSimulacao(input: {
  orcamento: number; convidados: number; cidade: string; estilo: Estilo; aceitaOciosas: boolean;
  resultado?: any;
  categoriasSelecionadas?: string[] | null;
}): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    let coupleId: string | null = null;
    if (user) {
      const { data: c } = await supabase.from("couples").select("id").eq("user_id", user.id).maybeSingle();
      coupleId = c?.id || null;
    }
    const { data, error } = await (supabase.from("home_simulacoes" as any) as any)
      .insert({
        user_id: user?.id ?? null,
        couple_id: coupleId,
        orcamento_total: input.orcamento,
        num_convidados: input.convidados,
        cidade: input.cidade,
        estilo: input.estilo,
        resultado: input.resultado ?? null,
        categorias_selecionadas: input.categoriasSelecionadas ?? null,
      })
      .select("id")
      .maybeSingle();
    if (error) throw error;
    return data?.id ?? null;
  } catch (e) {
    console.error("salvarSimulacao", e);
    return null;
  }
}

export async function calcularSimulacao(
  orcamento: number,
  convidados: number,
  cidade: string,
  estilo: Estilo,
  aceitaOciosas: boolean = false,
  categoriasSelecionadas?: string[] | null,
): Promise<SimuladorResultado> {
  // Normaliza para os enums internos — aceita rótulos antigos/livres
  const normalizar = (v: any): Estilo => {
    const s = String(v || "").toLowerCase();
    if (s.startsWith("simples") || s.startsWith("intim")) return "intimista";
    if (s.startsWith("grande") || s.startsWith("grand")) return "grandioso";
    if (s.startsWith("médio") || s.startsWith("medio") || s.startsWith("eleg")) return "elegante";
    if (s === "intimista" || s === "elegante" || s === "grandioso") return s as Estilo;
    return "elegante";
  };
  const estiloNorm: Estilo = normalizar(estilo);
  let dist: Record<string, number> = { ...DISTRIBUICAO[estiloNorm] };

  // Filtra apenas as categorias escolhidas pelo cliente, redistribuindo o peso
  if (categoriasSelecionadas && categoriasSelecionadas.length > 0) {
    const filtrada: Record<string, number> = {};
    let soma = 0;
    for (const k of Object.keys(dist)) {
      if (categoriasSelecionadas.includes(k)) {
        filtrada[k] = dist[k];
        soma += dist[k];
      }
    }
    if (soma > 0 && Object.keys(filtrada).length > 0) {
      // normaliza para somar 1
      for (const k of Object.keys(filtrada)) filtrada[k] = filtrada[k] / soma;
      dist = filtrada;
    }
  }

  // mapa slug → category_id
  const { data: cats } = await supabase.from("categories").select("id, slug");
  const catIdMap = new Map<string, string>();
  (cats || []).forEach((c: any) => catIdMap.set(c.slug, c.id));

  const alocacoes: Record<string, number> = {};
  for (const [k, pct] of Object.entries(dist)) alocacoes[k] = Math.round(orcamento * pct);

  const promises = Object.keys(alocacoes).map(async (cat) => {
    const verba = alocacoes[cat];
    const slug = CATEGORIA_SLUG[cat];
    const fornecedores = await buscarFornecedores(slug, verba, convidados, cidade, aceitaOciosas, catIdMap);
    return { cat, verba, slug, fornecedores };
  });
  const resultados = await Promise.all(promises);

  const plano: Record<string, CategoriaPlano> = {};
  let totalAlocado = 0;
  let comFornecedor = 0;
  const semFornecedor: string[] = [];

  for (const { cat, verba, slug, fornecedores } of resultados) {
    totalAlocado += verba;
    plano[cat] = {
      key: cat,
      label: CATEGORIAS_LABELS[cat],
      icon: CATEGORIAS_ICONS[cat],
      slug,
      verba,
      percentual: dist[cat],
      fornecedores,
      encontrou: fornecedores.length > 0,
    };
    if (fornecedores.length > 0) comFornecedor++;
    else semFornecedor.push(CATEGORIAS_LABELS[cat]);
  }

  const sobra = orcamento - totalAlocado;
  const alertas = gerarAlertas(plano, semFornecedor, sobra, aceitaOciosas);

  const totalCategorias = Object.keys(plano).length;
  const resumo = {
    orcamentoTotal: orcamento,
    totalAlocado,
    sobraOrcamento: sobra,
    convidados,
    cidade,
    estilo: estiloNorm,
    aceitaOciosas,
    categoriasComFornecedor: comFornecedor,
    totalCategorias,
    cobertura: Math.round((comFornecedor / totalCategorias) * 100),
  };

  // salva snapshot
  const simulacaoId = await salvarSimulacao({
    orcamento, convidados, cidade, estilo: estiloNorm, aceitaOciosas,
    resultado: { resumo, plano, alertas },
    categoriasSelecionadas: categoriasSelecionadas || null,
  });

  return { simulacaoId, resumo, plano, alertas };
}

/**
 * Recalcula sem salvar nova simulação — apenas devolve o objeto.
 * Útil para o toggle "datas ociosas" e para o botão de ação dos alertas.
 */
export async function recalcularSimulacao(
  orcamento: number,
  convidados: number,
  cidade: string,
  estilo: Estilo,
  aceitaOciosas: boolean,
  categoriasSelecionadas?: string[] | null,
): Promise<Omit<SimuladorResultado, "simulacaoId">> {
  const r = await calcularSimulacao(orcamento, convidados, cidade, estilo, aceitaOciosas, categoriasSelecionadas);
  return { resumo: r.resumo, plano: r.plano, alertas: r.alertas };
}

/**
 * Recalcula APENAS uma categoria com nova verba — sem refazer a página inteira.
 */
export async function recalcularCategoria(
  catKey: string,
  novaVerba: number,
  convidados: number,
  cidade: string,
  aceitaOciosas: boolean,
): Promise<CategoriaPlano | null> {
  const slug = CATEGORIA_SLUG[catKey];
  if (!slug) return null;
  const { data: cats } = await supabase.from("categories").select("id, slug");
  const catIdMap = new Map<string, string>();
  (cats || []).forEach((c: any) => catIdMap.set(c.slug, c.id));
  const fornecedores = await buscarFornecedores(slug, novaVerba, convidados, cidade, aceitaOciosas, catIdMap);
  return {
    key: catKey,
    label: CATEGORIAS_LABELS[catKey],
    icon: CATEGORIAS_ICONS[catKey],
    slug,
    verba: novaVerba,
    percentual: 0,
    fornecedores,
    encontrou: fornecedores.length > 0,
  };
}

/**
 * Cria o plano real do casal a partir do resultado.
 * Atualiza couples + insere couple_suppliers + budget_items.
 */
export async function criarPlano(
  _simulacaoId: string | null,
  resultado: SimuladorResultado,
  nomeDoPlano: string,
  dataEvento: string,
  fornecedoresSelecionados?: Set<string> | null,
): Promise<{ couple_id: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário precisa estar logado para criar um plano.");

  const { data: couple, error: cErr } = await supabase
    .from("couples")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (cErr) throw cErr;
  if (!couple) throw new Error("Perfil de casal não encontrado.");

  const coupleId = couple.id as string;

  // Marca esta simulação como o plano ativo (e desmarca as demais do casal)
  if (_simulacaoId) {
    const { error: e1 } = await (supabase.from("home_simulacoes" as any) as any)
      .update({ is_active_plan: false })
      .or(`couple_id.eq.${coupleId},user_id.eq.${user.id}`);
    if (e1) console.error("[criarPlano] reset is_active_plan:", e1);
    const { data: upd, error: e2 } = await (supabase.from("home_simulacoes" as any) as any)
      .update({ is_active_plan: true, couple_id: coupleId, user_id: user.id })
      .eq("id", _simulacaoId)
      .select();
    if (e2) console.error("[criarPlano] mark active:", e2);
    if (!upd || upd.length === 0) console.warn("[criarPlano] update affected 0 rows for sim", _simulacaoId);
  }

  // Atualiza couples
  await (supabase.from("couples") as any)
    .update({
      wedding_date: dataEvento,
      wedding_city: resultado.resumo.cidade,
      wedding_style: resultado.resumo.estilo,
      estimated_guests: resultado.resumo.convidados,
      estimated_budget: resultado.resumo.orcamentoTotal,
      target_budget: resultado.resumo.orcamentoTotal,
      header_quote: nomeDoPlano,
      budget_mode: "fixed",
    })
    .eq("id", coupleId);

  // Mapa slug → category_id
  const { data: cats } = await supabase.from("categories").select("id, slug");
  const catIdMap = new Map<string, string>();
  (cats || []).forEach((c: any) => catIdMap.set(c.slug, c.id));

  // budget_items por categoria (estimativa)
  const { data: existingBudget } = await supabase
    .from("budget_items").select("category, supplier_id").eq("couple_id", coupleId);
  const existingCats = new Set((existingBudget || []).map((b: any) => b.category));
  const budgetRows: any[] = [];
  for (const cat of Object.values(resultado.plano)) {
    if (!existingCats.has(cat.slug)) {
      budgetRows.push({
        couple_id: coupleId,
        category: cat.slug,
        description: cat.label,
        estimated_cost: cat.verba,
        status: "estimated",
      });
      existingCats.add(cat.slug);
    }
  }
  if (budgetRows.length) {
    await (supabase.from("budget_items") as any).insert(budgetRows);
  }

  // couple_suppliers — primeiro fornecedor sugerido por categoria, status nao_iniciado
  const csRowsMap = new Map<string, any>();
  for (const cat of Object.values(resultado.plano)) {
    // Se houver subset, usa apenas os escolhidos; senão, usa o primeiro sugerido
    const escolhidos = fornecedoresSelecionados && fornecedoresSelecionados.size > 0
      ? cat.fornecedores.filter((f) => fornecedoresSelecionados.has(f.id))
      : cat.fornecedores.slice(0, 1);
    for (const f of escolhidos) {
      if (csRowsMap.has(f.id)) continue;
      const catId = catIdMap.get(cat.slug) || null;
      csRowsMap.set(f.id, {
        couple_id: coupleId,
        supplier_id: f.id,
        category_id: catId,
        kanban_status: "nao_iniciado",
        status: "saved",
        estimated_value: f.preco_base || cat.verba,
        simulation_id: _simulacaoId,
        notes: "Adicionado pela simulação",
      });
    }
  }
  const csRows = Array.from(csRowsMap.values());
  if (csRows.length) {
    // Busca fornecedores já existentes para o casal e separa entre update / insert.
    // Isso evita qualquer chance de erro 23505 mesmo que o upsert se comporte de forma inesperada.
    const supplierIds = csRows.map((r) => r.supplier_id);
    const { data: existentes } = await (supabase.from("couple_suppliers") as any)
      .select("id, supplier_id, kanban_status")
      .eq("couple_id", coupleId)
      .in("supplier_id", supplierIds);
    const existMap = new Map<string, any>();
    (existentes || []).forEach((e: any) => existMap.set(e.supplier_id, e));

    const novos: any[] = [];
    for (const row of csRows) {
      const ex = existMap.get(row.supplier_id);
      if (ex) {
        // Não sobrescreve fornecedores já contratados/descartados
        if (ex.kanban_status === "contratado" || ex.kanban_status === "descartado") continue;
        const { error: upErr } = await (supabase.from("couple_suppliers") as any)
          .update({
            category_id: row.category_id,
            estimated_value: row.estimated_value,
            simulation_id: row.simulation_id,
            notes: row.notes,
          })
          .eq("id", ex.id);
        if (upErr) console.warn("update couple_supplier", upErr);
      } else {
        novos.push(row);
      }
    }
    if (novos.length) {
      const { error: insErr } = await (supabase.from("couple_suppliers") as any).insert(novos);
      // 23505 = corrida de inserção concorrente — seguro ignorar
      if (insErr && (insErr as any).code !== "23505") throw insErr;
    }
  }

  return { couple_id: coupleId };
}