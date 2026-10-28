import { supabase } from "@/integrations/supabase/client";

export const LOGO_TIPOS = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
export const LOGO_MAX_BYTES = 2 * 1024 * 1024;

export function validarLogo(file: File): string | null {
  if (!LOGO_TIPOS.includes(file.type)) return "Use uma imagem PNG, JPG, WEBP ou SVG.";
  if (file.size > LOGO_MAX_BYTES) return "A logo deve ter no máximo 2 MB.";
  return null;
}

/** Envia a logo e salva no cadastro do fornecedor. Retorna a URL pública. */
export async function enviarLogo(userId: string, supplierId: string, file: File): Promise<string> {
  const erro = validarLogo(file);
  if (erro) throw new Error(erro);
  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const path = `logos/${userId}/logo-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("supplier-photos").upload(path, file, { contentType: file.type });
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage.from("supplier-photos").getPublicUrl(path);
  const { error: e2 } = await (supabase.from("suppliers") as any).update({ logo_url: publicUrl }).eq("id", supplierId);
  if (e2) throw e2;
  return publicUrl;
}
