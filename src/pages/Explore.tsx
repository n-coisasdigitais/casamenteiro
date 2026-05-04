import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import UserMenu from "@/components/UserMenu";
import SEO from "@/components/SEO";
import {
  Heart, Search, Building, Camera, Music, Utensils,
  Flower2, Mail, Shirt, Sparkles, Cake, ClipboardList, Car, Video,
  ChevronLeft, ChevronRight, Star, User, Menu
} from "lucide-react";

const categoryIcons: Record<string, any> = {
  "building": Building, "camera": Camera, "video": Video, "music": Music,
  "flower": Flower2, "mail": Mail, "shirt": Shirt, "sparkles": Sparkles,
  "cake": Cake, "clipboard": ClipboardList, "car": Car, "utensils": Utensils,
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

function ExploreCard({ s }: { s: Supplier }) {
  const photo = s.supplier_photos?.[0]?.photo_url;
  const badge = s.featured ? "Destaque" : (s.rating && s.rating >= 4.7 ? "Preferido" : null);
  return (
    <Link
      to={`/fornecedor/${s.id}`}
      className="group flex-shrink-0 w-[180px] md:w-[210px] snap-start"
    >
      <div className="relative aspect-square rounded-2xl overflow-hidden bg-muted">
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
        {badge && (
          <span className="absolute top-2 left-2 bg-background/95 text-foreground text-[11px] font-semibold px-2.5 py-1 rounded-full shadow-sm">
            {badge}
          </span>
        )}
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); }}
          aria-label="Favoritar"
          className="absolute top-2 right-2 text-white/90 hover:text-primary transition-colors"
        >
          <Heart className="h-5 w-5 drop-shadow-md" strokeWidth={2.2} />
        </button>
      </div>
      <div className="pt-2 px-0.5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-foreground truncate">{s.company_name}</p>
          {s.rating != null && s.rating > 0 && (
            <span className="flex items-center gap-0.5 text-xs text-foreground shrink-0">
              <Star className="h-3 w-3 fill-foreground" /> {Number(s.rating).toFixed(1)}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {s.categories?.name || "Fornecedor"}{s.city ? ` · ${s.city}` : ""}
        </p>
        {s.guest_min && (
          <p className="text-xs text-muted-foreground">
            {s.guest_min}{s.guest_max ? `–${s.guest_max}` : "+"} convidados
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
            ) : title}
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
      <div
        ref={ref}
        className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory -mx-4 px-4"
      >
        {items.map((s) => <ExploreCard key={s.id} s={s} />)}
      </div>
    </section>
  );
}

const Explore = () => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [featured, setFeatured] = useState<Supplier[]>([]);
  const [byCategory, setByCategory] = useState<Record<string, Supplier[]>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLocation, setSearchLocation] = useState("");

  useEffect(() => {
    (async () => {
      const { data: cats } = await supabase.from("categories").select("*").order("name");
      setCategories(cats || []);

      const { data: feat } = await supabase
        .from("suppliers")
        .select("id, company_name, city, state, rating, review_count, price_min, guest_min, guest_max, featured, categories(name), supplier_photos(photo_url)")
        .eq("status", "approved")
        .order("featured", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(12);
      setFeatured((feat as any) || []);

      // load up to 5 categories with items
      const slugs = (cats || []).slice(0, 6);
      const results: Record<string, Supplier[]> = {};
      await Promise.all(slugs.map(async (c) => {
        const { data } = await supabase
          .from("suppliers")
          .select("id, company_name, city, state, rating, review_count, price_min, guest_min, guest_max, featured, categories(name), supplier_photos(photo_url)")
          .eq("status", "approved")
          .eq("category_id", c.id)
          .order("featured", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(12);
        if (data && data.length) results[c.slug] = data as any;
      }));
      setByCategory(results);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Fornecedores de casamento — Meu Grande Dia"
        description="Descubra espaços, buffets, fotógrafos, decoração e mais. Fornecedores avaliados para o seu casamento."
      />
      {/* Header — Airbnb-style */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="container py-3 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <Heart className="h-5 w-5 text-primary fill-primary" />
            <span className="text-lg font-semibold tracking-tight hidden sm:inline">Casamenteiro</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link to="/explorar" className="font-semibold border-b-2 border-foreground pb-3 -mb-3">Fornecedores</Link>
            {user && (
              <>
                <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition">Meu Casamento</Link>
                <Link to="/perfil" className="text-muted-foreground hover:text-foreground transition">Perfil</Link>
              </>
            )}
          </nav>

          <div className="flex items-center gap-2">
            {user ? (
              <UserMenu />
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
          <div className="mx-auto max-w-2xl flex items-stretch bg-background border border-border shadow-sm hover:shadow-md transition-shadow rounded-full overflow-hidden">
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
            <div className="hidden sm:block flex-1 px-5 py-2.5">
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
                <Link to={`/buscar?q=${encodeURIComponent(searchQuery)}&loc=${encodeURIComponent(searchLocation)}`} aria-label="Pesquisar">
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
                    to={`/buscar?cat=${cat.slug}`}
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

      {/* Carousels */}
      <main className="pb-12">
        <CarouselRow
          title="Fornecedores em destaque"
          subtitle="Os mais bem avaliados da plataforma"
          items={featured}
          href="/buscar"
        />
        {categories.map((c) => byCategory[c.slug] && (
          <CarouselRow
            key={c.id}
            title={c.name}
            subtitle={`Os mais procurados em ${c.name.toLowerCase()}`}
            items={byCategory[c.slug]}
            href={`/buscar?cat=${c.slug}`}
          />
        ))}
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
                <Link to="/cadastro?tipo=couple" className="hover:text-background">Criar conta grátis</Link>
                <Link to="/buscar" className="hover:text-background">Buscar fornecedores</Link>
                <Link to="/dashboard" className="hover:text-background">Meu casamento</Link>
                <Link to="/tarefas" className="hover:text-background">Agenda de tarefas</Link>
              </nav>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm">Ferramentas</h4>
              <nav className="flex flex-col gap-2 text-sm text-background/60">
                <Link to="/orcamento" className="hover:text-background">Orçamento</Link>
                <Link to="/convidados" className="hover:text-background">Lista de convidados</Link>
                <Link to="/meus-fornecedores" className="hover:text-background">Meus fornecedores</Link>
                <Link to="/perfil" className="hover:text-background">Meu perfil</Link>
              </nav>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm">Para fornecedores</h4>
              <nav className="flex flex-col gap-2 text-sm text-background/60">
                <Link to="/cadastro?tipo=supplier" className="hover:text-background">Cadastrar empresa</Link>
                <Link to="/fornecedor/painel" className="hover:text-background">Painel do fornecedor</Link>
              </nav>
            </div>
          </div>
          <div className="border-t border-background/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-col md:flex-row items-center gap-3 text-xs text-background/40">
              <p>© 2026 Casamenteiro. Todos os direitos reservados.</p>
              <div className="flex items-center gap-3">
                <Link to="/termos" className="hover:text-background">Termos de Uso</Link>
                <Link to="/privacidade" className="hover:text-background">Privacidade</Link>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-background/60">
              <span>Desenvolvido com carinho pela</span>
              <a href="https://ncoisas.digital/" target="_blank" rel="noopener noreferrer" className="font-semibold text-background/80 hover:text-background transition-colors">N Coisas Digitais</a>
              <Heart className="h-3.5 w-3.5 fill-primary text-primary" />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Explore;
