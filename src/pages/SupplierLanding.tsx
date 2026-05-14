import { Link } from "react-router-dom";
import { Heart, Target, ClipboardCheck, MessageCircle } from "lucide-react";
import SEO from "@/components/SEO";
import WhyTimeline from "@/components/supplier/WhyTimeline";

const STEPS = [
  { icon: Target, title: "Você se cadastra", text: "Preenche as informações do seu serviço em poucos minutos." },
  { icon: ClipboardCheck, title: "A gente aprova", text: "Nossa equipe revisa e publica seu perfil na plataforma." },
  { icon: MessageCircle, title: "Os casais te encontram", text: "Receba contatos de casais com orçamento definido e data marcada." },
];

export default function SupplierLanding() {
  return (
    <div style={{ background: "#FAF7F2", color: "#2C2420" }} className="min-h-screen">
      <SEO
        title="Casamenteiro — Para fornecedores de casamento"
        description="Conecte seu serviço a casais com orçamento definido e data marcada. Cadastro gratuito, leads qualificados e visibilidade real."
      />

      {/* Navbar */}
      <header className="fixed top-0 inset-x-0 z-40 backdrop-blur-md" style={{ background: "rgba(250,247,242,0.9)", borderBottom: "1px solid rgba(44,36,32,0.08)" }}>
        <div className="container flex items-center justify-between h-14">
          <Link to="/" className="flex items-center gap-2">
            <Heart className="h-4 w-4" style={{ color: "#C4856A", fill: "#C4856A" }} />
            <span className="font-serif text-lg">Casamenteiro</span>
          </Link>
          <Link
            to="/fornecedor/login"
            className="text-sm font-medium hover:opacity-70 transition"
            style={{ color: "#2C2420" }}
          >
            Já tenho cadastro
          </Link>
        </div>
      </header>

      <main className="pt-14">
        {/* HERO */}
        <section
          className="relative flex items-center justify-center px-4"
          style={{ minHeight: "85vh", background: "#2C2420" }}
        >
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1920&q=80')",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(44,36,32,0.7), rgba(44,36,32,0.95))" }} />
          <div className="relative z-10 max-w-3xl mx-auto text-center text-white animate-fade-in">
            <h1 className="font-serif text-4xl md:text-6xl leading-tight mb-6">
              Leve seu negócio para quem quer casar.
            </h1>
            <p className="text-base md:text-lg font-light mb-10 opacity-80 max-w-xl mx-auto">
              Conecte seu serviço a casais que já sabem o que querem e estão prontos para contratar.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/fornecedor/cadastro"
                className="rounded-full px-8 py-3 font-semibold text-sm transition hover:opacity-90"
                style={{ background: "#C4856A", color: "white" }}
              >
                Quero me cadastrar →
              </Link>
              <Link
                to="/fornecedor/login"
                className="rounded-full px-8 py-3 font-semibold text-sm transition hover:bg-white hover:text-[#2C2420]"
                style={{ border: "1px solid rgba(255,255,255,0.6)", color: "white" }}
              >
                Já tenho cadastro
              </Link>
            </div>
          </div>
        </section>

        {/* COMO FUNCIONA */}
        <section className="py-20 px-4">
          <div className="container max-w-5xl">
            <h2 className="font-serif text-3xl md:text-4xl text-center mb-14">Como funciona</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {STEPS.map((step, i) => (
                <div
                  key={i}
                  className="p-8 text-center transition hover:shadow-lg"
                  style={{ background: "white", borderRadius: 14, border: "1px solid rgba(44,36,32,0.06)" }}
                >
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-5" style={{ background: "#FAF0E8", color: "#C4856A" }}>
                    <step.icon className="h-5 w-5" />
                  </div>
                  <div className="text-xs uppercase tracking-wider mb-2 opacity-50">Passo {i + 1}</div>
                  <h3 className="font-serif text-xl mb-3">{step.title}</h3>
                  <p className="text-sm opacity-70 leading-relaxed">{step.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* BENEFÍCIOS — timeline animada */}
        <WhyTimeline />

        {/* DEPOIMENTO */}
        <section className="py-24 px-4" style={{ background: "#F0E8DF" }}>
          <div className="container max-w-3xl text-center">
            <p className="font-serif italic text-2xl md:text-3xl leading-snug mb-6" style={{ color: "#2C2420" }}>
              "Recebi 3 contatos na primeira semana. Um já fechou."
            </p>
            <p className="text-sm opacity-60">— Banda Ritmo & Amor, Belo Horizonte</p>
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="py-24 px-4 text-center">
          <div className="container max-w-2xl">
            <h2 className="font-serif text-3xl md:text-5xl mb-4">Pronto para aparecer?</h2>
            <p className="text-base opacity-70 mb-10">Cadastro gratuito. Aprovação em até 48 horas.</p>
            <Link
              to="/fornecedor/cadastro"
              className="inline-block rounded-full px-10 py-4 font-semibold text-sm transition hover:opacity-90"
              style={{ background: "#C4856A", color: "white" }}
            >
              Começar cadastro →
            </Link>
          </div>
        </section>
      </main>

      {/* Rodapé */}
      <footer className="py-8 px-4 border-t" style={{ borderColor: "rgba(44,36,32,0.08)" }}>
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-3 text-xs opacity-60">
          <div className="flex items-center gap-2">
            <Heart className="h-3.5 w-3.5" style={{ color: "#C4856A", fill: "#C4856A" }} />
            <span>© {new Date().getFullYear()} Casamenteiro</span>
          </div>
          <Link to="/privacidade" className="hover:opacity-100">Política de privacidade</Link>
        </div>
      </footer>
    </div>
  );
}