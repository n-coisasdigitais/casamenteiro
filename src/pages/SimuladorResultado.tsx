import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { computeSimulador, type SimuladorResult, type SupplierMatch } from "@/lib/simulador/match";
import { Heart, Check, Star, ArrowLeft, Tag, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

export default function SimuladorResultado() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const id = params.get("id");

  const [loading, setLoading] = useState(true);
  const [sim, setSim] = useState<any>(null);
  const [result, setResult] = useState<SimuladorResult | null>(null);
  // map: category_slug -> selected supplier_id
  const [picks, setPicks] = useState<Record<string, string>>({});

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
              {Object.keys(picks).length} / {result.categories.length} categorias
            </div>
          </div>
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${overBudget ? "bg-destructive" : "bg-primary"}`}
              style={{ width: `${pctUsed}%` }}
            />
          </div>
        </div>
      </div>
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

      <Link
        to={`/fornecedor/${supplier.id}`}
        onClick={(e) => e.stopPropagation()}
        className="text-[11px] text-primary hover:underline mt-2 inline-block"
      >
        Ver perfil completo →
      </Link>
    </div>
  );
}