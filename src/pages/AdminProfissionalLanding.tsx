import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { traduzirErro } from "@/lib/errorMessages";
import { ArrowDown, ArrowUp, ExternalLink, Loader2, Plus, Save, Trash2, Upload } from "lucide-react";
import { useFeatureFlags, useFeatureStatus } from "@/contexts/FeatureFlagsContext";
import { PAINEL_ICONES } from "@/lib/supplierLandingConfig";
import {
  DEFAULT_PROFISSIONAL,
  mesclarProfissional,
  type ProfissionalLandingConfig,
  type ProfRecurso,
} from "@/lib/profissionalLandingConfig";

const ICONE_LABEL: Record<string, string> = {
  inbox: "Caixa de entrada", message: "Mensagem", kanban: "Kanban", calendar: "Agenda", "calendar-heart": "Agenda com coração",
  users: "Pessoas", star: "Estrela", wallet: "Carteira", sparkles: "Brilho", "bar-chart": "Gráfico", refresh: "Sincronizar", shield: "Escudo",
};

function mover<T>(lista: T[], i: number, d: -1 | 1): T[] {
  const j = i + d;
  if (j < 0 || j >= lista.length) return lista;
  const n = [...lista];
  [n[i], n[j]] = [n[j], n[i]];
  return n;
}

type Secao = keyof ProfissionalLandingConfig;

// fora do componente para os inputs não perderem o foco a cada tecla
const Campo = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div><Label className="text-xs">{label}</Label>{children}</div>
);

