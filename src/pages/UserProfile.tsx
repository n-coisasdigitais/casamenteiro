import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Heart, ArrowLeft, Save, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import UserMenu from "@/components/UserMenu";

export default function UserProfile() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [fullName, setFullName] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [coupleRole, setCoupleRole] = useState<string>("");
  const [weddingDate, setWeddingDate] = useState("");
  const [estimatedGuests, setEstimatedGuests] = useState("");
  const [estimatedBudget, setEstimatedBudget] = useState("");
  const [coupleId, setCoupleId] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [saving, setSaving] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login"); return; }

    if (profile) {
      setFullName(profile.full_name || "");
    }

    supabase.from("couples").select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data) {
        setCoupleId(data.id);
        setPartnerName(data.partner_name || "");
        setCoupleRole(data.couple_role || "");
        setWeddingDate(data.wedding_date || "");
        setEstimatedGuests(data.estimated_guests?.toString() || "");
        setEstimatedBudget(data.estimated_budget?.toString() || "");
      }
    });
  }, [user, profile, authLoading, navigate]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);

    const profileUpdate = supabase
      .from("profiles")
      .update({ full_name: fullName })
      .eq("user_id", user.id);

    const coupleUpdate = coupleId
      ? supabase
          .from("couples")
          .update({
            partner_name: partnerName || null,
            couple_role: (coupleRole as "noivo" | "noiva") || null,
            wedding_date: weddingDate || null,
            estimated_guests: estimatedGuests ? parseInt(estimatedGuests) : null,
            estimated_budget: estimatedBudget ? parseFloat(estimatedBudget) : null,
          })
          .eq("id", coupleId)
      : Promise.resolve({ error: null });

    const [profileRes, coupleRes] = await Promise.all([profileUpdate, coupleUpdate]);

    if (profileRes.error || coupleRes.error) {
      toast({ title: "Erro ao salvar", description: "Tente novamente.", variant: "destructive" });
    } else {
      toast({ title: "Perfil atualizado!" });
    }
    setSaving(false);
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast({ title: "Senha muito curta", description: "Mínimo de 6 caracteres.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Senhas não coincidem", variant: "destructive" });
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast({ title: "Erro ao alterar senha", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Senha alterada com sucesso!" });
      setNewPassword("");
      setConfirmPassword("");
    }
    setSavingPassword(false);
  };

  const initials = fullName
    ? fullName.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("")
    : "U";

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><p>Carregando...</p></div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="container flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/dashboard"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <Link to="/" className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-primary fill-primary" />
              <span className="text-lg font-bold">Meu Grande Dia</span>
            </Link>
          </div>
          <UserMenu />
        </div>
      </header>

      <main className="container px-4 py-8 max-w-2xl">
        {/* Avatar + name header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="h-16 w-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
            {initials}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{fullName || "Meu Perfil"}</h1>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        {/* Personal data */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Dados pessoais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="fullName">Nome completo</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="partnerName">Nome do(a) parceiro(a)</Label>
              <Input id="partnerName" value={partnerName} onChange={(e) => setPartnerName(e.target.value)} />
            </div>
            <div>
              <Label>Eu sou</Label>
              <Select value={coupleRole} onValueChange={setCoupleRole}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="noivo">Noivo</SelectItem>
                  <SelectItem value="noiva">Noiva</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Wedding data */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Dados do casamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="weddingDate">Data do casamento</Label>
              <Input id="weddingDate" type="date" value={weddingDate} onChange={(e) => setWeddingDate(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="guests">Número de convidados</Label>
              <Input id="guests" type="number" value={estimatedGuests} onChange={(e) => setEstimatedGuests(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="budget">Orçamento estimado (R$)</Label>
              <Input id="budget" type="number" value={estimatedBudget} onChange={(e) => setEstimatedBudget(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleSaveProfile} disabled={saving} className="w-full mb-8">
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Salvando..." : "Salvar alterações"}
        </Button>

        {/* Change password */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Alterar senha
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="newPassword">Nova senha</Label>
              <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
              <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </div>
            <Button onClick={handleChangePassword} disabled={savingPassword} variant="outline" className="w-full">
              {savingPassword ? "Alterando..." : "Alterar senha"}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
