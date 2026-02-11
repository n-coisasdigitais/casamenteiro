import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { 
  Heart, Search, ArrowLeft, Building, Star, MapPin, Users, 
  DollarSign, ChevronDown, ChevronUp, List, LayoutGrid, Tag,
  ChevronLeft, ChevronRight
} from "lucide-react";

type Category = { id: string; name: string; slug: string };

type Supplier = {
  id: string;
  company_name: string;
  description: string | null;
  city: string | null;
  state: string | null;
  rating: number | null;
  review_count: number | null;
  price_min: number | null;
  price_max: number | null;
  guest_min: number | null;
  guest_max: number | null;
  promo_percentage: number | null;
  featured: boolean;
  category_id: string | null;
  categories: { name: string } | null;
  supplier_photos: { photo_url: string }[];
};

// Sub-category labels per main category slug
const subCategories: Record<string, string[]> = {
  "espacos-buffet": ["Fazendas", "Chácaras", "Hotéis", "Restaurantes", "Salões", "Sítios", "Casas", "Espaços exclusivos"],
  "fotografia": ["Pré-wedding", "Pós-wedding", "Álbuns", "Mini álbuns", "Álbum digital", "Fotografias em alta resolução"],
  "musica-dj": ["DJ", "Banda", "Cantor", "Coral", "Instrumentistas"],
  "decoracao": ["Decoração floral", "Cenografia", "Iluminação", "Mobiliário"],
};

const priceRanges = [
  { label: "Menos de R$1.000", max: 1000 },
  { label: "R$1.000 - R$5.000", min: 1000, max: 5000 },
  { label: "R$5.000 - R$15.000", min: 5000, max: 15000 },
  { label: "R$15.000 - R$30.000", min: 15000, max: 30000 },
  { label: "Mais de R$30.000", min: 30000 },
];

