import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Lock, Copy, Link2, UserMinus, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import DashboardHeader from "@/components/DashboardHeader";
import DashboardNav from "@/components/DashboardNav";
import AvatarUpload from "@/components/AvatarUpload";
import { Textarea } from "@/components/ui/textarea";
import CouplePhotoUpload from "@/components/CouplePhotoUpload";
import CepInput from "@/components/CepInput";
import AlbumUpload from "@/components/AlbumUpload";

export default function UserProfile() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [partnerName, setPartnerName] = useState("");
  const [coupleRole, setCoupleRole] = useState<string>("");
  const [weddingDate, setWeddingDate] = useState("");
  const [estimatedGuests, setEstimatedGuests] = useState("");
  const [estimatedBudget, setEstimatedBudget] = useState("");
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Vínculo de parceiro
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [linkedPartners, setLinkedPartners] = useState<{ id: string; user_id: string; name: string; email?: string | null }[]>([]);
  const [partnerCodeInput, setPartnerCodeInput] = useState("");
  const [linking, setLinking] = useState(false);

  // Campos do convite
  const [inviteMessage, setInviteMessage] = useState("");
  const [invitePhotoUrl, setInvitePhotoUrl] = useState("");
  const [ceremonyTime, setCeremonyTime] = useState("");
  const [ceremonyAddress, setCeremonyAddress] = useState("");
  const [receptionAddress, setReceptionAddress] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [dressCode, setDressCode] = useState("");

  // Convite — novos campos (Fase 2)
  const [ceremonyCep, setCeremonyCep] = useState("");
  const [ceremonyLat, setCeremonyLat] = useState<number | null>(null);
  const [ceremonyLng, setCeremonyLng] = useState<number | null>(null);
  const [ceremonyLocalNome, setCeremonyLocalNome] = useState("");
  const [receptionCep, setReceptionCep] = useState("");
  const [receptionLat, setReceptionLat] = useState<number | null>(null);
  const [receptionLng, setReceptionLng] = useState<number | null>(null);
  const [receptionLocalNome, setReceptionLocalNome] = useState("");
  const [inviteVideoUrl, setInviteVideoUrl] = useState("");
  const [inviteAlbum, setInviteAlbum] = useState<string[]>([]);

  // Header pessoal + meta de orçamento
  const [headerPhotoUrl, setHeaderPhotoUrl] = useState("");
  const [headerQuote, setHeaderQuote] = useState("");
  const [targetBudget, setTargetBudget] = useState("");
  const [budgetMode, setBudgetMode] = useState<string>("fixed");

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
    setEmail(user.email || "");

    supabase.from("couples").select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data) {
        setCoupleId(data.id);
        setInviteCode((data as any).invite_code || null);
        setIsOwner(true);
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
        setHeaderPhotoUrl((data as any).header_photo_url || "");
        setHeaderQuote((data as any).header_quote || "");
        setTargetBudget((data as any).target_budget?.toString() || "");
        setBudgetMode((data as any).budget_mode || "fixed");
        setCeremonyCep((data as any).ceremony_cep || "");
        setCeremonyLat((data as any).ceremony_lat ?? null);
        setCeremonyLng((data as any).ceremony_lng ?? null);
        setCeremonyLocalNome((data as any).ceremony_local_nome || "");
        setReceptionCep((data as any).reception_cep || "");
        setReceptionLat((data as any).reception_lat ?? null);
        setReceptionLng((data as any).reception_lng ?? null);
        setReceptionLocalNome((data as any).reception_local_nome || "");
        setInviteVideoUrl((data as any).invite_video_url || "");
        setInviteAlbum(Array.isArray((data as any).invite_album) ? (data as any).invite_album : []);
        loadLinks(data.id);
      } else {
        // Não é dono — pode estar vinculado como parceiro
        setIsOwner(false);
        supabase.from("couple_links").select("couple_id").eq("linked_user_id", user.id).maybeSingle().then(({ data: lk }) => {
          if (lk?.couple_id) {
            setCoupleId(lk.couple_id);
            supabase.from("couples").select("invite_code").eq("id", lk.couple_id).maybeSingle().then(({ data: c }) => {
              if (c) setInviteCode((c as any).invite_code || null);
            });
            loadLinks(lk.couple_id);
          }
        });
      }
    });
  }, [user, profile, authLoading, navigate]);

  const loadLinks = async (cId: string) => {
    const { data: links } = await supabase
      .from("couple_links")
      .select("id, linked_user_id")
      .eq("couple_id", cId);
    if (!links || links.length === 0) { setLinkedPartners([]); return; }
    const userIds = links.map((l: any) => l.linked_user_id);
    const { data: profs } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", userIds);
    setLinkedPartners(
      links.map((l: any) => ({
        id: l.id,
        user_id: l.linked_user_id,
        name: profs?.find((p: any) => p.user_id === l.linked_user_id)?.full_name || "Parceiro(a)",
      }))
    );
  };

  const copyInvite = () => {
    if (!inviteCode) return;
    navigator.clipboard.writeText(inviteCode);
    toast({ title: "Código copiado!", description: "Envie para seu(sua) parceiro(a) colar na tela de perfil dele(a)." });
  };

  const handleLinkPartner = async () => {
    const code = partnerCodeInput.trim();
    if (!code) return;
    setLinking(true);
    const { data, error } = await (supabase.rpc as any)("link_partner_by_invite_code", { _code: code });
    setLinking(false);
    if (error) {
      toast({ title: "Não foi possível vincular", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Vinculado com sucesso!", description: "Vocês agora compartilham o mesmo casamento." });
    setPartnerCodeInput("");
    // Recarrega para refletir o novo couple_id
    setTimeout(() => window.location.reload(), 600);
  };

  const handleUnlink = async (linkId: string) => {
    if (!confirm("Tem certeza que quer desvincular essa pessoa do casamento? Ela perderá o acesso.")) return;
    const { error } = await supabase.from("couple_links").delete().eq("id", linkId);
    if (error) {
      toast({ title: "Erro ao desvincular", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Vínculo removido" });
    if (coupleId) loadLinks(coupleId);
  };

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
            header_photo_url: headerPhotoUrl || null,
            header_quote: headerQuote || null,
            target_budget: targetBudget ? parseFloat(targetBudget) : null,
            budget_mode: budgetMode,
            ceremony_cep: ceremonyCep || null,
            ceremony_lat: ceremonyLat,
            ceremony_lng: ceremonyLng,
            ceremony_local_nome: ceremonyLocalNome || null,
            reception_cep: receptionCep || null,
            reception_lat: receptionLat,
            reception_lng: receptionLng,
            reception_local_nome: receptionLocalNome || null,
            invite_video_url: inviteVideoUrl || null,
            invite_album: inviteAlbum,
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

  const handleChangeEmail = async () => {
    if (!email || !email.includes("@")) {
      toast({ title: "Email inválido", variant: "destructive" });
      return;
    }
    if (email === user?.email) return;
    setSavingEmail(true);
    const { error } = await supabase.auth.updateUser({ email });
    if (error) {
      toast({ title: "Erro ao alterar email", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Email atualizado!", description: "Verifique sua caixa de entrada para confirmar a alteração." });
    }
    setSavingEmail(false);
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
              <Label htmlFor="email">Email</Label>
              <div className="flex gap-2">
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                <Button onClick={handleChangeEmail} disabled={savingEmail || email === user?.email} variant="outline">
                  {savingEmail ? "Salvando..." : "Alterar"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Ao alterar, você precisará confirmar pelo link enviado ao novo email.</p>
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
            <div>
              <Label htmlFor="target">Meta de orçamento (R$)</Label>
              <Input id="target" type="number" value={targetBudget} onChange={(e) => setTargetBudget(e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">Esse será o teto que você quer respeitar nos gastos.</p>
            </div>
            <div>
              <Label>Modo do orçamento</Label>
              <Select value={budgetMode} onValueChange={setBudgetMode}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixo (meta acima)</SelectItem>
                  <SelectItem value="simulation">Pela última simulação</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleSaveProfile} disabled={saving} className="w-full mb-8">
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Salvando..." : "Salvar alterações"}
        </Button>

        {/* Vínculo de parceiro */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              Vínculo do casal
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Compartilhe o mesmo casamento com seu(sua) parceiro(a). Cada um mantém seu login, mas tarefas, convidados, orçamento e fornecedores ficam compartilhados.
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            {isOwner && inviteCode && (
              <div>
                <Label>Seu código de convite</Label>
                <div className="flex gap-2">
                  <Input value={inviteCode} readOnly className="font-mono uppercase tracking-wider" />
                  <Button onClick={copyInvite} variant="outline" type="button">
                    <Copy className="h-4 w-4 mr-1.5" /> Copiar
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Envie esse código para seu(sua) parceiro(a). No perfil dele(a), basta colar aqui embaixo para se vincular.
                </p>
              </div>
            )}

            {!linkedPartners.some((p) => p.user_id === user?.id) && (
              <div>
                <Label htmlFor="partnerCode">Vincular usando o código do(a) parceiro(a)</Label>
                <div className="flex gap-2">
                  <Input
                    id="partnerCode"
                    value={partnerCodeInput}
                    onChange={(e) => setPartnerCodeInput(e.target.value)}
                    placeholder="Cole o código aqui"
                    className="font-mono uppercase"
                  />
                  <Button onClick={handleLinkPartner} disabled={linking || !partnerCodeInput.trim()} type="button">
                    <UserPlus className="h-4 w-4 mr-1.5" />
                    {linking ? "Vinculando..." : "Vincular"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Sua conta será unida ao casamento da pessoa que gerou o código. Suas simulações antigas continuam no histórico, sem virar um casamento separado.
                </p>
              </div>
            )}

            {linkedPartners.length > 0 && (
              <div>
                <Label>Pessoas com acesso ao casamento</Label>
                <ul className="mt-2 space-y-2">
                  {linkedPartners.map((p) => (
                    <li key={p.id} className="flex items-center justify-between rounded-md border border-border p-2">
                      <span className="text-sm">{p.name}{p.user_id === user?.id ? " (você)" : ""}</span>
                      {(isOwner || p.user_id === user?.id) && (
                        <Button variant="ghost" size="sm" onClick={() => handleUnlink(p.id)}>
                          <UserMinus className="h-4 w-4 mr-1" /> Desvincular
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Personalização do painel */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Personalize seu painel</CardTitle>
            <p className="text-sm text-muted-foreground">Foto e frase que aparecem no topo da página de orçamento.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Foto de capa</Label>
              <CouplePhotoUpload url={headerPhotoUrl || null} onUploaded={setHeaderPhotoUrl} fileName="header" />
            </div>
            <div>
              <Label htmlFor="headerQuote">Sua frase</Label>
              <Textarea id="headerQuote" rows={2} value={headerQuote} onChange={(e) => setHeaderQuote(e.target.value)} placeholder="Ex.: Construindo o nosso grande dia, juntos." />
            </div>
            <Button onClick={handleSaveProfile} disabled={saving} variant="outline" className="w-full">
              <Save className="mr-2 h-4 w-4" />Salvar personalização
            </Button>
          </CardContent>
        </Card>

        {/* Dados do convite */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Dados do convite</CardTitle>
            <p className="text-sm text-muted-foreground">Esses dados aparecerão no convite enviado por email aos convidados.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Foto do convite</Label>
              <CouplePhotoUpload url={invitePhotoUrl || null} onUploaded={setInvitePhotoUrl} fileName="invite" />
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
              <Input
                id="ceremonyLocalNome"
                placeholder="Nome do local (Ex.: Igreja N. S. de Lourdes)"
                value={ceremonyLocalNome}
                onChange={(e) => setCeremonyLocalNome(e.target.value)}
              />
              <div className="mt-3">
                <CepInput
                  cep={ceremonyCep}
                  endereco={ceremonyAddress}
                  label="Cerimônia"
                  onChange={({ cep, endereco, lat, lng }) => {
                    setCeremonyCep(cep);
                    setCeremonyAddress(endereco);
                    if (lat !== undefined) setCeremonyLat(lat);
                    if (lng !== undefined) setCeremonyLng(lng);
                  }}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="receptionAddress">Endereço da recepção</Label>
              <Input
                id="receptionLocalNome"
                placeholder="Nome do local (Ex.: Espaço Villa)"
                value={receptionLocalNome}
                onChange={(e) => setReceptionLocalNome(e.target.value)}
              />
              <div className="mt-3">
                <CepInput
                  cep={receptionCep}
                  endereco={receptionAddress}
                  label="Recepção"
                  onChange={({ cep, endereco, lat, lng }) => {
                    setReceptionCep(cep);
                    setReceptionAddress(endereco);
                    if (lat !== undefined) setReceptionLat(lat);
                    if (lng !== undefined) setReceptionLng(lng);
                  }}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="contactPhone">Telefone de contato</Label>
              <Input id="contactPhone" placeholder="(11) 99999-9999" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="inviteVideoUrl">Vídeo do convite (YouTube)</Label>
              <Input
                id="inviteVideoUrl"
                placeholder="https://youtu.be/... ou https://www.youtube.com/watch?v=..."
                value={inviteVideoUrl}
                onChange={(e) => setInviteVideoUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">Cole o link do YouTube. Aparecerá como vídeo no convite.</p>
            </div>
            <div>
              <Label>Álbum de fotos (até 10)</Label>
              <AlbumUpload album={inviteAlbum} onChange={setInviteAlbum} max={10} />
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
