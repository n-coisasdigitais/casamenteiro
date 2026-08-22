// Helpers de autenticação/autorização para as edge functions.
import { createClient } from "npm:@supabase/supabase-js@2";

export const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
export const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
export const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

export function bearer(req: Request): string | null {
  const h = req.headers.get("Authorization") || "";
  if (!h.toLowerCase().startsWith("bearer ")) return null;
  const t = h.slice(7).trim();
  return t || null;
}

function jwtClaims(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const p = parts[1].replaceAll("-", "+").replaceAll("_", "/");
    return JSON.parse(atob(p.padEnd(Math.ceil(p.length / 4) * 4, "="))) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Chamada interna confiável: cron/back-end usando a service role key. */
export function isServiceRole(req: Request): boolean {
  const t = bearer(req);
  if (!t) return false;
  if (SERVICE_ROLE_KEY && t === SERVICE_ROLE_KEY) return true;
  return jwtClaims(t)?.role === "service_role";
}

export function adminClient() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
}

/** Retorna o id do usuário autenticado ou null. */
export async function getUserId(req: Request): Promise<string | null> {
  const token = bearer(req);
  if (!token || token === ANON_KEY || token === SERVICE_ROLE_KEY) return null;
  const supabase = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await supabase.auth.getClaims(token);
  const sub = data?.claims?.sub as string | undefined;
  if (error || !sub) return null;
  return sub;
}

export async function isAdmin(userId: string): Promise<boolean> {
  const { data } = await adminClient().rpc("has_role", { _user_id: userId, _role: "admin" });
  return data === true;
}
