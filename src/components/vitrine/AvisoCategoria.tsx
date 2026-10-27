import { useState } from "react";
import { Bell, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { traduzirErro } from "@/lib/errorMessages";
import { pedirAviso, type CategoriaVitrine } from "@/lib/vitrine";

/**
 * "Me avise quando chegar": guarda o pedido em avisos_categoria.
 * Quando um fornecedor da categoria é aprovado, a pessoa recebe notificação (se tiver conta) e e-mail.
 */
export default function AvisoCategoria({
  categorias,
  categoriaFixa,
  compacto = false,
}: {
  categorias?: CategoriaVitrine[];
  categoriaFixa?: CategoriaVitrine;
  compacto?: boolean;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [cat, setCat] = useState(categoriaFixa?.id || categorias?.[0]?.id || "");
  const [email, setEmail] = useState("");
  const [cidade, setCidade] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [feito, setFeito] = useState(false);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cat) return;
    if (!user && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast({ title: "Informe um e-mail válido", variant: "destructive" });
      return;
    }
    setEnviando(true);
    const { error } = await pedirAviso({ categoryId: cat, userId: user?.id, email: user ? user.email : email, cidade });
    setEnviando(false);
    if (error) {
      toast({ title: "Não foi possível registrar", description: traduzirErro(error), variant: "destructive" });
      return;
    }
    setFeito(true);
  };

  if (feito)
    return (
      <p className="inline-flex items-center gap-2 font-bold text-[var(--vt-ok)]">
        <Check className="h-[18px] w-[18px]" /> Pronto! Avisamos por {user ? "notificação e e-mail" : "e-mail"} assim que chegar.
      </p>
    );

  return (
    <form onSubmit={enviar} className={`flex flex-wrap gap-2 ${compacto ? "" : "max-w-[560px]"}`}>
      {!categoriaFixa && categorias && (
        <select className="vt-campo flex-1 basis-[180px]" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Categoria">
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      )}
      {!user && (
        <input
          className="vt-campo flex-1 basis-[200px]"
          type="email"
          required
          placeholder="Seu e-mail"
          aria-label="Seu e-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      )}
      <input
        className="vt-campo flex-1 basis-[160px]"
        placeholder="Cidade do casamento"
        aria-label="Cidade do casamento"
        maxLength={120}
        value={cidade}
        onChange={(e) => setCidade(e.target.value)}
      />
      <button type="submit" className="vt-pill pri h-[46px]" disabled={enviando}>
        <Bell className="h-4 w-4" />
        {enviando ? "Enviando..." : "Me avise"}
      </button>
    </form>
  );
}