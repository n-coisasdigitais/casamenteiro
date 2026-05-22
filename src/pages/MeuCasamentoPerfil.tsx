import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import DashboardHeader from "@/components/DashboardHeader";
import DashboardNav from "@/components/DashboardNav";
import { ensureCoupleProfile, youtubeIdFromUrl, youtubeThumbnail } from "@/lib/coupleProfile";
import { toast } from "sonner";
import { Trash2, Upload, Star, ExternalLink, Plus } from "lucide-react";

const PRIVACY_KEYS = [
  { key: "publico", label: "Perfil público" },
  { key: "exibir_data", label: "Exibir data do casamento" },
  { key: "exibir_fornecedores", label: "Exibir fornecedores contratados" },
  { key: "exibir_fotos", label: "Exibir fotos" },
  { key: "exibir_videos", label: "Exibir vídeos" },
  { key: "exibir_avaliacoes", label: "Exibir avaliações recebidas" },
  { key: "exibir_casamento_mesmo_dia", label: "Aparecer em 'casando no mesmo dia'" },
  { key: "mensagens_casais", label: "Receber mensagens de outros casais" },
  { key: "mensagens_fornecedores", label: "Receber mensagens de fornecedores" },
] as const;

export default function MeuCasamentoPerfil() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [perfil, setPerfil] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [fotos, setFotos] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [novoVideoUrl, setNovoVideoUrl] = useState("");
  const [novoVideoTitulo, setNovoVideoTitulo] = useState("");
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewSupplier, setReviewSupplier] = useState<any>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [reviewPublico, setReviewPublico] = useState(true);
  const [fornecedoresParaAvaliar, setFornecedoresParaAvaliar] = useState<any[]>([]);
  const [avaliacoesRecebidas, setAvaliacoesRecebidas] = useState<any[]>([]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login"); return; }
    (async () => {
      const { data: cid } = await supabase.rpc("get_couple_id_for_user", { _user_id: user.id });
      if (!cid) { toast.error("Você precisa completar o onboarding primeiro"); navigate("/onboarding"); return; }
      setCoupleId(cid as string);
      const { data: couple } = await supabase.from("couples").select("*,profiles(full_name)").eq("id", cid as string).maybeSingle();
      const fallback = couple?.partner_name ? `${(couple as any).profiles?.full_name || ""} & ${couple.partner_name}`.trim() : "";
      const p = await ensureCoupleProfile(cid as string, fallback, couple?.wedding_date);
      setPerfil(p);
      await reloadMedia(cid as string, p?.id);
    })();
  }, [user, authLoading, navigate]);

  const reloadMedia = async (cid: string, perfilId?: string) => {
    const [f, v, cs] = await Promise.all([
      supabase.from("couple_photos").select("*").eq("couple_id", cid).order("ordem"),
      supabase.from("couple_videos").select("*").eq("couple_id", cid),
      supabase.from("couple_suppliers").select("supplier_id,suppliers(id,company_name,logo_url)").eq("couple_id", cid).eq("kanban_status", "contratado"),
    ]);
    setFotos(f.data || []);
    setVideos(v.data || []);
    const suppliers = (cs.data || []).map((x: any) => x.suppliers).filter(Boolean);
    const { data: existingReviews } = await supabase
      .from("reviews").select("supplier_id").eq("couple_id", cid).eq("autor_tipo", "couple");
    const reviewed = new Set((existingReviews || []).map((r: any) => r.supplier_id));
    setFornecedoresParaAvaliar(suppliers.filter((s: any) => !reviewed.has(s.id)));
    if (perfilId) {
      const { data: ar } = await supabase
        .from("reviews")
        .select("*,suppliers(company_name)")
        .eq("alvo_couple_id", cid).eq("autor_tipo", "supplier")
        .order("created_at", { ascending: false });
      setAvaliacoesRecebidas(ar || []);
    }
  };

  const salvar = async (patch: any) => {
    if (!perfil) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("couple_public_profiles")
      .update(patch)
      .eq("id", perfil.id)
      .select("*").maybeSingle();
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setPerfil(data);
    toast.success("Salvo!");
  };

  const uploadImagem = async (file: File, campo: "foto_capa_url" | "foto_perfil_url") => {
    if (!user) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Imagem deve ter no máximo 5MB"); return; }
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${campo}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("couple-profile").upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); return; }
    const { data: { publicUrl } } = supabase.storage.from("couple-profile").getPublicUrl(path);
    await salvar({ [campo]: publicUrl });
  };

  const uploadFotoAlbum = async (file: File) => {
    if (!user || !coupleId) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Foto deve ter no máximo 2MB"); return; }
    if (fotos.length >= 50) { toast.error("Máximo de 50 fotos"); return; }
    const ext = file.name.split(".").pop();
    const path = `${user.id}/album-${Date.now()}-${Math.random().toString(36).slice(2,6)}.${ext}`;
    const { error } = await supabase.storage.from("couple-profile").upload(path, file);
    if (error) { toast.error(error.message); return; }
    const { data: { publicUrl } } = supabase.storage.from("couple-profile").getPublicUrl(path);
    await supabase.from("couple_photos").insert({ couple_id: coupleId, url: publicUrl, ordem: fotos.length });
    await reloadMedia(coupleId, perfil?.id);
  };

  const excluirFoto = async (id: string) => {
    await supabase.from("couple_photos").delete().eq("id", id);
    if (coupleId) await reloadMedia(coupleId, perfil?.id);
  };

  const toggleDestaque = async (foto: any) => {
    await supabase.from("couple_photos").update({ destaque: !foto.destaque }).eq("id", foto.id);
    if (coupleId) await reloadMedia(coupleId, perfil?.id);
  };

  const adicionarVideo = async () => {
    if (!coupleId) return;
    if (videos.length >= 5) { toast.error("Máximo de 5 vídeos"); return; }
    const id = youtubeIdFromUrl(novoVideoUrl);
    if (!id) { toast.error("URL do YouTube inválida"); return; }
    await supabase.from("couple_videos").insert({
      couple_id: coupleId, tipo: "youtube", url: novoVideoUrl,
      titulo: novoVideoTitulo || null, thumbnail_url: youtubeThumbnail(novoVideoUrl),
    });
    setNovoVideoUrl(""); setNovoVideoTitulo("");
    await reloadMedia(coupleId, perfil?.id);
  };

  const excluirVideo = async (id: string) => {
    await supabase.from("couple_videos").delete().eq("id", id);
    if (coupleId) await reloadMedia(coupleId, perfil?.id);
  };

  const abrirReview = (s: any) => {
    setReviewSupplier(s); setReviewRating(5); setReviewText(""); setReviewPublico(true);
    setReviewModalOpen(true);
  };

  const enviarReview = async () => {
    if (!reviewSupplier || !user || !coupleId) return;
    if (reviewText.trim().length < 30) { toast.error("Escreva pelo menos 30 caracteres"); return; }
    const { error } = await supabase.from("reviews").insert({
      supplier_id: reviewSupplier.id, couple_id: coupleId, user_id: user.id,
      rating: reviewRating, comment: reviewText.trim(),
      autor_tipo: "couple", alvo_tipo: "supplier", publico: reviewPublico, aprovado: true,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Avaliação enviada!");
    setReviewModalOpen(false);
    await reloadMedia(coupleId, perfil?.id);
  };

  if (!perfil) return <div className="min-h-screen flex items-center justify-center">Carregando…</div>;

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <DashboardNav />
      <div className="container py-8 px-4 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-serif">Perfil público</h1>
            <p className="text-sm text-muted-foreground">
              Acesse em <Link to={`/casais/${perfil.slug}`} className="text-primary underline">/casais/{perfil.slug}</Link>
            </p>
          </div>
          <Link to={`/casais/${perfil.slug}`} target="_blank">
            <Button variant="outline" size="sm"><ExternalLink className="h-4 w-4 mr-2" />Ver perfil</Button>
          </Link>
        </div>

        <Tabs defaultValue="info">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="info">Informações</TabsTrigger>
            <TabsTrigger value="fotos">Fotos</TabsTrigger>
            <TabsTrigger value="videos">Vídeos</TabsTrigger>
            <TabsTrigger value="privacidade">Privacidade</TabsTrigger>
            <TabsTrigger value="avaliacoes">Avaliações</TabsTrigger>
          </TabsList>

          {/* INFO */}
          <TabsContent value="info" className="space-y-4">
            <Card className="p-6 space-y-4">
              <div>
                <Label>Nome do casal</Label>
                <Input value={perfil.nome_casal} onChange={(e) => setPerfil({ ...perfil, nome_casal: e.target.value })} />
              </div>
              <div>
                <Label>Estilo</Label>
                <Select value={perfil.estilo || "none"} onValueChange={(v) => setPerfil({ ...perfil, estilo: v === "none" ? null : v })}>
                  <SelectTrigger><SelectValue placeholder="Escolha um estilo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem estilo</SelectItem>
                    <SelectItem value="intimista">Intimista</SelectItem>
                    <SelectItem value="elegante">Elegante</SelectItem>
                    <SelectItem value="grandioso">Grandioso</SelectItem>
                    <SelectItem value="rustico">Rústico</SelectItem>
                    <SelectItem value="praia">Praia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Bio (até 500 caracteres)</Label>
                <Textarea
                  value={perfil.bio || ""}
                  onChange={(e) => setPerfil({ ...perfil, bio: e.target.value.slice(0, 500) })}
                  maxLength={500}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground mt-1">{(perfil.bio || "").length}/500</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Foto de capa</Label>
                  {perfil.foto_capa_url && <img src={perfil.foto_capa_url} alt="" className="w-full h-32 object-cover rounded mt-2" />}
                  <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadImagem(e.target.files[0], "foto_capa_url")} className="mt-2 text-sm" />
                </div>
                <div>
                  <Label>Foto de perfil</Label>
                  {perfil.foto_perfil_url && <img src={perfil.foto_perfil_url} alt="" className="w-24 h-24 object-cover rounded-full mt-2" />}
                  <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadImagem(e.target.files[0], "foto_perfil_url")} className="mt-2 text-sm" />
                </div>
              </div>
              <Button onClick={() => salvar({ nome_casal: perfil.nome_casal, bio: perfil.bio, estilo: perfil.estilo })} disabled={saving}>
                {saving ? "Salvando…" : "Salvar alterações"}
              </Button>
            </Card>
          </TabsContent>

          {/* FOTOS */}
          <TabsContent value="fotos" className="space-y-4">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-medium">Álbum ({fotos.length}/50)</p>
                  <p className="text-xs text-muted-foreground">Máximo 2MB por foto</p>
                </div>
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadFotoAlbum(e.target.files[0])} />
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"><Upload className="h-4 w-4" />Enviar foto</span>
                </label>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {fotos.map((f: any) => (
                  <div key={f.id} className="relative group aspect-square rounded-lg overflow-hidden bg-muted">
                    <img src={f.url} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button size="icon" variant="secondary" onClick={() => toggleDestaque(f)}>
                        <Star className={`h-4 w-4 ${f.destaque ? "fill-primary text-primary" : ""}`} />
                      </Button>
                      <Button size="icon" variant="destructive" onClick={() => excluirFoto(f.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* VÍDEOS */}
          <TabsContent value="videos" className="space-y-4">
            <Card className="p-6 space-y-4">
              <div>
                <Label>URL do YouTube</Label>
                <Input value={novoVideoUrl} onChange={(e) => setNovoVideoUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." />
              </div>
              <div>
                <Label>Título (opcional)</Label>
                <Input value={novoVideoTitulo} onChange={(e) => setNovoVideoTitulo(e.target.value)} />
              </div>
              {youtubeThumbnail(novoVideoUrl) && (
                <img src={youtubeThumbnail(novoVideoUrl)!} alt="" className="w-full max-w-xs rounded" />
              )}
              <Button onClick={adicionarVideo} disabled={videos.length >= 5}><Plus className="h-4 w-4 mr-2" />Adicionar vídeo</Button>
              <p className="text-xs text-muted-foreground">{videos.length}/5 vídeos</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {videos.map((v: any) => (
                  <div key={v.id} className="relative group rounded-lg overflow-hidden bg-muted">
                    {v.thumbnail_url && <img src={v.thumbnail_url} alt="" className="w-full aspect-video object-cover" />}
                    <div className="p-2 flex items-center justify-between">
                      <span className="text-sm truncate">{v.titulo || v.url}</span>
                      <Button size="icon" variant="ghost" onClick={() => excluirVideo(v.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* PRIVACIDADE */}
          <TabsContent value="privacidade" className="space-y-4">
            <Card className="p-6 space-y-4">
              {PRIVACY_KEYS.map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <Label htmlFor={key} className="cursor-pointer flex-1">{label}</Label>
                  <Switch id={key} checked={!!perfil[key]} onCheckedChange={(v) => salvar({ [key]: v })} />
                </div>
              ))}
            </Card>
          </TabsContent>

          {/* AVALIAÇÕES */}
          <TabsContent value="avaliacoes" className="space-y-6">
            <Card className="p-6">
              <h3 className="font-medium mb-3">Avalie seus fornecedores contratados</h3>
              {fornecedoresParaAvaliar.length === 0 ? (
                <p className="text-sm text-muted-foreground">Você já avaliou todos os fornecedores contratados.</p>
              ) : (
                <div className="space-y-2">
                  {fornecedoresParaAvaliar.map((s: any) => (
                    <div key={s.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                      <div className="flex items-center gap-3">
                        {s.logo_url && <img src={s.logo_url} alt="" className="w-10 h-10 rounded-full object-cover" />}
                        <span className="font-medium">{s.company_name}</span>
                      </div>
                      <Button size="sm" onClick={() => abrirReview(s)}>Avaliar</Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-6">
              <h3 className="font-medium mb-3">Avaliações que você recebeu</h3>
              {avaliacoesRecebidas.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma avaliação ainda.</p>
              ) : (
                <div className="space-y-3">
                  {avaliacoesRecebidas.map((a: any) => (
                    <div key={a.id} className="p-3 border border-border rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{a.suppliers?.company_name}</span>
                        <div className="flex">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={`h-3 w-3 ${i < a.rating ? "fill-primary text-primary" : "text-muted"}`} />
                          ))}
                        </div>
                      </div>
                      {a.comment && <p className="text-sm">{a.comment}</p>}
                      <p className="text-xs text-muted-foreground mt-1">
                        {a.aprovado ? (a.publico ? "Publicada" : "Privada") : "Aguardando moderação"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={reviewModalOpen} onOpenChange={setReviewModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Avaliar {reviewSupplier?.company_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nota</Label>
              <div className="flex gap-1 mt-1">
                {[1,2,3,4,5].map((n) => (
                  <button key={n} onClick={() => setReviewRating(n)} className="p-1">
                    <Star className={`h-7 w-7 ${n <= reviewRating ? "fill-primary text-primary" : "text-muted"}`} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Conte como foi a experiência (mín. 30 caracteres)</Label>
              <Textarea value={reviewText} onChange={(e) => setReviewText(e.target.value)} rows={5} />
              <p className="text-xs text-muted-foreground mt-1">{reviewText.length}/30</p>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="rev-publico">Tornar avaliação pública</Label>
              <Switch id="rev-publico" checked={reviewPublico} onCheckedChange={setReviewPublico} />
            </div>
            <Button onClick={enviarReview} className="w-full">Enviar avaliação</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}