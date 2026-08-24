// Redirect URI canônica do OAuth do Mercado Pago.
// O apex casamenteiro.com.br não responde; o Mercado Pago recusa a autorização
// quando a redirect_uri não é exatamente a cadastrada na aplicação.
export const MP_REDIRECT_PADRAO = "https://www.casamenteiro.com.br/fornecedor/mp-callback";

export function redirectUriMp(): string {
  const bruto = (Deno.env.get("MP_OAUTH_REDIRECT_URI") ?? "").trim();
  if (!bruto) return MP_REDIRECT_PADRAO;
  try {
    const u = new URL(bruto);
    if (u.protocol !== "https:") return MP_REDIRECT_PADRAO;
    // normaliza apex -> www (o apex está fora do ar)
    if (u.hostname === "casamenteiro.com.br") u.hostname = "www.casamenteiro.com.br";
    if (!u.pathname.endsWith("/fornecedor/mp-callback")) return MP_REDIRECT_PADRAO;
    u.search = "";
    u.hash = "";
    return u.toString().replace(/\/$/, "");
  } catch {
    return MP_REDIRECT_PADRAO;
  }
}
