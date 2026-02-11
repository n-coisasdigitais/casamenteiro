import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Heart, Search, ArrowLeft, MapPin, Building } from "lucide-react";

type Category = { id: string; name: string; slug: string };
type Supplier = {
  id: string;
  company_name: string;
  description: string | null;
  city: string | null;
  state: string | null;
  category_id: string | null;
  categories?: { name: string } | null;
  supplier_photos?: { photo_url: string }[];
};

export default function SupplierSearch() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from("categories").select("*").then(({ data }) => {
      if (data) setCategories(data);
    });
    searchSuppliers();
  }, []);

  const searchSuppliers = async () => {
    setLoading(true);
    let query = supabase
      .from("suppliers")
      .select("*, categories(name), supplier_photos(photo_url)")
      .eq("status", "approved")
      .order("created_at", { ascending: false });

    if (selectedCategory !== "all") {
      query = query.eq("category_id", selectedCategory);
    }
    if (city.trim()) {
      query = query.ilike("city", `%${city.trim()}%`);
    }

    const { data } = await query;
    setSuppliers((data as any) || []);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="container flex items-center h-16 px-4 gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/dashboard"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <h1 className="font-serif text-lg font-semibold">Buscar Fornecedores</h1>
        </div>
      </header>

      <main className="container px-4 py-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="sm:w-[200px]">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input placeholder="Cidade..." value={city} onChange={(e) => setCity(e.target.value)} className="sm:w-[200px]" />
          <Button onClick={searchSuppliers} disabled={loading}>
            <Search className="mr-2 h-4 w-4" />
            Buscar
          </Button>
        </div>

        {/* Results */}
        {loading ? (
          <p className="text-center text-muted-foreground py-12">Buscando...</p>
        ) : suppliers.length === 0 ? (
          <div className="text-center py-16">
            <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum fornecedor encontrado.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {suppliers.map((sup) => (
              <Link to={`/fornecedor/${sup.id}`} key={sup.id}>
                <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full">
                  <div className="h-40 bg-muted flex items-center justify-center">
                    {sup.supplier_photos && sup.supplier_photos.length > 0 ? (
                      <img src={sup.supplier_photos[0].photo_url} alt={sup.company_name} className="w-full h-full object-cover" />
                    ) : (
                      <Building className="h-12 w-12 text-muted-foreground" />
                    )}
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-serif font-semibold text-lg mb-1">{sup.company_name}</h3>
                    {sup.categories && (
                      <p className="text-sm text-primary font-medium mb-2">{(sup.categories as any).name}</p>
                    )}
                    {(sup.city || sup.state) && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {[sup.city, sup.state].filter(Boolean).join(", ")}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
