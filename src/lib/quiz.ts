import { supabase } from "@/integrations/supabase/client";

/** Quiz "Um dia vou casar": dados, pontuação e textos. */

export type EstiloQuiz = "intimista" | "elegante" | "grandioso";
export type FormatoAdesivo = "etiqueta" | "postit" | "mensagem";

export type OpcaoQuiz = {
  id: string;
  rotulo: string;
  foto_url: string;
  credito_nome: string | null;
  credito_url: string | null;
  supplier_id: string | null;
  peso_intimista: number;
  peso_elegante: number;
  peso_grandioso: number;
};
export type PerguntaQuiz = { id: string; titulo: string; subtitulo: string | null; opcoes: OpcaoQuiz[] };

export type Adesivo = { texto: string; mensagem: string };
export type TextosQuiz = { titulos: string[]; adesivos: Adesivo[]; palavras_bloqueadas: string[] };

export const TEXTOS_PADRAO: TextosQuiz = {
  titulos: [
    "Um dia vou casar",
    "Não estou aqui por opção: o cupido errou a flecha",
    "Estou aqui porque a vida tá difícil e o buffet tá caro",
    "Ainda não tenho par, mas já tenho a paleta",
    "Já escolhi a música de entrada. Só falta quem me espera no altar",
    "Primeiro o quiz, depois o crush",
  ],
  adesivos: [
    { texto: "Cupido em greve", mensagem: "Tô de greve. Volto quando aumentarem minha flecha." },
    { texto: "Procura-se cupido", mensagem: "Alguém viu meu arco? Perdi faz tempo." },
    { texto: "Em pré-produção", mensagem: "Calma, tô finalizando os detalhes." },
    { texto: "Só falta o par", mensagem: "Já achei o salão. Agora vou atrás do par." },
  ],
  palavras_bloqueadas: [],
};

export const RESULTADOS: Record<EstiloQuiz, { nome: string; descricao: string; paleta: string[] }> = {
  intimista: {
    nome: "Intimista ao pôr do sol",
    descricao: "Poucos convidados, luz dourada e mesa comprida ao ar livre. Cada detalhe tem história.",
    paleta: ["#F3E3D3", "#D9905A", "#9E7B5B", "#6F7D62"],
  },
  elegante: {
    nome: "Elegante e atemporal",
    descricao: "Branco, velas e cristais. Um casamento que vai ficar lindo nas fotos daqui a 30 anos.",
    paleta: ["#FAF6F0", "#D8CBB8", "#A68B6B", "#3E3A36"],
  },
  grandioso: {
    nome: "Festão até o sol nascer",
    descricao: "Lustres, pista lotada e todo mundo que você ama. Ninguém vai esquecer essa noite.",
    paleta: ["#F6E7D8", "#C9973F", "#8E3B2E", "#2B211B"],
  },
};

export const FORMATOS: { id: FormatoAdesivo; rotulo: string }[] = [
  { id: "postit", rotulo: "Post-it" },
  { id: "etiqueta", rotulo: "Etiqueta" },
  { id: "mensagem", rotulo: "Mensagem" },
];

/** Carrega só perguntas completas: ativas e com pelo menos 2 opções com foto. */
export async function carregarQuiz(): Promise<PerguntaQuiz[]> {
  const { data: perguntas, error } = await (supabase.from("quiz_perguntas" as any) as any)
    .select("id, titulo, subtitulo, ordem")
    .eq("ativo", true)
    .order("ordem");
  if (error) throw error;
  const ids = (perguntas || []).map((p: any) => p.id);
  if (!ids.length) return [];
  const { data: opcoes, error: e2 } = await (supabase.from("quiz_opcoes" as any) as any)
    .select(
      "id, pergunta_id, ordem, rotulo, foto_url, credito_nome, credito_url, supplier_id, peso_intimista, peso_elegante, peso_grandioso",
    )
    .in("pergunta_id", ids)
    .eq("ativo", true)
    .not("foto_url", "is", null)
    .order("ordem");
  if (e2) throw e2;
  return (perguntas || [])
    .map((p: any) => ({
      id: p.id,
      titulo: p.titulo,
      subtitulo: p.subtitulo,
      opcoes: (opcoes || []).filter((o: any) => o.pergunta_id === p.id && o.foto_url),
    }))
    .filter((p: PerguntaQuiz) => p.opcoes.length >= 2);
}

export async function carregarTextos(): Promise<TextosQuiz> {
  try {
    const { data } = await (supabase.rpc as any)("quiz_textos");
    if (data && Array.isArray(data.titulos) && data.titulos.length) {
      return {
        titulos: data.titulos,
        adesivos: Array.isArray(data.adesivos) ? data.adesivos : TEXTOS_PADRAO.adesivos,
        palavras_bloqueadas: Array.isArray(data.palavras_bloqueadas) ? data.palavras_bloqueadas : [],
      };
    }
  } catch {
    /* usa o padrão */
  }
  return TEXTOS_PADRAO;
}

