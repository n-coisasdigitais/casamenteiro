import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Eye, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import MarkdownSimples from "@/components/ajuda/MarkdownSimples";
import { ICONES_AJUDA } from "@/components/ajuda/IconeAjuda";
import { carregarConteudoAjuda } from "@/lib/ajuda";
import { carregarDadosFornecedor } from "@/lib/fornecedorLanding";
import { PUBLICOS, preencherAjuda, type ConteudoAjuda, type FaqItem, type Publico, type ValoresAjuda } from "@/lib/ajudaTexto";

const PUB_OPCOES = [{ valor: "todos", rotulo: "Todos" }, ...PUBLICOS];
const NOVO: Omit<FaqItem, "id"> = { publico: "todos", categoria: "", pergunta: "", slug: "", resposta: "", feature_flag: null, ordem: 0, ativo: true };
const slugify = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
const PLACEHOLDERS = "{taxa_reserva} {carencia_dias} {teste_dias} {aprovacao_horas} {preco_pro} {preco_premium} {preco_pro_anual} {preco_premium_anual}";

export default function AdminAjuda() {
  const { toast } = useToast();
  const [itens, setItens] = useState<FaqItem[]>([]);
  const [flags, setFlags] = useState<{ key: string; label: string | null }[]>([]);
  const [valores, setValores] = useState<ValoresAjuda | null>(null);
  const [conteudo, setConteudo] = useState<ConteudoAjuda | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [fPub, setFPub] = useState("todas");
  const [fCat, setFCat] = useState("todas");
  const [edit, setEdit] = useState<(Omit<FaqItem, "id"> & { id?: string }) | null>(null);
  const [preview, setPreview] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const carregar = async () => {
    setCarregando(true);
    const [f, fl, c, forn] = await Promise.all([
      (supabase.from("faq_itens" as any) as any).select("*").order("publico").order("ordem"),
      (supabase.from("feature_flags" as any) as any).select("key, label").order("key"),
      carregarConteudoAjuda(),
      carregarDadosFornecedor(),
    ]);
    setItens((f.data as FaqItem[]) ?? []);
    setFlags((fl.data as any[]) ?? []);
    setConteudo(c);
    setValores({ taxaReserva: forn.taxaReserva, carenciaDias: forn.carenciaDias, testeDias: forn.testeDias, aprovacaoHoras: forn.aprovacaoHoras, planos: forn.planos });
    setCarregando(false);
  };
  useEffect(() => { carregar(); }, []);

  const categorias = useMemo(() => [...new Set(itens.map((i) => i.categoria))].sort(), [itens]);
  const filtrados = itens.filter((i) => (fPub === "todas" || i.publico === fPub) && (fCat === "todas" || i.categoria === fCat));

  const salvarItem = async () => {
    if (!edit) return;
    if (!edit.pergunta.trim() || !edit.resposta.trim() || !edit.categoria.trim()) {
      toast({ title: "Preencha pergunta, resposta e categoria", variant: "destructive" });
      return;
    }
    setSalvando(true);
    const { id, ...dados } = edit;
    const row = { ...dados, slug: slugify(dados.slug || dados.pergunta), feature_flag: dados.feature_flag || null };
    const q = (supabase.from("faq_itens" as any) as any);
    const { error } = id ? await q.update(row).eq("id", id) : await q.insert(row);
    setSalvando(false);
    if (error) {
      toast({ title: "Não foi possível salvar", description: error.code === "23505" ? "Já existe uma pergunta com esse endereço (slug)." : error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Pergunta salva" });
    setEdit(null);
    carregar();
  };

  const alternar = async (i: FaqItem, ativo: boolean) => {
    setItens((xs) => xs.map((x) => (x.id === i.id ? { ...x, ativo } : x)));
    const { error } = await (supabase.from("faq_itens" as any) as any).update({ ativo }).eq("id", i.id);
    if (error) { toast({ title: "Não foi possível alterar", variant: "destructive" }); carregar(); }
  };

  const remover = async (i: FaqItem) => {
    if (!confirm(`Remover “${i.pergunta}”?`)) return;
    await (supabase.from("faq_itens" as any) as any).delete().eq("id", i.id);
    carregar();
  };

  // troca a ordem com o vizinho do mesmo público
  const mover = async (i: FaqItem, dir: -1 | 1) => {
    const grupo = itens.filter((x) => x.publico === i.publico).sort((a, b) => a.ordem - b.ordem);
    const idx = grupo.findIndex((x) => x.id === i.id);
    const viz = grupo[idx + dir];
    if (!viz) return;
    const a = i.ordem === viz.ordem ? viz.ordem + dir : viz.ordem;
    await Promise.all([
      (supabase.from("faq_itens" as any) as any).update({ ordem: a }).eq("id", i.id),
      (supabase.from("faq_itens" as any) as any).update({ ordem: i.ordem }).eq("id", viz.id),
    ]);
    carregar();
  };

  const salvarConteudo = async () => {
    if (!conteudo) return;
    setSalvando(true);
    const { error } = await (supabase.from("system_settings" as any) as any).upsert({ key: "ajuda_conteudo", value: conteudo }, { onConflict: "key" });
    setSalvando(false);
    toast(error ? { title: "Não foi possível salvar", description: error.message, variant: "destructive" } : { title: "Conteúdo da Central de Ajuda salvo" });
  };

  const setLista = (campo: "passos" | "funcionalidades", pub: Publico, lista: any[]) =>
    setConteudo((c) => (c ? { ...c, [campo]: { ...c[campo], [pub]: lista } } : c));

  if (carregando || !conteudo) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Central de Ajuda</h1>
        <p className="text-muted-foreground">Perguntas, textos e funcionalidades da página pública <a href="/ajuda" target="_blank" className="underline">/ajuda</a>.</p>
      </div>

      <Tabs defaultValue="perguntas">
        <TabsList className="flex-wrap">
          <TabsTrigger value="perguntas">Perguntas</TabsTrigger>
          <TabsTrigger value="textos">Textos e passos</TabsTrigger>
          <TabsTrigger value="funcionalidades">Funcionalidades</TabsTrigger>
        </TabsList>

        <TabsContent value="perguntas" className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-44">
              <Label>Público</Label>
              <Select value={fPub} onValueChange={setFPub}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="todas">Todos os públicos</SelectItem>{PUB_OPCOES.map((p) => <SelectItem key={p.valor} value={p.valor}>{p.rotulo}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="w-56">
              <Label>Categoria</Label>
              <Select value={fCat} onValueChange={setFCat}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="todas">Todas</SelectItem>{categorias.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button className="ml-auto" onClick={() => { setEdit({ ...NOVO, ordem: (Math.max(0, ...itens.map((i) => i.ordem)) + 10) }); setPreview(false); }}>
              <Plus className="mr-1 h-4 w-4" /> Nova pergunta
            </Button>
          </div>

          <div className="divide-y rounded-xl border bg-card">
            {filtrados.length === 0 && <p className="p-6 text-muted-foreground">Nenhuma pergunta.</p>}
            {filtrados.map((i) => (
              <div key={i.id} className="flex flex-wrap items-center gap-3 p-3">
                <div className="flex flex-col">
                  <button aria-label="Subir" onClick={() => mover(i, -1)}><ArrowUp className="h-4 w-4" /></button>
                  <button aria-label="Descer" onClick={() => mover(i, 1)}><ArrowDown className="h-4 w-4" /></button>
                </div>
                <div className="min-w-0 flex-1">
                  <button className="text-left font-semibold hover:underline" onClick={() => { setEdit(i); setPreview(false); }}>{i.pergunta}</button>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <Badge variant="secondary">{PUB_OPCOES.find((p) => p.valor === i.publico)?.rotulo}</Badge>
                    <Badge variant="outline">{i.categoria}</Badge>
                    {i.feature_flag && <Badge variant="outline">recurso: {i.feature_flag}</Badge>}
                  </div>
                </div>
                <Switch checked={i.ativo} onCheckedChange={(v) => alternar(i, v)} aria-label={`Ativar ${i.pergunta}`} />
                <Button variant="ghost" size="icon" aria-label="Remover" onClick={() => remover(i)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="textos" className="space-y-6">
          <div className="space-y-3 rounded-xl border bg-card p-4">
            <h2 className="font-bold">Abertura da página</h2>
            <div><Label>Título</Label><Input value={conteudo.hero.titulo} onChange={(e) => setConteudo({ ...conteudo, hero: { ...conteudo.hero, titulo: e.target.value } })} /></div>
            <div><Label>Proposta de valor</Label><Textarea rows={3} value={conteudo.hero.texto} onChange={(e) => setConteudo({ ...conteudo, hero: { ...conteudo.hero, texto: e.target.value } })} /></div>
          </div>
          {PUBLICOS.map(({ valor, rotulo }) => (
            <ListaEditavel key={valor} titulo={`Como funciona — ${rotulo}`} lista={conteudo.passos[valor]} max={4} comFlag={false}
              onChange={(l) => setLista("passos", valor, l)} flags={flags} />
          ))}
          <Button onClick={salvarConteudo} disabled={salvando}><Save className="mr-1 h-4 w-4" /> Salvar textos</Button>
        </TabsContent>

        <TabsContent value="funcionalidades" className="space-y-6">
          <p className="text-sm text-muted-foreground">Cada card segue o recurso escolhido: ligado aparece normal; desligado com “Em breve” (Configurações) mostra o selo; senão some. Máximo de 8 por público.</p>
          {PUBLICOS.map(({ valor, rotulo }) => (
            <ListaEditavel key={valor} titulo={`Funcionalidades — ${rotulo}`} lista={conteudo.funcionalidades[valor]} max={8} comFlag
              onChange={(l) => setLista("funcionalidades", valor, l)} flags={flags} />
          ))}
          <Button onClick={salvarConteudo} disabled={salvando}><Save className="mr-1 h-4 w-4" /> Salvar funcionalidades</Button>
        </TabsContent>
      </Tabs>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>{edit?.id ? "Editar pergunta" : "Nova pergunta"}</DialogTitle></DialogHeader>
          {edit && (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Público</Label>
                  <Select value={edit.publico} onValueChange={(v) => setEdit({ ...edit, publico: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PUB_OPCOES.map((p) => <SelectItem key={p.valor} value={p.valor}>{p.rotulo}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Categoria</Label><Input list="aj-cats" value={edit.categoria} onChange={(e) => setEdit({ ...edit, categoria: e.target.value })} /><datalist id="aj-cats">{categorias.map((c) => <option key={c} value={c} />)}</datalist></div>
              </div>
              <div><Label>Pergunta</Label><Input value={edit.pergunta} onChange={(e) => setEdit({ ...edit, pergunta: e.target.value, slug: edit.id ? edit.slug : slugify(e.target.value) })} /></div>
              <div><Label>Endereço (âncora)</Label><Input value={edit.slug} onChange={(e) => setEdit({ ...edit, slug: e.target.value })} /><p className="mt-1 text-xs text-muted-foreground">/ajuda#{slugify(edit.slug || edit.pergunta)}</p></div>
              <div>
                <div className="flex items-center justify-between"><Label>Resposta</Label>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setPreview((p) => !p)}><Eye className="mr-1 h-4 w-4" />{preview ? "Editar" : "Pré-visualizar"}</Button>
                </div>
                {preview && valores ? (
                  <div className="rounded-md border bg-muted/40 p-3 text-sm"><MarkdownSimples texto={preencherAjuda(edit.resposta, valores)} /></div>
                ) : (
                  <Textarea rows={6} value={edit.resposta} onChange={(e) => setEdit({ ...edit, resposta: e.target.value })} />
                )}
                <p className="mt-1 text-xs text-muted-foreground">Use **negrito**, listas com “- ” e [texto](/link). Valores automáticos: {PLACEHOLDERS}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Só mostrar se o recurso estiver ligado</Label>
                  <Select value={edit.feature_flag || "_"} onValueChange={(v) => setEdit({ ...edit, feature_flag: v === "_" ? null : v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="_">Sempre mostrar</SelectItem>{flags.map((f) => <SelectItem key={f.key} value={f.key}>{f.label || f.key}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="flex items-end gap-2 pb-2"><Switch checked={edit.ativo} onCheckedChange={(v) => setEdit({ ...edit, ativo: v })} /><Label>Ativa</Label></div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEdit(null)}>Cancelar</Button>
                <Button onClick={salvarItem} disabled={salvando}>{salvando && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Salvar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ListaEditavel({ titulo, lista, max, comFlag, onChange, flags }: {
  titulo: string; lista: any[]; max: number; comFlag: boolean; onChange: (l: any[]) => void; flags: { key: string; label: string | null }[];
}) {
  const set = (i: number, campo: string, v: any) => onChange(lista.map((x, j) => (j === i ? { ...x, [campo]: v } : x)));
  const mover = (i: number, d: number) => { const n = [...lista]; const t = n[i + d]; if (!t) return; n[i + d] = n[i]; n[i] = t; onChange(n); };
  return (
    <div className="space-y-3 rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between"><h2 className="font-bold">{titulo}</h2><span className="text-xs text-muted-foreground">{lista.length}/{max}</span></div>
      {lista.map((x, i) => (
        <div key={i} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[auto_140px_1fr_1fr_auto]">
          <div className="flex gap-1 sm:flex-col">
            <button aria-label="Subir" onClick={() => mover(i, -1)}><ArrowUp className="h-4 w-4" /></button>
            <button aria-label="Descer" onClick={() => mover(i, 1)}><ArrowDown className="h-4 w-4" /></button>
          </div>
          <Select value={x.icone} onValueChange={(v) => set(i, "icone", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{ICONES_AJUDA.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
          </Select>
          <Input placeholder="Título" value={x.titulo} onChange={(e) => set(i, "titulo", e.target.value)} />
          <Input placeholder="Texto" value={x.texto} onChange={(e) => set(i, "texto", e.target.value)} />
          <Button variant="ghost" size="icon" aria-label="Remover" onClick={() => onChange(lista.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
          {comFlag && (
            <div className="sm:col-span-5">
              <Select value={x.flag || "_"} onValueChange={(v) => set(i, "flag", v === "_" ? null : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="_">Sem recurso (sempre aparece)</SelectItem>{flags.map((f) => <SelectItem key={f.key} value={f.key}>{f.label || f.key}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
        </div>
      ))}
      {lista.length < max && (
        <Button variant="outline" size="sm" onClick={() => onChange([...lista, comFlag ? { icone: "Sparkles", titulo: "", texto: "", flag: null } : { icone: "Sparkles", titulo: "", texto: "" }])}>
          <Plus className="mr-1 h-4 w-4" /> Adicionar
        </Button>
      )}
    </div>
  );
}
