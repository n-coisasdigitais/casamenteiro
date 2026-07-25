import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Heart, Users, Calendar, Star } from "lucide-react";
import SEO from "@/components/SEO";
import PaymentDisclaimer from "@/components/staff/PaymentDisclaimer";

export default function StaffLanding() {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Profissionais de eventos — Casamenteiro"
        description="Cadastre-se como profissional de eventos e receba convites de fornecedores parceiros."
      />
      <header className="border-b bg-white">
        <div className="container mx-auto flex items-center justify-between py-4 px-4">
          <Link to="/" className="flex items-center gap-2">
            <Heart className="h-6 w-6 text-primary fill-primary" />
            <span className="text-xl font-bold">Casamenteiro</span>
          </Link>
          <div className="flex gap-2">
            <Link to="/profissional/login"><Button variant="ghost">Entrar</Button></Link>
            <Link to="/profissional/cadastro"><Button>Cadastrar</Button></Link>
          </div>
        </div>
      </header>

      <section className="container mx-auto px-4 py-16 text-center max-w-3xl">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Sua próxima vaga em casamentos e eventos
        </h1>
        <p className="text-lg text-muted-foreground mb-8">
          Cadastre-se, defina suas funções e valores, e receba convites de fornecedores
          parceiros próximos. Sem taxa de plataforma.
        </p>
        <Link to="/profissional/cadastro">
          <Button size="lg">Criar meu perfil grátis</Button>
        </Link>

        <div className="grid md:grid-cols-3 gap-6 mt-16 text-left">
          {[
            { icon: Users, title: "Convites diretos", desc: "Fornecedores te encontram por função, cidade e valor." },
            { icon: Calendar, title: "Agenda organizada", desc: "Bloqueia data automaticamente ao aceitar uma vaga." },
            { icon: Star, title: "Avaliação mútua", desc: "Construa reputação a cada evento concluído." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-lg border p-5 bg-white">
              <Icon className="h-6 w-6 text-primary mb-3" />
              <h3 className="font-semibold mb-1">{title}</h3>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-10">
          <PaymentDisclaimer />
        </div>
      </section>
    </div>
  );
}