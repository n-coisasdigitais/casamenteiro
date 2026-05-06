import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Heart, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { criarPlano, type SimuladorResultado as SimRes } from "@/lib/simulador";

type Category = { id: string; name: string; slug: string };

export default function CoupleOnboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [simulacao, setSimulacao] = useState<any>(null);

  const [coupleRole, setCoupleRole] = useState<"noivo" | "noiva">("noivo");
  const [partnerName, setPartnerName] = useState("");
  const [weddingDate, setWeddingDate] = useState("");
  const [estimatedGuests, setEstimatedGuests] = useState("");
  const [estimatedBudget, setEstimatedBudget] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  useEffect(() => {
    document.title = "Bem-vindos ao Casamenteiro";
    supabase.from("categories").select("*").then(({ data }) => {
      if (data) setCategories(data);
    });
  }, []);

  // Carrega simulação mais recente (para pular passos redundantes)
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await (supabase
        .from("home_simulacoes" as any)
        .select("*")
        .eq("user_id", user.id)
        .order("criado_em", { ascending: false })
        .limit(1)
        .maybeSingle() as any);
      if (data) {
        setSimulacao(data);
        if (data.num_convidados) setEstimatedGuests(String(data.num_convidados));
        if (data.orcamento_total) setEstimatedBudget(String(data.orcamento_total));
        if (data.data_evento) setWeddingDate(data.data_evento);
      }
      setBootstrapping(false);
    })();
  }, [user]);

  const toggleService = (id: string) => {
    setSelectedServices((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const temSimulacao = !!simulacao;

  const handleSubmit = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("couples")
        .update({
          couple_role: coupleRole,
          partner_name: partnerName,
          wedding_date: weddingDate || null,
          estimated_guests: estimatedGuests ? parseInt(estimatedGuests) : null,
          estimated_budget: estimatedBudget ? parseFloat(estimatedBudget) : null,
          needed_services: selectedServices,
          onboarding_completed: true,
        })
        .eq("user_id", user.id);
      if (error) throw error;

      // Se há simulação salva, monta o plano automaticamente e leva para ele
      if (simulacao && simulacao.resultado && weddingDate) {
        try {
          const nomePlano = partnerName
            ? `Casamento de ${partnerName}`
            : `Casamento em ${simulacao.cidade || "minha cidade"}`;
          await criarPlano(simulacao.id, simulacao.resultado as SimRes, nomePlano, weddingDate);
          toast({ title: "Tudo pronto!", description: "Seu plano foi montado com base na sua simulação." });
          navigate("/meu-casamento/plano");
          return;
        } catch (e: any) {
          toast({ title: "Plano não foi criado", description: e.message, variant: "destructive" });
        }
      }

      toast({ title: "Tudo pronto!", description: "Vamos encontrar os melhores fornecedores para você." });
      navigate("/dashboard");
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const allSteps = [
    // Step 0: Role
    <div key="role" className="space-y-4">
      <h3 className="font-serif text-xl font-semibold">Eu sou...</h3>
      <RadioGroup value={coupleRole} onValueChange={(v) => setCoupleRole(v as "noivo" | "noiva")}>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="noivo" id="noivo" />
          <Label htmlFor="noivo">Noivo</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="noiva" id="noiva" />
          <Label htmlFor="noiva">Noiva</Label>
        </div>
      </RadioGroup>
    </div>,
    // Step 1: Partner
    <div key="partner" className="space-y-4">
      <h3 className="font-serif text-xl font-semibold">Nome do meu amor</h3>
      <Input placeholder="Nome do(a) parceiro(a)" value={partnerName} onChange={(e) => setPartnerName(e.target.value)} />
    </div>,
    // Step 2: Date & Guests (omitido se a simulação já cobriu)
    <div key="details" className="space-y-4">
      <h3 className="font-serif text-xl font-semibold">Detalhes do casamento</h3>
      {!weddingDate && (
        <div>
          <Label>Data prevista</Label>
          <Input type="date" value={weddingDate} onChange={(e) => setWeddingDate(e.target.value)} />
        </div>
      )}
      {!estimatedGuests && (
        <div>
          <Label>Número estimado de convidados</Label>
          <Input type="number" placeholder="150" value={estimatedGuests} onChange={(e) => setEstimatedGuests(e.target.value)} />
        </div>
      )}
      {!estimatedBudget && (
        <div>
          <Label>Orçamento total estimado (R$)</Label>
          <Input type="number" placeholder="50000" value={estimatedBudget} onChange={(e) => setEstimatedBudget(e.target.value)} />
        </div>
      )}
      {weddingDate && estimatedGuests && estimatedBudget && (
        <p className="text-sm text-muted-foreground">
          Pegamos da sua simulação: <strong>{estimatedGuests}</strong> convidados,{" "}
          orçamento de <strong>R$ {Number(estimatedBudget).toLocaleString("pt-BR")}</strong>
          {weddingDate && <> para <strong>{new Date(weddingDate).toLocaleDateString("pt-BR")}</strong></>}.
          Você pode ajustar tudo depois.
        </p>
      )}
    </div>,
    // Step 3: Services — só mostra se NÃO houver simulação (a simulação já gera o plano)
    <div key="services" className="space-y-4">
      <h3 className="font-serif text-xl font-semibold">Quais serviços você precisa?</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {categories.map((cat) => (
          <div key={cat.id} className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:bg-accent transition-colors">
            <Checkbox
              id={cat.id}
              checked={selectedServices.includes(cat.id)}
              onCheckedChange={() => toggleService(cat.id)}
            />
            <Label htmlFor={cat.id} className="cursor-pointer flex-1">{cat.name}</Label>
          </div>
        ))}
      </div>
    </div>,
  ];

  const steps = useMemo(() => {
    // Se temos simulação completa, pulamos o step 3 (serviços) e o step 2 só aparece se faltar algo
    if (!temSimulacao) return allSteps;
    const out = [allSteps[0], allSteps[1]];
    const faltaAlgo = !weddingDate || !estimatedGuests || !estimatedBudget;
    if (faltaAlgo) out.push(allSteps[2]);
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [temSimulacao, weddingDate, estimatedGuests, estimatedBudget, categories, partnerName, coupleRole, selectedServices]);

  if (bootstrapping) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-beige">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // mantém o step dentro do range quando os passos mudam
  const safeStep = Math.min(step, steps.length - 1);

  return (
    <div className="min-h-screen flex items-center justify-center bg-beige px-4 py-8">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <Heart className="h-8 w-8 text-primary fill-primary mx-auto mb-2" />
          <CardTitle className="font-serif text-2xl">
            {temSimulacao ? "Vamos finalizar seu plano" : "Conte-nos sobre seu casamento"}
          </CardTitle>
          {temSimulacao && (
            <p className="text-xs text-muted-foreground mt-1">
              Já temos sua simulação. Só faltam alguns detalhes.
            </p>
          )}
          <p className="text-sm text-muted-foreground">Passo {safeStep + 1} de {steps.length}</p>
          <div className="flex gap-1 mt-3">
            {steps.map((_, i) => (
              <div key={i} className={`h-1 flex-1 rounded-full ${i <= safeStep ? "bg-primary" : "bg-border"}`} />
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {steps[safeStep]}
          <div className="flex justify-between mt-8">
            <Button variant="ghost" onClick={() => setStep(safeStep - 1)} disabled={safeStep === 0}>
              Voltar
            </Button>
            {safeStep < steps.length - 1 ? (
              <Button onClick={() => setStep(safeStep + 1)}>Próximo</Button>
            ) : (
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? "Salvando..." : "Finalizar"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
