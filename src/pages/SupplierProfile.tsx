import { useEffect, useState, useMemo, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Heart, MapPin, Phone, Mail, Building, Star, Users,
  DollarSign, Tag, ChevronLeft, ChevronRight, Calendar,
  Sparkles, TreePine, Car as CarIcon, ChefHat, Image, Send, Eye, MessageCircle
} from "lucide-react";
import QuoteRequestForm from "@/components/QuoteRequestForm";
import SupplierMap from "@/components/SupplierMap";
import { buildWhatsAppLink } from "@/lib/phone";
import SEO from "@/components/SEO";
import { absoluteUrl, breadcrumbJsonLd, priceRangeLabel, truncate } from "@/lib/seo";
import UserMenu from "@/components/UserMenu";
import NotificationsBell from "@/components/NotificationsBell";
import DynamicFieldsView from "@/components/dynamic-fields/DynamicFieldsView";

type Review = {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  created_at: string;
  couples: { id: string } | null;
  profiles: { full_name: string | null } | null;
};

export default function SupplierProfile() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [supplier, setSupplier] = useState<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [isFavorited, setIsFavorited] = useState(false);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState(0);
  const [loading, setLoading] = useState(true);
  const quoteFormRef = useRef<HTMLDivElement>(null);

  // Reviews
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [userHasReview, setUserHasReview] = useState(false);
  const [phoneUnlocked, setPhoneUnlocked] = useState(false);

  // Recommendations
  const [recommendations, setRecommendations] = useState<any[]>([]);

  // Social proof - random viewer count (stable per page load)
  const viewerCount = useMemo(() => Math.floor(Math.random() * 15) + 1, []);

  useEffect(() => {
    if (!id) return;
    
    supabase.from("suppliers").select("*, categories(name)").eq("id", id).maybeSingle().then(({ data }) => {
      setSupplier(data);
      setLoading(false);
      if (data?.category_id) {
        supabase
          .from("suppliers")
          .select("*, categories(name), supplier_photos(photo_url)")
          .eq("status", "approved")
          .eq("category_id", data.category_id)
          .neq("id", id)
          .order("rating", { ascending: false, nullsFirst: false })
          .limit(4)
          .then(({ data: recs }) => setRecommendations(recs || []));
      }
    });
    
    supabase.from("supplier_photos").select("*").eq("supplier_id", id).order("display_order").then(({ data }) => setPhotos(data || []));
    loadReviews();

    // Registra visita ao perfil (1x por carregamento)
    (supabase.from("supplier_profile_views") as any).insert({
      supplier_id: id,
      viewer_id: user?.id ?? null,
    }).then(() => { /* fire-and-forget */ });

    if (user) {
      supabase.from("couples").select("id").eq("user_id", user.id).maybeSingle().then(({ data }) => {
        if (data) {
          setCoupleId(data.id);
          supabase.from("couple_favorites").select("id").eq("couple_id", data.id).eq("supplier_id", id).maybeSingle().then(({ data: fav }) => {
            setIsFavorited(!!fav);
          });
          supabase.from("reviews").select("id").eq("couple_id", data.id).eq("supplier_id", id).maybeSingle().then(({ data: rev }) => {
            setUserHasReview(!!rev);
          });
          supabase.from("quotes").select("id").eq("couple_id", data.id).eq("supplier_id", id).limit(1).then(({ data: q }) => {
            setPhoneUnlocked(!!(q && q.length > 0));
          });
        }
      });
    }
  }, [id, user]);

  const loadReviews = async () => {
    if (!id) return;
    const { data } = await supabase
      .from("reviews")
      .select("*")
      .eq("supplier_id", id)
      .order("created_at", { ascending: false });
    setReviews(data || []);
  };

  const submitReview = async () => {
    if (!coupleId || !id || !user) {
      toast({ title: "Faça login como casal para avaliar", variant: "destructive" });
      return;
    }
    setSubmittingReview(true);
    const { error } = await supabase.from("reviews").insert({
      supplier_id: id,
      couple_id: coupleId,
      user_id: user.id,
      rating: reviewRating,
      title: reviewTitle.trim() || null,
      comment: reviewComment.trim() || null,
    });
    setSubmittingReview(false);
    if (error) {
      toast({ title: "Erro ao enviar avaliação", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Avaliação enviada!" });
      setReviewTitle("");
      setReviewComment("");
      setReviewRating(5);
      setUserHasReview(true);
      loadReviews();
      supabase.from("suppliers").select("*, categories(name)").eq("id", id).maybeSingle().then(({ data }) => setSupplier(data));
    }
  };

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

  const scrollToQuoteForm = () => {
    quoteFormRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p>Carregando...</p></div>;
  if (!supplier) return (
    <div className="min-h-screen flex items-center justify-center flex-col gap-4">
      <Building className="h-16 w-16 text-muted-foreground" />
      <p className="text-muted-foreground">Fornecedor não encontrado.</p>
      <Button asChild><Link to="/buscar">Voltar à busca</Link></Button>
    </div>
  );

  const categoryName = (supplier.categories as any)?.name || "Fornecedor";
  const ratingLabel = supplier.rating >= 4.8 ? "Fantástico" : supplier.rating >= 4.5 ? "Excelente" : supplier.rating >= 4.0 ? "Muito bom" : "Bom";

  const seoImages = [
    supplier.profile_photo_url,
    ...photos.slice(0, 4).map((p: any) => p.photo_url),
  ].filter(Boolean);
  const localBusinessJsonLd: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": absoluteUrl(`/fornecedor/${id}`),
    name: supplier.company_name,
    url: absoluteUrl(`/fornecedor/${id}`),
    image: seoImages.length ? seoImages : undefined,
    description: supplier.description || undefined,
    priceRange: priceRangeLabel(supplier.price_min, supplier.price_max),
    address: {
      "@type": "PostalAddress",
      addressLocality: supplier.city || undefined,
      addressRegion: supplier.state || undefined,
      addressCountry: "BR",
    },
    telephone: supplier.whatsapp || supplier.phone || undefined,
    geo:
      supplier.lat && supplier.lng
        ? { "@type": "GeoCoordinates", latitude: supplier.lat, longitude: supplier.lng }
        : undefined,
    aggregateRating:
      supplier.rating && supplier.review_count
        ? {
            "@type": "AggregateRating",
            ratingValue: supplier.rating,
            reviewCount: supplier.review_count,
          }
        : undefined,
  };
  const breadcrumb = breadcrumbJsonLd([
    { name: "Início", path: "/" },
    { name: categoryName, path: "/explorar" },
    { name: supplier.company_name, path: `/fornecedor/${id}` },
  ]);

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`${supplier.company_name} — Casamenteiro`}
        description={truncate(
          supplier.description ||
            `Conheça ${supplier.company_name}${supplier.city ? ` em ${supplier.city}` : ""} e peça um orçamento sem compromisso.`
        )}
        canonical={absoluteUrl(`/fornecedor/${id}`)}
        ogImage={supplier.profile_photo_url || undefined}
        jsonLd={[localBusinessJsonLd, breadcrumb]}
      />
      {/* Header */}
      <header className="bg-background border-b border-border sticky top-0 z-50">
        <div className="container flex items-center h-14 gap-4">
          <Link to="/" className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary fill-primary" />
            <span className="text-lg font-bold hidden sm:inline">Casamenteiro</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm ml-6">
            <Link to="/explorar" className="text-muted-foreground hover:text-foreground transition-colors">Fornecedores</Link>
            {user && <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">Meu Casamento</Link>}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {user ? (
              <>
                <NotificationsBell />
                <UserMenu />
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/login">Entrar</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link to="/cadastro">Cadastrar</Link>
                </Button>
              </>
            )}
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

      {/* Interest banner with social proof */}
      <div className="bg-blue-50 border-b border-blue-100">
        <div className="container py-3 text-sm text-blue-700 flex items-center gap-2">
          <Eye className="h-4 w-4" />
          <span className="font-medium">{viewerCount} {viewerCount === 1 ? "pessoa está" : "pessoas estão"} olhando este fornecedor.</span>
          <button onClick={scrollToQuoteForm} className="underline font-medium hover:text-blue-900 transition-colors">
            Solicite um orçamento!
          </button>
        </div>
      </div>

      <main className="container py-6">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left: Gallery + content */}
          <div className="flex-1 min-w-0">
            {/* Photo gallery - mosaic */}
            {photos.length > 0 ? (
              <div className="relative mb-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 rounded-xl overflow-hidden" style={{ height: "400px" }}>
                  <div className="col-span-2 row-span-2 relative bg-muted cursor-pointer" onClick={() => setSelectedPhoto(0)}>
                    <img src={photos[0]?.photo_url} alt={supplier.company_name} className="w-full h-full object-cover" />
                  </div>
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
                <div className="absolute top-4 right-4 flex gap-2">
                  <button
                    onClick={toggleFavorite}
                    className={`bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-md hover:bg-white transition-colors ${isFavorited ? "text-primary" : "text-muted-foreground"}`}
                  >
                    <Heart className={`h-5 w-5 ${isFavorited ? "fill-primary" : ""}`} />
                  </button>
                </div>
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

            {/* Mobile: Supplier info + quote form */}
            <div className="lg:hidden mb-6" ref={quoteFormRef}>
              <Card>
                <CardContent className="p-5">
                  <h1 className="font-bold text-xl mb-3">{supplier.company_name}</h1>

                  {supplier.rating && (
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star key={s} className={`h-4 w-4 ${s <= Math.round(supplier.rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
                        ))}
                      </div>
                      <span className="font-semibold text-sm">{supplier.rating.toFixed(1)}</span>
                      <span className="text-sm text-muted-foreground">{ratingLabel}</span>
                    </div>
                  )}

                  {(supplier.city || supplier.state) && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span>{[supplier.city, supplier.state].filter(Boolean).join(", ")}</span>
                    </div>
                  )}

                  {supplier.price_min && (
                    <div className="flex items-center gap-2 text-sm mb-3">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span>Desde R${supplier.price_min.toLocaleString("pt-BR")}</span>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <QuoteRequestForm
                      supplierId={supplier.id}
                      supplierName={supplier.company_name}
                    />
                    {phoneUnlocked && buildWhatsAppLink(supplier.whatsapp || supplier.phone || "", "Olá! Vim pelo Casamenteiro, gostaria de conversar sobre o casamento.") && (
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-12 w-12 shrink-0 border-emerald-600 text-emerald-700 hover:bg-emerald-50"
                        asChild
                      >
                        <a
                          href={buildWhatsAppLink(supplier.whatsapp || supplier.phone || "", "Olá! Vim pelo Casamenteiro, gostaria de conversar sobre o casamento.")!}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="Conversar no WhatsApp"
                        >
                          <MessageCircle className="h-5 w-5" />
                        </a>
                      </Button>
                    )}
                  </div>
                  {(supplier.whatsapp || supplier.phone) && !phoneUnlocked && (
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                      <MessageCircle className="h-3 w-3" />
                      WhatsApp liberado após enviar o primeiro pedido de orçamento
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="info" className="mb-8">
              <TabsList className="bg-transparent border-b border-border rounded-none w-full justify-start gap-0 h-auto p-0 overflow-x-auto">
                {[
                  { value: "info", label: "Informação" },
                  { value: "faqs", label: "FAQs" },
                  { value: "opinions", label: `Opiniões ${reviews.length > 0 ? `(${reviews.length})` : ""}` },
                  { value: "map", label: "Mapa" },
                ].map(tab => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 text-sm whitespace-nowrap"
                  >
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="info" className="mt-6">
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

                {supplier.category_id && (
                  <div className="mb-8">
                    <h2 className="font-bold text-lg mb-4">Detalhes da categoria</h2>
                    <DynamicFieldsView
                      supplierId={supplier.id}
                      categoryId={supplier.category_id}
                    />
                  </div>
                )}

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
                      <p className="text-sm text-muted-foreground">{ratingLabel} · {reviews.length} opiniões</p>
                    </div>
                  </div>
                ) : null}

                {user && coupleId && !userHasReview && (
                  <div className="border border-border rounded-lg p-4 mb-6">
                    <h3 className="font-semibold text-sm mb-3">Deixe sua avaliação</h3>
                    <div className="flex gap-1 mb-3">
                      {[1, 2, 3, 4, 5].map(s => (
                        <button key={s} onClick={() => setReviewRating(s)}>
                          <Star className={`h-6 w-6 transition-colors ${s <= reviewRating ? "fill-amber-400 text-amber-400" : "text-muted-foreground hover:text-amber-300"}`} />
                        </button>
                      ))}
                    </div>
                    <Input
                      placeholder="Título da avaliação (opcional)"
                      value={reviewTitle}
                      onChange={(e) => setReviewTitle(e.target.value)}
                      className="mb-2"
                      maxLength={100}
                    />
                    <Textarea
                      placeholder="Conte como foi sua experiência..."
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      className="mb-3"
                      maxLength={1000}
                    />
                    <Button onClick={submitReview} disabled={submittingReview} size="sm">
                      <Send className="h-4 w-4 mr-2" />
                      {submittingReview ? "Enviando..." : "Enviar avaliação"}
                    </Button>
                  </div>
                )}

                {!user && (
                  <p className="text-sm text-muted-foreground mb-4">
                    <Link to="/login" className="text-primary underline">Faça login</Link> para deixar sua avaliação.
                  </p>
                )}

                {reviews.length > 0 ? (
                  <div className="space-y-4">
                    {reviews.map((rev) => (
                      <div key={rev.id} className="border border-border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map(s => (
                              <Star key={s} className={`h-3.5 w-3.5 ${s <= rev.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
                            ))}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(rev.created_at).toLocaleDateString("pt-BR")}
                          </span>
                        </div>
                        {rev.title && <p className="font-semibold text-sm mb-1">{rev.title}</p>}
                        {rev.comment && <p className="text-sm text-muted-foreground">{rev.comment}</p>}
                      </div>
                    ))}
                  </div>
                ) : !supplier.rating ? (
                  <p className="text-sm text-muted-foreground">Ainda não há opiniões sobre este fornecedor.</p>
                ) : null}
              </TabsContent>

              <TabsContent value="map" className="mt-6" forceMount>
                <h2 className="font-bold text-lg mb-4">Localização</h2>
                <SupplierMap
                  city={supplier.city}
                  state={supplier.state}
                  supplierName={supplier.company_name}
                />
              </TabsContent>
            </Tabs>

            {/* Recommendations */}
            {recommendations.length > 0 && (
              <div className="mb-8">
                <h2 className="font-bold text-lg mb-4">Fornecedores similares que você pode gostar</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {recommendations.map((rec) => {
                    const photo = rec.supplier_photos?.[0]?.photo_url;
                    return (
                      <Link key={rec.id} to={`/fornecedor/${rec.id}`} className="group">
                        <div className="rounded-lg overflow-hidden border border-border bg-card hover:shadow-lg transition-all">
                          <div className="relative h-36 bg-muted">
                            {photo ? (
                              <img src={photo} alt={rec.company_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center"><Building className="h-8 w-8 text-muted-foreground" /></div>
                            )}
                          </div>
                          <div className="p-3">
                            <h3 className="font-semibold text-sm mb-1 group-hover:text-primary transition-colors line-clamp-1">{rec.company_name}</h3>
                            {rec.rating && (
                              <div className="flex items-center gap-1 text-xs mb-1">
                                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                <span className="font-semibold">{rec.rating.toFixed(1)}</span>
                              </div>
                            )}
                            {(rec.city || rec.state) && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {[rec.city, rec.state].filter(Boolean).join(", ")}
                              </p>
                            )}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right sidebar - desktop only */}
          <aside className="hidden lg:block w-[340px] shrink-0">
            <div className="sticky top-20" ref={quoteFormRef}>
              <Card className="mb-4">
                <CardContent className="p-6">
                  <h1 className="font-bold text-xl mb-3">{supplier.company_name}</h1>

                  {supplier.rating && (
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star key={s} className={`h-4 w-4 ${s <= Math.round(supplier.rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
                        ))}
                      </div>
                      <span className="font-semibold text-sm">{supplier.rating.toFixed(1)}</span>
                      <span className="text-sm text-muted-foreground">{ratingLabel}</span>
                      {reviews.length > 0 && (
                        <span className="text-sm text-primary underline cursor-pointer">· {reviews.length} opiniões</span>
                      )}
                    </div>
                  )}

                  {(supplier.city || supplier.state) && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span>{[supplier.city, supplier.state].filter(Boolean).join(", ")}</span>
                    </div>
                  )}

                  {supplier.promo_percentage && supplier.promo_percentage > 0 && (
                    <div className="flex items-center gap-2 text-sm mb-4">
                      <Tag className="h-4 w-4 text-primary" />
                      <span>1 promoção</span>
                      <span className="text-primary font-medium">{supplier.promo_percentage}% desconto</span>
                    </div>
                  )}

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

                  <div className="flex gap-2">
                    <QuoteRequestForm
                      supplierId={supplier.id}
                      supplierName={supplier.company_name}
                    />
                    {supplier.phone && phoneUnlocked && (
                      <Button variant="outline" size="icon" className="h-12 w-12 shrink-0" asChild>
                        <a href={`tel:${supplier.phone}`}>
                          <Phone className="h-5 w-5" />
                        </a>
                      </Button>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    Dos mais pesquisados em {supplier.state || "sua região"}
                  </p>
                </CardContent>
              </Card>

              {(supplier.email || (supplier.phone && phoneUnlocked)) && (
                <Card>
                  <CardContent className="p-4 space-y-2">
                    <h3 className="font-semibold text-sm">Contato</h3>
                    {supplier.phone && phoneUnlocked && (
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
