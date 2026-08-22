import { useEffect, useMemo, useState } from "react";
import SEO from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Gift, Loader2, Pencil, Plus, TicketPercent, Trash2 } from "lucide-react";
import {
  BENEFICIO_ORIGEM_LABEL,
  BENEFICIO_STATUS_LABEL,
  concederBeneficioAdmin,
  descreverBeneficio,
  excluirCupom,
  listarCupons,
  salvarCupom,
  type Beneficio,
  type BeneficioTipo,
  type Cupom,
} from "@/lib/beneficios";

const TIPO_LABEL: Record<BeneficioTipo, string> = {
  percentual: "Desconto em %",
  valor: "Desconto em R$",
  meses_gratis: "Meses grátis",
};

const vazio = {
  codigo: "",
  descricao: "",
  tipo: "percentual" as BeneficioTipo,
  valor: 50,
  ciclos: 1,
  valido_de: "",
  valido_ate: "",
  max_usos: "" as string | number,
  max_usos_por_fornecedor: 1,
  ativo: true,
};

export default function AdminCupons() {
  const { toast } = useToast();
  const [carregando, setCarregando] = useState(true);
  const [cupons, setCupons] = useState<Cupom[]>([]);
  const [beneficios, setBeneficios] = useState<(Beneficio & { supplier_nome?: string })[]>([]);
  const [fornecedores, setFornecedores] = useState<{ id: string; business_name: string }[]>([]);

  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [form, setForm] = useState({ ...vazio });
  const [salvando, setSalvando] = useState(false);
  const [excluir, setExcluir] = useState<Cupom | null>(null);

  const [presente, setPresente] = useState({
    supplierId: "",
    tipo: "meses_gratis" as BeneficioTipo,
    valor: 1,
    ciclos: 1,
    motivo: "",
  });
  const [enviandoPresente, setEnviandoPresente] = useState(false);

  const carregar = async () => {
    const [cs, bs, fs] = await Promise.all([
      listarCupons(),
      (supabase
        .from("supplier_credits" as any)
        .select("*, suppliers(business_name)")
        .order("created_at", { ascending: false })
        .limit(200) as any),
      supabase.from("suppliers").select("id, business_name").order("business_name").limit(500),
    ]);
    setCupons(cs);
    setBeneficios(
      ((bs?.data as any[]) ?? []).map((b) => ({
        ...b,
        valor: Number(b.valor),
        supplier_nome: b.suppliers?.business_name,
      })),
    );
    setFornecedores(((fs.data as any[]) ?? []) as { id: string; business_name: string }[]);
    setCarregando(false);
  };

  useEffect(() => {
    carregar();
  }, []);

  const abrirNovo = () => {
    setEditando(null);
    setForm({ ...vazio });
    setAberto(true);
  };

  const abrirEdicao = (c: Cupom) => {
    setEditando(c.id);
    setForm({
      codigo: c.codigo,
      descricao: c.descricao ?? "",
      tipo: c.tipo,
      valor: Number(c.valor),
      ciclos: c.ciclos,
      valido_de: c.valido_de ? c.valido_de.slice(0, 10) : "",
      valido_ate: c.valido_ate ? c.valido_ate.slice(0, 10) : "",
      max_usos: c.max_usos ?? "",
      max_usos_por_fornecedor: c.max_usos_por_fornecedor,
      ativo: c.ativo,
    });
    setAberto(true);
  };

  const salvar = async () => {
    if (!form.codigo.trim()) {
      toast({ title: "Informe o código do cupom", variant: "destructive" });
      return;
    }
    if (form.tipo === "percentual" && (form.valor <= 0 || form.valor > 100)) {
      toast({ title: "O desconto em % deve ficar entre 1 e 100", variant: "destructive" });
      return;
    }
    setSalvando(true);
    const erro = await salvarCupom({
      id: editando ?? undefined,
      codigo: form.codigo,
      descricao: form.descricao || null,
      tipo: form.tipo,
      valor: Number(form.valor),
      ciclos: Number(form.ciclos),
      valido_de: form.valido_de || null,
      valido_ate: form.valido_ate || null,
      max_usos: form.max_usos === "" ? null : Number(form.max_usos),
      max_usos_por_fornecedor: Number(form.max_usos_por_fornecedor),
      ativo: form.ativo,
    } as any);
    setSalvando(false);
    if (erro) {
      toast({
        title: "Não foi possível salvar",
        description: erro.includes("duplicate") ? "Já existe um cupom com esse código." : erro,
        variant: "destructive",
      });
      return;
    }
    toast({ title: editando ? "Cupom atualizado" : "Cupom criado" });
    setAberto(false);
    carregar();
  };

  const confirmarExclusao = async () => {
    if (!excluir) return;
    const erro = await excluirCupom(excluir.id);
    setExcluir(null);
    if (erro) {
      toast({ title: "Não foi possível excluir", description: erro, variant: "destructive" });
      return;
    }
    toast({ title: "Cupom excluído" });
    carregar();
  };

  const conceder = async () => {
    if (!presente.supplierId) {
      toast({ title: "Escolha um fornecedor", variant: "destructive" });
      return;
    }
    setEnviandoPresente(true);
    const erro = await concederBeneficioAdmin({
      supplierId: presente.supplierId,
      tipo: presente.tipo,
      valor: Number(presente.valor),
      ciclos: Number(presente.ciclos),
      motivo: presente.motivo || "Presente da equipe Casamenteiro",
    });
    setEnviandoPresente(false);
    if (erro) {
      toast({ title: "Não foi possível conceder", description: erro, variant: "destructive" });
      return;
    }
    toast({ title: "Presente concedido", description: "O benefício entra na próxima cobrança do fornecedor." });
    setPresente({ ...presente, motivo: "" });
    carregar();
  };

  const ativos = useMemo(() => cupons.filter((c) => c.ativo).length, [cupons]);

  if (carregando) {
    return (
      <div className="p-8 flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando cupons...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SEO title="Cupons e presentes | Admin Casamenteiro" noIndex />

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Cupons e presentes</h1>
          <p className="text-sm text-muted-foreground">
            {cupons.length} cupons cadastrados · {ativos} ativos. Os benefícios valem a partir da primeira cobrança, depois
            do período de teste.
          </p>
        </div>
        <Button onClick={abrirNovo}>
          <Plus className="h-4 w-4 mr-2" /> Novo cupom
        </Button>
      </div>

      <Tabs defaultValue="cupons">
        <TabsList>
          <TabsTrigger value="cupons">Cupons</TabsTrigger>
          <TabsTrigger value="presentes">Presentear fornecedor</TabsTrigger>
          <TabsTrigger value="concedidos">Benefícios concedidos</TabsTrigger>
        </TabsList>

        <TabsContent value="cupons" className="pt-4">
          <Card>
            <CardContent className="p-0 divide-y">
              {cupons.length === 0 && (
                <p className="p-8 text-center text-sm text-muted-foreground">Nenhum cupom criado ainda.</p>
              )}
              {cupons.map((c) => (
                <div key={c.id} className="p-4 flex items-center justify-between gap-3 flex-wrap">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <TicketPercent className="h-4 w-4 text-primary" />
                      <span className="font-mono font-semibold">{c.codigo}</span>
                      <Badge variant={c.ativo ? "secondary" : "outline"}>{c.ativo ? "Ativo" : "Inativo"}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {descreverBeneficio({ tipo: c.tipo, valor: c.valor, ciclos_total: c.ciclos })}
                      {c.descricao ? ` · ${c.descricao}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {c.valido_de ? `De ${new Date(c.valido_de).toLocaleDateString("pt-BR")} ` : ""}
                      {c.valido_ate ? `até ${new Date(c.valido_ate).toLocaleDateString("pt-BR")} · ` : ""}
                      {c.usos} usos{c.max_usos ? ` de ${c.max_usos}` : " (ilimitado)"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => abrirEdicao(c)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setExcluir(c)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="presentes" className="pt-4">
          <Card className="max-w-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Gift className="h-4 w-4 text-primary" /> Presentear um fornecedor
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Fornecedor</Label>
                <Select
                  value={presente.supplierId}
                  onValueChange={(v) => setPresente({ ...presente, supplierId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha o fornecedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {fornecedores.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.business_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2 col-span-1">
                  <Label>Tipo</Label>
                  <Select
                    value={presente.tipo}
                    onValueChange={(v) => setPresente({ ...presente, tipo: v as BeneficioTipo })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TIPO_LABEL).map(([k, v]) => (
                        <SelectItem key={k} value={k}>
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{presente.tipo === "meses_gratis" ? "Meses" : "Valor"}</Label>
                  <Input
                    type="number"
                    min={1}
                    value={presente.valor}
                    onChange={(e) => setPresente({ ...presente, valor: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ciclos</Label>
                  <Input
                    type="number"
                    min={1}
                    value={presente.ciclos}
                    onChange={(e) => setPresente({ ...presente, ciclos: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Motivo (aparece no histórico)</Label>
                <Textarea
                  value={presente.motivo}
                  onChange={(e) => setPresente({ ...presente, motivo: e.target.value })}
                  placeholder="Ex.: parceria de lançamento"
                  rows={2}
                />
              </div>
              <Button onClick={conceder} disabled={enviandoPresente} className="w-full">
                {enviandoPresente ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Gift className="h-4 w-4 mr-2" />}
                Conceder benefício
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="concedidos" className="pt-4">
          <Card>
            <CardContent className="p-0 divide-y">
              {beneficios.length === 0 && (
                <p className="p-8 text-center text-sm text-muted-foreground">Nenhum benefício concedido ainda.</p>
              )}
              {beneficios.map((b) => (
                <div key={b.id} className="p-4 flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <p className="font-medium text-sm">{b.supplier_nome || "Fornecedor"}</p>
                    <p className="text-sm text-muted-foreground">
                      {descreverBeneficio(b)} · {BENEFICIO_ORIGEM_LABEL[b.origem] ?? b.origem}
                      {b.motivo ? ` · ${b.motivo}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(b.created_at).toLocaleDateString("pt-BR")}
                      {b.ciclos_restantes > 0 ? ` · ${b.ciclos_restantes} ciclo(s) restante(s)` : ""}
                    </p>
                  </div>
                  <Badge variant="secondary">{BENEFICIO_STATUS_LABEL[b.status] ?? b.status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar cupom" : "Novo cupom"}</DialogTitle>
            <DialogDescription>
              O benefício é aplicado na primeira cobrança do fornecedor, depois do período de teste.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Código</Label>
                <Input
                  value={form.codigo}
                  onChange={(e) => setForm({ ...form, codigo: e.target.value.toUpperCase() })}
                  placeholder="LANCAMENTO50"
                  className="font-mono uppercase"
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v as BeneficioTipo })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TIPO_LABEL).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{form.tipo === "meses_gratis" ? "Quantidade de meses" : "Valor do desconto"}</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.valor}
                  onChange={(e) => setForm({ ...form, valor: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Ciclos com desconto</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.ciclos}
                  onChange={(e) => setForm({ ...form, ciclos: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Válido de</Label>
                <Input
                  type="date"
                  value={form.valido_de}
                  onChange={(e) => setForm({ ...form, valido_de: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Válido até</Label>
                <Input
                  type="date"
                  value={form.valido_ate}
                  onChange={(e) => setForm({ ...form, valido_ate: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Limite total de usos</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.max_usos}
                  onChange={(e) => setForm({ ...form, max_usos: e.target.value })}
                  placeholder="Vazio = ilimitado"
                />
              </div>
              <div className="space-y-2">
                <Label>Usos por fornecedor</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.max_usos_por_fornecedor}
                  onChange={(e) => setForm({ ...form, max_usos_por_fornecedor: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descrição interna</Label>
              <Textarea
                rows={2}
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                placeholder="Campanha de lançamento"
              />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">Cupom ativo</p>
                <p className="text-xs text-muted-foreground">Desative para pausar novos resgates.</p>
              </div>
              <Switch checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={salvar} disabled={salvando}>
              {salvando && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!excluir} onOpenChange={(o) => !o && setExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir o cupom {excluir?.codigo}?</AlertDialogTitle>
            <AlertDialogDescription>
              Fornecedores que já resgataram mantêm o desconto. Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarExclusao}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
