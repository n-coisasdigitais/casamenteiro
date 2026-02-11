import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SupplierCard from "@/components/SupplierCard";
import { Heart, Search, ArrowLeft, Building, SlidersHorizontal } from "lucide-react";

type Category = { id: string; name: string; slug: string };

export default function SupplierSearch() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from("categories").select("*").then(({ data }) => {
      if (data) setCategories(data);
    });

    // Read URL params
    const params = new URLSearchParams(window.location.search);
    const cat = params.get("cat");
    const loc = params.get("loc");
    if (loc) setCity(loc);
    
    if (cat) {
      // Find category by slug
      supabase.from("categories").select("id").eq("slug", cat).single().then(({ data }) => {
        if (data) {
          setSelectedCategory(data.id);
        }
        searchSuppliers(data?.id, loc || "");
      });
    } else {
      searchSuppliers();
    }
  }, []);

  const searchSuppliers = async (catId?: string, cityFilter?: string) => {
    setLoading(true);
    let query = supabase
      .from("suppliers")
      .select("*, categories(name), supplier_photos(photo_url)")
      .eq("status", "approved")
      .order("featured", { ascending: false })
      .order("created_at", { ascending: false });

    const catToUse = catId || (selectedCategory !== "all" ? selectedCategory : undefined);
    const cityToUse = cityFilter !== undefined ? cityFilter : city;

    if (catToUse) {
      query = query.eq("category_id", catToUse);
    }
    if (cityToUse?.trim()) {
      query = query.ilike("city", `%${cityToUse.trim()}%`);
    }

    const { data } = await query;
    setSuppliers(data || []);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-background border-b border-border sticky top-0 z-40">
        <div className="container flex items-center h-14 gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/dashboard"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-primary fill-primary" />
            <h1 className="font-bold text-base">Buscar Fornecedores</h1>
          </div>
        </div>
      </header>

      <main className="container py-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8 p-4 bg-secondary rounded-xl">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="sm:w-[220px] bg-background">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input 
            placeholder="Cidade..." 
            value={city} 
            onChange={(e) => setCity(e.target.value)} 
            className="sm:w-[200px] bg-background" 
          />
          <Button onClick={() => searchSuppliers()} disabled={loading}>
            <Search className="mr-2 h-4 w-4" />
            Buscar
          </Button>
        </div>

        {/* Category chips */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => { setSelectedCategory(cat.id); searchSuppliers(cat.id); }}
              className={`px-4 py-1.5 rounded-full border text-sm whitespace-nowrap transition-colors ${
                selectedCategory === cat.id 
                  ? "bg-primary text-primary-foreground border-primary" 
                  : "border-border hover:bg-secondary"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Results */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-72 bg-secondary animate-pulse rounded-lg" />
            ))}
          </div>
        ) : suppliers.length === 0 ? (
          <div className="text-center py-20">
            <Building className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-bold text-lg mb-2">Nenhum fornecedor encontrado</h3>
            <p className="text-muted-foreground text-sm">Tente alterar os filtros ou buscar em outra cidade.</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-4">{suppliers.length} fornecedores encontrados</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {suppliers.map((sup) => (
                <SupplierCard
                  key={sup.id}
                  id={sup.id}
                  company_name={sup.company_name}
                  city={sup.city}
                  state={sup.state}
                  rating={(sup as any).rating}
                  review_count={(sup as any).review_count}
                  price_min={(sup as any).price_min}
                  guest_min={(sup as any).guest_min}
                  guest_max={(sup as any).guest_max}
                  promo_percentage={(sup as any).promo_percentage}
                  featured={(sup as any).featured}
                  category_name={(sup.categories as any)?.name}
                  photo_url={sup.supplier_photos?.[0]?.photo_url}
                />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
