import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import SEO from "@/components/SEO";
import { FUNCOES_STAFF, slugify } from "@/lib/staff";
import { formatPhoneBR, isValidPhoneBR } from "@/lib/phone";
import StaffPhotoUpload from "@/components/staff/StaffPhotoUpload";
import { traduzirErro } from "@/lib/errorMessages";

export default function StaffOnboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [telefone, setTelefone] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [raio, setRaio] = useState(30);
  const [valorMin, setValorMin] = useState<number | "">("");
  const [bio, setBio] = useState("");
  const [funcoes, setFuncoes] = useState<string[]>([]);
  const [consent, setConsent] = useState(false);
  const [pub, setPub] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await (supabase.from("staff_profiles" as any) as any)
        .select("*").eq("user_id", user.id).maybeSingle();
      if (data) {
        setProfileId(data.id);
        setNome(data.nome || "");
        setFotoUrl(data.foto_url || null);
        setTelefone(data.telefone || "");
        setCidade(data.cidade || "");
        setEstado(data.estado || "");
        setRaio(data.raio_km ?? 30);
        setValorMin(data.valor_min_turno ?? "");
        setBio(data.bio || "");
        setFuncoes(data.funcoes || []);
        setConsent(!!data.consentimento_lgpd);
        setPub(!!data.is_public);
      }
    })();
  }, [user]);

  const toggleFuncao = (f: string) =>
    setFuncoes((prev) => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);

  const salvar = async () => {
    if (!user) return;
    if (!nome.trim()) return toast({ title: "Informe seu nome", variant: "destructive" });
    if (!isValidPhoneBR(telefone)) return toast({ title: "Telefone inválido", variant: "destructive" });
    if (!cidade.trim()) return toast({ title: "Informe sua cidade", variant: "destructive" });
    if (funcoes.length === 0) return toast({ title: "Selecione ao menos uma função", variant: "destructive" });
    if (!consent) return toast({ title: "Aceite os termos LGPD para continuar", variant: "destructive" });

    setLoading(true);
    const payload = {
      user_id: user.id,
      criado_por: user.id,
      nome: nome.trim(),
      foto_url: fotoUrl,
      slug: slugify(nome) + "-" + user.id.slice(0, 6),
      telefone,
      cidade: cidade.trim(),
      estado: estado.trim() || null,
      raio_km: Number(raio) || 30,
      valor_min_turno: valorMin === "" ? null : Number(valorMin),
      bio: bio.trim() || null,
      funcoes,
      consentimento_lgpd: consent,
      is_public: pub,
    };
    let error;
    if (profileId) {
      ({ error } = await (supabase.from("staff_profiles" as any) as any).update(payload).eq("id", profileId));
    } else {
      ({ error } = await (supabase.from("staff_profiles" as any) as any).insert(payload));
    }
    setLoading(false);
    if (error) return toast({ title: "Erro ao salvar", description: traduzirErro(error), variant: "destructive" });
    toast({ title: "Perfil salvo!" });
    navigate("/profissional/painel");
  };

  return (
    <div className="min-h-screen bg-muted/30 py-10">
      <SEO title="Meu perfil profissional — Casamenteiro" noIndex />
      <div className="container mx-auto max-w-2xl px-4">
        <Card>
          <CardHeader><CardTitle>Complete seu perfil profissional</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <StaffPhotoUpload fotoUrl={fotoUrl} nome={nome} onUploaded={setFotoUrl} />
            <div><Label>Nome completo</Label><Input value={nome} onChange={e => setNome(e.target.value)} /></div>
            <div><Label>Telefone / WhatsApp</Label>
              <Input value={telefone} onChange={e => setTelefone(formatPhoneBR(e.target.value))} placeholder="(11) 99999-9999" />
              <p className="text-xs text-muted-foreground mt-1">Fica oculto até você aceitar uma vaga.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Cidade</Label><Input value={cidade} onChange={e => setCidade(e.target.value)} /></div>
              <div><Label>Estado (UF)</Label><Input value={estado} onChange={e => setEstado(e.target.value.slice(0, 2).toUpperCase())} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Raio de atendimento (km)</Label><Input type="number" value={raio} onChange={e => setRaio(Number(e.target.value))} /></div>
              <div><Label>Valor mínimo por turno (R$)</Label><Input type="number" value={valorMin} onChange={e => setValorMin(e.target.value === "" ? "" : Number(e.target.value))} /></div>
            </div>
            <div>
              <Label>Funções que você desempenha</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {FUNCOES_STAFF.map(f => (
                  <Badge
                    key={f}
                    variant={funcoes.includes(f) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleFuncao(f)}
                  >{f}</Badge>
                ))}
              </div>
            </div>
            <div><Label>Bio</Label><Textarea rows={3} value={bio} onChange={e => setBio(e.target.value)} placeholder="Conte um pouco da sua experiência" /></div>
            <label className="flex gap-2 items-start text-sm cursor-pointer">
              <Checkbox checked={pub} onCheckedChange={v => setPub(v === true)} className="mt-0.5" />
              <span>Manter meu perfil visível no marketplace público</span>
            </label>
            <label className="flex gap-2 items-start text-sm cursor-pointer">
              <Checkbox checked={consent} onCheckedChange={v => setConsent(v === true)} className="mt-0.5" />
              <span>Autorizo o tratamento dos meus dados conforme a LGPD e a exibição pública do perfil.</span>
            </label>
            <Button onClick={salvar} disabled={loading} className="w-full">
              {loading ? "Salvando..." : "Salvar e continuar"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}