/** Soma os pesos das opções escolhidas. Empate: elegante > intimista > grandioso. */
export function calcularEstilo(escolhidas: OpcaoQuiz[]): EstiloQuiz {
  const t = { intimista: 0, elegante: 0, grandioso: 0 };
  escolhidas.forEach((o) => {
    t.intimista += o.peso_intimista;
    t.elegante += o.peso_elegante;
    t.grandioso += o.peso_grandioso;
  });
  const ordem: EstiloQuiz[] = ["elegante", "intimista", "grandioso"];
  return ordem.reduce((melhor, e) => (t[e] > t[melhor] ? e : melhor), ordem[0]);
}

/** Texto livre: corta tamanho e barra palavras da lista do admin. */
export function textoPermitido(texto: string, bloqueadas: string[]): boolean {
  const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const palavras = norm(texto).split(/[^a-z0-9]+/);
  return !bloqueadas.some((b) => palavras.includes(norm(b)));
}

// ---------- resultado pendente (antes do cadastro) ----------
const CHAVE_PENDENTE = "quiz_resultado_pendente";
const CHAVE_INDICACAO = "quiz_indicado_por";

export type ResultadoQuiz = {
  id: string;
  estilo: EstiloQuiz;
  opcoes: string[];
  fotos: string[];
  titulo: string;
  adesivo: string | null;
  formato: FormatoAdesivo;
  usarFoto: boolean;
};

export function guardarIndicacao(codigo: string | null) {
  if (!codigo) return;
  try {
    localStorage.setItem(CHAVE_INDICACAO, codigo.toLowerCase().slice(0, 16));
  } catch {
    /* noop */
  }
}
function lerIndicacao(): string | null {
  try {
    return localStorage.getItem(CHAVE_INDICACAO);
  } catch {
    return null;
  }
}

export function guardarPendente(r: ResultadoQuiz) {
  try {
    localStorage.setItem(CHAVE_PENDENTE, JSON.stringify(r));
  } catch {
    /* noop */
  }
}
export function lerPendente(): ResultadoQuiz | null {
  try {
    const raw = localStorage.getItem(CHAVE_PENDENTE);
    return raw ? (JSON.parse(raw) as ResultadoQuiz) : null;
  } catch {
    return null;
  }
}
export function limparPendente() {
  try {
    localStorage.removeItem(CHAVE_PENDENTE);
  } catch {
    /* noop */
  }
}

/** Grava o resultado. Funciona deslogado: o id vem do navegador. */
export async function registrarResultado(r: ResultadoQuiz, userId: string | null) {
  const { error } = await (supabase.from("quiz_resultados" as any) as any).insert({
    id: r.id,
    user_id: userId,
    estilo: r.estilo,
    opcoes: r.opcoes,
    indicado_codigo: lerIndicacao(),
    titulo: r.titulo,
    adesivo: r.adesivo,
    formato_adesivo: r.formato,
  });
  if (error && !String(error.message || "").includes("duplicate")) throw error;
}

export async function marcarCompartilhou(id: string) {
  try {
    await (supabase.rpc as any)("quiz_marcar_compartilhou", { _id: id });
  } catch {
    /* noop */
  }
}

export async function contagemEstilo(estilo: EstiloQuiz): Promise<number> {
  try {
    const { data } = await (supabase.rpc as any)("quiz_contagem_estilo", { _estilo: estilo });
    return Number(data) || 0;
  } catch {
    return 0;
  }
}

/** Depois do cadastro/login: amarra o resultado pendente à conta e grava as escolhas do card. */
export async function reivindicarPendente(userId: string): Promise<boolean> {
  const r = lerPendente();
  if (!r) return false;
  await (supabase.rpc as any)("quiz_reivindicar_resultado", { _id: r.id });
  await (supabase.from("sonho_perfis" as any) as any).upsert(
    {
      user_id: userId,
      estilo: r.estilo,
      resultado_id: r.id,
      titulo: r.titulo,
      adesivo: r.adesivo,
      formato_adesivo: r.formato,
      mostrar_foto: r.usarFoto,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  limparPendente();
  return true;
}

export function novoId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** Fonte manuscrita do post-it (Google Fonts), carregada só nas telas do quiz e do mural. */
export function carregarFonteCaveat() {
  if (typeof document === "undefined" || document.getElementById("fonte-caveat")) return;
  const link = document.createElement("link");
  link.id = "fonte-caveat";
  link.rel = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=Caveat:wght@600&display=swap";
  document.head.appendChild(link);
}
