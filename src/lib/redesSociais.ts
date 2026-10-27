import { supabase } from "@/integrations/supabase/client";

export type RedeChave = "instagram" | "tiktok" | "youtube" | "facebook" | "pinterest" | "site";
export type Redes = Partial<Record<RedeChave, string | null>>;

/** Ordem de exibição e como cada rede vira link. O banco guarda só o @/nome; o link é montado aqui. */
export const REDES: { chave: RedeChave; nome: string; prefixo: string; placeholder: string }[] = [
  { chave: "instagram", nome: "Instagram", prefixo: "instagram.com/", placeholder: "seuperfil" },
  { chave: "tiktok", nome: "TikTok", prefixo: "tiktok.com/@", placeholder: "seuperfil" },
  { chave: "youtube", nome: "YouTube", prefixo: "youtube.com/@", placeholder: "seucanal" },
  { chave: "facebook", nome: "Facebook", prefixo: "facebook.com/", placeholder: "suapagina" },
  { chave: "pinterest", nome: "Pinterest", prefixo: "pinterest.com/", placeholder: "seuperfil" },
  { chave: "site", nome: "Site", prefixo: "https://", placeholder: "seusite.com.br" },
];

const DOMINIO: Record<Exclude<RedeChave, "site">, RegExp> = {
  instagram: /^(https?:\/\/)?(www\.|m\.)?instagram\.com\//i,
  tiktok: /^(https?:\/\/)?(www\.|m\.)?tiktok\.com\/@?/i,
  youtube: /^(https?:\/\/)?(www\.|m\.)?youtube\.com\/(@|c\/|channel\/|user\/)?/i,
  facebook: /^(https?:\/\/)?(www\.|m\.|pt-br\.)?(facebook|fb)\.com\//i,
  pinterest: /^(https?:\/\/)?(www\.|br\.)?pinterest\.(com|com\.br)\//i,
};

/** Aceita "@perfil", "perfil" ou o link inteiro colado; devolve só o identificador (ou o site sem https). */
export function normalizarRede(chave: RedeChave, valor: string): string | null {
  let v = (valor || "").trim();
  if (!v) return null;
  if (chave === "site") {
    v = v.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
    return v || null;
  }
  v = v.replace(DOMINIO[chave], "").replace(/^@/, "").replace(/[/?#].*$/, "").trim();
  return v || null;
}

export function linkRede(chave: RedeChave, valor?: string | null): string | null {
  const v = (valor || "").trim();
  if (!v) return null;
  if (chave === "site") return /^https?:\/\//i.test(v) ? v : `https://${v}`;
  const r = REDES.find((x) => x.chave === chave)!;
  return `https://${r.prefixo}${v.replace(/^@/, "")}`;
}

/** Texto curto para o botão: @perfil no Instagram/TikTok, nome da rede nas demais. */
export function rotuloRede(chave: RedeChave, valor?: string | null): string {
  const v = (valor || "").replace(/^@/, "");
  if ((chave === "instagram" || chave === "tiktok") && v) return `@${v}`;
  if (chave === "site" && v) return v.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
  return REDES.find((x) => x.chave === chave)!.nome;
}

export async function carregarRedes(supplierId: string): Promise<Redes | null> {
  const { data } = await (supabase.from("supplier_redes_sociais" as any) as any)
    .select("instagram, tiktok, youtube, facebook, pinterest, site")
    .eq("supplier_id", supplierId)
    .maybeSingle();
  return (data as Redes) || null;
}

export async function salvarRedes(supplierId: string, redes: Redes) {
  const payload: Record<string, any> = { supplier_id: supplierId, updated_at: new Date().toISOString() };
  REDES.forEach(({ chave }) => {
    payload[chave] = normalizarRede(chave, redes[chave] || "");
  });
  return (supabase.from("supplier_redes_sociais" as any) as any).upsert(payload, { onConflict: "supplier_id" });
}

export function registrarCliqueRede(supplierId: string, rede: RedeChave) {
  // não bloqueia a navegação; falha silenciosa se não houver sessão
  (supabase.from("supplier_redes_cliques" as any) as any).insert({ supplier_id: supplierId, rede }).then(() => {});
}
