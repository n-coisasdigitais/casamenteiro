import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import DashboardHeader from "@/components/DashboardHeader";
import DashboardNav from "@/components/DashboardNav";
import AvatarUpload from "@/components/AvatarUpload";
import { Textarea } from "@/components/ui/textarea";

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
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Campos do convite
  const [inviteMessage, setInviteMessage] = useState("");
  const [invitePhotoUrl, setInvitePhotoUrl] = useState("");
  const [ceremonyTime, setCeremonyTime] = useState("");
  const [ceremonyAddress, setCeremonyAddress] = useState("");
  const [receptionAddress, setReceptionAddress] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [dressCode, setDressCode] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [saving, setSaving] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login"); return; }

    if (profile) {
      setFullName(profile.full_name || "");
      setAvatarUrl(profile.avatar_url || null);
    }

    supabase.from("couples").select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data) {
        setCoupleId(data.id);
        setPartnerName(data.partner_name || "");
        setCoupleRole(data.couple_role || "");
        setWeddingDate(data.wedding_date || "");
        setEstimatedGuests(data.estimated_guests?.toString() || "");
        setEstimatedBudget(data.estimated_budget?.toString() || "");
        setInviteMessage((data as any).invite_message || "");
        setInvitePhotoUrl((data as any).invite_photo_url || "");
        setCeremonyTime((data as any).ceremony_time || "");
        setCeremonyAddress((data as any).ceremony_address || "");
        setReceptionAddress((data as any).reception_address || "");
        setContactPhone((data as any).contact_phone || "");
        setDressCode((data as any).dress_code || "");
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
            invite_message: inviteMessage || null,
            invite_photo_url: invitePhotoUrl || null,
            ceremony_time: ceremonyTime || null,
            ceremony_address: ceremonyAddress || null,
            reception_address: receptionAddress || null,
            contact_phone: contactPhone || null,
            dress_code: dressCode || null,
          })
          .eq("id", coupleId)
      : Promise.resolve({ error: null });

    const [profileRes, coupleRes] = await Promise.all([profileUpdate, coupleUpdate]);

    if (profileRes.error || coupleRes.error) {
      toast({ title: "Erro ao salvar", description: "Tente novamente.", variant: "destructive" });
    } else {
      toast({ title: "Perfil atualizado com sucesso!" });
    }
    setSaving(false);
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast({ title: "Senha muito curta", description: "Mínimo de 6 caracteres.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "As senhas não coincidem", variant: "destructive" });
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

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><p>Carregando...</p></div>;

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <DashboardNav />

      <main className="container px-4 py-8 max-w-2xl">
        {/* Avatar + name header */}
        <div className="flex items-center gap-4 mb-8">
          <AvatarUpload
            avatarUrl={avatarUrl}
            fullName={fullName}
            onUploaded={(url) => setAvatarUrl(url)}
          />
          <div>
            <h1 className="text-2xl font-bold">{fullName || "Meu Perfil"}</h1>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        {/* Dados pessoais */}
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

        {/* Dados do casamento */}
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
              <Label htmlFor="guests">Número estimado de convidados</Label>
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

        {/* Dados do convite */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Dados do convite</CardTitle>
            <p className="text-sm text-muted-foreground">Esses dados aparecerão no convite enviado por email aos convidados.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="invitePhoto">Foto do convite (URL)</Label>
              <Input id="invitePhoto" placeholder="https://..." value={invitePhotoUrl} onChange={(e) => setInvitePhotoUrl(e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">Use uma foto de capa do casal. Em breve, upload direto.</p>
            </div>
            <div>
              <Label htmlFor="inviteMessage">Mensagem para os convidados</Label>
              <Textarea id="inviteMessage" rows={4} value={inviteMessage} onChange={(e) => setInviteMessage(e.target.value)} placeholder="Ex.: É com muita alegria que convidamos vocês para celebrar conosco este momento tão especial..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ceremonyTime">Horário da cerimônia</Label>
                <Input id="ceremonyTime" placeholder="Ex.: 16h" value={ceremonyTime} onChange={(e) => setCeremonyTime(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="dressCode">Traje</Label>
                <Input id="dressCode" placeholder="Ex.: Esporte fino" value={dressCode} onChange={(e) => setDressCode(e.target.value)} />
              </div>
            </div>
            <div>
              <Label htmlFor="ceremonyAddress">Endereço da cerimônia</Label>
              <Input id="ceremonyAddress" value={ceremonyAddress} onChange={(e) => setCeremonyAddress(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="receptionAddress">Endereço da recepção</Label>
              <Input id="receptionAddress" value={receptionAddress} onChange={(e) => setReceptionAddress(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="contactPhone">Telefone de contato</Label>
              <Input id="contactPhone" placeholder="(11) 99999-9999" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
            </div>
            <Button onClick={handleSaveProfile} disabled={saving} variant="outline" className="w-full">
              <Save className="mr-2 h-4 w-4" />
              Salvar dados do convite
            </Button>
          </CardContent>
        </Card>

        {/* Alterar senha */}
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
