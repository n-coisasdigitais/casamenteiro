import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Category = { id: string; name: string; slug: string };

export default function CoupleOnboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  const [coupleRole, setCoupleRole] = useState<"noivo" | "noiva">("noivo");
  const [partnerName, setPartnerName] = useState("");
  const [weddingDate, setWeddingDate] = useState("");
  const [estimatedGuests, setEstimatedGuests] = useState("");
  const [estimatedBudget, setEstimatedBudget] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  useEffect(() => {
    supabase.from("categories").select("*").then(({ data }) => {
      if (data) setCategories(data);
    });
  }, []);

  const toggleService = (id: string) => {
    setSelectedServices((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

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
      toast({ title: "Onboarding completo!", description: "Vamos encontrar os melhores fornecedores para você." });
      navigate("/dashboard");
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const steps = [
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
    // Step 2: Date & Guests
    <div key="details" className="space-y-4">
      <h3 className="font-serif text-xl font-semibold">Detalhes do casamento</h3>
      <div>
        <Label>Data prevista</Label>
        <Input type="date" value={weddingDate} onChange={(e) => setWeddingDate(e.target.value)} />
      </div>
      <div>
        <Label>Número estimado de convidados</Label>
        <Input type="number" placeholder="150" value={estimatedGuests} onChange={(e) => setEstimatedGuests(e.target.value)} />
      </div>
      <div>
        <Label>Orçamento total estimado (R$)</Label>
        <Input type="number" placeholder="50000" value={estimatedBudget} onChange={(e) => setEstimatedBudget(e.target.value)} />
      </div>
    </div>,
    // Step 3: Services
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-beige px-4 py-8">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <Heart className="h-8 w-8 text-primary fill-primary mx-auto mb-2" />
          <CardTitle className="font-serif text-2xl">Conte-nos sobre seu casamento</CardTitle>
          <p className="text-sm text-muted-foreground">Passo {step + 1} de {steps.length}</p>
          <div className="flex gap-1 mt-3">
            {steps.map((_, i) => (
              <div key={i} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-border"}`} />
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {steps[step]}
          <div className="flex justify-between mt-8">
            <Button variant="ghost" onClick={() => setStep(step - 1)} disabled={step === 0}>
              Voltar
            </Button>
            {step < steps.length - 1 ? (
              <Button onClick={() => setStep(step + 1)}>Próximo</Button>
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
