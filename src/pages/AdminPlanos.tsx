import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Save, Sparkles, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatBRL } from "@/lib/platformPricing";
import { PLAN_FEATURES, PLAN_LIMITS, type PlanLimites, type PlanRecursos } from "@/lib/planFeatures";

type PlanoRow = {
  id: string;
  slug: string;
  nome: string;
  descricao: string | null;
  preco_mensal: number;
  preco_anual: number;
  beneficios: string[];
  limites: PlanLimites;
  recursos: PlanRecursos;
  destaque_busca: boolean;
  ativo: boolean;
  ordem: number;
};

type PacoteRow = { id: string; label: string; dias: number; valor: number; ativo: boolean; ordem: number };

const planoVazio = (): PlanoRow => ({
  id: "", slug: "", nome: "", descricao: "", preco_mensal: 0, preco_anual: 0,
  beneficios: [], limites: {}, recursos: {}, destaque_busca: false, ativo: true, ordem: 0,
});

export default function AdminPlanos() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [checked, setChecked] = useState(false);
  const [planos, setPlanos] = useState<PlanoRow[]>([]);
  const [pacotes, setPacotes] = useState<PacoteRow[]>([]);
  const [editando, setEditando] = useState<PlanoRow | null>(null);
  const [novo, setNovo] = useState(false);

  const load = async () => {
    const { data } = await (supabase.from("subscription_plans" as any).select("*").order("ordem") as any);
    setPlanos(((data as any[]) ?? []).map((p) => ({
      ...p, beneficios: Array.isArray(p.beneficios) ? p.beneficios : [], limites: p.limites ?? {}, recursos: p.recursos ?? {},
    })) as PlanoRow[]);
    const { data: pk } = await (supabase.from("featured_packages" as any).select("*").order("ordem") as any);
    setPacotes(((pk as any[]) ?? []).map((p) => ({ ...p, valor: Number(p.valor), dias: Number(p.dias) })) as PacoteRow[]);
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

  const salvarPlano = async (p: PlanoRow, isNew: boolean) => {
    const payload: any = {
      slug: p.slug.trim(), nome: p.nome.trim(), descricao: p.descricao,
      preco_mensal: Number(p.preco_mensal || 0), preco_anual: Number(p.preco_anual || 0),
      beneficios: p.beneficios, limites: p.limites, recursos: p.recursos,
      destaque_busca: p.destaque_busca, ativo: p.ativo, ordem: Number(p.ordem || 0),
    };
    if (!payload.slug || !payload.nome) {
      toast({ title: "Preencha nome e chave do plano", variant: "destructive" });
      return;
    }
    const q = isNew
      ? await (supabase.from("subscription_plans" as any) as any).insert(payload)
      : await (supabase.from("subscription_plans" as any) as any).update(payload).eq("id", p.id);
    if (q.error) { toast({ title: "Erro", description: q.error.message, variant: "destructive" }); return; }
    toast({ title: "Plano salvo" });
    setEditando(null); setNovo(false); load();
  };

  const salvarPacote = async (pac: PacoteRow) => {
    const payload = { label: pac.label, dias: Number(pac.dias || 0), valor: Number(pac.valor || 0), ativo: pac.ativo, ordem: Number(pac.ordem || 0) };
    const q = pac.id
      ? await (supabase.from("featured_packages" as any) as any).update(payload).eq("id", pac.id)
      : await (supabase.from("featured_packages" as any) as any).insert(payload);
    if (q.error) { toast({ title: "Erro", description: q.error.message, variant: "destructive" }); return; }
    toast({ title: "Pacote salvo" });
    load();
  };

  const excluirPacote = async (id: string) => {
    const { error } = await (supabase.from("featured_packages" as any) as any).delete().eq("id", id);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Pacote removido" });
    load();
  };

  if (!checked) return <div className="min-h-screen flex items-center justify-center">Verificando...</div>;

  return (
    <div className="container py-6 max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Planos e destaques</h1>
        <p className="text-sm text-muted-foreground">
          Defina valores, benefícios e quais funcionalidades cada plano libera para o fornecedor.
        </p>
      </div>

      <Tabs defaultValue="planos">
        <TabsList>
          <TabsTrigger value="planos">Planos de assinatura</TabsTrigger>
          <TabsTrigger value="destaques">Pacotes de destaque</TabsTrigger>
        </TabsList>

        <TabsContent value="planos" className="space-y-3 pt-4">
          <div className="flex justify-end">
            <Button onClick={() => { setNovo(true); setEditando(planoVazio()); }}>
              <Plus className="h-4 w-4 mr-1" /> Novo plano
            </Button>
          </div>
          {planos.length === 0 && <p className="text-sm text-muted-foreground italic">Nenhum plano cadastrado.</p>}
          {planos.map((p) => {
            const ativos = PLAN_FEATURES.filter((f) => p.recursos?.[f.key]);
            return (
              <Card key={p.id}>
                <CardHeader className="flex flex-row items-start justify-between pb-2">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {p.nome}
                      {p.destaque_busca && <Sparkles className="h-4 w-4 text-primary" />}
                      {!p.ativo && <Badge variant="secondary">inativo</Badge>}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      <code className="bg-muted px-1 rounded">{p.slug}</code> · {formatBRL(p.preco_mensal)}/mês · {formatBRL(p.preco_anual)}/ano
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => { setNovo(false); setEditando(p); }}>Editar</Button>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  {p.descricao && <p className="text-muted-foreground">{p.descricao}</p>}
                  <div className="flex flex-wrap gap-1">
                    {ativos.length === 0
                      ? <span className="text-xs text-muted-foreground italic">Nenhuma funcionalidade liberada.</span>
                      : ativos.map((f) => <Badge key={f.key} variant="secondary">{f.label}</Badge>)}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="destaques" className="space-y-3 pt-4">
          <p className="text-sm text-muted-foreground">
            Pacotes que o fornecedor compra para aparecer no topo da busca.
          </p>
          {pacotes.map((pac) => (
            <PacoteEditor key={pac.id} inicial={pac} onSave={salvarPacote} onDelete={() => excluirPacote(pac.id)} />
          ))}
          <PacoteEditor
            key={`novo-${pacotes.length}`}
            inicial={{ id: "", label: "", dias: 7, valor: 0, ativo: true, ordem: pacotes.length + 1 }}
            onSave={salvarPacote}
          />
        </TabsContent>
      </Tabs>

      {editando && (
        <PlanoEditor
          inicial={editando}
          isNew={novo}
          onCancel={() => { setEditando(null); setNovo(false); }}
          onSave={salvarPlano}
        />
      )}
    </div>
  );
}

function PlanoEditor({ inicial, isNew, onCancel, onSave }: {
  inicial: PlanoRow; isNew: boolean; onCancel: () => void; onSave: (p: PlanoRow, isNew: boolean) => void;
}) {
  const [p, setP] = useState<PlanoRow>(inicial);
  const [beneficiosTexto, setBeneficiosTexto] = useState((inicial.beneficios || []).join("\n"));

  const setRecurso = (key: string, v: boolean) => setP({ ...p, recursos: { ...(p.recursos || {}), [key]: v } });
  const setLimite = (key: string, v: string) =>
    setP({ ...p, limites: { ...(p.limites || {}), [key]: v === "" ? 0 : Number(v) } });

  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isNew ? "Novo plano" : "Editar plano"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Nome</Label>
              <Input value={p.nome} onChange={(e) => setP({ ...p, nome: e.target.value })} />
            </div>
            <div>
              <Label>Chave (única)</Label>
              <Input value={p.slug} onChange={(e) => setP({ ...p, slug: e.target.value })} placeholder="essencial" />
            </div>
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea value={p.descricao ?? ""} onChange={(e) => setP({ ...p, descricao: e.target.value })} rows={2} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Preço mensal (R$)</Label>
              <Input type="number" step="0.01" value={p.preco_mensal} onChange={(e) => setP({ ...p, preco_mensal: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Preço anual (R$)</Label>
              <Input type="number" step="0.01" value={p.preco_anual} onChange={(e) => setP({ ...p, preco_anual: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Ordem</Label>
              <Input type="number" value={p.ordem} onChange={(e) => setP({ ...p, ordem: Number(e.target.value) })} />
            </div>
          </div>
          <div>
            <Label>Benefícios (um por linha)</Label>
            <Textarea
              rows={4}
              value={beneficiosTexto}
              onChange={(e) => {
                setBeneficiosTexto(e.target.value);
                setP({ ...p, beneficios: e.target.value.split("\n").map((l) => l.trim()).filter(Boolean) });
              }}
            />
          </div>

          <div className="border-t pt-4 space-y-2">
            <Label className="text-sm">Funcionalidades liberadas neste plano</Label>
            {PLAN_FEATURES.map((f) => (
              <div key={f.key} className="flex items-start justify-between gap-3 border rounded p-2">
                <div>
                  <p className="text-sm font-medium">{f.label}</p>
                  <p className="text-xs text-muted-foreground">{f.descricao}</p>
                </div>
                <Switch checked={Boolean(p.recursos?.[f.key])} onCheckedChange={(v) => setRecurso(f.key, v)} />
              </div>
            ))}
          </div>

          <div className="border-t pt-4">
            <Label className="text-sm">Limites</Label>
            <div className="grid grid-cols-3 gap-3 mt-2">
              {PLAN_LIMITS.map((l) => (
                <div key={l.key}>
                  <Label className="text-xs">{l.label}</Label>
                  <Input type="number" value={(p.limites as any)?.[l.key] ?? ""} onChange={(e) => setLimite(l.key, e.target.value)} />
                  <p className="text-[11px] text-muted-foreground mt-1">{l.ajuda}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-6 border-t pt-4">
            <div className="flex items-center gap-2">
              <Switch checked={p.destaque_busca} onCheckedChange={(v) => setP({ ...p, destaque_busca: v })} />
              <Label>Plano recomendado</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={p.ativo} onCheckedChange={(v) => setP({ ...p, ativo: v })} />
              <Label>Ativo</Label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button onClick={() => onSave(p, isNew)}><Save className="h-4 w-4 mr-1" /> Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PacoteEditor({ inicial, onSave, onDelete }: {
  inicial: PacoteRow; onSave: (p: PacoteRow) => void; onDelete?: () => void;
}) {
  const [p, setP] = useState<PacoteRow>(inicial);
  useEffect(() => { setP(inicial); }, [inicial.id]);

  return (
    <Card>
      <CardContent className="p-4 grid gap-3 md:grid-cols-[1fr,100px,120px,auto,auto] md:items-end">
        <div>
          <Label className="text-xs">Rótulo</Label>
          <Input value={p.label} onChange={(e) => setP({ ...p, label: e.target.value })} placeholder="7 dias" />
        </div>
        <div>
          <Label className="text-xs">Dias</Label>
          <Input type="number" value={p.dias} onChange={(e) => setP({ ...p, dias: Number(e.target.value) })} />
        </div>
        <div>
          <Label className="text-xs">Valor (R$)</Label>
          <Input type="number" step="0.01" value={p.valor} onChange={(e) => setP({ ...p, valor: Number(e.target.value) })} />
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={p.ativo} onCheckedChange={(v) => setP({ ...p, ativo: v })} />
          <Label className="text-xs">Ativo</Label>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => onSave(p)}>{p.id ? "Salvar" : "Adicionar"}</Button>
          {onDelete && (
            <Button size="sm" variant="ghost" onClick={onDelete} aria-label="Remover pacote">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
