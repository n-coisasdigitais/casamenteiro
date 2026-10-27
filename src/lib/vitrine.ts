/**
 * Dados das páginas públicas de vitrine (/explorar e /categoria/:slug).
 * - Só mostra fornecedor aprovado, fora do modo demonstração e com pelo menos 1 foto.
 * - Destaques pagos vêm da RPC `vitrine_destaques_ativos` (as compras não são legíveis pelo público).
 */
import { supabase } from "@/integrations/supabase/client";
import { demoValues } from "@/lib/demoScope";
import heroWedding from "@/assets/hero-wedding.jpg";

export type CategoriaVitrine = { id: string; name: string; slug: string; icon: string | null };

export type FornecedorVitrine = {
  id: string;
  company_name: string;
  description: string | null;
  city: string | null;
  state: string | null;
  rating: number | null;
  review_count: number | null;
  price_min: number | null;
  preco_por_pessoa: boolean | null;
  guest_max: number | null;
  featured: boolean;
  created_at: string;
  category_id: string | null;
  categories?: { name: string; slug: string } | null;
  fotos: string[];
};

export type Anuncio = {
  supplier_id: string;
  nome: string;
  cidade: string | null;
  estado: string | null;
  categoria: string | null;
  imagem: string;
  foco_desktop?: string | null;
  foco_mobile?: string | null;
};

export const FOTO_PADRAO = heroWedding;

/** Plural usado nos títulos ("Celebrantes para casamento"). */
export const PLURAL: Record<string, string> = {
  celebrante: "Celebrantes",
  "musica-dj": "Músicos e DJs",
  cerimonialista: "Cerimonialistas",
  espaco: "Espaços",
  buffet: "Buffets",
  "bolos-doces": "Confeitarias",
  convites: "Convites",
  decoracao: "Decoradores",
  fotografia: "Fotógrafos",
  "beleza-maquiagem": "Maquiadores",
  "traje-noivo": "Trajes do noivo",
  transporte: "Transporte",
  "vestido-noiva": "Vestidos de noiva",
  video: "Videomakers",
};
export const pluralCategoria = (c: { slug: string; name: string }) => PLURAL[c.slug] || c.name;

const COLS =
  "id, company_name, description, city, state, rating, review_count, price_min, preco_por_pessoa, guest_max, featured, created_at, category_id, categories(name, slug), supplier_photos(photo_url, is_principal, display_order)";

function comFotos(rows: any[]): FornecedorVitrine[] {
  return (rows || [])
    .map((r) => {
      const fotos = [...(r.supplier_photos || [])]
        .sort(
          (a: any, b: any) =>
            Number(!!b.is_principal) - Number(!!a.is_principal) || (a.display_order ?? 999) - (b.display_order ?? 999),
        )
        .map((p: any) => p.photo_url)
        .filter(Boolean);
      const { supplier_photos, ...resto } = r;
      void supplier_photos;
      return { ...resto, fotos } as FornecedorVitrine;
    })
    .filter((f) => f.fotos.length > 0);
}

export async function carregarCategorias(): Promise<CategoriaVitrine[]> {
  const { data } = await (supabase.from("categories") as any)
    .select("id, name, slug, icon, active")
    .order("name");
  return ((data as any[]) || []).filter((c) => c.active !== false);
}

/** Todos os fornecedores visíveis (com foto). Usado para contagem e listas. */
export async function carregarFornecedores(categoriaId?: string): Promise<FornecedorVitrine[]> {
  let q = (supabase.from("suppliers") as any)
    .select(COLS)
    .eq("status", "approved")
    .in("is_demo", demoValues())
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(400);
  if (categoriaId) q = q.eq("category_id", categoriaId);
  const { data } = await q;
  return comFotos(data as any[]);
}

function embaralhar<T>(l: T[]): T[] {
  const a = [...l];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Destaques pagos ativos: sem categoria = /explorar; com categoria = /categoria. */
export async function carregarAnuncios(categoriaId?: string | null): Promise<Anuncio[]> {
  const { data, error } = await (supabase.rpc as any)("vitrine_destaques_ativos", { _categoria_id: categoriaId ?? null });
  if (error || !data) return [];
  const demo = demoValues();
  return embaralhar(
    (data as any[])
      .filter((d) => d.imagem_url && demo.includes(!!d.is_demo))
      .map((d) => ({
        supplier_id: d.supplier_id,
        nome: d.supplier_nome,
        cidade: d.cidade,
        estado: d.estado,
        categoria: d.categoria_nome,
        imagem: d.imagem_url,
        foco_desktop: d.foco_desktop,
        foco_mobile: d.foco_mobile,
      })),
  );
}

/** Foto institucional configurada pelo admin (secoes_home, escopo 'explore'). */
export async function carregarFotoInstitucional(): Promise<string> {
  const { data } = await (supabase.from("secoes_home" as any) as any)
    .select("foto_url")
    .eq("escopo", "explore")
    .eq("ativo", true)
    .order("ordem")
    .limit(1)
    .maybeSingle();
  return (data as any)?.foto_url || FOTO_PADRAO;
}

export const normalizar = (s: string | null | undefined) =>
  (s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();

export function textoPreco(f: Pick<FornecedorVitrine, "price_min" | "preco_por_pessoa">): string | null {
  if (!f.price_min || Number(f.price_min) <= 0) return null;
  const n = Number(f.price_min);
  const v = `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })}`;
  return f.preco_por_pessoa ? `${v} /pessoa` : v;
}

/** Pedido de aviso quando chegar fornecedor na categoria. Duplicado conta como sucesso. */
export async function pedirAviso(opts: { categoryId: string; userId?: string | null; email?: string | null; cidade?: string | null }) {
  const { error } = await (supabase.from("avisos_categoria" as any) as any).insert({
    category_id: opts.categoryId,
    user_id: opts.userId || null,
    email: opts.email?.trim() || null,
    cidade: opts.cidade?.trim() || null,
  });
  if (error && (error as any).code !== "23505") return { error };
  return { error: null };
}