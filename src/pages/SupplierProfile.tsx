import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Heart, MapPin, Phone, Mail, Building, Star, Users,
  DollarSign, Tag, ChevronLeft, ChevronRight, Calendar,
  Sparkles, TreePine, Car as CarIcon, ChefHat, Image
} from "lucide-react";

export default function SupplierProfile() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [supplier, setSupplier] = useState<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [isFavorited, setIsFavorited] = useState(false);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState(0);

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
    if (!coupleId || !id) {
      if (!user) {
        toast({ title: "Faça login para favoritar", description: "Crie uma conta ou entre para salvar seus favoritos." });
        return;
      }
      return;
    }
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

  const categoryName = (supplier.categories as any)?.name || "Fornecedor";
  const ratingLabel = supplier.rating >= 4.8 ? "Fantástico" : supplier.rating >= 4.5 ? "Excelente" : supplier.rating >= 4.0 ? "Muito bom" : "Bom";

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
      <div className="border-b border-border">
        <div className="container py-2 text-xs text-muted-foreground flex items-center gap-1.5">
          <Link to="/" className="hover:text-foreground">Casamentos</Link>
          <span>/</span>
          <Link to="/buscar" className="hover:text-foreground">{categoryName}</Link>
          <span>/</span>
          <span className="text-foreground">{supplier.company_name}</span>
        </div>
      </div>

      {/* Search bar */}
      <div className="border-b border-border">
        <div className="container py-3 flex items-center gap-3 max-w-2xl">
          <div className="flex-1 border border-border rounded-lg px-3 py-2 text-sm text-muted-foreground">
            {categoryName}
          </div>
          <span className="text-sm text-muted-foreground">em</span>
          <div className="border border-border rounded-lg px-3 py-2 text-sm text-muted-foreground w-40">
            {[supplier.city, supplier.state].filter(Boolean).join(", ") || "Brasil"}
          </div>
          <Button variant="outline" className="text-primary border-primary hover:bg-primary hover:text-primary-foreground" asChild>
            <Link to="/buscar">Pesquisar</Link>
          </Button>
        </div>
      </div>

      {/* Interest banner */}
      <div className="bg-blue-50 border-b border-blue-100">
        <div className="container py-3 text-sm text-blue-700 flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          Há casais interessados neste fornecedor. <Link to="#" className="underline font-medium">Solicite um orçamento!</Link>
        </div>
      </div>

      <main className="container py-6">
        <div className="flex gap-8">
          {/* Left: Gallery + content */}
          <div className="flex-1 min-w-0">
            {/* Photo gallery - mosaic */}
            {photos.length > 0 ? (
              <div className="relative mb-6">
                <div className="grid grid-cols-3 gap-1 rounded-xl overflow-hidden" style={{ height: "400px" }}>
                  {/* Main photo */}
                  <div className="col-span-2 row-span-2 relative bg-muted cursor-pointer" onClick={() => setSelectedPhoto(0)}>
                    <img src={photos[0]?.photo_url} alt={supplier.company_name} className="w-full h-full object-cover" />
                  </div>
                  {/* Side photos */}
                  {photos.slice(1, 5).map((photo, i) => (
                    <div key={photo.id} className="relative bg-muted cursor-pointer" onClick={() => setSelectedPhoto(i + 1)}>
                      <img src={photo.photo_url} alt="" className="w-full h-full object-cover" />
                      {i === 3 && photos.length > 5 && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-medium">
                          +{photos.length - 5} fotos
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Action buttons */}
                <div className="absolute top-4 right-4 flex gap-2">
                  <button
                    onClick={toggleFavorite}
                    className={`bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-md hover:bg-white transition-colors ${isFavorited ? "text-primary" : "text-muted-foreground"}`}
                  >
                    <Heart className={`h-5 w-5 ${isFavorited ? "fill-primary" : ""}`} />
                  </button>
                </div>

                {/* Ver fotos button */}
                <button className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg px-4 py-2 text-sm font-medium shadow-md flex items-center gap-2 hover:bg-white transition-colors">
                  <Image className="h-4 w-4" />
                  Ver Fotos {photos.length}
                </button>
              </div>
            ) : (
              <div className="h-64 bg-muted rounded-xl flex items-center justify-center mb-6">
                <Building className="h-16 w-16 text-muted-foreground" />
              </div>
            )}

            {/* Tabs */}
            <Tabs defaultValue="info" className="mb-8">
              <TabsList className="bg-transparent border-b border-border rounded-none w-full justify-start gap-0 h-auto p-0">
                {[
                  { value: "info", label: "Informação" },
                  { value: "faqs", label: "FAQs" },
                  { value: "opinions", label: `Opiniões ${supplier.review_count ? supplier.review_count : ""}` },
                  { value: "map", label: "Mapa" },
                ].map(tab => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 text-sm"
                  >
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="info" className="mt-6">
                {/* Dados de interesse */}
                <div className="mb-8">
                  <h2 className="font-bold text-lg mb-4">Dados de interesse</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {supplier.city && (
                      <div className="flex items-center gap-3 text-sm">
                        <TreePine className="h-5 w-5 text-muted-foreground" />
                        <span>{supplier.city}</span>
                      </div>
                    )}
                    {(supplier.guest_min || supplier.guest_max) && (
                      <div className="flex items-center gap-3 text-sm">
                        <Users className="h-5 w-5 text-muted-foreground" />
                        <span>
                          {supplier.guest_min && supplier.guest_max
                            ? `${supplier.guest_min} a ${supplier.guest_max} convidados`
                            : supplier.guest_max
                              ? `Até ${supplier.guest_max} convidados`
                              : `${supplier.guest_min}+ convidados`}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-sm">
                      <CarIcon className="h-5 w-5 text-muted-foreground" />
                      <span>Possui estacionamento</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <ChefHat className="h-5 w-5 text-muted-foreground" />
                      <span>Cozinha para catering</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                      <span>Realiza 1 evento por dia</span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h2 className="font-bold text-lg mb-4">Informação</h2>
                  {supplier.description ? (
                    <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                      {supplier.description}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Ainda não há informações detalhadas sobre este fornecedor.</p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="faqs" className="mt-6">
                <h2 className="font-bold text-lg mb-4">Perguntas frequentes</h2>
                <p className="text-sm text-muted-foreground">Ainda não há perguntas frequentes cadastradas.</p>
              </TabsContent>

              <TabsContent value="opinions" className="mt-6">
                <h2 className="font-bold text-lg mb-4">Opiniões</h2>
                {supplier.rating ? (
                  <div className="flex items-center gap-3 mb-6 p-4 bg-secondary rounded-lg">
                    <div className="text-3xl font-bold text-primary">{supplier.rating.toFixed(1)}</div>
                    <div>
                      <div className="flex gap-0.5 mb-1">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star key={s} className={`h-4 w-4 ${s <= Math.round(supplier.rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground">{ratingLabel} · {supplier.review_count || 0} opiniões</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Ainda não há opiniões. <button className="text-primary underline">Deixe sua opinião</button></p>
                )}
              </TabsContent>

              <TabsContent value="map" className="mt-6">
                <h2 className="font-bold text-lg mb-4">Localização</h2>
                <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <MapPin className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">{[supplier.city, supplier.state].filter(Boolean).join(", ")}</p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right sidebar - sticky */}
          <aside className="hidden lg:block w-[340px] shrink-0">
            <div className="sticky top-20">
              <Card className="mb-4">
                <CardContent className="p-6">
                  <h1 className="font-bold text-xl mb-3">{supplier.company_name}</h1>

                  {/* Rating */}
                  {supplier.rating && (
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star key={s} className={`h-4 w-4 ${s <= Math.round(supplier.rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
                        ))}
                      </div>
                      <span className="font-semibold text-sm">{supplier.rating.toFixed(1)}</span>
                      <span className="text-sm text-muted-foreground">{ratingLabel}</span>
                      {supplier.review_count && (
                        <span className="text-sm text-primary underline cursor-pointer">· {supplier.review_count} opiniões</span>
                      )}
                    </div>
                  )}

                  {/* Location */}
                  {(supplier.city || supplier.state) && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span>{[supplier.city, supplier.state].filter(Boolean).join(", ")}</span>
                    </div>
                  )}

                  {/* Promo */}
                  {supplier.promo_percentage && supplier.promo_percentage > 0 && (
                    <div className="flex items-center gap-2 text-sm mb-4">
                      <Tag className="h-4 w-4 text-primary" />
                      <span>1 promoção</span>
                      <span className="text-primary font-medium">{supplier.promo_percentage}% desconto</span>
                    </div>
                  )}

                  {/* Price & capacity card */}
                  <div className="border border-border rounded-lg p-4 mb-4 space-y-3">
                    {supplier.price_min && (
                      <div className="flex items-center gap-3">
                        <DollarSign className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">
                            {categoryName === "Espaços e Buffet" ? "Aluguel" : "Preço"} desde R${supplier.price_min.toLocaleString("pt-BR")}
                          </p>
                        </div>
                      </div>
                    )}
                    {(supplier.guest_min || supplier.guest_max) && (
                      <div className="flex items-center gap-3">
                        <Users className="h-5 w-5 text-muted-foreground" />
                        <p className="text-sm">
                          {supplier.guest_min && supplier.guest_max
                            ? `${supplier.guest_min} a ${supplier.guest_max} convidados`
                            : supplier.guest_max
                              ? `Até ${supplier.guest_max} convidados`
                              : `${supplier.guest_min}+ convidados`}
                        </p>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Disponibilidade</p>
                        <p className="text-xs text-muted-foreground">Ver calendário</p>
                      </div>
                    </div>
                  </div>

                  {/* CTA buttons */}
                  <div className="flex gap-2">
                    <Button className="flex-1 h-12 text-base font-semibold">
                      Pedir Orçamento Grátis
                    </Button>
                    {supplier.phone && (
                      <Button variant="outline" size="icon" className="h-12 w-12 shrink-0" asChild>
                        <a href={`tel:${supplier.phone}`}>
                          <Phone className="h-5 w-5" />
                        </a>
                      </Button>
                    )}
                  </div>

                  {/* Popular tag */}
                  <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    Dos mais pesquisados em {supplier.state || "sua região"}
                  </p>
                </CardContent>
              </Card>

              {/* Contact card */}
              {(supplier.email || supplier.phone) && (
                <Card>
                  <CardContent className="p-4 space-y-2">
                    <h3 className="font-semibold text-sm">Contato</h3>
                    {supplier.phone && (
                      <p className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-4 w-4 text-primary" />{supplier.phone}
                      </p>
                    )}
                    {supplier.email && (
                      <p className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-4 w-4 text-primary" />{supplier.email}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
