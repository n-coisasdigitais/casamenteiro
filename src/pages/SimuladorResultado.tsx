import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { computeSimulador, type SimuladorResult, type SupplierMatch } from "@/lib/simulador/match";
import { Heart, Check, Star, ArrowLeft, Tag, AlertCircle, Send, ExternalLink, Save, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SimuladorResultado() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const id = params.get("id");

  const [loading, setLoading] = useState(true);
  const [sim, setSim] = useState<any>(null);
  const [result, setResult] = useState<SimuladorResult | null>(null);
  // map: category_slug -> selected supplier_id
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [savingPlan, setSavingPlan] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkMessage, setBulkMessage] = useState("");
  const [bulkEventDate, setBulkEventDate] = useState("");
  const [bulkGuests, setBulkGuests] = useState("");
  const [bulkPhone, setBulkPhone] = useState("");
  const [bulkSending, setBulkSending] = useState(false);

  useEffect(() => {
    document.title = "Meu plano de casamento — Casamenteiro";
    (async () => {
      if (!id) {
        navigate("/");
        return;
      }
      const { data } = await (supabase
        .from("home_simulacoes" as any)
        .select("*")
        .eq("id", id)
        .maybeSingle() as any);
      if (!data) {
        navigate("/");
        return;
      }
      setSim(data);
      // Carrega seleções salvas dentro do resultado
      const savedPicks = (data.resultado && data.resultado.picks) as Record<string, string> | undefined;
      if (savedPicks) setPicks(savedPicks);
      // Se tem resultado salvo, usa; senão recalcula
      if (data.resultado && Array.isArray(data.resultado.categories)) {
        setResult(data.resultado as SimuladorResult);
      } else {
        const r = await computeSimulador({
          orcamento_total: Number(data.orcamento_total),
          num_convidados: data.num_convidados,
          cidade: data.cidade || "",
          estilo: data.estilo || "Médio e elegante",
          data_evento: data.data_evento,
        });
        setResult(r);
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Carrega couple_id do usuário
  useEffect(() => {
    if (!user) return;
    supabase.from("couples").select("id").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data) {
        setCoupleId(data.id);
        // Pré-preenche campos do bulk
        setBulkEventDate((sim?.data_evento) || "");
        setBulkGuests(String(sim?.num_convidados || ""));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, sim?.id]);

  const totalSelecionado = useMemo(() => {
    if (!result) return 0;
    let sum = 0;
    for (const cat of result.categories) {
      const pickedId = picks[cat.category_slug];
      const picked = cat.suppliers.find((s) => s.id === pickedId);
      if (picked) sum += picked.estimated_price;
    }
    return sum;
  }, [picks, result]);

  const totalBudget = result?.total_budget || 0;
  const overBudget = totalSelecionado > totalBudget;
  const pctUsed = totalBudget > 0 ? Math.min(100, (totalSelecionado / totalBudget) * 100) : 0;
  const selectedCount = Object.keys(picks).length;

  // Auto-save picks na simulação sempre que mudam (debounce simples)
  useEffect(() => {
    if (!id || !result) return;
    const t = setTimeout(async () => {
      const newResultado = { ...result, picks } as any;
      await (supabase.from("home_simulacoes" as any) as any)
        .update({ resultado: newResultado })
        .eq("id", id);
    }, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picks, id]);

  const finalizarPlano = async () => {
    if (!user) {
      navigate(`/cadastro?redirect=/simulador/resultado?id=${id}`);
      return;
    }
    if (!coupleId || !result) return;
    if (selectedCount === 0) {
      toast({ title: "Selecione ao menos um fornecedor", variant: "destructive" });
      return;
    }
    setSavingPlan(true);
    try {
      await (supabase.from("couples") as any)
        .update({
          target_budget: totalBudget,
          estimated_budget: totalBudget,
          estimated_guests: sim.num_convidados || null,
          wedding_date: sim.data_evento || null,
          budget_mode: "fixed",
        })
        .eq("id", coupleId);

      const categoryRows = result.categories.map((cat) => ({
        couple_id: coupleId,
        category: cat.category_slug,
        description: cat.category_name,
        estimated_cost: Math.round(cat.budget_slice),
        status: "estimated",
      }));

      const { data: existingBudget } = await supabase
        .from("budget_items")
        .select("category, supplier_id")
        .eq("couple_id", coupleId);
      const existingCategories = new Set(
        (existingBudget || []).filter((item: any) => !item.supplier_id).map((item: any) => item.category)
      );
      const missingCategories = categoryRows.filter((row) => !existingCategories.has(row.category));
      if (missingCategories.length) {
        await (supabase.from("budget_items") as any).insert(missingCategories);
      }

      const rows = result.categories
        .map((cat) => {
          const sid = picks[cat.category_slug];
          if (!sid) return null;
          const sup = cat.suppliers.find((s) => s.id === sid);
          return {
            couple_id: coupleId,
            supplier_id: sid,
            category_id: cat.category_id,
            status: "saved",
            contract_value: sup?.estimated_price || null,
            estimated_value: sup?.estimated_price || null,
            simulation_id: id,
            notes: "Adicionado pela simulação",
          };
        })
        .filter(Boolean) as any[];
      // Remove duplicatas existentes pela combinação couple+supplier
      for (const r of rows) {
        await supabase
          .from("couple_suppliers")
          .delete()
          .eq("couple_id", r.couple_id)
          .eq("supplier_id", r.supplier_id);
      }
      const { error } = await supabase.from("couple_suppliers").insert(rows);
      if (error) throw error;
      toast({ title: "Plano salvo!", description: "Sua simulação agora aparece em Orçamento e Fornecedores." });
      navigate("/orcamento");
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    } finally {
      setSavingPlan(false);
    }
  };

  const enviarOrcamentoMassa = async () => {
    if (!user || !coupleId || !result) {
      toast({ title: "Faça login para enviar orçamentos", variant: "destructive" });
      return;
    }
    if (!bulkMessage.trim()) {
      toast({ title: "Escreva uma mensagem", variant: "destructive" });
      return;
    }
    if (selectedCount === 0) {
      toast({ title: "Nenhum fornecedor selecionado", variant: "destructive" });
      return;
    }
    setBulkSending(true);
    try {
      const rows = result.categories
        .map((cat) => {
          const sid = picks[cat.category_slug];
          if (!sid) return null;
          return {
            couple_id: coupleId,
            supplier_id: sid,
            user_id: user.id,
            event_date: bulkEventDate || null,
            guest_count: bulkGuests ? parseInt(bulkGuests) : null,
            message: bulkMessage.trim(),
            phone: bulkPhone.trim() || null,
            phone_visible: !!bulkPhone.trim(),
          };
        })
        .filter(Boolean) as any[];
      const { error } = await supabase.from("quotes").insert(rows);
      if (error) throw error;
      toast({
        title: "Orçamentos enviados!",
        description: `${rows.length} pedido(s) enviado(s). Acompanhe no seu painel.`,
      });
      setBulkOpen(false);
      navigate("/dashboard");
    } catch (e: any) {
      toast({ title: "Erro ao enviar", description: e.message, variant: "destructive" });
    } finally {
      setBulkSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Montando seu plano...</p>
      </div>
    );
  }

  if (!result || !sim) return null;

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <header className="border-b border-border bg-background sticky top-0 z-30">
        <div className="container py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary" fill="currentColor" />
            <span className="font-serif text-lg">Casamenteiro</span>
          </Link>
          <Button variant="ghost" size="sm" asChild>
            <Link to={user ? "/dashboard" : "/"}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
            </Link>
          </Button>
        </div>
      </header>

      <div className="container py-8 md:py-12">
        {/* Resumo */}
        <div className="mb-8">
          <p className="label-ui text-primary mb-2">Seu plano personalizado</p>
          <h1 className="text-3xl md:text-4xl mb-3" style={{ fontWeight: 700, letterSpacing: "-0.02em" }}>
            Casamento em {sim.cidade || "sua cidade"} para {sim.num_convidados} convidados
          </h1>
          <p className="text-muted-foreground">
            Orçamento de <strong>R$ {totalBudget.toLocaleString("pt-BR")}</strong> · estilo {sim.estilo}
            {sim.data_evento && (
              <> · data <strong>{new Date(sim.data_evento + "T00:00:00").toLocaleDateString("pt-BR")}</strong></>
            )}
          </p>
        </div>

        {/* Categorias */}
        <div className="space-y-6">
          {result.categories.map((cat) => (
            <Card key={cat.category_slug} className="p-5 md:p-6">
              <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-xl font-semibold">{cat.category_name}</h2>
                    {cat.essential && <Badge variant="secondary" className="text-[10px]">essencial</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {cat.pct}% do orçamento · até <strong>R$ {cat.budget_slice.toLocaleString("pt-BR")}</strong>
                  </p>
                </div>
                {picks[cat.category_slug] && (
                  <Badge className="bg-accent text-accent-foreground">
                    <Check className="w-3 h-3 mr-1" /> selecionado
                  </Badge>
                )}
              </div>

              {cat.suppliers.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                  <AlertCircle className="w-4 h-4" />
                  Nenhum fornecedor encontrado nessa categoria. Vamos avisar quando aparecer um match.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {cat.suppliers.map((s) => (
                    <SupplierMatchCard
                      key={s.id}
                      supplier={s}
                      slice={cat.budget_slice}
                      selected={picks[cat.category_slug] === s.id}
                      onToggle={() =>
                        setPicks((prev) => {
                          const next = { ...prev };
                          if (next[cat.category_slug] === s.id) delete next[cat.category_slug];
                          else next[cat.category_slug] = s.id;
                          return next;
                        })
                      }
                    />
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>

      {/* Sticky budget bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur shadow-lg">
        <div className="container py-3">
          <div className="flex items-center justify-between gap-4 mb-2">
            <div className="text-sm">
              <span className="text-muted-foreground">Selecionado:</span>{" "}
              <strong className={overBudget ? "text-destructive" : ""}>
                R$ {totalSelecionado.toLocaleString("pt-BR")}
              </strong>{" "}
              <span className="text-muted-foreground">de R$ {totalBudget.toLocaleString("pt-BR")}</span>
            </div>
            <div className="text-sm font-medium">
              {selectedCount} / {result.categories.length} categorias
            </div>
          </div>
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${overBudget ? "bg-destructive" : "bg-primary"}`}
              style={{ width: `${pctUsed}%` }}
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2 mt-3">
            <Button
              variant="outline"
              className="flex-1"
              disabled={selectedCount === 0}
              onClick={() => setBulkOpen(true)}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Pedir orçamento p/ todos ({selectedCount})
            </Button>
            <Button
              className="flex-1"
              disabled={selectedCount === 0 || savingPlan}
              onClick={finalizarPlano}
            >
              <Save className="w-4 h-4 mr-2" />
              {savingPlan ? "Salvando..." : "Finalizar plano"}
            </Button>
          </div>
        </div>
      </div>

      {/* Bulk dialog */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pedir orçamento para {selectedCount} fornecedor(es)</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Data do evento</Label>
                <Input type="date" value={bulkEventDate} onChange={(e) => setBulkEventDate(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Nº convidados</Label>
                <Input type="number" value={bulkGuests} onChange={(e) => setBulkGuests(e.target.value)} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Telefone (opcional)</Label>
              <Input type="tel" placeholder="(11) 99999-9999" value={bulkPhone} onChange={(e) => setBulkPhone(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Mensagem *</Label>
              <Textarea
                rows={4}
                placeholder="Olá! Estou planejando meu casamento e gostaria de receber um orçamento..."
                value={bulkMessage}
                onChange={(e) => setBulkMessage(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setBulkOpen(false)} disabled={bulkSending}>Cancelar</Button>
            <Button onClick={enviarOrcamentoMassa} disabled={bulkSending}>
              <Send className="w-4 h-4 mr-2" />
              {bulkSending ? "Enviando..." : "Enviar para todos"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SupplierMatchCard({
  supplier,
  slice,
  selected,
  onToggle,
}: {
  supplier: SupplierMatch;
  slice: number;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      onClick={onToggle}
      className={`relative rounded-xl border-2 p-3 cursor-pointer transition ${
        selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
      }`}
    >
      <div className="flex gap-3">
        <div className="w-16 h-16 rounded-lg bg-secondary overflow-hidden flex-shrink-0">
          {supplier.profile_photo_url ? (
            <img src={supplier.profile_photo_url} alt={supplier.company_name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">sem foto</div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold truncate">{supplier.company_name}</h3>
            <Checkbox checked={selected} className="mt-0.5 flex-shrink-0 pointer-events-none" />
          </div>
          {supplier.city && (
            <p className="text-[11px] text-muted-foreground truncate">{supplier.city}</p>
          )}
          {supplier.rating != null && supplier.review_count ? (
            <div className="flex items-center gap-1 text-[11px] mt-0.5">
              <Star className="w-3 h-3 fill-current text-primary" />
              <span>{Number(supplier.rating).toFixed(1)}</span>
              <span className="text-muted-foreground">({supplier.review_count})</span>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between flex-wrap gap-2">
        <div className="text-sm">
          <span className="font-semibold">R$ {supplier.estimated_price.toLocaleString("pt-BR")}</span>
          {!supplier.fits_budget_slice && (
            <span className="text-[11px] text-destructive ml-1">acima da fatia</span>
          )}
        </div>
        {supplier.is_idle_promo && supplier.applied_discount_pct > 0 && (
          <Badge variant="outline" className="text-[10px] border-primary text-primary">
            <Tag className="w-2.5 h-2.5 mr-1" /> -{supplier.applied_discount_pct}% data ociosa
          </Badge>
        )}
      </div>

      <a
        href={`/fornecedor/${supplier.id}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="text-[11px] text-primary hover:underline mt-2 inline-flex items-center gap-1"
      >
        Ver perfil completo <ExternalLink className="w-3 h-3" />
      </a>
    </div>
  );
}