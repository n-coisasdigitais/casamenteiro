export type SegmentoComunicacao = "couples" | "suppliers" | "profissionais" | "genericos" | "all";
export type FiltroPendencia = "todos" | "dados" | "documentos" | "incompleto";

export function filtroComunicacao(segmento: SegmentoComunicacao, filtro: FiltroPendencia): FiltroPendencia {
  if (segmento !== "suppliers" && segmento !== "profissionais") return "todos";
  if (segmento === "suppliers" && filtro === "documentos") return "dados";
  return filtro;
}