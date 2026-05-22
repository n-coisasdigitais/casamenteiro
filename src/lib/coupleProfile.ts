import { supabase } from "@/integrations/supabase/client";

export async function ensureCoupleProfile(coupleId: string, fallbackName?: string, weddingDate?: string | null) {
  const { data: existing } = await supabase
    .from("couple_public_profiles")
    .select("*")
    .eq("couple_id", coupleId)
    .maybeSingle();
  if (existing) return existing;

  const nome = (fallbackName && fallbackName.trim()) || "Nosso Casamento";
  const { data: slugData } = await supabase.rpc("generate_couple_profile_slug", {
    _nome: nome,
    _wedding_date: weddingDate ?? null,
  });
  const slug = (slugData as string) || `casal-${Math.random().toString(36).slice(2, 8)}`;

  const { data: created, error } = await supabase
    .from("couple_public_profiles")
    .insert({ couple_id: coupleId, nome_casal: nome, slug, publico: true })
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return created;
}

export function youtubeIdFromUrl(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

export function youtubeThumbnail(url: string): string | null {
  const id = youtubeIdFromUrl(url);
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
}

export function youtubeEmbedUrl(url: string): string | null {
  const id = youtubeIdFromUrl(url);
  return id ? `https://www.youtube.com/embed/${id}` : null;
}