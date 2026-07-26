import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Heart, ArrowLeft, Plus, Save, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CATEGORIAS_PRECO, MODO_LABEL, formatBRL, type PlatformPrice, type PriceCategoria, type PriceModo } from "@/lib/platformPricing";

type CategoriaRef = { id: string; name: string; slug: string };

export default function AdminPlatformPrices() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [checked, setChecked] = useState(false);
  const [rows, setRows] = useState<PlatformPrice[]>([]);
  const [cats, setCats] = useState<CategoriaRef[]>([]);
  const [tab, setTab] = useState<PriceCategoria>("reservas");
  const [editing, setEditing] = useState<PlatformPrice | null>(null);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    const { data } = await (supabase.from("platform_prices" as any).select("*").order("categoria").order("label") as any);
    if (data) setRows(data as PlatformPrice[]);
    const { data: cData } = await supabase.from("categories").select("id, name, slug").order("name");
    if (cData) setCats(cData as any);
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login"); return; }
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }).then(({ data }) => {
      if (!data) { navigate("/"); return; }
      setChecked(true);
      load();
    });
  }, [user, authLoading, navigate]);

  const grouped = CATEGORIAS_PRECO.map(c => ({
    ...c,
    items: rows.filter(r => r.categoria === c.key),
  }));

  const save = async (row: PlatformPrice, isNew: boolean) => {
    const payload: any = {
      chave: row.chave, categoria: row.categoria, label: row.label, descricao: row.descricao,
      modo: row.modo, valor_fixo: Number(row.valor_fixo || 0), percentual: Number(row.percentual || 0),
      valor_min: row.valor_min == null || row.valor_min === ("" as any) ? null : Number(row.valor_min),
      valor_max: row.valor_max == null || row.valor_max === ("" as any) ? null : Number(row.valor_max),
      moeda: row.moeda || "BRL", ativo: row.ativo, overrides: row.overrides || {},
      updated_by: user!.id, updated_at: new Date().toISOString(),
    };
    if (!isNew) payload.id = row.id;
    const q = isNew
      ? await (supabase.from("platform_prices" as any) as any).insert(payload)
      : await (supabase.from("platform_prices" as any) as any).update(payload).eq("id", row.id);
    if (q.error) { toast({ title: "Erro", description: q.error.message, variant: "destructive" }); return; }
    toast({ title: "Preço salvo" });
    setEditing(null); setCreating(false); load();
  };

  if (!checked) return <div className="min-h-screen flex items-center justify-center">Verificando...</div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b sticky top-0 z-40">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild><Link to="/admin"><ArrowLeft className="h-4 w-4" /></Link></Button>
            <Heart className="h-5 w-5 text-primary fill-primary" />
            <span className="font-bold">Tabela de preços</span>
          </div>
          <Button onClick={() => { setCreating(true); setEditing({ id: "", chave: "", categoria: tab, label: "", descricao: "", modo: "fixo", valor_fixo: 0, percentual: 0, valor_min: null, valor_max: null, moeda: "BRL", ativo: true, overrides: {}, updated_at: "" }); }}>
            <Plus className="h-4 w-4 mr-1" /> Novo preço
          </Button>
        </div>
      </header>
      <main className="container py-6 max-w-4xl">
        <p className="text-sm text-muted-foreground mb-4">
          Centraliza os valores cobrados pela plataforma. Cada preço tem uma chave única usada no código.
          Você pode configurar sobrescritas por categoria de fornecedor.
        </p>

        <Tabs value={tab} onValueChange={(v) => setTab(v as PriceCategoria)}>
          <TabsList className="mb-4">
            {CATEGORIAS_PRECO.map(c => (
              <TabsTrigger key={c.key} value={c.key}>{c.label}</TabsTrigger>
            ))}
          </TabsList>

          {grouped.map(g => (
            <TabsContent key={g.key} value={g.key} className="space-y-3">
              {g.items.length === 0 && (
                <p className="text-sm text-muted-foreground italic">Nenhum preço nesta aba.</p>
              )}
              {g.items.map(row => (
                <Card key={row.id}>
                  <CardHeader className="flex flex-row items-start justify-between pb-2">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Tag className="h-4 w-4 text-muted-foreground" /> {row.label}
                        {!row.ativo && <Badge variant="secondary">inativo</Badge>}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        <code className="bg-muted px-1 rounded">{row.chave}</code> · {MODO_LABEL[row.modo]}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setEditing(row)}>Editar</Button>
                  </CardHeader>
                  <CardContent className="text-sm space-y-1">
                    <div>
                      {row.modo === "fixo" && <>Valor: <strong>{formatBRL(row.valor_fixo)}</strong></>}
                      {row.modo === "percentual" && <>Percentual: <strong>{row.percentual}%</strong></>}
                      {row.modo === "hibrido" && <>Fixo <strong>{formatBRL(row.valor_fixo)}</strong> + <strong>{row.percentual}%</strong></>}
                      {(row.valor_min || row.valor_max) && (
                        <span className="text-muted-foreground ml-2">
                          {row.valor_min ? `mín ${formatBRL(row.valor_min)}` : ""}
                          {row.valor_min && row.valor_max ? " · " : ""}
                          {row.valor_max ? `máx ${formatBRL(row.valor_max)}` : ""}
                        </span>
                      )}
                    </div>
                    {row.descricao && <p className="text-muted-foreground">{row.descricao}</p>}
                    {Object.keys(row.overrides || {}).length > 0 && (
                      <p className="text-xs text-primary">Sobrescritas por categoria: {Object.keys(row.overrides).length}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          ))}
        </Tabs>
      </main>

      {editing && (
        <PriceEditor
          row={editing}
          isNew={creating}
          cats={cats}
          onCancel={() => { setEditing(null); setCreating(false); }}
          onSave={save}
        />
      )}
    </div>
  );
}

function PriceEditor({ row: initial, isNew, cats, onCancel, onSave }: {
  row: PlatformPrice; isNew: boolean; cats: CategoriaRef[];
  onCancel: () => void; onSave: (r: PlatformPrice, isNew: boolean) => void;
}) {
  const [r, setR] = useState<PlatformPrice>(initial);
  const overrideKeys = Object.keys(r.overrides || {});

  const addOverride = (slug: string) => {
    if (!slug || (r.overrides || {})[slug]) return;
    setR({ ...r, overrides: { ...(r.overrides || {}), [slug]: { modo: r.modo, valor_fixo: r.valor_fixo, percentual: r.percentual } } });
  };
  const setOverride = (slug: string, field: string, value: any) => {
    setR({ ...r, overrides: { ...(r.overrides || {}), [slug]: { ...(r.overrides || {})[slug], [field]: value } } });
  };
  const removeOverride = (slug: string) => {
    const cp = { ...(r.overrides || {}) }; delete cp[slug]; setR({ ...r, overrides: cp });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isNew ? "Novo preço" : "Editar preço"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Chave (única)</Label>
              <Input value={r.chave} onChange={e => setR({ ...r, chave: e.target.value })} disabled={!isNew} placeholder="reserva_data_ociosa" />
            </div>
            <div>
              <Label>Categoria</Label>
              <Select value={r.categoria} onValueChange={(v) => setR({ ...r, categoria: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIAS_PRECO.map(c => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Rótulo</Label>
            <Input value={r.label} onChange={e => setR({ ...r, label: e.target.value })} />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea value={r.descricao ?? ""} onChange={e => setR({ ...r, descricao: e.target.value })} rows={2} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Modo</Label>
              <Select value={r.modo} onValueChange={(v) => setR({ ...r, modo: v as PriceModo })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixo">Valor fixo</SelectItem>
                  <SelectItem value="percentual">Percentual</SelectItem>
                  <SelectItem value="hibrido">Fixo + percentual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Valor fixo (R$)</Label>
              <Input type="number" step="0.01" value={r.valor_fixo} onChange={e => setR({ ...r, valor_fixo: Number(e.target.value) })} disabled={r.modo === "percentual"} />
            </div>
            <div>
              <Label>Percentual (%)</Label>
              <Input type="number" step="0.01" value={r.percentual} onChange={e => setR({ ...r, percentual: Number(e.target.value) })} disabled={r.modo === "fixo"} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Mínimo (R$, opcional)</Label>
              <Input type="number" step="0.01" value={r.valor_min ?? ""} onChange={e => setR({ ...r, valor_min: e.target.value === "" ? null : Number(e.target.value) })} />
            </div>
            <div>
              <Label>Máximo (R$, opcional)</Label>
              <Input type="number" step="0.01" value={r.valor_max ?? ""} onChange={e => setR({ ...r, valor_max: e.target.value === "" ? null : Number(e.target.value) })} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={r.ativo} onCheckedChange={(v) => setR({ ...r, ativo: v })} />
            <Label>Ativo</Label>
          </div>

          <div className="border-t pt-4">
            <Label className="text-sm">Sobrescritas por categoria de fornecedor</Label>
            <p className="text-xs text-muted-foreground mb-2">Permite cobrar valores diferentes por categoria.</p>
            <div className="space-y-2">
              {overrideKeys.map(slug => {
                const o = r.overrides[slug] || {};
                const cat = cats.find(c => c.slug === slug);
                return (
                  <div key={slug} className="border rounded p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <strong className="text-sm">{cat?.name || slug}</strong>
                      <Button size="sm" variant="ghost" onClick={() => removeOverride(slug)}>Remover</Button>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <Label className="text-xs">Modo</Label>
                        <Select value={(o.modo as string) ?? r.modo} onValueChange={(v) => setOverride(slug, "modo", v)}>
                          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fixo">Fixo</SelectItem>
                            <SelectItem value="percentual">%</SelectItem>
                            <SelectItem value="hibrido">Híbrido</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Fixo</Label>
                        <Input className="h-8" type="number" step="0.01" value={(o.valor_fixo as number) ?? ""} onChange={e => setOverride(slug, "valor_fixo", Number(e.target.value))} />
                      </div>
                      <div>
                        <Label className="text-xs">%</Label>
                        <Input className="h-8" type="number" step="0.01" value={(o.percentual as number) ?? ""} onChange={e => setOverride(slug, "percentual", Number(e.target.value))} />
                      </div>
                    </div>
                  </div>
                );
              })}
              <Select value="" onValueChange={addOverride}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Adicionar sobrescrita por categoria..." /></SelectTrigger>
                <SelectContent>
                  {cats.filter(c => !overrideKeys.includes(c.slug)).map(c => (
                    <SelectItem key={c.id} value={c.slug}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button onClick={() => onSave(r, isNew)}><Save className="h-4 w-4 mr-1" /> Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}