import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import SupplierCard from "@/components/SupplierCard";
import UserMenu from "@/components/UserMenu";
import heroImage from "@/assets/hero-wedding.jpg";
import { 
  Heart, Search, Building, Camera, Music, Utensils, 
  Flower2, Mail, Shirt, Sparkles, Cake, ClipboardList, Car, Video,
  ChevronRight, User
} from "lucide-react";

const categoryIcons: Record<string, any> = {
  "building": Building, "camera": Camera, "video": Video, "music": Music,
  "flower": Flower2, "mail": Mail, "shirt": Shirt, "sparkles": Sparkles,
  "cake": Cake, "clipboard": ClipboardList, "car": Car,
};

type Category = { id: string; name: string; slug: string; icon: string | null };

const Index = () => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [featuredSuppliers, setFeaturedSuppliers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLocation, setSearchLocation] = useState("");

  useEffect(() => {
    supabase.from("categories").select("*").then(({ data }) => setCategories(data || []));
    
    // Load featured/approved suppliers for showcase
    supabase
      .from("suppliers")
      .select("*, categories(name), supplier_photos(photo_url)")
      .eq("status", "approved")
      .order("featured", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(8)
      .then(({ data }) => setFeaturedSuppliers(data || []));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container flex items-center justify-between h-14">
          <Link to="/" className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary fill-primary" />
            <span className="text-lg font-bold text-foreground">Meu Grande Dia</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link to="/buscar" className="text-muted-foreground hover:text-foreground transition-colors">Fornecedores</Link>
            <Link to="/buscar?cat=espacos-buffet" className="text-muted-foreground hover:text-foreground transition-colors">Espaços</Link>
            <Link to="/buscar?cat=fotografia" className="text-muted-foreground hover:text-foreground transition-colors">Fotografia</Link>
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <UserMenu />
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/login">Entrar</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link to="/cadastro">
                    <User className="mr-1.5 h-3.5 w-3.5" />
                    Cadastrar
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-14">
        <div className="relative h-[480px] md:h-[520px] overflow-hidden">
          <img 
            src={heroImage} 
            alt="Casamento dos sonhos" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-foreground/70 via-foreground/40 to-transparent" />
          <div className="absolute inset-0 flex items-center">
            <div className="container">
              <div className="max-w-lg">
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 leading-tight">
                  Encontre tudo o que precisa para o seu casamento
                </h1>
                <p className="text-white/80 text-base md:text-lg mb-8">
                  Mais de 80.000 fornecedores para escolher
                </p>
                {/* Search bar */}
                <div className="flex bg-background rounded-lg shadow-xl overflow-hidden">
                  <div className="flex-1 flex items-center gap-2 px-4">
                    <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                    <Input 
                      placeholder="Pesquisar por nome ou categoria..." 
                      className="border-0 shadow-none focus-visible:ring-0 px-0 text-sm"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="hidden sm:flex items-center border-l border-border px-4">
                    <Input 
                      placeholder="Estado" 
                      className="border-0 shadow-none focus-visible:ring-0 px-0 w-24 text-sm"
                      value={searchLocation}
                      onChange={(e) => setSearchLocation(e.target.value)}
                    />
                  </div>
                  <Button className="rounded-none rounded-r-lg px-6 h-12" asChild>
                    <Link to={`/buscar?q=${searchQuery}&loc=${searchLocation}`}>Pesquisar</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Category chips - horizontal scroll */}
      <section className="py-6 border-b border-border">
        <div className="container">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map((cat) => {
              const Icon = categoryIcons[cat.icon || "building"] || Building;
              return (
                <Link
                  key={cat.id}
                  to={`/buscar?cat=${cat.slug}`}
                  className="flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-background hover:bg-secondary hover:border-primary/30 transition-all text-sm whitespace-nowrap"
                >
                  <Icon className="h-4 w-4 text-primary" />
                  {cat.name}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured suppliers */}
      {featuredSuppliers.length > 0 && (
        <section className="py-12">
          <div className="container">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">Empresas de casamentos destacadas</h2>
                <p className="text-sm text-muted-foreground mt-1">Confira os melhores fornecedores da sua região</p>
              </div>
              <Button variant="ghost" className="text-primary" asChild>
                <Link to="/buscar">
                  Ver todos <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {featuredSuppliers.map((sup) => (
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
          </div>
        </section>
      )}

      {/* How it works */}
      <section className="py-16 bg-secondary">
        <div className="container">
          <h2 className="text-2xl font-bold text-center mb-3">Como funciona</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-md mx-auto text-sm">
            Em três passos simples, encontre tudo para o seu casamento perfeito
          </p>
          <div className="grid md:grid-cols-3 gap-8 max-w-3xl mx-auto">
            {[
              { num: "1", title: "Cadastre-se", desc: "Crie sua conta gratuita e conte-nos sobre o casamento dos sonhos." },
              { num: "2", title: "Busque fornecedores", desc: "Explore nossa rede de fornecedores verificados por categoria e localização." },
              { num: "3", title: "Planeje com amor", desc: "Favorite, compare e organize tudo em um só lugar." },
            ].map((step) => (
              <div key={step.num} className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4 text-lg font-bold">
                  {step.num}
                </div>
                <h3 className="font-bold text-lg mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA - Two types */}
      <section className="py-16">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <div className="bg-coral-light rounded-xl p-8 text-center">
              <Heart className="h-10 w-10 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Sou Casal</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Encontre os melhores fornecedores e planeje cada detalhe do seu grande dia.
              </p>
              <Button size="lg" className="w-full" asChild>
                <Link to="/cadastro?tipo=couple">Começar agora</Link>
              </Button>
            </div>
            <div className="bg-secondary rounded-xl p-8 text-center">
              <Building className="h-10 w-10 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Sou Fornecedor</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Cadastre sua empresa e alcance milhares de casais procurando seus serviços.
              </p>
              <Button size="lg" variant="outline" className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground" asChild>
                <Link to="/cadastro?tipo=supplier">Cadastrar empresa</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 bg-foreground text-background">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 fill-primary text-primary" />
              <span className="text-lg font-bold">Meu Grande Dia</span>
            </div>
            <nav className="flex gap-6 text-sm text-background/60">
              <Link to="/buscar" className="hover:text-background">Fornecedores</Link>
              <Link to="/cadastro?tipo=supplier" className="hover:text-background">Para empresas</Link>
            </nav>
            <p className="text-background/40 text-xs">
              © 2026 Meu Grande Dia. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
      {/* Subfooter */}
      <div className="py-3 bg-foreground border-t border-background/10 text-center">
        <div className="flex items-center justify-center gap-1.5 text-xs text-background/60">
          <span>Desenvolvido com carinho pela</span>
          <a href="https://ncoisas.digital/" target="_blank" rel="noopener noreferrer" className="font-semibold text-background/80 hover:text-background transition-colors">N Coisas Digitais</a>
          <Heart className="h-3.5 w-3.5 fill-background text-background" />
        </div>
      </div>
    </div>
  );
};

export default Index;
