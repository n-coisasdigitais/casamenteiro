import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Heart, LogOut, Upload, X, AlertCircle, CheckCircle, Clock, MessageSquare, Eye, Phone, Calendar, Users as UsersIcon, CalendarDays, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import QuoteThread from "@/components/QuoteThread";
import QuoteProposalPanel from "@/components/QuoteProposalPanel";
import AvailabilityCalendar from "@/components/AvailabilityCalendar";
import PromoDatesManager from "@/components/PromoDatesManager";
import NotificationsBell from "@/components/NotificationsBell";
import SupplierMetrics from "@/components/supplier/SupplierMetrics";
import SupplierOnboardingWizard from "@/components/supplier/SupplierOnboardingWizard";
import { formatPhoneBR, isValidPhoneBR } from "@/lib/phone";

type Category = { id: string; name: string };

export default function SupplierDashboard() {
  const { user, profile, signOut } = useAuth();
  const { toast } = useToast();
  const [supplier, setSupplier] = useState<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<any>(null);
  const [threadOpen, setThreadOpen] = useState(false);

  const [companyName, setCompanyName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase.from("categories").select("*").then(({ data }) => setCategories(data || []));
    loadSupplier();
  }, [user]);

  useEffect(() => {
    if (supplier) loadQuotes();
  }, [supplier]);

  const loadSupplier = async () => {
    if (!user) return;
    const { data } = await supabase.from("suppliers").select("*").eq("user_id", user.id).maybeSingle();
    if (data) {
      setSupplier(data);
      setCompanyName(data.company_name || "");
      setDescription(data.description || "");
      setCategoryId(data.category_id || "");
      setCity(data.city || "");
      setState(data.state || "");
      setPhone(formatPhoneBR(data.whatsapp || data.phone || ""));
      setEmail(data.email || "");
      const { data: photoData } = await supabase.from("supplier_photos").select("*").eq("supplier_id", data.id).order("display_order");
      setPhotos(photoData || []);
    }
  };

  const loadQuotes = async () => {
    if (!supplier) return;
    const { data } = await supabase
      .from("quotes")
      .select("*")
      .eq("supplier_id", supplier.id)
      .order("created_at", { ascending: false });
    setQuotes(data || []);
  };

  const updateQuoteStatus = async (quoteId: string, status: string) => {
    const { error } = await supabase
      .from("quotes")
      .update({ status })
      .eq("id", quoteId);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Status atualizado!" });
      // Mark as viewed when opening
      loadQuotes();
    }
  };

  const openThread = (quote: any) => {
    setSelectedQuote(quote);
    setThreadOpen(true);
    // Auto-mark as viewed
    if (quote.status === "pending") {
      updateQuoteStatus(quote.id, "viewed");
    }
  };

  const handleSave = async () => {
    if (!supplier) return;
    if (phone && !isValidPhoneBR(phone)) {
      toast({ title: "WhatsApp inválido", description: "Use DDD + número (ex.: (11) 91234-5678).", variant: "destructive" });
      return;
    }
    setLoading(true);
    const phoneDigits = phone.replace(/\D/g, "") || null;
    const { error } = await supabase.from("suppliers").update({
      company_name: companyName,
      description,
      category_id: categoryId || null,
      city: city || null,
      state: state || null,
      phone: phoneDigits,
      whatsapp: phoneDigits,
      email: email || null,
    }).eq("id", supplier.id);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Perfil atualizado!" });
    }
    setLoading(false);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !supplier || photos.length >= 10) return;
    setUploading(true);
    const file = e.target.files[0];
    const filePath = `${user!.id}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from("supplier-photos").upload(filePath, file);
    if (uploadError) {
      toast({ title: "Erro no upload", description: uploadError.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from("supplier-photos").getPublicUrl(filePath);
    await supabase.from("supplier_photos").insert({
      supplier_id: supplier.id,
      photo_url: publicUrl,
      display_order: photos.length,
    });
    await loadSupplier();
    setUploading(false);
  };

  const deletePhoto = async (photoId: string) => {
    await supabase.from("supplier_photos").delete().eq("id", photoId);
    setPhotos(photos.filter((p) => p.id !== photoId));
  };

  const statusConfig = {
    pending: { label: "Pendente de Aprovação", icon: Clock, variant: "secondary" as const },
    approved: { label: "Aprovado", icon: CheckCircle, variant: "default" as const },
    rejected: { label: "Rejeitado", icon: AlertCircle, variant: "destructive" as const },
  };

  const statusInfo = supplier ? statusConfig[supplier.status as keyof typeof statusConfig] : null;

  if (!supplier) return <div className="min-h-screen flex items-center justify-center"><p>Carregando...</p></div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="container flex items-center justify-between h-16 px-4">
          <Link to="/" className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary fill-primary" />
            <span className="text-lg font-bold">Meu Grande Dia</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:inline">{profile?.full_name}</span>
            <NotificationsBell />
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container px-4 py-8 max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Painel do Fornecedor</h1>
          {statusInfo && (
            <Badge variant={statusInfo.variant} className="flex items-center gap-1">
              <statusInfo.icon className="h-3 w-3" />
              {statusInfo.label}
            </Badge>
          )}
        </div>

        {supplier.status === "pending" && (
          <Card className="mb-6 border-primary/30 bg-primary/5">
            <CardContent className="p-4 text-sm text-muted-foreground">
              <p><strong>Seu perfil está em análise.</strong> Complete todas as informações e adicione fotos ao seu portfólio para agilizar a aprovação.</p>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="quotes" className="space-y-6">
          <TabsList className="flex-wrap">
            <TabsTrigger value="quotes" className="flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4" />
              Orçamentos {quotes.length > 0 && <Badge variant="secondary" className="ml-1 text-xs h-5 px-1.5">{quotes.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="availability" className="flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" />
              Disponibilidade
            </TabsTrigger>
            <TabsTrigger value="profile">Meu Perfil</TabsTrigger>
            <TabsTrigger value="photos">Fotos</TabsTrigger>
          </TabsList>

          {/* QUOTES TAB */}
          <TabsContent value="quotes">
            {quotes.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Nenhum pedido de orçamento recebido ainda.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {quotes.map((q) => {
                  const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
                    pending: { label: "Novo", variant: "default" },
                    viewed: { label: "Visualizado", variant: "secondary" },
                    answered: { label: "Respondido", variant: "outline" },
                    accepted: { label: "Aceito", variant: "default" },
                    rejected: { label: "Recusado", variant: "destructive" },
                    cancelled: { label: "Cancelado", variant: "secondary" },
                  };
                  const st = statusMap[q.status] || statusMap.pending;
                  return (
                    <Card key={q.id} className={`cursor-pointer hover:shadow-md transition-shadow ${q.status === "pending" ? "border-primary/50" : ""}`} onClick={() => openThread(q)}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant={st.variant} className="text-xs">{st.label}</Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(q.created_at).toLocaleDateString("pt-BR")}
                              </span>
                            </div>
                            <p className="text-sm line-clamp-2">{q.message}</p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              {q.event_date && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(q.event_date).toLocaleDateString("pt-BR")}
                                </span>
                              )}
                              {q.guest_count && (
                                <span className="flex items-center gap-1">
                                  <UsersIcon className="h-3 w-3" />
                                  {q.guest_count} convidados
                                </span>
                              )}
                              {q.phone && q.phone_visible && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {q.phone}
                                </span>
                              )}
                              {q.phone && !q.phone_visible && (
                                <span className="flex items-center gap-1 italic">
                                  <Phone className="h-3 w-3" />
                                  Telefone oculto
                                </span>
                              )}
                            </div>
                          </div>
                          <Eye className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* AVAILABILITY TAB */}
          <TabsContent value="availability" className="space-y-4">
            <AvailabilityCalendar supplierId={supplier.id} />
            <PromoDatesManager supplierId={supplier.id} />
          </TabsContent>

          {/* PROFILE TAB */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div><Label>Nome da empresa</Label><Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} /></div>
                <div><Label>Descrição dos serviços</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} /></div>
                <div><Label>Categoria</Label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Cidade</Label><Input value={city} onChange={(e) => setCity(e.target.value)} /></div>
                  <div><Label>Estado</Label><Input value={state} onChange={(e) => setState(e.target.value)} /></div>
                </div>
                <div>
                  <Label>WhatsApp (com DDD)</Label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(formatPhoneBR(e.target.value))}
                    placeholder="(11) 91234-5678"
                    inputMode="numeric"
                  />
                  {phone && !isValidPhoneBR(phone) && (
                    <p className="text-xs text-destructive mt-1">Telefone inválido. Use DDD + número.</p>
                  )}
                </div>
                <div><Label>E-mail de contato</Label><Input value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                <Button onClick={handleSave} disabled={loading} className="w-full">
                  {loading ? "Salvando..." : "Salvar alterações"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* PHOTOS TAB */}
          <TabsContent value="photos">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Portfólio ({photos.length}/10 fotos)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  {photos.map((photo) => (
                    <div key={photo.id} className="relative group rounded-lg overflow-hidden aspect-square">
                      <img src={photo.photo_url} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={() => deletePhoto(photo.id)}
                        className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
                {photos.length < 10 && (
                  <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-accent transition-colors">
                    <Upload className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {uploading ? "Enviando..." : "Adicionar foto"}
                    </span>
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
                  </label>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Quote Thread Dialog */}
        <Dialog open={threadOpen} onOpenChange={setThreadOpen}>
          <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col p-0 gap-0">
            <DialogHeader className="p-4 pb-2 border-b border-border">
              <DialogTitle className="text-base">Orçamento</DialogTitle>
              {selectedQuote && (
                <div className="flex items-center gap-2 mt-2">
                  <Select
                    value={selectedQuote.status}
                    onValueChange={(val) => {
                      updateQuoteStatus(selectedQuote.id, val);
                      setSelectedQuote({ ...selectedQuote, status: val });
                    }}
                  >
                    <SelectTrigger className="w-40 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Novo</SelectItem>
                      <SelectItem value="viewed">Visualizado</SelectItem>
                      <SelectItem value="answered">Respondido</SelectItem>
                      <SelectItem value="accepted">Aceito ✓</SelectItem>
                      <SelectItem value="rejected">Recusado ✕</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </DialogHeader>
            {selectedQuote && user && (
              <QuoteThread quoteId={selectedQuote.id} currentUserId={user.id} />
            )}
            {selectedQuote && user && supplier && (
              <QuoteProposalPanel
                quoteId={selectedQuote.id}
                currentUserId={user.id}
                isSupplier={true}
                coupleId={selectedQuote.couple_id}
                supplierId={supplier.id}
              />
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
