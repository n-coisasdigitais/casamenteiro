import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, Zap, Play } from "lucide-react";

const TIPOS = [
  { value: "dias_antes_casamento", label: "X dias antes do casamento" },
  { value: "dias_antes_pagamento", label: "X dias antes de um pagamento" },
  { value: "dias_apos_pagamento_vencido", label: "X dias após pagamento vencido" },
  { value: "rsvp_pendente", label: "X dias antes do casamento, com RSVPs pendentes" },
  { value: "sem_atividade_dias", label: "X dias sem atividade na plataforma" },
];

const PUBLICOS = [
  { value: "couples", label: "Casais" },
  { value: "suppliers", label: "Fornecedores" },
  { value: "all", label: "Todos" },
];

interface Gatilho {
  id: string;
  nome: string;
  descricao: string | null;
  tipo: string;
  dias: number;
  publico_alvo: string;
  titulo: string;
  corpo: string;
  link: string | null;
  canais: string[];
  ativo: boolean;
}

export default function AdminBroadcastTriggers() {
  const { toast } = useToast();
  const [gatilhos, setGatilhos] = useState<Gatilho[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [novo, setNovo] = useState<Partial<Gatilho>>({
    nome: "", tipo: "dias_antes_casamento", dias: 30, publico_alvo: "couples",
    titulo: "", corpo: "", link: "", canais: ["platform"], ativo: true,
  });

  const carregar = async () => {
    setLoading(true);
    const { data } = await (supabase.from("broadcast_gatilhos") as any).select("*").order("created_at", { ascending: false });
    setGatilhos((data || []) as Gatilho[]);
    setLoading(false);
  };

  useEffect(() => { carregar(); }, []);

  const criar = async () => {
    if (!novo.nome || !novo.titulo || !novo.corpo) {
      toast({ title: "Preencha nome, título e corpo", variant: "destructive" });
      return;
    }
    const { error } = await (supabase.from("broadcast_gatilhos") as any).insert([novo]);
    if (error) {
      toast({ title: "Erro ao criar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Gatilho criado!" });
    setNovo({
      nome: "", tipo: "dias_antes_casamento", dias: 30, publico_alvo: "couples",
      titulo: "", corpo: "", link: "", canais: ["platform"], ativo: true,
    });
    carregar();
  };

  const atualizar = async (g: Gatilho, patch: Partial<Gatilho>) => {
    setSaving(g.id);
    const { error } = await (supabase.from("broadcast_gatilhos") as any).update(patch).eq("id", g.id);
    setSaving(null);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    setGatilhos((arr) => arr.map((x) => x.id === g.id ? { ...x, ...patch } : x));
  };

  const remover = async (id: string) => {
    if (!confirm("Remover este gatilho?")) return;
    await (supabase.from("broadcast_gatilhos") as any).delete().eq("id", id);
    carregar();
  };

  const executarAgora = async () => {
    toast({ title: "Disparando cron...", description: "Aguarde alguns segundos." });
    const { error } = await supabase.functions.invoke("broadcast-cron");
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Cron executado", description: "Veja as notificações geradas." });
  };

  return (
    <div className="container py-6 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Zap className="h-6 w-6 text-primary" /> Gatilhos automáticos</h1>
          <p className="text-sm text-muted-foreground">Notificações disparadas automaticamente conforme regras de tempo.</p>
        </div>
        <Button variant="outline" onClick={executarAgora}><Play className="h-4 w-4 mr-2" />Executar agora</Button>
      </div>

      <Card className="p-4 space-y-3">
        <h2 className="font-semibold">Novo gatilho</h2>
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <Label>Nome interno</Label>
            <Input value={novo.nome || ""} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} />
          </div>
          <div>
            <Label>Público</Label>
            <Select value={novo.publico_alvo} onValueChange={(v) => setNovo({ ...novo, publico_alvo: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PUBLICOS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tipo</Label>
            <Select value={novo.tipo} onValueChange={(v) => setNovo({ ...novo, tipo: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIPOS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Dias</Label>
            <Input type="number" value={novo.dias ?? 0} onChange={(e) => setNovo({ ...novo, dias: Number(e.target.value) })} />
          </div>
          <div className="md:col-span-2">
            <Label>Título da notificação</Label>
            <Input value={novo.titulo || ""} onChange={(e) => setNovo({ ...novo, titulo: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <Label>Corpo</Label>
            <Textarea rows={3} value={novo.corpo || ""} onChange={(e) => setNovo({ ...novo, corpo: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <Label>Link (opcional)</Label>
            <Input value={novo.link || ""} onChange={(e) => setNovo({ ...novo, link: e.target.value })} placeholder="/tarefas" />
          </div>
        </div>
        <Button onClick={criar}><Plus className="h-4 w-4 mr-2" />Criar gatilho</Button>
      </Card>

      <div className="space-y-3">
        <h2 className="font-semibold">Gatilhos cadastrados</h2>
        {loading && <p className="text-muted-foreground">Carregando...</p>}
        {!loading && gatilhos.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum gatilho ainda.</p>
        )}
        {gatilhos.map((g) => (
          <Card key={g.id} className="p-4">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold">{g.nome}</h3>
                  <Badge variant="secondary">{TIPOS.find((t) => t.value === g.tipo)?.label || g.tipo}</Badge>
                  <Badge variant="outline">{g.dias} dias</Badge>
                  <Badge>{PUBLICOS.find((p) => p.value === g.publico_alvo)?.label}</Badge>
                </div>
                <p className="text-sm font-medium mt-2">{g.titulo}</p>
                <p className="text-sm text-muted-foreground">{g.corpo}</p>
                {g.link && <p className="text-xs text-primary mt-1">→ {g.link}</p>}
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{g.ativo ? "Ativo" : "Pausado"}</span>
                  <Switch
                    checked={g.ativo}
                    disabled={saving === g.id}
                    onCheckedChange={(v) => atualizar(g, { ativo: v })}
                  />
                </div>
                <Button size="icon" variant="ghost" onClick={() => remover(g.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}