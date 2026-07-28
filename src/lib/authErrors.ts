// Traduz mensagens de erro do Supabase Auth para pt-BR.
export function traduzirErroAuth(error: any): string {
  const msg = String(error?.message || error || "").toLowerCase();
  const code = String(error?.code || error?.error_code || "").toLowerCase();
  const reasons = Array.isArray(error?.weak_password?.reasons)
    ? error.weak_password.reasons.join(" ").toLowerCase()
    : "";
  if (msg.includes("invalid login credentials")) return "E-mail ou senha incorretos.";
  if (msg.includes("email not confirmed")) return "Confirme seu e-mail antes de entrar. Veja sua caixa de entrada.";
  if (msg.includes("user already registered") || msg.includes("already been registered"))
    return "Este e-mail já está cadastrado. Tente entrar.";
  if (msg.includes("password should be at least"))
    return "A senha deve ter pelo menos 6 caracteres.";
  if (msg.includes("rate limit") || msg.includes("too many"))
    return "Muitas tentativas. Aguarde um instante e tente novamente.";
  if (msg.includes("invalid email")) return "E-mail inválido.";
  if (msg.includes("user not found")) return "Usuário não encontrado.";
  if (msg.includes("token has expired") || msg.includes("invalid token") || msg.includes("expired"))
    return "O link expirou. Solicite um novo.";
  if (
    code === "weak_password" ||
    reasons.includes("pwned") ||
    msg.includes("pwned") ||
    msg.includes("known to be weak") ||
    msg.includes("weak password")
  )
    return "Esta senha é muito comum ou apareceu em vazamentos. Use uma senha com letras, números e símbolos (ex.: MinhaSenha@2026).";
  if (msg.includes("network")) return "Sem conexão. Verifique sua internet.";
  return error?.message || "Algo deu errado. Tente novamente.";
}