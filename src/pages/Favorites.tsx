import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, ArrowLeft, MapPin, Building } from "lucide-react";

export default function Favorites() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const loadFavorites = async () => {
      const { data: couple } = await supabase.from("couples").select("id").eq("user_id", user.id).maybeSingle();
      if (!couple) { setLoading(false); return; }
      const { data } = await supabase
        .from("couple_favorites")
        .select("*, suppliers(*, categories(name), supplier_photos(photo_url))")
        .eq("couple_id", couple.id);
      setFavorites(data || []);
      setLoading(false);
    };
    loadFavorites();
  }, [user]);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="container flex items-center h-16 px-4 gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/dashboard"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <h1 className="font-serif text-lg font-semibold">Meus Favoritos</h1>
        </div>
      </header>
      <main className="container px-4 py-6">
        {loading ? (
          <p className="text-center text-muted-foreground py-12">Carregando...</p>
        ) : favorites.length === 0 ? (
          <div className="text-center py-16">
            <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum favorito ainda.</p>
            <Button className="mt-4" asChild><Link to="/buscar">Buscar fornecedores</Link></Button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {favorites.map((fav) => {
              const sup = fav.suppliers;
              if (!sup) return null;
              return (
                <Link to={`/fornecedor/${sup.id}`} key={fav.id}>
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full">
                    <div className="h-40 bg-muted flex items-center justify-center">
                      {sup.supplier_photos?.length > 0 ? (
                        <img src={sup.supplier_photos[0].photo_url} alt={sup.company_name} className="w-full h-full object-cover" />
                      ) : (
                        <Building className="h-12 w-12 text-muted-foreground" />
                      )}
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-serif font-semibold text-lg mb-1">{sup.company_name}</h3>
                      {sup.categories && <p className="text-sm text-primary font-medium mb-2">{sup.categories.name}</p>}
                      {(sup.city || sup.state) && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />{[sup.city, sup.state].filter(Boolean).join(", ")}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
