import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ExternalLink, Loader2, Plus, Save, Trash2, Upload, ArrowUp, ArrowDown } from "lucide-react";
import { DEFAULT_LANDING, SupplierLandingConfig, HowStep, WhyItem, TestimonialItem } from "@/lib/supplierLandingConfig";

export default function AdminFornecedorLanding() {
  const { toast } = useToast();
  const [cfg, setCfg] = useState<SupplierLandingConfig>(DEFAULT_LANDING);
  const [rowId, setRowId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [uploadingWhyIdx, setUploadingWhyIdx] = useState<number | null>(null);
  const [uploadingTesIdx, setUploadingTesIdx] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase
        .from("fornecedor_landing_config" as any)
        .select("id, config")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle() as any);
      if (data) {
        setRowId(data.id);
        setCfg({ ...DEFAULT_LANDING, ...(data.config as any) });
      }
      setLoading(false);
    })();
  }, []);

  const upload = async (file: File, prefix: string): Promise<string | null> => {
    const ext = file.name.split(".").pop() || "bin";
    const path = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("supplier-landing").upload(path, file, { upsert: false, contentType: file.type });
    if (error) { toast({ title: "Erro no upload", description: error.message, variant: "destructive" }); return null; }
    const { data } = supabase.storage.from("supplier-landing").getPublicUrl(path);
    return data.publicUrl;
  };

  const save = async () => {
    setSaving(true);
    let res;
    if (rowId) {
      res = await (supabase.from("fornecedor_landing_config" as any) as any).update({ config: cfg }).eq("id", rowId);
    } else {
      res = await (supabase.from("fornecedor_landing_config" as any) as any).insert({ config: cfg }).select("id").single();
      if (res.data?.id) setRowId(res.data.id);
    }
    setSaving(false);
    if (res.error) toast({ title: "Erro ao salvar", description: res.error.message, variant: "destructive" });
    else toast({ title: "Salvo!", description: "A página /fornecedor foi atualizada." });
  };

  const update = <K extends keyof SupplierLandingConfig>(section: K, patch: Partial<SupplierLandingConfig[K]>) =>
    setCfg((c) => ({ ...c, [section]: { ...c[section], ...patch } }));

  if (loading) return <div className="p-8"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b sticky top-14 z-30">
        <div className="container flex items-center justify-between h-14">
          <h1 className="font-semibold">Landing /fornecedor</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href="/fornecedor" target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3 w-3 mr-1" />Ver página</a>
            </Button>
            <Button size="sm" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
              Salvar
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-6">
        <Tabs defaultValue="navbar">
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="navbar">Navbar</TabsTrigger>
            <TabsTrigger value="hero">Hero</TabsTrigger>
            <TabsTrigger value="how">Como funciona</TabsTrigger>
            <TabsTrigger value="why">Por que anunciar</TabsTrigger>
            <TabsTrigger value="testimonials">Depoimentos</TabsTrigger>
            <TabsTrigger value="cta">CTA final</TabsTrigger>
          </TabsList>

          {/* NAVBAR */}
          <TabsContent value="navbar" className="mt-6">
            <Card className="p-6 space-y-4 max-w-xl">
              <div><Label>Texto do botão</Label><Input value={cfg.navbar.cta_label} onChange={(e) => update("navbar", { cta_label: e.target.value })} /></div>
              <div><Label>Link do botão</Label><Input value={cfg.navbar.cta_href} onChange={(e) => update("navbar", { cta_href: e.target.value })} /></div>
            </Card>
          </TabsContent>

          {/* HERO */}
          <TabsContent value="hero" className="mt-6">
            <Card className="p-6 space-y-4 max-w-2xl">
              <div>
                <Label>Vídeo de fundo (URL)</Label>
                <div className="flex gap-2 items-center">
                  <Input value={cfg.hero.video_src || ""} onChange={(e) => update("hero", { video_src: e.target.value })} placeholder="https://..." />
                  <label className="cursor-pointer">
                    <Button type="button" variant="outline" size="sm" asChild>
                      <span>{uploadingHero ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Upload className="h-3 w-3 mr-1" />Enviar</>}</span>
                    </Button>
                    <input type="file" accept="video/*" className="hidden" onChange={async (e) => {
                      const f = e.target.files?.[0]; if (!f) return;
                      setUploadingHero(true);
                      const url = await upload(f, "hero");
                      setUploadingHero(false);
                      if (url) update("hero", { video_src: url });
                    }} />
                  </label>
                </div>
                {cfg.hero.video_src && <video src={cfg.hero.video_src} controls muted className="mt-2 max-h-40 rounded" />}
              </div>
              <div>
                <Label>Imagem de fallback (se sem vídeo)</Label>
                <Input value={cfg.hero.fallback_image || ""} onChange={(e) => update("hero", { fallback_image: e.target.value })} />
              </div>
              <div><Label>Eyebrow (chip)</Label><Input value={cfg.hero.eyebrow} onChange={(e) => update("hero", { eyebrow: e.target.value })} /></div>
              <div className="grid md:grid-cols-2 gap-3">
                <div><Label>Título — parte normal</Label><Input value={cfg.hero.title_pre} onChange={(e) => update("hero", { title_pre: e.target.value })} /></div>
                <div><Label>Título — palavra em itálico</Label><Input value={cfg.hero.title_em} onChange={(e) => update("hero", { title_em: e.target.value })} /></div>
              </div>
              <div><Label>Subtítulo</Label><Textarea value={cfg.hero.subtitle} onChange={(e) => update("hero", { subtitle: e.target.value })} /></div>
              <div className="grid md:grid-cols-2 gap-3">
                <div><Label>CTA principal — texto</Label><Input value={cfg.hero.cta_primary_label} onChange={(e) => update("hero", { cta_primary_label: e.target.value })} /></div>
                <div><Label>CTA principal — link</Label><Input value={cfg.hero.cta_primary_href} onChange={(e) => update("hero", { cta_primary_href: e.target.value })} /></div>
              </div>
              <div><Label>CTA secundário — texto</Label><Input value={cfg.hero.cta_secondary_label} onChange={(e) => update("hero", { cta_secondary_label: e.target.value })} /></div>
            </Card>
          </TabsContent>

          {/* HOW */}
          <TabsContent value="how" className="mt-6 space-y-4">
            <Card className="p-6 space-y-3 max-w-2xl">
              <div><Label>Eyebrow</Label><Input value={cfg.how.eyebrow} onChange={(e) => update("how", { eyebrow: e.target.value })} /></div>
              <div><Label>Título</Label><Input value={cfg.how.title} onChange={(e) => update("how", { title: e.target.value })} /></div>
              <div><Label>Subtítulo</Label><Textarea value={cfg.how.subtitle} onChange={(e) => update("how", { subtitle: e.target.value })} /></div>
            </Card>
            <div className="space-y-3">
              {cfg.how.steps.map((s, i) => (
                <Card key={i} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase text-muted-foreground">Passo {i + 1}</span>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" disabled={i === 0} onClick={() => {
                        const arr = [...cfg.how.steps]; [arr[i-1], arr[i]] = [arr[i], arr[i-1]]; update("how", { steps: arr });
                      }}><ArrowUp className="h-3 w-3" /></Button>
                      <Button size="icon" variant="ghost" disabled={i === cfg.how.steps.length - 1} onClick={() => {
                        const arr = [...cfg.how.steps]; [arr[i+1], arr[i]] = [arr[i], arr[i+1]]; update("how", { steps: arr });
                      }}><ArrowDown className="h-3 w-3" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => update("how", { steps: cfg.how.steps.filter((_, j) => j !== i) })}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-2">
                    <Input placeholder="Label (ex: Passo 01)" value={s.label} onChange={(e) => {
                      const arr = [...cfg.how.steps]; arr[i] = { ...s, label: e.target.value }; update("how", { steps: arr });
                    }} />
                    <Input placeholder="Emoji" value={s.emoji} onChange={(e) => {
                      const arr = [...cfg.how.steps]; arr[i] = { ...s, emoji: e.target.value }; update("how", { steps: arr });
                    }} />
                  </div>
                  <Input placeholder="Título" value={s.title} onChange={(e) => {
                    const arr = [...cfg.how.steps]; arr[i] = { ...s, title: e.target.value }; update("how", { steps: arr });
                  }} />
                  <Textarea placeholder="Descrição" value={s.description} onChange={(e) => {
                    const arr = [...cfg.how.steps]; arr[i] = { ...s, description: e.target.value }; update("how", { steps: arr });
                  }} />
                  <Input placeholder="Texto da preview" value={s.preview} onChange={(e) => {
                    const arr = [...cfg.how.steps]; arr[i] = { ...s, preview: e.target.value }; update("how", { steps: arr });
                  }} />
                </Card>
              ))}
              <Button variant="outline" onClick={() => {
                const novo: HowStep = { label: `Passo 0${cfg.how.steps.length + 1}`, title: "", description: "", emoji: "✨", preview: "" };
                update("how", { steps: [...cfg.how.steps, novo] });
              }}><Plus className="h-3 w-3 mr-1" />Adicionar passo</Button>
            </div>
          </TabsContent>

          {/* WHY */}
          <TabsContent value="why" className="mt-6 space-y-4">
            <Card className="p-6 space-y-3 max-w-2xl">
              <div><Label>Eyebrow</Label><Input value={cfg.why.eyebrow} onChange={(e) => update("why", { eyebrow: e.target.value })} /></div>
              <div className="grid md:grid-cols-2 gap-2">
                <div><Label>Título — linha 1</Label><Input value={cfg.why.title_line1} onChange={(e) => update("why", { title_line1: e.target.value })} /></div>
                <div><Label>Título — linha 2</Label><Input value={cfg.why.title_line2} onChange={(e) => update("why", { title_line2: e.target.value })} /></div>
              </div>
              <div><Label>Subtítulo</Label><Textarea value={cfg.why.subtitle} onChange={(e) => update("why", { subtitle: e.target.value })} /></div>
            </Card>
            <div className="space-y-3">
              {cfg.why.items.map((it, i) => (
                <Card key={i} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase text-muted-foreground">Item {i + 1}</span>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" disabled={i === 0} onClick={() => {
                        const arr = [...cfg.why.items]; [arr[i-1], arr[i]] = [arr[i], arr[i-1]]; update("why", { items: arr });
                      }}><ArrowUp className="h-3 w-3" /></Button>
                      <Button size="icon" variant="ghost" disabled={i === cfg.why.items.length - 1} onClick={() => {
                        const arr = [...cfg.why.items]; [arr[i+1], arr[i]] = [arr[i], arr[i+1]]; update("why", { items: arr });
                      }}><ArrowDown className="h-3 w-3" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => update("why", { items: cfg.why.items.filter((_, j) => j !== i) })}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-2">
                    <Input placeholder="Label" value={it.label} onChange={(e) => {
                      const arr = [...cfg.why.items]; arr[i] = { ...it, label: e.target.value }; update("why", { items: arr });
                    }} />
                    <Input placeholder="Título" value={it.title} onChange={(e) => {
                      const arr = [...cfg.why.items]; arr[i] = { ...it, title: e.target.value }; update("why", { items: arr });
                    }} />
                  </div>
                  <Textarea placeholder="Descrição" value={it.description} onChange={(e) => {
                    const arr = [...cfg.why.items]; arr[i] = { ...it, description: e.target.value }; update("why", { items: arr });
                  }} />
                  <div className="flex gap-2 items-center">
                    <Input placeholder="URL da imagem" value={it.imageSrc} onChange={(e) => {
                      const arr = [...cfg.why.items]; arr[i] = { ...it, imageSrc: e.target.value }; update("why", { items: arr });
                    }} />
                    <label className="cursor-pointer">
                      <Button type="button" variant="outline" size="sm" asChild>
                        <span>{uploadingWhyIdx === i ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}</span>
                      </Button>
                      <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                        const f = e.target.files?.[0]; if (!f) return;
                        setUploadingWhyIdx(i);
                        const url = await upload(f, "why");
                        setUploadingWhyIdx(null);
                        if (url) { const arr = [...cfg.why.items]; arr[i] = { ...it, imageSrc: url }; update("why", { items: arr }); }
                      }} />
                    </label>
                  </div>
                  <Input placeholder="Texto alternativo" value={it.imageAlt} onChange={(e) => {
                    const arr = [...cfg.why.items]; arr[i] = { ...it, imageAlt: e.target.value }; update("why", { items: arr });
                  }} />
                  {it.imageSrc && <img src={it.imageSrc} alt="" className="w-32 h-24 object-cover rounded" />}
                </Card>
              ))}
              <Button variant="outline" onClick={() => {
                const novo: WhyItem = { label: `0${cfg.why.items.length + 1}`, title: "", description: "", imageSrc: "", imageAlt: "" };
                update("why", { items: [...cfg.why.items, novo] });
              }}><Plus className="h-3 w-3 mr-1" />Adicionar item</Button>
            </div>
          </TabsContent>

          {/* TESTIMONIALS */}
          <TabsContent value="testimonials" className="mt-6 space-y-4">
            <Card className="p-6 space-y-3 max-w-2xl">
              <div><Label>Eyebrow</Label><Input value={cfg.testimonials.eyebrow} onChange={(e) => update("testimonials", { eyebrow: e.target.value })} /></div>
              <div className="grid md:grid-cols-2 gap-2">
                <div><Label>Título — parte normal</Label><Input value={cfg.testimonials.title_pre} onChange={(e) => update("testimonials", { title_pre: e.target.value })} /></div>
                <div><Label>Título — palavra em destaque</Label><Input value={cfg.testimonials.title_em} onChange={(e) => update("testimonials", { title_em: e.target.value })} /></div>
              </div>
              <div><Label>Subtítulo</Label><Input value={cfg.testimonials.subtitle} onChange={(e) => update("testimonials", { subtitle: e.target.value })} /></div>
              <div><Label>Texto da avaliação</Label><Input value={cfg.testimonials.rating_text} onChange={(e) => update("testimonials", { rating_text: e.target.value })} /></div>
            </Card>
            <div className="space-y-3">
              {cfg.testimonials.items.map((t, i) => (
                <Card key={t.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase text-muted-foreground">Depoimento {i + 1}</span>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" disabled={i === 0} onClick={() => {
                        const arr = [...cfg.testimonials.items]; [arr[i-1], arr[i]] = [arr[i], arr[i-1]]; update("testimonials", { items: arr });
                      }}><ArrowUp className="h-3 w-3" /></Button>
                      <Button size="icon" variant="ghost" disabled={i === cfg.testimonials.items.length - 1} onClick={() => {
                        const arr = [...cfg.testimonials.items]; [arr[i+1], arr[i]] = [arr[i], arr[i+1]]; update("testimonials", { items: arr });
                      }}><ArrowDown className="h-3 w-3" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => update("testimonials", { items: cfg.testimonials.items.filter((_, j) => j !== i) })}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid md:grid-cols-3 gap-2">
                    <Input placeholder="Nome" value={t.name} onChange={(e) => {
                      const arr = [...cfg.testimonials.items]; arr[i] = { ...t, name: e.target.value }; update("testimonials", { items: arr });
                    }} />
                    <Input placeholder="Papel/Categoria" value={t.role} onChange={(e) => {
                      const arr = [...cfg.testimonials.items]; arr[i] = { ...t, role: e.target.value }; update("testimonials", { items: arr });
                    }} />
                    <Input placeholder="Cidade" value={t.city} onChange={(e) => {
                      const arr = [...cfg.testimonials.items]; arr[i] = { ...t, city: e.target.value }; update("testimonials", { items: arr });
                    }} />
                  </div>
                  <Textarea placeholder="Texto do depoimento" value={t.text} onChange={(e) => {
                    const arr = [...cfg.testimonials.items]; arr[i] = { ...t, text: e.target.value }; update("testimonials", { items: arr });
                  }} />
                  <div className="grid md:grid-cols-3 gap-2">
                    <Input type="number" min={1} max={5} placeholder="Estrelas" value={t.rating} onChange={(e) => {
                      const arr = [...cfg.testimonials.items]; arr[i] = { ...t, rating: Math.max(1, Math.min(5, Number(e.target.value) || 5)) }; update("testimonials", { items: arr });
                    }} />
                    <Input placeholder="Emoji (fallback)" value={t.emoji || ""} onChange={(e) => {
                      const arr = [...cfg.testimonials.items]; arr[i] = { ...t, emoji: e.target.value }; update("testimonials", { items: arr });
                    }} />
                    <div className="flex gap-1">
                      <Input placeholder="Avatar URL" value={t.avatarUrl || ""} onChange={(e) => {
                        const arr = [...cfg.testimonials.items]; arr[i] = { ...t, avatarUrl: e.target.value }; update("testimonials", { items: arr });
                      }} />
                      <label className="cursor-pointer">
                        <Button type="button" variant="outline" size="sm" asChild>
                          <span>{uploadingTesIdx === i ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}</span>
                        </Button>
                        <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                          const f = e.target.files?.[0]; if (!f) return;
                          setUploadingTesIdx(i);
                          const url = await upload(f, "avatars");
                          setUploadingTesIdx(null);
                          if (url) { const arr = [...cfg.testimonials.items]; arr[i] = { ...t, avatarUrl: url }; update("testimonials", { items: arr }); }
                        }} />
                      </label>
                    </div>
                  </div>
                </Card>
              ))}
              <Button variant="outline" onClick={() => {
                const novo: TestimonialItem = { id: crypto.randomUUID(), name: "", role: "", city: "", text: "", rating: 5, emoji: "🙂" };
                update("testimonials", { items: [...cfg.testimonials.items, novo] });
              }}><Plus className="h-3 w-3 mr-1" />Adicionar depoimento</Button>
            </div>
          </TabsContent>

          {/* CTA */}
          <TabsContent value="cta" className="mt-6">
            <Card className="p-6 space-y-3 max-w-2xl">
              <div><Label>Eyebrow</Label><Input value={cfg.cta.eyebrow} onChange={(e) => update("cta", { eyebrow: e.target.value })} /></div>
              <div><Label>Título</Label><Textarea value={cfg.cta.title} onChange={(e) => update("cta", { title: e.target.value })} /></div>
              <div><Label>Subtítulo</Label><Textarea value={cfg.cta.subtitle} onChange={(e) => update("cta", { subtitle: e.target.value })} /></div>
              <div className="grid md:grid-cols-2 gap-2">
                <div><Label>Texto do botão</Label><Input value={cfg.cta.button_label} onChange={(e) => update("cta", { button_label: e.target.value })} /></div>
                <div><Label>Caminho de redirecionamento</Label><Input value={cfg.cta.redirect_path} onChange={(e) => update("cta", { redirect_path: e.target.value })} /></div>
              </div>
              <div><Label>Rodapé (footnote)</Label><Input value={cfg.cta.footnote} onChange={(e) => update("cta", { footnote: e.target.value })} /></div>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-8 flex justify-end">
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar alterações
          </Button>
        </div>
      </main>
    </div>
  );
}