/** Admin › Landing Profissional — textos da página /profissional. */
export default function AdminProfissionalLanding() {
  const { toast } = useToast();
  const flags = useFeatureFlags();
  const statusVagas = useFeatureStatus()("vagas");
  const [cfg, setCfg] = useState<ProfissionalLandingConfig>(DEFAULT_PROFISSIONAL);
  const [rowId, setRowId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [subindo, setSubindo] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase
        .from("profissional_landing_config" as any)
        .select("id, config")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle() as any);
      if (data) {
        setRowId(data.id);
        setCfg(mesclarProfissional(data.config));
      }
      setLoading(false);
    })();
  }, []);

  const set = <K extends Secao>(k: K, patch: Partial<ProfissionalLandingConfig[K]>) =>
    setCfg((c) => ({ ...c, [k]: { ...c[k], ...patch } }));
  const setRecurso = (i: number, patch: Partial<ProfRecurso>) =>
    set("recursos", { items: cfg.recursos.items.map((it, k) => (k === i ? { ...it, ...patch } : it)) });

  const salvar = async () => {
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const tabela = supabase.from("profissional_landing_config" as any) as any;
    const res = rowId
      ? await tabela.update({ config: cfg, updated_at: new Date().toISOString(), updated_by: u.user?.id ?? null }).eq("id", rowId)
      : await tabela.insert({ config: cfg, updated_by: u.user?.id ?? null }).select("id").single();
    if (!rowId && res.data?.id) setRowId(res.data.id);
    setSaving(false);
    if (res.error) toast({ title: "Erro ao salvar", description: traduzirErro(res.error), variant: "destructive" });
    else toast({ title: "Salvo!", description: "A página /profissional foi atualizada." });
  };

  const subirHero = async (file: File) => {
    setSubindo(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `profissional/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("supplier-landing").upload(path, file, { upsert: false, contentType: file.type });
    setSubindo(false);
    if (error) return toast({ title: "Erro no upload", description: traduzirErro(error), variant: "destructive" });
    set("hero", { imagem: supabase.storage.from("supplier-landing").getPublicUrl(path).data.publicUrl });
  };

  if (loading) return <div className="p-8"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-14 z-30 border-b bg-card">
        <div className="container flex h-14 items-center justify-between">
          <h1 className="font-semibold">Landing /profissional</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href="/profissional" target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-1 h-3 w-3" />Ver página</a>
            </Button>
            <Button size="sm" onClick={salvar} disabled={saving}>
              {saving ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Save className="mr-1 h-3 w-3" />}Salvar
            </Button>
          </div>
        </div>
      </header>

      <main className="container space-y-4 py-6">
        <Card className="max-w-3xl p-4 text-sm">
          <strong>Situação do recurso “vagas”: </strong>
          {statusVagas === "ativo" && "ligado: a página mostra o cadastro e as vagas abertas."}
          {statusVagas === "em_breve" && "desligado com “Em breve”: a página aparece com o selo e o botão vira lista de espera (e-mails em Admin › E-mails do CTA, origem espera_profissional)."}
          {statusVagas === "oculto" && "desligado e oculto: /profissional volta para a Home."}
          <span className="text-muted-foreground"> Mude em Admin › Feature flags.</span>
        </Card>

        <Tabs defaultValue="hero">
          <TabsList className="flex h-auto flex-wrap">
            <TabsTrigger value="hero">Hero</TabsTrigger>
            <TabsTrigger value="como">Como funciona</TabsTrigger>
            <TabsTrigger value="funcoes">Funções</TabsTrigger>
            <TabsTrigger value="recursos">Painel (recursos)</TabsTrigger>
            <TabsTrigger value="vagas">Vagas abertas</TabsTrigger>
            <TabsTrigger value="combinado">Combinado</TabsTrigger>
            <TabsTrigger value="faq">Dúvidas</TabsTrigger>
            <TabsTrigger value="cta">CTA final</TabsTrigger>
          </TabsList>

          <TabsContent value="hero" className="mt-6">
            <Card className="max-w-2xl space-y-4 p-6">
              <Campo label="Eyebrow"><Input value={cfg.hero.eyebrow} onChange={(e) => set("hero", { eyebrow: e.target.value })} /></Campo>
              <div className="grid gap-3 md:grid-cols-2">
                <Campo label="Título — parte normal"><Input value={cfg.hero.title_pre} onChange={(e) => set("hero", { title_pre: e.target.value })} /></Campo>
                <Campo label="Título — trecho em itálico"><Input value={cfg.hero.title_em} onChange={(e) => set("hero", { title_em: e.target.value })} /></Campo>
              </div>
              <Campo label="Subtítulo"><Textarea value={cfg.hero.subtitle} onChange={(e) => set("hero", { subtitle: e.target.value })} /></Campo>
              <Campo label="Texto do botão (quando vagas está ligado)"><Input value={cfg.hero.cta_label} onChange={(e) => set("hero", { cta_label: e.target.value })} /></Campo>
              <div className="space-y-2">
                <Label className="text-xs">Imagem de fundo (sugerido 2400×1400, JPG até 500 KB; vazio = imagem padrão)</Label>
                {cfg.hero.imagem && <img src={cfg.hero.imagem} alt="" className="h-32 w-full rounded-md object-cover" />}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild disabled={subindo}>
                    <label className="cursor-pointer">
                      {subindo ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Upload className="mr-1 h-3 w-3" />}Enviar imagem
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && subirHero(e.target.files[0])} />
                    </label>
                  </Button>
                  {cfg.hero.imagem && <Button variant="ghost" size="sm" onClick={() => set("hero", { imagem: "" })}>Usar padrão</Button>}
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="como" className="mt-6 space-y-4">
            <Card className="max-w-2xl space-y-4 p-6">
              <Campo label="Eyebrow"><Input value={cfg.como.eyebrow} onChange={(e) => set("como", { eyebrow: e.target.value })} /></Campo>
              <Campo label="Título"><Input value={cfg.como.title} onChange={(e) => set("como", { title: e.target.value })} /></Campo>
            </Card>
            {cfg.como.passos.map((p, i) => (
              <Card key={i} className="max-w-2xl space-y-3 p-4">
                <Campo label={`Passo ${i + 1} — título`}><Input value={p.titulo} onChange={(e) => set("como", { passos: cfg.como.passos.map((x, k) => (k === i ? { ...x, titulo: e.target.value } : x)) })} /></Campo>
                <Campo label="Texto"><Textarea rows={2} value={p.texto} onChange={(e) => set("como", { passos: cfg.como.passos.map((x, k) => (k === i ? { ...x, texto: e.target.value } : x)) })} /></Campo>
                <div className="flex justify-end gap-1">
                  <Button size="icon" variant="ghost" aria-label="Subir" onClick={() => set("como", { passos: mover(cfg.como.passos, i, -1) })}><ArrowUp className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" aria-label="Descer" onClick={() => set("como", { passos: mover(cfg.como.passos, i, 1) })}><ArrowDown className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" aria-label="Remover" onClick={() => set("como", { passos: cfg.como.passos.filter((_, k) => k !== i) })}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </Card>
            ))}
            {cfg.como.passos.length < 4 && (
              <Button variant="outline" onClick={() => set("como", { passos: [...cfg.como.passos, { titulo: "Novo passo", texto: "" }] })}><Plus className="mr-1 h-4 w-4" />Adicionar passo</Button>
            )}
          </TabsContent>

          <TabsContent value="funcoes" className="mt-6">
            <Card className="max-w-2xl space-y-4 p-6">
              <p className="text-xs text-muted-foreground">A lista de funções vem do cadastro de profissionais (a mesma do onboarding). Funções com vaga aberta ganham o selo “vaga aberta”.</p>
              <Campo label="Eyebrow"><Input value={cfg.funcoes.eyebrow} onChange={(e) => set("funcoes", { eyebrow: e.target.value })} /></Campo>
              <Campo label="Título"><Input value={cfg.funcoes.title} onChange={(e) => set("funcoes", { title: e.target.value })} /></Campo>
              <Campo label="Subtítulo"><Textarea value={cfg.funcoes.subtitle} onChange={(e) => set("funcoes", { subtitle: e.target.value })} /></Campo>
            </Card>
          </TabsContent>

          <TabsContent value="recursos" className="mt-6 space-y-4">
            <Card className="max-w-2xl space-y-4 p-6">
              <Campo label="Eyebrow"><Input value={cfg.recursos.eyebrow} onChange={(e) => set("recursos", { eyebrow: e.target.value })} /></Campo>
              <Campo label="Título"><Input value={cfg.recursos.title} onChange={(e) => set("recursos", { title: e.target.value })} /></Campo>
              <Campo label="Subtítulo"><Textarea value={cfg.recursos.subtitle} onChange={(e) => set("recursos", { subtitle: e.target.value })} /></Campo>
              <p className="text-xs text-muted-foreground">Cada recurso pode depender de uma feature flag. Ligada: aparece normal. Desligada: aparece com “Em breve” (ou some, se o “Em breve” da flag estiver desligado).</p>
            </Card>
            {cfg.recursos.items.map((it, i) => (
              <Card key={it.id} className="space-y-3 p-4">
                <div className="grid gap-3 md:grid-cols-[180px,1fr,1fr]">
                  <Campo label="Ícone">
                    <select value={it.icone} onChange={(e) => setRecurso(i, { icone: e.target.value as ProfRecurso["icone"] })} className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm">
                      {PAINEL_ICONES.map((ic) => <option key={ic} value={ic}>{ICONE_LABEL[ic] ?? ic}</option>)}
                    </select>
                  </Campo>
                  <Campo label="Título"><Input value={it.titulo} onChange={(e) => setRecurso(i, { titulo: e.target.value })} /></Campo>
                  <Campo label="Feature flag">
                    <select value={it.flag ?? ""} onChange={(e) => setRecurso(i, { flag: e.target.value || undefined })} className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm">
                      <option value="">Sempre aparece</option>
                      {Object.keys(flags).sort().map((k) => <option key={k} value={k}>{k}{flags[k] ? " (ligada)" : " (desligada)"}</option>)}
                    </select>
                  </Campo>
                </div>
                <Campo label="Texto"><Textarea rows={2} value={it.texto} onChange={(e) => setRecurso(i, { texto: e.target.value })} /></Campo>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">Cor</Label>
                    <select value={it.tom ?? "escuro"} onChange={(e) => setRecurso(i, { tom: e.target.value as ProfRecurso["tom"] })} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
                      <option value="escuro">Escuro</option><option value="pessego">Pêssego</option><option value="salvia">Sálvia</option>
                    </select>
                  </div>
                  <label className="flex items-center gap-2 text-xs"><Switch checked={!!it.largo} onCheckedChange={(v) => setRecurso(i, { largo: v })} />Bloco largo</label>
                  <span className="ml-auto flex gap-1">
                    <Button size="icon" variant="ghost" aria-label="Subir" onClick={() => set("recursos", { items: mover(cfg.recursos.items, i, -1) })}><ArrowUp className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" aria-label="Descer" onClick={() => set("recursos", { items: mover(cfg.recursos.items, i, 1) })}><ArrowDown className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" aria-label="Remover" onClick={() => set("recursos", { items: cfg.recursos.items.filter((_, k) => k !== i) })}><Trash2 className="h-4 w-4" /></Button>
                  </span>
                </div>
              </Card>
            ))}
            <Button variant="outline" onClick={() => set("recursos", { items: [...cfg.recursos.items, { id: `r${Date.now()}`, icone: "sparkles", titulo: "Novo recurso", texto: "" }] })}>
              <Plus className="mr-1 h-4 w-4" />Adicionar recurso
            </Button>
          </TabsContent>

          <TabsContent value="vagas" className="mt-6">
            <Card className="max-w-2xl space-y-4 p-6">
              <p className="text-xs text-muted-foreground">Esta seção aparece com o recurso “vagas” ligado. Com vagas publicadas, mostra até 6; sem nenhuma, mostra o aviso abaixo. Só fornecedores com plano pago (recurso “Equipe e vagas” no plano) ou em período de teste publicam vagas.</p>
              <Campo label="Eyebrow"><Input value={cfg.vagas.eyebrow} onChange={(e) => set("vagas", { eyebrow: e.target.value })} /></Campo>
              <Campo label="Título"><Input value={cfg.vagas.title} onChange={(e) => set("vagas", { title: e.target.value })} /></Campo>
              <Campo label="Subtítulo"><Textarea value={cfg.vagas.subtitle} onChange={(e) => set("vagas", { subtitle: e.target.value })} /></Campo>
              <hr />
              <p className="text-sm font-semibold">Quando ainda não há nenhuma vaga publicada</p>
              <Campo label="Título"><Input value={cfg.vagas.vazio_title} onChange={(e) => set("vagas", { vazio_title: e.target.value })} /></Campo>
              <Campo label="Texto"><Textarea rows={3} value={cfg.vagas.vazio_texto} onChange={(e) => set("vagas", { vazio_texto: e.target.value })} /></Campo>
            </Card>
          </TabsContent>

          <TabsContent value="combinado" className="mt-6">
            <Card className="max-w-2xl space-y-4 p-6">
              <Campo label="Eyebrow"><Input value={cfg.combinado.eyebrow} onChange={(e) => set("combinado", { eyebrow: e.target.value })} /></Campo>
              <Campo label="Título"><Input value={cfg.combinado.title} onChange={(e) => set("combinado", { title: e.target.value })} /></Campo>
              <Campo label="Texto"><Textarea rows={3} value={cfg.combinado.texto} onChange={(e) => set("combinado", { texto: e.target.value })} /></Campo>
              <Campo label="Itens com ✓ (um por linha; também aparecem embaixo do botão do hero)">
                <Textarea rows={4} value={cfg.combinado.itens.join("\n")} onChange={(e) => set("combinado", { itens: e.target.value.split("\n").filter(Boolean) })} />
              </Campo>
            </Card>
          </TabsContent>

          <TabsContent value="faq" className="mt-6 space-y-4">
            <Card className="max-w-2xl p-6">
              <Campo label="Título da seção"><Input value={cfg.faq.title} onChange={(e) => set("faq", { title: e.target.value })} /></Campo>
            </Card>
            {cfg.faq.items.map((f, i) => (
              <Card key={f.id} className="max-w-2xl space-y-3 p-4">
                <Campo label="Pergunta"><Input value={f.q} onChange={(e) => set("faq", { items: cfg.faq.items.map((x, k) => (k === i ? { ...x, q: e.target.value } : x)) })} /></Campo>
                <Campo label="Resposta"><Textarea rows={3} value={f.a} onChange={(e) => set("faq", { items: cfg.faq.items.map((x, k) => (k === i ? { ...x, a: e.target.value } : x)) })} /></Campo>
                <div className="flex justify-end gap-1">
                  <Button size="icon" variant="ghost" aria-label="Subir" onClick={() => set("faq", { items: mover(cfg.faq.items, i, -1) })}><ArrowUp className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" aria-label="Descer" onClick={() => set("faq", { items: mover(cfg.faq.items, i, 1) })}><ArrowDown className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" aria-label="Remover" onClick={() => set("faq", { items: cfg.faq.items.filter((_, k) => k !== i) })}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </Card>
            ))}
            <Button variant="outline" onClick={() => set("faq", { items: [...cfg.faq.items, { id: `q${Date.now()}`, q: "Nova pergunta", a: "" }] })}><Plus className="mr-1 h-4 w-4" />Adicionar pergunta</Button>
          </TabsContent>

          <TabsContent value="cta" className="mt-6">
            <Card className="max-w-2xl space-y-4 p-6">
              <p className="text-sm font-semibold">Com o recurso “vagas” ligado (leva ao cadastro com o e-mail preenchido)</p>
              <Campo label="Título"><Input value={cfg.cta.title} onChange={(e) => set("cta", { title: e.target.value })} /></Campo>
              <Campo label="Subtítulo"><Textarea value={cfg.cta.subtitle} onChange={(e) => set("cta", { subtitle: e.target.value })} /></Campo>
              <Campo label="Botão"><Input value={cfg.cta.button_label} onChange={(e) => set("cta", { button_label: e.target.value })} /></Campo>
              <hr />
              <p className="text-sm font-semibold">Em breve (lista de espera)</p>
              <Campo label="Título"><Input value={cfg.cta.espera_title} onChange={(e) => set("cta", { espera_title: e.target.value })} /></Campo>
              <Campo label="Subtítulo"><Textarea value={cfg.cta.espera_subtitle} onChange={(e) => set("cta", { espera_subtitle: e.target.value })} /></Campo>
              <Campo label="Botão"><Input value={cfg.cta.espera_button} onChange={(e) => set("cta", { espera_button: e.target.value })} /></Campo>
              <hr />
              <Campo label="Nota abaixo do botão"><Input value={cfg.cta.footnote} onChange={(e) => set("cta", { footnote: e.target.value })} /></Campo>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
