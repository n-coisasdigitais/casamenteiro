import { forwardRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const CIDADES_MG = [
  "Belo Horizonte","Uberlândia","Contagem","Juiz de Fora","Betim","Montes Claros","Ribeirão das Neves","Uberaba","Governador Valadares","Ipatinga","Sete Lagoas","Divinópolis","Santa Luzia","Ibirité","Poços de Caldas","Patos de Minas","Pouso Alegre","Teófilo Otoni","Barbacena","Sabará","Varginha","Conselheiro Lafaiete","Vespasiano","Itabira","Araguari","Ubá","Passos","Coronel Fabriciano","Muriaé","Lavras"
];

const SimulatorCTA = forwardRef<HTMLElement>((_, ref) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [orcamento, setOrcamento] = useState(80000);
  const [convidados, setConvidados] = useState(120);
  const [cidade, setCidade] = useState("");
  const [estilo, setEstilo] = useState("Médio e elegante");
  const [loading, setLoading] = useState(false);

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const payload = { orcamento_total: orcamento, num_convidados: convidados, cidade, estilo };
    try {
      if (!user) {
        localStorage.setItem("pending_simulacao", JSON.stringify(payload));
        toast({ title: "Seu simulador foi salvo!", description: "Crie sua conta gratuita pra ver o resultado completo." });
        navigate("/cadastro?redirect=simulador");
        return;
      }
      const { data, error } = await (supabase.from("home_simulacoes" as any) as any)
        .insert({ ...payload, user_id: user.id })
        .select("id")
        .maybeSingle();
      if (error) throw error;
      navigate(`/simulador/resultado?id=${data?.id}`);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  return (
    <section
      ref={ref}
      className="relative min-h-[80vh] flex items-center py-20 text-white"
      style={{
        backgroundImage: "linear-gradient(rgba(10,10,10,0.7), rgba(10,10,10,0.8)), url(https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=1920&q=70)",
        backgroundSize: "cover", backgroundPosition: "center",
      }}
    >
      <div className="container max-w-3xl">
        <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl leading-[1.1] mb-4">
          Quanto você quer investir no seu casamento?
        </h2>
        <p className="text-white/70 text-base md:text-lg mb-10">
          Responde 4 perguntas. A gente monta o plano pra você.
        </p>
        <form onSubmit={submit} className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-6 md:p-8 grid md:grid-cols-2 gap-5">
          <div className="md:col-span-2">
            <label className="block text-sm text-white/80 mb-2">Quanto tenho pra investir</label>
            <div className="flex items-center justify-between mb-2">
              <span className="font-serif text-2xl text-rose-gold">{fmt(orcamento)}</span>
            </div>
            <input type="range" min={10000} max={500000} step={5000} value={orcamento}
              onChange={(e) => setOrcamento(+e.target.value)}
              className="w-full accent-[hsl(var(--rose-gold))]" />
          </div>
          <div>
            <label className="block text-sm text-white/80 mb-2">Quantos convidados</label>
            <input type="number" min={10} value={convidados} onChange={(e) => setConvidados(+e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-md px-3 py-2.5 text-white placeholder-white/40 focus:outline-none focus:border-rose-gold" />
          </div>
          <div>
            <label className="block text-sm text-white/80 mb-2">Onde será</label>
            <input list="cidades-mg" value={cidade} onChange={(e) => setCidade(e.target.value)}
              placeholder="Cidade em MG"
              className="w-full bg-white/10 border border-white/20 rounded-md px-3 py-2.5 text-white placeholder-white/40 focus:outline-none focus:border-rose-gold" />
            <datalist id="cidades-mg">{CIDADES_MG.map(c => <option key={c} value={c} />)}</datalist>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm text-white/80 mb-2">Estilo</label>
            <select value={estilo} onChange={(e) => setEstilo(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-md px-3 py-2.5 text-white focus:outline-none focus:border-rose-gold">
              <option className="text-ink">Simples e emocionante</option>
              <option className="text-ink">Médio e elegante</option>
              <option className="text-ink">Grande e memorável</option>
            </select>
          </div>
          <button type="submit" disabled={loading}
            className="md:col-span-2 bg-rose-gold text-white font-medium py-3.5 rounded-md hover:opacity-90 transition disabled:opacity-50">
            {loading ? "Simulando..." : "Simular meu casamento →"}
          </button>
        </form>
      </div>
    </section>
  );
});
SimulatorCTA.displayName = "SimulatorCTA";
export default SimulatorCTA;