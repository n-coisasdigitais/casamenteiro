import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, ArrowLeft, MapPin, Building, Send, MessageCircle, CheckSquare, Square } from "lucide-react";
import UserMenu from "@/components/UserMenu";
import BulkContactDialog, { type BulkSupplier } from "@/components/BulkContactDialog";

export default function Favorites() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkMode, setBulkMode] = useState<"platform" | "whatsapp">("platform");

  useEffect(() => {
    if (!user) return;
    const loadFavorites = async () => {
      const { data: couple } = await supabase.from("couples").select("id").eq("user_id", user.id).maybeSingle();
      if (!couple) { setLoading(false); return; }
      const { data } = await supabase
        .from("couple_favorites")
        .select("*, suppliers(*, categories(name), supplier_photos(photo_url), whatsapp, phone)")
        .eq("couple_id", couple.id);
      setFavorites(data || []);
      setLoading(false);
    };
    loadFavorites();
  }, [user]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectedSuppliers = useMemo<BulkSupplier[]>(() => {
    return favorites
      .filter((f) => f.suppliers && selected.has(f.suppliers.id))
      .map((f) => ({
        id: f.suppliers.id,
        company_name: f.suppliers.company_name,
        whatsapp: f.suppliers.whatsapp,
        phone: f.suppliers.phone,
        categories: f.suppliers.categories ? { name: f.suppliers.categories.name } : null,
      }));
  }, [favorites, selected]);

  const openBulk = (mode: "platform" | "whatsapp") => {
    if (selected.size === 0) return;
    setBulkMode(mode);
    setBulkOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="container flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/dashboard"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <h1 className="text-lg font-semibold">Meus Favoritos</h1>
          </div>
          <UserMenu />
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
          <>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <p className="text-sm text-muted-foreground">
              {selected.size > 0 ? `${selected.size} selecionado(s)` : "Selecione fornecedores para enviar orçamento em massa"}
            </p>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" disabled={selected.size === 0} onClick={() => openBulk("platform")}>
                <Send className="h-3.5 w-3.5 mr-1.5" /> Enviar pela plataforma
              </Button>
              <Button size="sm" variant="outline" disabled={selected.size === 0} onClick={() => openBulk("whatsapp")}>
                <MessageCircle className="h-3.5 w-3.5 mr-1.5" /> Abrir WhatsApp
              </Button>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {favorites.map((fav) => {
              const sup = fav.suppliers;
              if (!sup) return null;
              const isSel = selected.has(sup.id);
              return (
                <Card key={fav.id} className={`overflow-hidden hover:shadow-lg transition-shadow h-full relative ${isSel ? "ring-2 ring-primary" : ""}`}>
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); toggle(sup.id); }}
                    className="absolute top-2 left-2 z-10 bg-background/95 rounded-full p-1.5 shadow-sm hover:bg-background"
                    aria-label={isSel ? "Desmarcar" : "Selecionar"}
                  >
                    {isSel ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4 text-muted-foreground" />}
                  </button>
                  <Link to={`/fornecedor/${sup.id}`}>
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
                  </Link>
                </Card>
              );
            })}
          </div>
          <BulkContactDialog
            open={bulkOpen}
            onOpenChange={setBulkOpen}
            suppliers={selectedSuppliers}
            mode={bulkMode}
            onDone={() => setSelected(new Set())}
          />
          </>
        )}
      </main>
    </div>
  );
}
