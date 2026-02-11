import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, ArrowLeft, MapPin, Phone, Mail, Building } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function SupplierProfile() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [supplier, setSupplier] = useState<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [isFavorited, setIsFavorited] = useState(false);
  const [coupleId, setCoupleId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    supabase.from("suppliers").select("*, categories(name)").eq("id", id).single().then(({ data }) => setSupplier(data));
    supabase.from("supplier_photos").select("*").eq("supplier_id", id).order("display_order").then(({ data }) => setPhotos(data || []));

    if (user) {
      supabase.from("couples").select("id").eq("user_id", user.id).single().then(({ data }) => {
        if (data) {
          setCoupleId(data.id);
          supabase.from("couple_favorites").select("id").eq("couple_id", data.id).eq("supplier_id", id).single().then(({ data: fav }) => {
            setIsFavorited(!!fav);
          });
        }
      });
    }
  }, [id, user]);

  const toggleFavorite = async () => {
    if (!coupleId || !id) return;
    if (isFavorited) {
      await supabase.from("couple_favorites").delete().eq("couple_id", coupleId).eq("supplier_id", id);
      setIsFavorited(false);
      toast({ title: "Removido dos favoritos" });
    } else {
      await supabase.from("couple_favorites").insert({ couple_id: coupleId, supplier_id: id });
      setIsFavorited(true);
      toast({ title: "Adicionado aos favoritos!" });
    }
  };

  if (!supplier) return <div className="min-h-screen flex items-center justify-center"><p>Carregando...</p></div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="container flex items-center justify-between h-16 px-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/buscar"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <h1 className="font-serif text-lg font-semibold truncate">{supplier.company_name}</h1>
          {user && coupleId && (
            <Button variant="ghost" size="icon" onClick={toggleFavorite}>
              <Heart className={`h-5 w-5 ${isFavorited ? "fill-primary text-primary" : ""}`} />
            </Button>
          )}
        </div>
      </header>

      <main className="container px-4 py-6 max-w-3xl">
        {/* Photo gallery */}
        {photos.length > 0 && (
          <div className="grid grid-cols-2 gap-2 mb-6 rounded-xl overflow-hidden">
            {photos.slice(0, 4).map((photo, i) => (
              <div key={photo.id} className={`${i === 0 ? "col-span-2 h-64" : "h-40"} bg-muted`}>
                <img src={photo.photo_url} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        )}

        {photos.length === 0 && (
          <div className="h-48 bg-muted rounded-xl flex items-center justify-center mb-6">
            <Building className="h-16 w-16 text-muted-foreground" />
          </div>
        )}

        <h2 className="font-serif text-2xl font-bold mb-2">{supplier.company_name}</h2>
        {supplier.categories && (
          <p className="text-primary font-medium mb-4">{(supplier.categories as any).name}</p>
        )}

        {supplier.description && (
          <Card className="mb-4">
            <CardContent className="p-4">
              <h3 className="font-semibold mb-2">Sobre</h3>
              <p className="text-muted-foreground whitespace-pre-line">{supplier.description}</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold">Contato</h3>
            {(supplier.city || supplier.state) && (
              <p className="flex items-center gap-2 text-sm"><MapPin className="h-4 w-4 text-primary" />{[supplier.city, supplier.state].filter(Boolean).join(", ")}</p>
            )}
            {supplier.phone && (
              <p className="flex items-center gap-2 text-sm"><Phone className="h-4 w-4 text-primary" />{supplier.phone}</p>
            )}
            {supplier.email && (
              <p className="flex items-center gap-2 text-sm"><Mail className="h-4 w-4 text-primary" />{supplier.email}</p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
