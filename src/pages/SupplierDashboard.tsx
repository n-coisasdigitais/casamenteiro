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
import { Heart, LogOut, Upload, X, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Category = { id: string; name: string };

export default function SupplierDashboard() {
  const { user, profile, signOut } = useAuth();
  const { toast } = useToast();
  const [supplier, setSupplier] = useState<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

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

  const loadSupplier = async () => {
    if (!user) return;
    const { data } = await supabase.from("suppliers").select("*").eq("user_id", user.id).single();
    if (data) {
      setSupplier(data);
      setCompanyName(data.company_name || "");
      setDescription(data.description || "");
      setCategoryId(data.category_id || "");
      setCity(data.city || "");
      setState(data.state || "");
      setPhone(data.phone || "");
      setEmail(data.email || "");
      // Load photos
      const { data: photoData } = await supabase.from("supplier_photos").select("*").eq("supplier_id", data.id).order("display_order");
      setPhotos(photoData || []);
    }
  };

  const handleSave = async () => {
    if (!supplier) return;
    setLoading(true);
    const { error } = await supabase.from("suppliers").update({
      company_name: companyName,
      description,
      category_id: categoryId || null,
      city: city || null,
      state: state || null,
      phone: phone || null,
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
            <span className="font-serif text-lg font-semibold">Meu Grande Dia</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:inline">{profile?.full_name}</span>
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container px-4 py-8 max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-serif text-2xl font-bold">Meu Perfil</h1>
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

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="font-serif text-lg">Informações</CardTitle>
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
            <div><Label>Telefone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
            <div><Label>E-mail de contato</Label><Input value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <Button onClick={handleSave} disabled={loading} className="w-full">
              {loading ? "Salvando..." : "Salvar alterações"}
            </Button>
          </CardContent>
        </Card>

        {/* Photos */}
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-lg">Portfólio ({photos.length}/10 fotos)</CardTitle>
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
      </main>
    </div>
  );
}
