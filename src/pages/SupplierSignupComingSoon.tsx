import { Link } from "react-router-dom";
import { Heart, Clock } from "lucide-react";
import SEO from "@/components/SEO";

export default function SupplierSignupComingSoon() {
  return (
    <div style={{ background: "#FAF7F2", color: "#2C2420" }} className="min-h-screen flex flex-col">
      <SEO title="Cadastro de fornecedor — Em breve" description="O cadastro de fornecedores está sendo finalizado." />
      <header className="border-b" style={{ borderColor: "rgba(44,36,32,0.08)" }}>
        <div className="container flex items-center justify-between h-14">
          <Link to="/" className="flex items-center gap-2">
            <Heart className="h-4 w-4" style={{ color: "#C4856A", fill: "#C4856A" }} />
            <span className="font-serif text-lg">Casamenteiro</span>
          </Link>
          <Link to="/fornecedor/login" className="text-sm font-medium hover:opacity-70">Já tenho cadastro</Link>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-6" style={{ background: "#FAF0E8", color: "#C4856A" }}>
            <Clock className="h-6 w-6" />
          </div>
          <h1 className="font-serif text-3xl mb-3">Cadastro chegando em breve</h1>
          <p className="text-sm opacity-70 mb-8">
            Estamos finalizando os últimos detalhes do cadastro de fornecedores. Em poucos dias você poderá criar seu perfil em minutos.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/fornecedor" className="rounded-full px-6 py-3 text-sm font-semibold" style={{ border: "1px solid #2C2420", color: "#2C2420" }}>
              Voltar
            </Link>
            <Link to="/fornecedor/login" className="rounded-full px-6 py-3 text-sm font-semibold" style={{ background: "#C4856A", color: "white" }}>
              Entrar
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}