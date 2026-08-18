// Tradução genérica de erros (auth, banco, storage, edge functions) para pt-BR.
import { traduzirErroAuth } from "./authErrors";

const TEM_PORTUGUES = /[ãõçáéíóúâêô]|não|senha|cadastr|inválid|permiss/i;

export function traduzirErro(error: any): string {
  const msg = String(error?.message || error || "").toLowerCase();
  const code = String(error?.code || "").toLowerCase();
  const details = String(error?.details || "").toLowerCase();

  // Erros de autenticação primeiro (mensagens do Supabase Auth em inglês)
  const auth = traduzirErroAuth(error);
  if (auth && auth !== error?.message) return auth;

  // Postgres codes
  if (code === "23505" || msg.includes("duplicate key")) return "Este registro já existe.";
  if (code === "23503" || msg.includes("foreign key")) return "Não é possível concluir: existem dados vinculados.";
  if (code === "23502" || msg.includes("not-null")) return "Preencha todos os campos obrigatórios.";
  if (code === "23514" || msg.includes("check constraint")) return "Valor inválido para um dos campos.";
  if (code === "42501" || msg.includes("permission denied") || msg.includes("rls")) {
    return "Você não tem permissão para essa ação.";
  }
  if (code === "pgrst116" || msg.includes("no rows")) return "Registro não encontrado.";
  if (code === "pgrst301" || msg.includes("jwt")) return "Sua sessão expirou. Entre novamente.";

  // Storage
  if (msg.includes("payload too large") || msg.includes("file size")) return "Arquivo muito grande.";
  if (msg.includes("mime") || msg.includes("invalid file type")) return "Tipo de arquivo não permitido.";
  if (msg.includes("bucket not found")) return "Local de upload indisponível. Tente novamente.";
  if (msg.includes("object not found") || msg.includes("not found")) return "Arquivo não encontrado.";

  // Rede / edge
  if (msg.includes("failed to fetch") || msg.includes("network")) return "Sem conexão. Tente novamente.";
  if (msg.includes("timeout")) return "A operação demorou demais. Tente novamente.";
  if (msg.includes("function") && msg.includes("not found")) return "Serviço indisponível no momento.";

  // Genéricos: nunca expor texto técnico em inglês
  const original = String(error?.message || error || "").trim();
  if (original && TEM_PORTUGUES.test(original) && original.length < 180) return original;
  if (details && TEM_PORTUGUES.test(details)) return details;
  return "Não foi possível concluir. Tente novamente.";
}

// Wrapper conveniente para toasts
export function toastErro(toast: any, error: any, titulo = "Erro") {
  toast({ title: titulo, description: traduzirErro(error), variant: "destructive" });
}