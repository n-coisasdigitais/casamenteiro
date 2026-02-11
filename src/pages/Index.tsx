import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Heart, Search, CheckCircle, Camera, Music, Utensils, Building } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <Heart className="h-6 w-6 text-primary fill-primary" />
            <span className="font-serif text-xl font-semibold text-foreground">Meu Grande Dia</span>
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link to="/login">Entrar</Link>
            </Button>
            <Button asChild>
              <Link to="/cadastro">Cadastrar</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-16">
        <div className="h-[85vh] flex items-center justify-center bg-gradient-to-b from-beige to-background">
          <div className="container text-center px-4">
            <h1 className="font-serif text-4xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 animate-fade-in">
              O casamento dos seus sonhos começa aqui
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-in" style={{ animationDelay: "0.2s" }}>
              Encontre os melhores fornecedores, organize cada detalhe e viva o dia mais especial da sua vida.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in" style={{ animationDelay: "0.4s" }}>
              <Button size="lg" className="text-lg px-8 py-6" asChild>
                <Link to="/cadastro?tipo=couple">
                  <Heart className="mr-2 h-5 w-5" />
                  Sou Casal
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8 py-6 border-primary text-primary hover:bg-primary hover:text-primary-foreground" asChild>
                <Link to="/cadastro?tipo=supplier">
                  <Building className="mr-2 h-5 w-5" />
                  Sou Fornecedor
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-card">
        <div className="container px-4">
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-center text-foreground mb-4">
            Como funciona
          </h2>
          <p className="text-center text-muted-foreground mb-16 max-w-lg mx-auto">
            Em três passos simples, encontre tudo para o seu casamento perfeito
          </p>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { icon: CheckCircle, title: "Cadastre-se", desc: "Crie sua conta gratuita e conte-nos sobre o seu casamento dos sonhos." },
              { icon: Search, title: "Busque fornecedores", desc: "Explore nossa rede de fornecedores verificados por categoria e localização." },
              { icon: Heart, title: "Planeje com amor", desc: "Favorite seus preferidos, compare e organize tudo em um só lugar." },
            ].map((step, i) => (
              <div key={i} className="text-center p-8 rounded-xl bg-background border border-border hover:shadow-lg transition-shadow">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                  <step.icon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-serif text-xl font-semibold mb-3">{step.title}</h3>
                <p className="text-muted-foreground">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories preview */}
      <section className="py-20">
        <div className="container px-4">
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-center text-foreground mb-4">
            Categorias de serviços
          </h2>
          <p className="text-center text-muted-foreground mb-12">
            Tudo o que você precisa para o dia perfeito
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {[
              { icon: Building, name: "Espaços" },
              { icon: Camera, name: "Fotografia" },
              { icon: Utensils, name: "Buffet" },
              { icon: Music, name: "Música e DJ" },
            ].map((cat, i) => (
              <div key={i} className="flex flex-col items-center gap-3 p-6 rounded-xl bg-beige hover:bg-beige-dark transition-colors cursor-pointer">
                <cat.icon className="h-8 w-8 text-primary" />
                <span className="font-medium text-foreground">{cat.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-foreground text-background">
        <div className="container px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Heart className="h-5 w-5 fill-primary text-primary" />
            <span className="font-serif text-lg">Meu Grande Dia</span>
          </div>
          <p className="text-background/60 text-sm">
            © 2026 Meu Grande Dia. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
