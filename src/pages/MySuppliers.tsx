import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Search, Plus, CheckCircle, Store } from "lucide-react";
import DashboardHeader from "@/components/DashboardHeader";
import DashboardNav from "@/components/DashboardNav";

type Category = { id: string; name: string; slug: string; icon: string | null };
type CoupleSupplier = { id: string; supplier_id: string; category_id: string | null; status: string };
type Favorite = { id: string; supplier_id: string };

export default function MySuppliers() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [coupleSuppliers, setCoupleSuppliers] = useState<CoupleSupplier[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "saved" | "contracted">("all");

  useEffect(() => {
    if (!user) return;
    supabase.from("couples").select("id, onboarding_completed").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (!data || !data.onboarding_completed) { navigate("/onboarding"); return; }
      setCoupleId(data.id);
      loadData(data.id);
    });
  }, [user]);

  const loadData = async (cId: string) => {
    const [catRes, csRes, favRes] = await Promise.all([
      supabase.from("categories").select("*").order("name"),
      supabase.from("couple_suppliers").select("id, supplier_id, category_id, status").eq("couple_id", cId),
      supabase.from("couple_favorites").select("id, supplier_id").eq("couple_id", cId),
    ]);
    setCategories(catRes.data || []);
    setCoupleSuppliers(csRes.data || []);
    setFavorites(favRes.data || []);
  };

  const contracted = coupleSuppliers.filter((s) => s.status === "contracted");
  const saved = coupleSuppliers.filter((s) => s.status === "saved");
  const totalCategories = categories.length;

  const getCategoryStatus = (catId: string) => {
    const cs = coupleSuppliers.find((s) => s.category_id === catId && s.status === "contracted");
    return cs ? "contracted" : coupleSuppliers.find((s) => s.category_id === catId) ? "saved" : null;
  };

  const filteredCategories = categories.filter((cat) => {
    if (filter === "all") return true;
    const status = getCategoryStatus(cat.id);
    if (filter === "contracted") return status === "contracted";
    if (filter === "saved") return status === "saved" || status === "contracted";
    return true;
  });

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <DashboardNav />
      <main className="container px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold">Meus Fornecedores</h1>
            <p className="text-muted-foreground mt-1">
              {contracted.length} de {totalCategories} CONTRATADOS
            </p>
          </div>
          <Button asChild>
            <Link to="/buscar">
              <Plus className="mr-2 h-4 w-4" />
              Buscar fornecedor
            </Link>
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
          >
            <Store className="mr-2 h-4 w-4" />
            Todos ({totalCategories})
          </Button>
          <Button
            variant={filter === "saved" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("saved")}
          >
            <Heart className="mr-2 h-4 w-4" />
            Guardados ({favorites.length})
          </Button>
          <Button
            variant={filter === "contracted" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("contracted")}
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Contratados ({contracted.length})
          </Button>
        </div>

        {/* Category grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredCategories.map((cat) => {
            const status = getCategoryStatus(cat.id);
            return (
              <Card key={cat.id} className="relative overflow-hidden hover:shadow-md transition-shadow">
                {status === "contracted" && (
                  <div className="absolute top-2 right-2">
                    <CheckCircle className="h-5 w-5 text-primary fill-primary/20" />
                  </div>
                )}
                <CardContent className="p-5 flex flex-col items-center text-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-2xl">
                    {cat.icon || "📦"}
                  </div>
                  <h3 className="font-semibold text-sm">{cat.name}</h3>
                  {status && (
                    <Badge variant={status === "contracted" ? "default" : "secondary"} className="text-xs">
                      {status === "contracted" ? "Contratado" : "Guardado"}
                    </Badge>
                  )}
                  <Button variant="outline" size="sm" className="w-full" asChild>
                    <Link to={`/buscar?categoria=${cat.slug}`}>
                      <Search className="mr-2 h-3 w-3" />
                      Pesquisar
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredCategories.length === 0 && (
          <p className="text-center text-muted-foreground py-12">
            Nenhum fornecedor encontrado neste filtro.
          </p>
        )}
      </main>
    </div>
  );
}
