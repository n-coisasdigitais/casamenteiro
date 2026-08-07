import { useEffect, useState, useRef, useCallback } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SEO from "@/components/SEO";
import UserMenu from "@/components/UserMenu";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { absoluteUrl, breadcrumbJsonLd, itemListJsonLd, truncate } from "@/lib/seo";
import {
  Heart,
  Star,
  Building,
  MapPin,
  ChevronRight,
  Loader2,
  Award,
  Camera,
  Music,
  Utensils,
  Flower2,
  Mail,
  Shirt,
  Sparkles,
  Cake,
  ClipboardList,
  Car,
  Video,
} from "lucide-react";

const categoryIcons: Record<string, any> = {
  building: Building,
  camera: Camera,
  video: Video,
  music: Music,
  flower: Flower2,
  mail: Mail,
  shirt: Shirt,
  sparkles: Sparkles,
  cake: Cake,
  clipboard: ClipboardList,
  car: Car,
  utensils: Utensils,
};

type HeroDestaque = {
  supplier_id: string | null;
  imagem_url: string | null;
  company_name: string;
  profile_photo_url: string | null;
  category_name: string | null;
  category_icon: string | null;
  city: string | null;
  institucional?: boolean;
};

function CategoriaHero({ d, categoryLabel }: { d: HeroDestaque | null; categoryLabel?: string }) {
  if (!d) return null;
  const Icon = categoryIcons[d.category_icon || "building"] || Building;
  const img =
    d.imagem_url ||
    d.profile_photo_url ||
    "https://images.unsplash.com/photo-1519741497674-611481863552?w=2000&q=85&auto=format&fit=crop";
  const inst = d.institucional;

  return (
    <section className="relative">
      <div
        className="relative h-[52vh] min-h-[380px] w-full overflow-hidden"
        style={{ borderBottomLeftRadius: "50% 12%", borderBottomRightRadius: "50% 12%" }}
      >
        <img src={img} alt={d.company_name} className="absolute inset-0 w-full h-full object-cover" />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, hsl(0 0% 0% / 0.35) 0%, hsl(0 0% 0% / 0.25) 45%, hsl(0 0% 0% / 0.45) 100%)",
          }}
        />

        {/* tag do fornecedor pago (canto sup. direito) */}
        {!inst && d.supplier_id && (
          <a
            href={`/fornecedor/${d.supplier_id}`}
            className="absolute top-5 right-5 flex items-center gap-2 bg-background/95 hover:bg-background text-foreground text-sm font-semibold pl-2.5 pr-4 py-1.5 rounded-full shadow transition"
          >
            <span className="flex items-center justify-center h-7 w-7 rounded-full bg-secondary">
              <Icon className="h-4 w-4 text-primary" />
            </span>
            <span className="max-w-[180px] truncate">{d.company_name}</span>
            <Award className="h-3.5 w-3.5 text-primary" />
          </a>
        )}

        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6 pb-14">
          <h1
            className="font-serif text-white max-w-3xl"
            style={{
              fontSize: "clamp(1.9rem, 4.5vw, 3.25rem)",
              lineHeight: 1.08,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              textShadow: "0 2px 18px hsl(0 0% 0% / 0.5)",
            }}
          >
            {inst ? d.company_name : `Destaque em ${categoryLabel || d.category_name || "casamentos"}`}
          </h1>
          {(inst ? d.category_name : d.company_name) && (
            <p
              className="text-white/90 mt-2 max-w-xl"
              style={{ fontSize: "clamp(0.95rem, 1.6vw, 1.15rem)", textShadow: "0 1px 10px hsl(0 0% 0% / 0.5)" }}
            >
              {inst ? d.category_name : `${d.company_name}${d.city ? ` · ${d.city}` : ""}`}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

type Category = { id: string; name: string; slug: string; icon: string | null };
type Supplier = {
  id: string;
  company_name: string;
  description: string | null;
  city: string | null;
  state: string | null;
  rating: number | null;
  review_count: number | null;
  price_min: number | null;
  featured: boolean;
  supplier_photos?: { photo_url: string }[];
};

const PAGE_SIZE = 18;
import { useMyPlanSuppliers } from "@/hooks/useMyPlanSuppliers";

const formatPrice = (n: number | null) => {
  if (!n) return null;
  if (n >= 1000) return `R$ ${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
  return `R$ ${n}`;
};

function SupplierCardItem({ s, inPlan }: { s: Supplier; inPlan?: boolean }) {
  const _fotos = s.supplier_photos || [];
  const photo = (_fotos.find((p: any) => p.is_principal) || _fotos[0])?.photo_url;
  return (
    <Link to={`/fornecedor/${s.id}`} className="group block">
      <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-muted">
        {photo ? (
          <img
            src={photo}
            alt={s.company_name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <Building className="h-8 w-8" />
          </div>
        )}
        {s.featured && (
          <span className="absolute top-2 left-2 bg-background/95 text-foreground text-[11px] font-semibold px-2.5 py-1 rounded-full shadow-sm">
            Destaque
          </span>
        )}
        {inPlan && (
          <span className="absolute bottom-2 left-2 bg-primary text-primary-foreground text-[11px] font-semibold px-2.5 py-1 rounded-full shadow-sm">
            No seu plano
          </span>
        )}
      </div>
      <div className="pt-2.5 px-0.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground truncate">{s.company_name}</h3>
          {s.rating != null && s.rating > 0 && (
            <span className="flex items-center gap-0.5 text-xs text-foreground shrink-0">
              <Star className="h-3 w-3 fill-foreground" /> {Number(s.rating).toFixed(1)}
            </span>
          )}
        </div>
        {s.city && (
          <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
            <MapPin className="h-3 w-3" /> {s.city}
            {s.state ? ` · ${s.state}` : ""}
          </p>
        )}
        {s.price_min && (
          <p className="text-xs text-foreground mt-0.5">
            <span className="font-semibold">{formatPrice(s.price_min)}</span>
            <span className="text-muted-foreground"> · a partir de</span>
          </p>
        )}
      </div>
    </Link>
  );
}

export default function CategoriaPublica() {
  const { slug } = useParams<{ slug: string }>();
  const { user, profile } = useAuth();
  const planIds = useMyPlanSuppliers();
  const [category, setCategory] = useState<Category | null>(null);
  const [otherCategories, setOtherCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [heroDestaque, setHeroDestaque] = useState<HeroDestaque | null>(null);
  const [notFound, setNotFound] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // 1. Carrega a categoria pelo slug
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setSuppliers([]);
    setPage(0);
    setHasMore(true);
    setNotFound(false);
    (async () => {
      const { data: cat } = await supabase
        .from("categories")
        .select("id, name, slug, icon")
        .eq("slug", slug!)
        .maybeSingle();
      if (cancelled) return;
      if (!cat) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setCategory(cat as Category);
      const { data: others } = await supabase
        .from("categories")
        .select("id, name, slug, icon")
        .neq("id", cat.id)
        .order("name")
        .limit(12);
      if (!cancelled) setOtherCategories((others as Category[]) || []);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  // 2. Loader incremental
  const loadPage = useCallback(async (cat: Category, pageIdx: number, replace: boolean) => {
    const from = pageIdx * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data, count } = await supabase
      .from("suppliers")
      .select(
        "id, company_name, description, city, state, rating, review_count, price_min, featured, supplier_photos(photo_url, is_principal)",
        { count: "exact" },
      )
      .eq("status", "approved")
      .eq("category_id", cat.id)
      .order("featured", { ascending: false })
      .order("rating", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .range(from, to);
    const rows = (data as Supplier[]) || [];
    setSuppliers((prev) => (replace ? rows : [...prev, ...rows]));
    if (typeof count === "number") setTotal(count);
    setHasMore(rows.length === PAGE_SIZE);
  }, []);

  // 3. Primeira página quando categoria carrega
  useEffect(() => {
    if (!category) return;
    (async () => {
      await loadPage(category, 0, true);
      setLoading(false);
    })();
  }, [category, loadPage]);

  // 4. Infinite scroll via IntersectionObserver
  useEffect(() => {
    if (!category || loading || !hasMore || loadingMore) return;
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      async (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loadingMore) {
          setLoadingMore(true);
          const next = page + 1;
          await loadPage(category, next, false);
          setPage(next);
          setLoadingMore(false);
        }
      },
      { rootMargin: "300px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [category, page, hasMore, loading, loadingMore, loadPage]);

  if (notFound) return <Navigate to="/explorar" replace />;

  // Hero da categoria: destaque pago dela -> featured dela -> institucional (secoes_home escopo=explore)
  useEffect(() => {
    if (!category) return;
    (async () => {
      const hoje = new Date().toISOString();
      const { data: compras } = await (supabase.from("featured_purchases" as any) as any)
        .select("supplier_id, imagem_url, status, inicio, fim")
        .eq("status", "pago")
        .eq("escopo", "categoria")
        .eq("escopo_categoria_id", category.id)
        .lte("inicio", hoje)
        .gte("fim", hoje);
      const pick = compras && compras.length ? compras[Math.floor(Math.random() * compras.length)] : null;

      const buildFromSupplier = (sup: any, imagem: string | null): HeroDestaque => ({
        supplier_id: sup.id,
        imagem_url: imagem,
        company_name: sup.company_name,
        profile_photo_url: sup.profile_photo_url ?? null,
        category_name: sup.categories?.name ?? category.name,
        category_icon: sup.categories?.icon ?? category.icon,
        city: sup.city ?? null,
      });

      if (pick) {
        const { data: sup } = await supabase
          .from("suppliers")
          .select("id, company_name, city, profile_photo_url, categories(name, icon)")
          .eq("id", pick.supplier_id)
          .eq("status", "approved")
          .maybeSingle();
        if (sup) {
          setHeroDestaque(buildFromSupplier(sup, pick.imagem_url));
          return;
        }
      }
      // fallback: featured da categoria
      const { data: fb } = await supabase
        .from("suppliers")
        .select("id, company_name, city, profile_photo_url, categories(name, icon)")
        .eq("status", "approved")
        .eq("featured", true)
        .eq("category_id", category.id)
        .order("rating", { ascending: false, nullsFirst: false })
        .limit(1);
      if (fb && fb[0]) {
        setHeroDestaque(buildFromSupplier(fb[0] as any, null));
        return;
      }
      // fallback institucional configurável
      const { data: inst } = await (supabase.from("secoes_home" as any) as any)
        .select("foto_url, frase, subtexto")
        .eq("escopo", "explore")
        .eq("ativo", true)
        .order("ordem")
        .limit(1)
        .maybeSingle();
      setHeroDestaque(
        inst
          ? {
              supplier_id: null,
              imagem_url: inst.foto_url,
              company_name: inst.frase,
              profile_photo_url: null,
              category_name: inst.subtexto ?? `Os melhores em ${category.name.toLowerCase()}`,
              category_icon: null,
              city: null,
              institucional: true,
            }
          : {
              supplier_id: null,
              imagem_url:
                "https://images.unsplash.com/photo-1519741497674-611481863552?w=2000&q=85&auto=format&fit=crop",
              company_name: `Os melhores em ${category.name.toLowerCase()} para o seu casamento`,
              profile_photo_url: null,
              category_name: "Explore e peça orçamentos sem compromisso",
              category_icon: null,
              city: null,
              institucional: true,
            },
      );
    })();
  }, [category]);

  const seoTitle = category ? `${category.name} para casamento — Casamenteiro` : "Categoria — Casamenteiro";
  const seoDescription = category
    ? truncate(
        `Encontre os melhores ${category.name.toLowerCase()} para casamento no Casamenteiro. Compare orçamentos, fotos e avaliações reais de ${total || "diversos"} fornecedores aprovados.`,
      )
    : "";
  const canonical = absoluteUrl(`/categoria/${slug}`);

  const jsonLd = category
    ? [
        breadcrumbJsonLd([
          { name: "Início", path: "/" },
          { name: "Fornecedores", path: "/explorar" },
          { name: category.name, path: `/categoria/${category.slug}` },
        ]),
        {
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `${category.name} para casamento`,
          description: seoDescription,
          url: canonical,
          isPartOf: { "@type": "WebSite", name: "Casamenteiro", url: absoluteUrl("/") },
        },
        itemListJsonLd(
          suppliers.slice(0, 20).map((s) => ({
            name: s.company_name,
            path: `/fornecedor/${s.id}`,
          })),
        ),
      ]
    : undefined;

  return (
    <div className="min-h-screen bg-background">
      <SEO title={seoTitle} description={seoDescription} canonical={canonical} jsonLd={jsonLd} />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="container py-3 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <Heart className="h-5 w-5 text-primary fill-primary" />
            <span className="text-lg font-semibold tracking-tight hidden sm:inline">Casamenteiro</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link to="/explorar" className="text-muted-foreground hover:text-foreground transition">
              Fornecedores
            </Link>
            {user && (
              <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition">
                Meu Casamento
              </Link>
            )}
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground hidden sm:inline">
                  Olá, {profile?.full_name?.split(" ")[0] || "Casal"}
                </span>
                <UserMenu />
              </div>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
                  <Link to="/login">Entrar</Link>
                </Button>
                <Button size="sm" className="rounded-full" asChild>
                  <Link to="/cadastro">Cadastrar</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <CategoriaHero d={heroDestaque} categoryLabel={category?.name} />

      <main className="container py-6 md:py-10">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground flex items-center gap-1.5 mb-4">
          <Link to="/" className="hover:text-foreground">
            Início
          </Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/explorar" className="hover:text-foreground">
            Fornecedores
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">{category?.name || "Categoria"}</span>
        </nav>

        {/* Hero da categoria */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
            {category ? `${category.name} para casamento` : "Carregando..."}
          </h1>
          {category && (
            <p className="text-muted-foreground mt-2 max-w-2xl">
              {total > 0
                ? `${total} ${total === 1 ? "fornecedor aprovado" : "fornecedores aprovados"} para você comparar, conversar e contratar com segurança.`
                : "Estamos carregando os fornecedores desta categoria..."}
            </p>
          )}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="aspect-[4/3] rounded-2xl bg-muted animate-pulse" />
                <div className="h-3 w-2/3 bg-muted rounded animate-pulse" />
                <div className="h-3 w-1/2 bg-muted rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : suppliers.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p>Nenhum fornecedor desta categoria no momento.</p>
            <Button asChild className="mt-4 rounded-full">
              <Link to="/explorar">Ver todas as categorias</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-7">
              {suppliers.map((s) => (
                <SupplierCardItem key={s.id} s={s} inPlan={planIds.has(s.id)} />
              ))}
            </div>

            {/* Sentinel + fallback "carregar mais" */}
            <div ref={sentinelRef} className="h-10 mt-8 flex items-center justify-center">
              {loadingMore && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
            </div>
            {hasMore && !loadingMore && (
              <div className="flex justify-center mt-2">
                <Button
                  variant="outline"
                  className="rounded-full"
                  onClick={async () => {
                    if (!category) return;
                    setLoadingMore(true);
                    const next = page + 1;
                    await loadPage(category, next, false);
                    setPage(next);
                    setLoadingMore(false);
                  }}
                >
                  Carregar mais fornecedores
                </Button>
              </div>
            )}
            {!hasMore && suppliers.length > PAGE_SIZE && (
              <p className="text-center text-xs text-muted-foreground mt-6">
                Você viu todos os fornecedores desta categoria.
              </p>
            )}
          </>
        )}

        {/* Outras categorias — links internos para SEO */}
        {otherCategories.length > 0 && (
          <section className="mt-16 border-t border-border pt-10">
            <h2 className="text-lg font-semibold mb-4">Explore outras categorias</h2>
            <div className="flex flex-wrap gap-2">
              {otherCategories.map((c) => (
                <Link
                  key={c.id}
                  to={`/categoria/${c.slug}`}
                  className="px-3.5 py-1.5 rounded-full border border-border text-sm text-muted-foreground hover:text-foreground hover:border-foreground transition"
                >
                  {c.name}
                </Link>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-6">
              Ou veja{" "}
              <Link to="/explorar" className="underline hover:text-foreground">
                todos os fornecedores em destaque
              </Link>
              .
            </p>
          </section>
        )}
      </main>
    </div>
  );
}
