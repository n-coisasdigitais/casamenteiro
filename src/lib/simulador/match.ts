import { supabase } from "@/integrations/supabase/client";

export type SimuladorInput = {
  orcamento_total: number;
  num_convidados: number;
  cidade: string;
  estilo: string; // "Simples e emocionante" | "Médio e elegante" | "Grande e memorável"
  data_evento?: string | null; // YYYY-MM-DD
};

export type SupplierMatch = {
  id: string;
  company_name: string;
  city: string | null;
  rating: number | null;
  review_count: number | null;
  profile_photo_url: string | null;
  price_min: number | null;
  price_max: number | null;
  featured: boolean;
  // computed
  estimated_price: number;
  applied_discount_pct: number; // 0 if none
  is_idle_promo: boolean;
  fits_budget_slice: boolean;
};

export type CategoryResult = {
  category_id: string;
  category_name: string;
  category_slug: string;
  pct: number;
  budget_slice: number; // R$ destinado a essa categoria
  essential: boolean;
  display_order: number;
  suppliers: SupplierMatch[];
};

export type SimuladorResult = {
  total_budget: number;
  unallocated_budget: number;
  categories: CategoryResult[];
  computed_at: string;
};

const styleColumn = (estilo: string): "pct_simples" | "pct_medio" | "pct_grande" => {
  if (estilo.startsWith("Simples")) return "pct_simples";
  if (estilo.startsWith("Grande")) return "pct_grande";
  return "pct_medio";
};

/** Average of price_min/max if both, else whichever is set, else null */
function avgPrice(s: { price_min: number | null; price_max: number | null }): number | null {
  const a = s.price_min ?? null;
  const b = s.price_max ?? null;
  if (a != null && b != null) return (a + b) / 2;
  return a ?? b ?? null;
}

export async function computeSimulador(input: SimuladorInput): Promise<SimuladorResult> {
  const col = styleColumn(input.estilo);

  const { data: defaults } = await supabase
    .from("budget_distribution_defaults" as any)
    .select("*")
    .order("display_order");

  const { data: cats } = await supabase
    .from("categories")
    .select("id, name, slug");

  const catBySlug = new Map<string, { id: string; name: string }>();
  (cats || []).forEach((c: any) => catBySlug.set(c.slug, { id: c.id, name: c.name }));

  // Fetch all approved suppliers in city (or anywhere if city empty); we'll filter per category
  const sQuery = supabase
    .from("suppliers")
    .select("id, company_name, city, rating, review_count, profile_photo_url, price_min, price_max, featured, category_id, accepts_idle_dates, idle_discount_pct, status")
    .eq("status", "approved");
  const { data: suppliers } = await sQuery;

  // Promo dates / blocked dates only matter if data_evento defined
  let promoBySupplier = new Map<string, number>(); // supplier_id -> discount_pct on that date
  let blockedSet = new Set<string>(); // supplier_ids blocked on date
  if (input.data_evento) {
    const [{ data: promos }, { data: blocked }] = await Promise.all([
      supabase
        .from("supplier_promo_dates" as any)
        .select("supplier_id, discount_pct")
        .eq("promo_date", input.data_evento),
      supabase
        .from("supplier_blocked_dates")
        .select("supplier_id")
        .eq("blocked_date", input.data_evento),
    ]);
    (promos || []).forEach((p: any) => promoBySupplier.set(p.supplier_id, p.discount_pct));
    (blocked || []).forEach((b: any) => blockedSet.add(b.supplier_id));
  }

  const cityNorm = input.cidade.trim().toLowerCase();

  const categories: CategoryResult[] = [];

  for (const def of (defaults as any[]) || []) {
    const cat = catBySlug.get(def.category_slug);
    if (!cat) continue;
    const pct: number = def[col];
    const slice = Math.round((input.orcamento_total * pct) / 100);

    const candidates = (suppliers || [])
      .filter((s: any) => s.category_id === cat.id)
      .filter((s: any) => !blockedSet.has(s.id))
      .filter((s: any) => !cityNorm || (s.city || "").toLowerCase().includes(cityNorm) || true) // city: prefer match but don't exclude
      .map((s: any): SupplierMatch => {
        let price = avgPrice(s) ?? slice;
        let appliedDiscount = 0;
        let isIdlePromo = false;
        if (input.data_evento) {
          const promoPct = promoBySupplier.get(s.id);
          if (promoPct) {
            appliedDiscount = promoPct;
            isIdlePromo = true;
          } else if (s.accepts_idle_dates && s.idle_discount_pct) {
            appliedDiscount = s.idle_discount_pct;
            isIdlePromo = true;
          }
        }
        const estimated = Math.round(price * (1 - appliedDiscount / 100));
        return {
          id: s.id,
          company_name: s.company_name,
          city: s.city,
          rating: s.rating,
          review_count: s.review_count,
          profile_photo_url: s.profile_photo_url,
          price_min: s.price_min,
          price_max: s.price_max,
          featured: s.featured,
          estimated_price: estimated,
          applied_discount_pct: appliedDiscount,
          is_idle_promo: isIdlePromo,
          fits_budget_slice: estimated <= slice * 1.15, // 15% folga
        };
      });

    // Score: prioriza cidade exata, fits_budget, featured, rating, promo
    const scored = candidates
      .map((s) => {
        let score = 0;
        if (cityNorm && (s.city || "").toLowerCase().includes(cityNorm)) score += 100;
        if (s.fits_budget_slice) score += 50;
        if (s.featured) score += 20;
        if (s.is_idle_promo) score += 25;
        score += (s.rating || 0) * 5;
        return { s, score };
      })
      .sort((a, b) => b.score - a.score)
      .map((x) => x.s)
      .slice(0, 6);

    categories.push({
      category_id: cat.id,
      category_name: cat.name,
      category_slug: def.category_slug,
      pct,
      budget_slice: slice,
      essential: def.essential,
      display_order: def.display_order,
      suppliers: scored,
    });
  }

  return {
    total_budget: input.orcamento_total,
    unallocated_budget: 0,
    categories,
    computed_at: new Date().toISOString(),
  };
}