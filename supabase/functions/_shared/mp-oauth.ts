// Utilitário compartilhado: garante um access_token válido da conta Mercado Pago do fornecedor.
// Usado pelo split de corretagem e pela função mp-oauth-refresh.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

export type MpConexao = {
  mp_account_id: string | null;
  mp_access_token: string | null;
  mp_refresh_token: string | null;
  mp_token_expires_at: string | null;
};

const MARGEM_MS = 24 * 60 * 60 * 1000; // renova se faltar menos de 24h

export async function obterTokenFornecedor(
  admin: SupabaseClient,
  supplierId: string,
): Promise<{ accessToken: string | null; accountId: string | null; erro?: string }> {
  const { data: forn } = await admin
    .from("suppliers")
    .select("mp_account_id, mp_access_token, mp_refresh_token, mp_token_expires_at")
    .eq("id", supplierId)
    .maybeSingle();

  const conexao = forn as MpConexao | null;
  if (!conexao?.mp_account_id || !conexao.mp_access_token) {
    return { accessToken: null, accountId: conexao?.mp_account_id ?? null, erro: "Fornecedor sem conta Mercado Pago vinculada" };
  }

  const expira = conexao.mp_token_expires_at ? new Date(conexao.mp_token_expires_at).getTime() : 0;
  const precisaRenovar = !expira || expira - Date.now() < MARGEM_MS;
  if (!precisaRenovar || !conexao.mp_refresh_token) {
    return { accessToken: conexao.mp_access_token, accountId: conexao.mp_account_id };
  }

  const CLIENT_ID = Deno.env.get("MP_OAUTH_CLIENT_ID");
  const CLIENT_SECRET = Deno.env.get("MP_OAUTH_CLIENT_SECRET");
  if (!CLIENT_ID || !CLIENT_SECRET) {
    return { accessToken: conexao.mp_access_token, accountId: conexao.mp_account_id };
  }

  const res = await fetch("https://api.mercadopago.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: conexao.mp_refresh_token,
    }),
  });
  const tk = await res.json().catch(() => ({}) as any);
  if (!res.ok || !tk?.access_token) {
    console.error("Falha ao renovar token MP:", res.status, JSON.stringify(tk));
    // Segue com o token atual: pode ainda estar válido.
    return { accessToken: conexao.mp_access_token, accountId: conexao.mp_account_id };
  }

  await admin
    .from("suppliers")
    .update({
      mp_access_token: tk.access_token,
      mp_refresh_token: tk.refresh_token ?? conexao.mp_refresh_token,
      mp_token_expires_at: new Date(Date.now() + Number(tk.expires_in ?? 0) * 1000).toISOString(),
    })
    .eq("id", supplierId);

  return { accessToken: tk.access_token as string, accountId: conexao.mp_account_id };
}