export default function SupplierSearch() {
  const [searchParams] = useSearchParams();
  const catSlug = searchParams.get("cat") || "";
  const queryParam = searchParams.get("q") || "";
  const locParam = searchParams.get("loc") || "";

  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedCategorySlug, setSelectedCategorySlug] = useState(catSlug);
  const [searchQuery, setSearchQuery] = useState(queryParam);
  const [searchLocation, setSearchLocation] = useState(locParam);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "gallery">("list");
  const [showPromo, setShowPromo] = useState(false);
  const [selectedPriceRange, setSelectedPriceRange] = useState<number | null>(null);
  const [filtersOpen, setFiltersOpen] = useState({ category: true, highlights: true, price: false });
  const [photoIndex, setPhotoIndex] = useState<Record<string, number>>({});

  useEffect(() => {
    supabase.from("categories").select("*").order("name").then(({ data }) => {
      if (data) {
        setCategories(data);
        if (catSlug) {
          const found = data.find(c => c.slug === catSlug);
          if (found) setSelectedCategory(found.id);
        }
      }
    });
  }, [catSlug]);

  useEffect(() => {
    fetchSuppliers();
  }, [selectedCategory, showPromo, selectedPriceRange]);

  const fetchSuppliers = async () => {
    setLoading(true);
    let query = supabase
      .from("suppliers")
      .select("*, categories(name), supplier_photos(photo_url)")
      .eq("status", "approved")
      .order("featured", { ascending: false })
      .order("rating", { ascending: false, nullsFirst: false });

    if (selectedCategory) query = query.eq("category_id", selectedCategory);
    if (searchLocation.trim()) query = query.or(`city.ilike.%${searchLocation.trim()}%,state.ilike.%${searchLocation.trim()}%`);
    if (searchQuery.trim()) query = query.ilike("company_name", `%${searchQuery.trim()}%`);
    if (showPromo) query = query.not("promo_percentage", "is", null);
    
    if (selectedPriceRange !== null) {
      const range = priceRanges[selectedPriceRange];
      if (range.min) query = query.gte("price_min", range.min);
      if (range.max) query = query.lte("price_min", range.max);
    }

    const { data } = await query;
    setSuppliers((data as unknown as Supplier[]) || []);
    setLoading(false);
  };

  const handleSearch = () => fetchSuppliers();

  const currentCategoryName = categories.find(c => c.id === selectedCategory)?.name;
  const currentSlug = categories.find(c => c.id === selectedCategory)?.slug || "";
  const subs = subCategories[currentSlug] || [];

  const navigatePhoto = (supplierId: string, direction: number, totalPhotos: number) => {
    setPhotoIndex(prev => {
      const current = prev[supplierId] || 0;
      const next = (current + direction + totalPhotos) % totalPhotos;
      return { ...prev, [supplierId]: next };
    });
  };

  const getCategoryTitle = () => {
    if (currentCategoryName && searchLocation) return `${currentCategoryName} ${searchLocation}`;
    if (currentCategoryName) return currentCategoryName;
    if (searchQuery) return `Resultados para "${searchQuery}"`;
    return "Todos os fornecedores";
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-background border-b border-border sticky top-0 z-50">
        <div className="container flex items-center h-14 gap-4">
          <Link to="/" className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary fill-primary" />
            <span className="text-lg font-bold hidden sm:inline">Meu Grande Dia</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm ml-6">
            <Link to="/buscar?cat=espacos-buffet" className="text-muted-foreground hover:text-foreground transition-colors">Espaços</Link>
            <Link to="/buscar?cat=fotografia" className="text-muted-foreground hover:text-foreground transition-colors">Fotografia</Link>
            <Link to="/buscar" className="text-muted-foreground hover:text-foreground transition-colors">Fornecedores</Link>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/login">Entrar</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/cadastro">Cadastrar</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="border-b border-border bg-background">
        <div className="container py-2 text-xs text-muted-foreground flex items-center gap-1.5">
          <Link to="/" className="hover:text-foreground">Casamentos</Link>
          <span>/</span>
          {currentCategoryName ? (
            <>
              <Link to="/buscar" className="hover:text-foreground">Fornecedores</Link>
              <span>/</span>
              <span className="text-foreground">{currentCategoryName}</span>
              {searchLocation && (
                <>
                  <span>/</span>
                  <span className="text-foreground">{searchLocation}</span>
                </>
              )}
            </>
          ) : (
            <span className="text-foreground">Fornecedores</span>
          )}
        </div>
      </div>

      {/* Hero search bar */}
      <div className="relative">
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent py-6">
          <div className="container">
            <h1 className="text-2xl md:text-3xl font-bold mb-4">{getCategoryTitle()}</h1>
            <div className="flex bg-background rounded-lg border border-border shadow-sm overflow-hidden max-w-2xl">
              <div className="flex-1 flex items-center gap-2 px-4">
                <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                <Input
                  placeholder={currentCategoryName || "Pesquisar fornecedor..."}
                  className="border-0 shadow-none focus-visible:ring-0 px-0 text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
              <div className="flex items-center border-l border-border px-4">
                <Input
                  placeholder="Estado"
                  className="border-0 shadow-none focus-visible:ring-0 px-0 w-28 text-sm"
                  value={searchLocation}
                  onChange={(e) => setSearchLocation(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
              <Button className="rounded-none rounded-r-lg px-6 h-11" onClick={handleSearch}>
                Pesquisar
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="container py-6">
        <div className="flex gap-8">
          {/* Sidebar filters - desktop */}
          <aside className="hidden lg:block w-64 shrink-0">
            {/* Category filter */}
            <div className="mb-6">
              <button
                className="flex items-center justify-between w-full text-sm font-semibold mb-3"
                onClick={() => setFiltersOpen(p => ({ ...p, category: !p.category }))}
              >
                <span>{currentCategoryName || "Categoria"}</span>
                {filtersOpen.category ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {filtersOpen.category && (
                <div className="space-y-2">
                  {(subs.length > 0 ? subs : categories.map(c => c.name)).map((name, i) => (
                    <label key={i} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground cursor-pointer">
                      <Checkbox className="h-4 w-4" />
                      <span>{name}</span>
                    </label>
                  ))}
                  {subs.length === 0 && categories.map(cat => (
                    <label
                      key={cat.id}
                      className={`flex items-center gap-2 text-sm cursor-pointer ${selectedCategory === cat.id ? "text-primary font-medium" : "text-muted-foreground hover:text-foreground"}`}
                      onClick={() => {
                        setSelectedCategory(cat.id === selectedCategory ? null : cat.id);
                        setSelectedCategorySlug(cat.slug);
                      }}
                    >
                      <Checkbox checked={selectedCategory === cat.id} className="h-4 w-4" />
                      <span>{cat.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-border my-4" />

            {/* Highlights */}
            <div className="mb-6">
              <button
                className="flex items-center justify-between w-full text-sm font-semibold mb-3"
                onClick={() => setFiltersOpen(p => ({ ...p, highlights: !p.highlights }))}
              >
                <span>Filtros destacados</span>
                {filtersOpen.highlights ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {filtersOpen.highlights && (
                <div className="space-y-3">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Tag className="h-4 w-4" /> Promoções
                    </span>
                    <button
                      onClick={() => setShowPromo(!showPromo)}
                      className={`w-10 h-5 rounded-full transition-colors ${showPromo ? "bg-primary" : "bg-muted"}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${showPromo ? "translate-x-5" : "translate-x-0.5"}`} />
                    </button>
                  </label>
                </div>
              )}
            </div>

            <div className="border-t border-border my-4" />

            {/* Price */}
            <div className="mb-6">
              <button
                className="flex items-center justify-between w-full text-sm font-semibold mb-3"
                onClick={() => setFiltersOpen(p => ({ ...p, price: !p.price }))}
              >
                <span>Preço</span>
                {filtersOpen.price ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {filtersOpen.price && (
                <div className="space-y-2">
                  {priceRanges.map((range, i) => (
                    <label key={i} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground cursor-pointer">
                      <Checkbox
                        checked={selectedPriceRange === i}
                        onCheckedChange={() => setSelectedPriceRange(selectedPriceRange === i ? null : i)}
                        className="h-4 w-4"
                      />
                      <span>{range.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </aside>

          {/* Results */}
          <div className="flex-1 min-w-0">
            {/* Results header */}
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm font-medium tracking-wider text-muted-foreground uppercase">
                {suppliers.length} resultados
              </p>
              <div className="flex items-center border border-border rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode("list")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm ${viewMode === "list" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted"}`}
                >
                  <List className="h-4 w-4" /> Lista
                </button>
                <button
                  onClick={() => setViewMode("gallery")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm border-l border-border ${viewMode === "gallery" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted"}`}
                >
                  <LayoutGrid className="h-4 w-4" /> Galeria
                </button>
              </div>
            </div>

            {loading ? (
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : suppliers.length === 0 ? (
              <div className="text-center py-20">
                <Building className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-bold text-lg mb-2">Nenhum fornecedor encontrado</h3>
                <p className="text-muted-foreground text-sm">Tente alterar os filtros ou buscar em outra cidade.</p>
              </div>
            ) : viewMode === "list" ? (
              /* LIST VIEW */
              <div className="space-y-4">
                {suppliers.map((sup) => {
                  const photos = sup.supplier_photos || [];
                  const currentPhoto = photoIndex[sup.id] || 0;
                  return (
                    <div key={sup.id} className="flex border border-border rounded-lg overflow-hidden bg-card hover:shadow-lg transition-shadow">
                      {/* Photo carousel */}
                      <div className="relative w-[280px] h-[220px] shrink-0 bg-muted group">
                        {photos.length > 0 ? (
                          <Link to={`/fornecedor/${sup.id}`}>
                            <img
                              src={photos[currentPhoto]?.photo_url}
                              alt={sup.company_name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </Link>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Building className="h-12 w-12 text-muted-foreground" />
                          </div>
                        )}
                        {/* Carousel dots */}
                        {photos.length > 1 && (
                          <>
                            <button
                              onClick={() => navigatePhoto(sup.id, -1, photos.length)}
                              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => navigatePhoto(sup.id, 1, photos.length)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </button>
                            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
                              {photos.slice(0, 5).map((_, i) => (
                                <div key={i} className={`w-2 h-2 rounded-full ${i === currentPhoto ? "bg-white" : "bg-white/50"}`} />
                              ))}
                            </div>
                          </>
                        )}
                        {/* Badges */}
                        {sup.featured && (
                          <Badge className="absolute top-3 left-3 bg-amber-600 text-white text-[10px] font-bold tracking-wider">
                            TOP
                          </Badge>
                        )}
                        {/* Favorite */}
                        <button className="absolute top-3 right-3 text-white/80 hover:text-primary transition-colors">
                          <Heart className="h-5 w-5" />
                        </button>
                      </div>

                      {/* Info */}
                      <div className="flex-1 p-5 flex flex-col">
                        <Link to={`/fornecedor/${sup.id}`} className="hover:text-primary transition-colors">
                          <h3 className="font-bold text-lg mb-1">{sup.company_name}</h3>
                        </Link>

                        {/* Rating + location */}
                        <div className="flex items-center gap-1.5 text-sm mb-2">
                          {sup.rating && (
                            <>
                              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                              <span className="font-semibold">{sup.rating.toFixed(1)}</span>
                              {sup.review_count && (
                                <span className="text-muted-foreground">({sup.review_count})</span>
                              )}
                              <span className="text-muted-foreground">·</span>
                            </>
                          )}
                          {(sup.city || sup.state) && (
                            <span className="text-muted-foreground">
                              {[sup.city, sup.state].filter(Boolean).join(", ")}
                            </span>
                          )}
                        </div>

                        {/* Description */}
                        {sup.description && (
                          <p className="text-sm text-muted-foreground line-clamp-3 mb-3 flex-1">
                            {sup.description}
                          </p>
                        )}

                        {/* Price & guests & promo */}
                        <div className="flex items-center gap-4 text-sm mt-auto">
                          {sup.price_min && (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <DollarSign className="h-4 w-4" />
                              A partir de R${sup.price_min.toLocaleString("pt-BR")}
                            </span>
                          )}
                          {(sup.guest_min || sup.guest_max) && (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Users className="h-4 w-4" />
                              {sup.guest_min && sup.guest_max
                                ? `${sup.guest_min} a ${sup.guest_max}`
                                : sup.guest_max
                                  ? `Até ${sup.guest_max}`
                                  : `${sup.guest_min}+`}
                              <span className="text-xs">Convidados</span>
                            </span>
                          )}
                          {sup.promo_percentage && sup.promo_percentage > 0 && (
                            <span className="flex items-center gap-1 text-primary font-medium">
                              <Tag className="h-4 w-4" />
                              1 promoção <span className="text-emerald-600">-{sup.promo_percentage}%</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* CTA */}
                      <div className="hidden md:flex items-end p-5">
                        <Button className="whitespace-nowrap" asChild>
                          <Link to={`/fornecedor/${sup.id}`}>
                            Pedir Orçamento Grátis
                          </Link>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* GALLERY VIEW */
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {suppliers.map((sup) => {
                  const photo = sup.supplier_photos?.[0]?.photo_url;
                  return (
                    <Link key={sup.id} to={`/fornecedor/${sup.id}`} className="group">
                      <div className="rounded-lg overflow-hidden border border-border bg-card hover:shadow-lg transition-all">
                        <div className="relative h-48 bg-muted">
                          {photo ? (
                            <img src={photo} alt={sup.company_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"><Building className="h-10 w-10 text-muted-foreground" /></div>
                          )}
                          {sup.featured && (
                            <Badge className="absolute top-3 left-3 bg-amber-600 text-white text-[10px] font-bold">TOP</Badge>
                          )}
                        </div>
                        <div className="p-3">
                          <h3 className="font-semibold text-sm mb-1 group-hover:text-primary transition-colors line-clamp-1">{sup.company_name}</h3>
                          {sup.rating && (
                            <div className="flex items-center gap-1 text-xs mb-1">
                              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                              <span className="font-semibold">{sup.rating.toFixed(1)}</span>
                              {sup.review_count && <span className="text-muted-foreground">({sup.review_count})</span>}
                            </div>
                          )}
                          {sup.price_min && (
                            <p className="text-xs text-muted-foreground">A partir de R${sup.price_min.toLocaleString("pt-BR")}</p>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
