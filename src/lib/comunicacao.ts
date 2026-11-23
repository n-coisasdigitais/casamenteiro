export type SegmentoComunicacao = "couples" | "suppliers" | "profissionais" | "genericos" | "all";
export type FiltroPendencia = "todos" | "dados" | "documentos" | "incompleto";
export { explicarErroEmail } from "../../supabase/functions/_shared/email-errors";

export async function erroComunicacao(error: unknown): Promise<string> {
  const context = (error as { context?: Response } | null)?.context;
  if (context instanceof Response) {
    try {
      const body = await context.clone().json();
      if (typeof body.error === "string") return body.error;
    } catch { /* Usa a mensagem de recuperação abaixo. */ }
  }
  return "Não foi possível confirmar o envio. Confira o histórico antes de tentar novamente, para evitar duplicações.";
}

export function filtroComunicacao(segmento: SegmentoComunicacao, filtro: FiltroPendencia): FiltroPendencia {
  if (segmento !== "suppliers" && segmento !== "profissionais") return "todos";
  if (segmento === "suppliers" && filtro === "documentos") return "dados";
  return filtro;
}