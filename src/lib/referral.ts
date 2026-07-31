import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "casamenteiro_ref";
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias

export function captureReferralCode(codigo: string, nome?: string | null) {
  try {
    const payload = { codigo: codigo.toUpperCase(), nome: nome ?? null, ts: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {}
}

export function getStoredReferral(): { codigo: string; nome: string | null } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { codigo: string; nome?: string | null; ts: number };
    if (Date.now() - parsed.ts > TTL_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return { codigo: parsed.codigo, nome: parsed.nome ?? null };
  } catch {
    return null;
  }
}

/** Nome do casal dono do código de indicação (para exibir "Fulano te indicou"). */
export async function buscarNomeIndicador(codigo: string): Promise<string | null> {
  const { data: ref } = await supabase
    .from("referrals")
    .select("couple_id")
    .eq("codigo", codigo.toUpperCase())
    .eq("ativo", true)
    .maybeSingle();
  if (!ref?.couple_id) return null;
  const { data: perfil } = await supabase
    .from("couple_public_profiles")
    .select("nome_casal")
    .eq("couple_id", ref.couple_id)
    .maybeSingle();
  return perfil?.nome_casal ?? null;
}

export function getStoredReferralCode(): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { codigo: string; ts: number };
    if (Date.now() - parsed.ts > TTL_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed.codigo;
  } catch {
    return null;
  }
}

export function clearReferralCode() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

export async function incrementReferralClick(codigo: string) {
  const { data } = await supabase
    .from("referrals")
    .select("id, cliques")
    .eq("codigo", codigo.toUpperCase())
    .eq("ativo", true)
    .maybeSingle();
  if (!data) return null;
  await supabase
    .from("referrals")
    .update({ cliques: (data.cliques ?? 0) + 1 })
    .eq("id", data.id);
  return data.id;
}

export async function attributeReferralConversion(
  userId: string,
  tipoConta: "couple" | "supplier"
) {
  const codigo = getStoredReferralCode();
  if (!codigo) return;

  const { data: ref } = await supabase
    .from("referrals")
    .select("id, couple_id")
    .eq("codigo", codigo)
    .eq("ativo", true)
    .maybeSingle();
  if (!ref) {
    clearReferralCode();
    return;
  }

  // Não atribui auto-indicação
  const { data: ownCouple } = await supabase
    .from("couples")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (ownCouple?.id === ref.couple_id) {
    clearReferralCode();
    return;
  }

  await supabase.from("referral_conversions").insert({
    referral_id: ref.id,
    referred_user_id: userId,
    tipo_conta: tipoConta,
    status: "cadastrado",
  });
  clearReferralCode();
}

export async function getOrCreateReferralForCouple(coupleId: string) {
  const { data: existing } = await supabase
    .from("referrals")
    .select("*")
    .eq("couple_id", coupleId)
    .maybeSingle();
  if (existing) return existing;

  const { data: codeData } = await supabase.rpc("generate_referral_code");
  const codigo = (codeData as string) ?? Math.random().toString(36).slice(2, 10).toUpperCase();

  const { data: created, error } = await supabase
    .from("referrals")
    .insert({ couple_id: coupleId, codigo })
    .select()
    .maybeSingle();
  if (error) throw error;
  return created;
}

export function buildReferralUrl(codigo: string) {
  const base = typeof window !== "undefined" ? window.location.origin : "https://casamenteiro.com.br";
  return `${base}/i/${codigo}`;
}