import { useState, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import UserMenu from "@/components/UserMenu";
import SEO from "@/components/SEO";
import { absoluteUrl, itemListJsonLd, breadcrumbJsonLd } from "@/lib/seo";
import {
  Heart,
  Search,
  Building,
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
  ChevronLeft,
  ChevronRight,
  Star,
  User,
  Menu,
  MapPin,
  Award,
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

type Category = { id: string; name: string; slug: string; icon: string | null };
type Supplier = {
  id: string;
  company_name: string;
  city: string | null;
  state: string | null;
  rating: number | null;
  review_count: number | null;
  price_min: number | null;
  guest_min: number | null;
  guest_max: number | null;
  featured: boolean;
  categories?: { name: string } | null;
  supplier_photos?: { photo_url: string }[];
};

const formatPrice = (n: number | null) => {
  if (!n) return null;
  if (n >= 1000) return `R$ ${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
  return `R$ ${n}`;
};

// Card GRANDE vertical (estilo Airbnb ampliado): foto larga 4:3 + infos.
function ExploreCard({ s }: { s: Supplier }) {
  const photo = s.supplier_photos?.[0]?.photo_url;
  const badge = s.featured ? "Destaque" : s.rating && s.rating >= 4.7 ? "Preferido" : null;
  return (
    <Link to={`/fornecedor/${s.id}`} className="group flex-shrink-0 w-[280px] md:w-[320px] snap-start">
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
            <Building className="h-10 w-10" />
          </div>
        )}
        {badge && (
          <span className="absolute top-3 left-3 bg-background/95 text-foreground text-xs font-semibold px-3 py-1 rounded-full shadow-sm">
            {badge}
          </span>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
          }}
          aria-label="Favoritar"
          className="absolute top-3 right-3 text-white/90 hover:text-primary transition-colors"
        >
          <Heart className="h-5 w-5 drop-shadow-md" strokeWidth={2.2} />
        </button>
      </div>
      <div className="pt-3 px-0.5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-base font-semibold text-foreground truncate">{s.company_name}</p>
          {s.rating != null && s.rating > 0 && (
            <span className="flex items-center gap-0.5 text-sm text-foreground shrink-0">
              <Star className="h-3.5 w-3.5 fill-foreground" /> {Number(s.rating).toFixed(1)}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground truncate">
          {s.categories?.name || "Fornecedor"}
          {s.city ? ` · ${s.city}` : ""}
        </p>
        {s.guest_min && (
          <p className="text-sm text-muted-foreground">
            {s.guest_min}
            {s.guest_max ? `–${s.guest_max}` : "+"} convidados
          </p>
        )}
        {s.price_min && (
          <p className="text-sm text-foreground mt-0.5">
            <span className="font-semibold">{formatPrice(s.price_min)}</span>
            <span className="text-muted-foreground"> · a partir de</span>
          </p>
        )}
      </div>
    </Link>
  );
}

type Destaque = {
  supplier_id: string | null;
  imagem_url: string | null;
  company_name: string;
  profile_photo_url: string | null;
  category_name: string | null;
  category_icon: string | null;
  city: string | null;
  institucional?: boolean;
};

// Fallback institucional do site. A imagem/textos podem ser editados pelo admin
// (tabela secoes_home, escopo='explore'); esta constante é só o default de segurança
// caso o admin ainda não tenha configurado nada.
const HERO_INSTITUCIONAL_DEFAULT: Destaque = {
  supplier_id: null,
  imagem_url: "https://images.unsplash.com/photo-1519741497674-611481863552?w=2000&q=85&auto=format&fit=crop",
  company_name: "Os melhores fornecedores para o seu casamento",
  profile_photo_url: null,
  category_name: "Explore por categoria e peça orçamentos sem compromisso",
  category_icon: null,
  city: null,
  institucional: true,
};

// Hero de destaque (pago). Recebe o destaque vigente já resolvido; se não houver,
// cai no fornecedor featured ou, por fim, no hero institucional do site.
function FeaturedHero({ d, categoryLabel }: { d: Destaque | null; categoryLabel?: string }) {
  if (!d) return null;
  const Icon = categoryIcons[d.category_icon || "building"] || Building;
  const img = d.imagem_url || d.profile_photo_url;
  const inst = d.institucional;
  const href = inst || !d.supplier_id ? "/buscar" : `/fornecedor/${d.supplier_id}`;
  return (
    <section className="container pt-4">
      <Link
        to={href}
        className="group relative block rounded-3xl overflow-hidden aspect-[16/9] md:aspect-[21/9] bg-muted"
      >
        {img ? (
          <img
            src={img}
            alt={d.company_name}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Building className="h-16 w-16 text-muted-foreground" />
          </div>
        )}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, hsl(0 0% 0% / 0.7) 0%, hsl(0 0% 0% / 0.35) 40%, hsl(0 0% 0% / 0.15) 70%, hsl(0 0% 0% / 0.4) 100%)",
          }}
        />

        {/* selo destaque — canto superior direito quando é fornecedor */}
        {!inst && (
          <span className="absolute top-4 right-4 flex items-center gap-1.5 bg-background/95 text-foreground text-xs font-semibold px-3 py-1.5 rounded-full shadow">
            <Award className="h-3.5 w-3.5 text-primary" /> {categoryLabel ? `Destaque em ${categoryLabel}` : "Destaque"}
          </span>
        )}

        {/* Texto no TOPO */}
        <div className="absolute top-6 md:top-9 left-5 md:left-9 right-5 max-w-2xl">
          {inst ? (
            <div className="text-white">
              <p
                className="text-2xl md:text-4xl font-semibold leading-tight"
                style={{ textShadow: "0 2px 14px hsl(0 0% 0% / 0.55)" }}
              >
                {d.company_name}
              </p>
              {d.category_name && (
                <p
                  className="text-sm md:text-base text-white/85 mt-1.5"
                  style={{ textShadow: "0 1px 8px hsl(0 0% 0% / 0.5)" }}
                >
                  {d.category_name}
                </p>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2.5 text-white">
              <span className="flex items-center justify-center h-10 w-10 rounded-full bg-white/15 backdrop-blur-sm border border-white/25 shrink-0">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p
                  className="text-xl md:text-2xl font-semibold leading-tight"
                  style={{ textShadow: "0 2px 12px hsl(0 0% 0% / 0.5)" }}
                >
                  {d.company_name}
                </p>
                <p
                  className="text-sm text-white/85 flex items-center gap-1"
                  style={{ textShadow: "0 1px 8px hsl(0 0% 0% / 0.5)" }}
                >
                  {d.category_name}
                  {d.city ? (
                    <>
                      · <MapPin className="h-3 w-3" /> {d.city}
                    </>
                  ) : null}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* CTA no rodapé direito */}
        <div className="absolute bottom-5 right-5">
          <span className="inline-flex items-center rounded-full bg-primary text-primary-foreground text-sm font-medium px-5 py-2.5 shadow-lg group-hover:opacity-90 transition">
            {inst ? "Explorar fornecedores" : "Ver fornecedor"}
          </span>
        </div>
      </Link>
    </section>
  );
}

function CarouselRow({
  title,
  subtitle,
  items,
  href,
}: {
  title: string;
  subtitle?: string;
  items: Supplier[];
  href?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: 1 | -1) => {
    ref.current?.scrollBy({ left: dir * (ref.current.clientWidth * 0.8), behavior: "smooth" });
  };
  if (!items.length) return null;
  return (
    <section className="container py-6">
      <div className="flex items-end justify-between mb-3">
        <div>
          <h2 className="text-lg md:text-xl font-semibold tracking-tight flex items-center gap-1.5">
            {href ? (
              <Link to={href} className="hover:underline inline-flex items-center gap-1">
                {title} <ChevronRight className="h-5 w-5" />
              </Link>
            ) : (
              title
            )}
          </h2>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        <div className="hidden md:flex gap-1">
          <button
            type="button"
            onClick={() => scroll(-1)}
            className="h-8 w-8 rounded-full border border-border bg-background hover:bg-secondary flex items-center justify-center transition"
            aria-label="Anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => scroll(1)}
            className="h-8 w-8 rounded-full border border-border bg-background hover:bg-secondary flex items-center justify-center transition"
            aria-label="Próximo"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div ref={ref} className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory -mx-4 px-4">
        {items.map((s) => (
          <ExploreCard key={s.id} s={s} />
        ))}
      </div>
    </section>
  );
}

const Explore = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const catParam = searchParams.get("cat") || "";
  const locParam = searchParams.get("loc") || searchParams.get("cidade") || "";
  const qParam = searchParams.get("q") || "";
  const [categories, setCategories] = useState<Category[]>([]);
  const [featured, setFeatured] = useState<Supplier[]>([]);
  const [byCategory, setByCategory] = useState<Record<string, Supplier[]>>({});
  const [heroDestaque, setHeroDestaque] = useState<Destaque | null>(HERO_INSTITUCIONAL_DEFAULT);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLocation, setSearchLocation] = useState("");

  // Carrega o DESTAQUE PAGO vigente para o hero.
  // Escopo: com categoria filtrada -> destaque daquela categoria; sem filtro -> destaque 'home'/geral.
  // Rotaciona aleatoriamente entre os vigentes. Fallback: fornecedor featured melhor avaliado.
  useEffect(() => {
    (async () => {
      const cats = categories;
      const catId = catParam ? cats.find((c) => c.slug === catParam)?.id : null;
      const hoje = new Date().toISOString();

      let q = (supabase.from("featured_purchases" as any) as any)
        .select("supplier_id, imagem_url, escopo, escopo_categoria_id, inicio, fim, status")
        .eq("status", "pago")
        .lte("inicio", hoje)
        .gte("fim", hoje);

      q = catId ? q.eq("escopo", "categoria").eq("escopo_categoria_id", catId) : q.in("escopo", ["home", "categoria"]);

      const { data: compras } = await q;
      let escolhido: any = null;
      if (compras && compras.length) {
        escolhido = compras[Math.floor(Math.random() * compras.length)];
      }

      const resolveSupplier = async (supplierId: string, imagemUrl: string | null) => {
        const { data: sup } = await supabase
          .from("suppliers")
          .select("id, company_name, city, profile_photo_url, categories(name, icon)")
          .eq("id", supplierId)
          .eq("status", "approved")
          .maybeSingle();
        if (!sup) return null;
        return {
          supplier_id: sup.id,
          imagem_url: imagemUrl,
          company_name: (sup as any).company_name,
          profile_photo_url: (sup as any).profile_photo_url ?? null,
          category_name: (sup as any).categories?.name ?? null,
          category_icon: (sup as any).categories?.icon ?? null,
          city: (sup as any).city ?? null,
        } as Destaque;
      };

      if (escolhido) {
        setHeroDestaque(await resolveSupplier(escolhido.supplier_id, escolhido.imagem_url));
      } else {
        // Fallback: melhor fornecedor featured (ou da categoria filtrada), sem arte própria
        let fq = supabase
          .from("suppliers")
          .select("id, company_name, city, profile_photo_url, categories(name, icon)")
          .eq("status", "approved")
          .eq("featured", true)
          .order("rating", { ascending: false, nullsFirst: false })
          .limit(1);
        if (catId) fq = fq.eq("category_id", catId);
        const { data: fb } = await fq;
        const sup = fb?.[0] as any;
        if (sup) {
          setHeroDestaque({
            supplier_id: sup.id,
            imagem_url: null,
            company_name: sup.company_name,
            profile_photo_url: sup.profile_photo_url ?? null,
            category_name: sup.categories?.name ?? null,
            category_icon: sup.categories?.icon ?? null,
            city: sup.city ?? null,
          });
        } else {
          // institucional configurável pelo admin (secoes_home escopo='explore')
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
                  category_name: inst.subtexto ?? null,
                  category_icon: null,
                  city: null,
                  institucional: true,
                }
              : HERO_INSTITUCIONAL_DEFAULT,
          );
        }
      }
    })();
  }, [categories, catParam]);

  useEffect(() => {
    (async () => {
      const { data: cats } = await supabase.from("categories").select("*").order("name");
      setCategories(cats || []);

      const { data: feat } = await supabase
        .from("suppliers")
        .select(
          "id, company_name, city, state, rating, review_count, price_min, guest_min, guest_max, featured, categories(name), supplier_photos(photo_url)",
        )
        .eq("status", "approved")
        .order("featured", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(12);
      setFeatured((feat as any) || []);

      // load up to 5 categories with items
      const slugs = (cats || []).slice(0, 6);
      const results: Record<string, Supplier[]> = {};
      await Promise.all(
        slugs.map(async (c) => {
          const { data } = await supabase
            .from("suppliers")
            .select(
              "id, company_name, city, state, rating, review_count, price_min, guest_min, guest_max, featured, categories(name), supplier_photos(photo_url)",
            )
            .eq("status", "approved")
            .eq("category_id", c.id)
            .order("featured", { ascending: false })
            .order("created_at", { ascending: false })
            .limit(12);
          if (data && data.length) results[c.slug] = data as any;
        }),
      );
      setByCategory(results);
    })();
  }, []);

  const catNice = (() => {
    if (!catParam) return "";
    const c = categories.find((x) => x.slug === catParam);
    return c?.name || catParam.replace(/-/g, " ");
  })();
  const seoTitle = (() => {
    const parts: string[] = [];
    parts.push(catNice ? `${catNice}` : "Fornecedores de casamento");
    if (locParam) parts.push(`em ${locParam}`);
    return `${parts.join(" ")} — Casamenteiro`;
  })();
  const seoDescription = `Encontre ${catNice || "fornecedores de casamento"} avaliados${
    locParam ? ` em ${locParam}` : ""
  } no Casamenteiro. Compare orçamentos, fotos e avaliações reais.`;
  const canonicalPath = (() => {
    const params = new URLSearchParams();
    if (catParam) params.set("cat", catParam);
    if (locParam) params.set("loc", locParam);
    const qs = params.toString();
    return qs ? `/buscar?${qs}` : "/explorar";
  })();
  const seoJsonLd = [
    breadcrumbJsonLd([
      { name: "Início", path: "/" },
      { name: "Fornecedores", path: "/explorar" },
      ...(catNice ? [{ name: catNice, path: `/buscar?cat=${catParam}` }] : []),
    ]),
    ...(featured.length
      ? [itemListJsonLd(featured.slice(0, 10).map((s) => ({ name: s.company_name, path: `/fornecedor/${s.id}` })))]
      : []),
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO title={seoTitle} description={seoDescription} canonical={absoluteUrl(canonicalPath)} jsonLd={seoJsonLd} />
      {/* Header — Airbnb-style */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="container py-3 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <Heart className="h-5 w-5 text-primary fill-primary" />
            <span className="text-lg font-semibold tracking-tight hidden sm:inline">Casamenteiro</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link to="/explorar" className="font-semibold border-b-2 border-foreground pb-3 -mb-3">
              Fornecedores
            </Link>
            {user && (
              <>
                <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition">
                  Meu Casamento
                </Link>
                <Link to="/perfil" className="text-muted-foreground hover:text-foreground transition">
                  Perfil
                </Link>
              </>
            )}
          </nav>

          <div className="flex items-center gap-2">
            {authLoading ? (
              <div className="h-9 w-20" />
            ) : user ? (
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
                  <Link to="/cadastro">
                    <User className="mr-1.5 h-3.5 w-3.5" />
                    Cadastrar
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Search pill */}
        <div className="container pb-4">
          {/* Mobile: compact single search */}
          <Link
            to={`/buscar`}
            className="sm:hidden flex items-center gap-3 bg-background border border-border shadow-sm rounded-full px-4 py-3 active:scale-[0.99] transition"
            aria-label="Pesquisar"
          >
            <Search className="h-4 w-4 text-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground leading-tight">Comece sua busca</p>
              <p className="text-xs text-muted-foreground leading-tight truncate">Local · Categoria · Fornecedor</p>
            </div>
          </Link>

          {/* Desktop: full pill with inputs */}
          <div className="hidden sm:flex mx-auto max-w-2xl items-stretch bg-background border border-border shadow-sm hover:shadow-md transition-shadow rounded-full overflow-hidden">
            <div className="flex-1 px-5 py-2.5">
              <p className="text-[11px] font-semibold text-foreground">Onde</p>
              <Input
                placeholder="Buscar destinos"
                className="border-0 shadow-none focus-visible:ring-0 px-0 h-5 text-sm placeholder:text-muted-foreground"
                value={searchLocation}
                onChange={(e) => setSearchLocation(e.target.value)}
              />
            </div>
            <div className="w-px bg-border my-2" />
            <div className="flex-1 px-5 py-2.5">
              <p className="text-[11px] font-semibold text-foreground">O que</p>
              <Input
                placeholder="Categoria ou fornecedor"
                className="border-0 shadow-none focus-visible:ring-0 px-0 h-5 text-sm placeholder:text-muted-foreground"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center pr-2">
              <Button asChild size="icon" className="rounded-full h-11 w-11 bg-primary hover:bg-primary/90">
                <Link
                  to={`/buscar?q=${encodeURIComponent(searchQuery)}&loc=${encodeURIComponent(searchLocation)}`}
                  aria-label="Pesquisar"
                >
                  <Search className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Category chips strip */}
        <div className="border-t border-border">
          <div className="container">
            <div className="flex gap-7 overflow-x-auto scrollbar-hide py-3">
              {categories.map((cat) => {
                const Icon = categoryIcons[cat.icon || "building"] || Building;
                return (
                  <Link
                    key={cat.id}
                    to={`/categoria/${cat.slug}`}
                    className="flex flex-col items-center gap-1 min-w-[64px] text-muted-foreground hover:text-foreground transition group"
                  >
                    <Icon className="h-5 w-5 group-hover:text-primary transition-colors" />
                    <span className="text-[11px] font-medium whitespace-nowrap">{cat.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </header>

      {/* Hero de destaque (pago) + Carousels */}
      <main className="pb-12">
        <FeaturedHero d={heroDestaque} categoryLabel={catNice || undefined} />
        <CarouselRow
          title="Fornecedores em destaque"
          subtitle="Os mais bem avaliados da plataforma"
          items={featured}
          href="/buscar"
        />
        {categories.map(
          (c) =>
            byCategory[c.slug] && (
              <CarouselRow
                key={c.id}
                title={c.name}
                subtitle={`Os mais procurados em ${c.name.toLowerCase()}`}
                items={byCategory[c.slug]}
                href={`/categoria/${c.slug}`}
              />
            ),
        )}
      </main>

      {/* Footer */}
      <footer className="py-10 bg-foreground text-background">
        <div className="container">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Heart className="h-5 w-5 fill-primary text-primary" />
                <span className="text-lg font-semibold">Casamenteiro</span>
              </div>
              <p className="text-background/60 text-sm">
                A plataforma completa para planejar o casamento dos seus sonhos.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm">Para casais</h4>
              <nav className="flex flex-col gap-2 text-sm text-background/60">
                <Link to="/cadastro?tipo=couple" className="hover:text-background">
                  Criar conta grátis
                </Link>
                <Link to="/buscar" className="hover:text-background">
                  Buscar fornecedores
                </Link>
                <Link to="/dashboard" className="hover:text-background">
                  Meu casamento
                </Link>
                <Link to="/tarefas" className="hover:text-background">
                  Agenda de tarefas
                </Link>
              </nav>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm">Ferramentas</h4>
              <nav className="flex flex-col gap-2 text-sm text-background/60">
                <Link to="/orcamento" className="hover:text-background">
                  Orçamento
                </Link>
                <Link to="/convidados" className="hover:text-background">
                  Lista de convidados
                </Link>
                <Link to="/meus-fornecedores" className="hover:text-background">
                  Meus fornecedores
                </Link>
                <Link to="/perfil" className="hover:text-background">
                  Meu perfil
                </Link>
              </nav>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm">Para fornecedores</h4>
              <nav className="flex flex-col gap-2 text-sm text-background/60">
                <Link to="/cadastro?tipo=supplier" className="hover:text-background">
                  Cadastrar empresa
                </Link>
                <Link to="/fornecedor/painel" className="hover:text-background">
                  Painel do fornecedor
                </Link>
              </nav>
            </div>
          </div>
          <div className="border-t border-background/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-col md:flex-row items-center gap-3 text-xs text-background/40">
              <p>© 2026 Casamenteiro. Todos os direitos reservados.</p>
              <div className="flex items-center gap-3">
                <Link to="/termos" className="hover:text-background">
                  Termos de Uso
                </Link>
                <Link to="/privacidade" className="hover:text-background">
                  Privacidade
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-background/60">
              <span>Desenvolvido com carinho pela</span>
              <a
                href="https://ncoisas.digital/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-background/80 hover:text-background transition-colors"
              >
                N Coisas Digitais
              </a>
              <Heart className="h-3.5 w-3.5 fill-primary text-primary" />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Explore;
