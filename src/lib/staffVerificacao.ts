import { isValidPhoneBR } from "@/lib/phone";

/**
 * Dados mínimos para o profissional enviar o perfil para verificação.
 * A mesma regra existe no banco (função public.staff_requisitos_faltando),
 * então quem tentar enviar pela API sem completar recebe erro.
 * Se mudar algo aqui, mude lá também.
 */

/** Documentos obrigatórios (valores de TIPOS_DOC). Recusados não contam. */
export const DOCS_OBRIGATORIOS = ["identidade"] as const;

export const BIO_MINIMA = 30;

export type Requisito = {
  key: string;
  label: string;
  ok: boolean;
  /** onde o profissional resolve: no cadastro do perfil ou na área de documentos */
  onde: "perfil" | "documentos";
};

export function requisitosVerificacao(staff: any, docs: any[] = []): Requisito[] {
  if (!staff) return [];
  const docsValidos = (tipo: string) => docs.some((d) => d.tipo === tipo && d.status !== "rejeitado");
  const nomeCompleto =
    String(staff.nome || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean).length >= 2;

  return [
    { key: "foto", label: "Foto de perfil", ok: !!staff.foto_url, onde: "perfil" },
    { key: "nome", label: "Nome e sobrenome", ok: nomeCompleto, onde: "perfil" },
    { key: "telefone", label: "Telefone / WhatsApp válido", ok: isValidPhoneBR(staff.telefone || ""), onde: "perfil" },
    {
      key: "funcoes",
      label: "Ao menos uma função (garçom, cozinha…)",
      ok: (staff.funcoes || []).length > 0,
      onde: "perfil",
    },
    { key: "cidade", label: "Cidade e estado", ok: !!staff.cidade && !!staff.estado, onde: "perfil" },
    {
      key: "bio",
      label: `Apresentação com pelo menos ${BIO_MINIMA} letras`,
      ok: String(staff.bio || "").trim().length >= BIO_MINIMA,
      onde: "perfil",
    },
    { key: "lgpd", label: "Aceite dos termos de privacidade (LGPD)", ok: !!staff.consentimento_lgpd, onde: "perfil" },
    {
      key: "doc_identidade",
      label: "Documento com foto (RG ou CNH)",
      ok: docsValidos("identidade"),
      onde: "documentos",
    },
  ];
}

export const podeEnviarVerificacao = (staff: any, docs: any[] = []) =>
  requisitosVerificacao(staff, docs).every((r) => r.ok);

export type FiltroRequisitosVerificacao = "todos" | "completos" | "dados" | "documentos";

/** Filtra a fila administrativa usando exatamente os requisitos exibidos na ficha. */
export function atendeFiltroRequisitos(
  staff: any,
  docs: any[] = [],
  filtro: FiltroRequisitosVerificacao = "todos",
) {
  if (filtro === "todos") return true;
  const faltantes = requisitosVerificacao(staff, docs).filter((r) => !r.ok);
  if (filtro === "completos") return faltantes.length === 0;
  return faltantes.some((r) => (filtro === "dados" ? r.onde === "perfil" : r.onde === "documentos"));
}

/** Extensões que o modal mostra como imagem; o resto (PDF) vai em iframe. */
export const ehImagem = (path?: string | null) => /\.(png|jpe?g|webp|gif|heic|heif|bmp)$/i.test(path || "");
export const ehPdf = (path?: string | null) => /\.pdf$/i.test(path || "");
