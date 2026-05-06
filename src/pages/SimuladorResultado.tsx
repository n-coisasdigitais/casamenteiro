import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  recalcularSimulacao, recalcularCategoria, criarPlano, formatarReais,
  type Estilo, type SimuladorResultado as SimRes,
} from "@/lib/simulador";
import { Heart, ArrowLeft, AlertTriangle, Sparkles, Lightbulb, MessageCircle, Tag, ExternalLink, Loader2, Check, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const estiloLabel: Record<Estilo, string> = {
  intimista: "intimista",
  elegante: "elegante",
  grandioso: "grandioso",
};

export default function SimuladorResultado() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const id = params.get("id");
  const assumirOnLoad = params.get("assumir") === "1";

  const [loading, setLoading] = useState(true);
  const [recalculando, setRecalculando] = useState(false);
  const [sim, setSim] = useState<any>(null);
  const [resultado, setResultado] = useState<SimRes | null>(null);
  const [aceitaOciosas, setAceitaOciosas] = useState(false);

  const [openAssumir, setOpenAssumir] = useState(false);
  const [nomePlano, setNomePlano] = useState("");
  const [dataPrevista, setDataPrevista] = useState("");
  const [criando, setCriando] = useState(false);

  // Ajuste por categoria
  const [editandoCat, setEditandoCat] = useState<string | null>(null);
  const [novaVerbaCat, setNovaVerbaCat] = useState<string>("");
  const [recalculandoCat, setRecalculandoCat] = useState<string | null>(null);

  // Fornecedores selecionados para o plano (por categoria)
  const [selecionados, setSelecionados] = useState<Record<string, Set<string>>>({});

  useEffect(() => {
    document.title = "Seu plano — Casamenteiro";
    (async () => {
      if (!id) { navigate("/simulador"); return; }
      const { data } = await (supabase
        .from("home_simulacoes" as any)
        .select("*")
        .eq("id", id)
        .maybeSingle() as any);
      if (!data) { navigate("/simulador"); return; }
      setSim(data);
      // resultado salvo
      if (data.resultado && data.resultado.plano && data.resultado.resumo) {
        setResultado(data.resultado as SimRes);
        setAceitaOciosas(!!data.resultado.resumo?.aceitaOciosas);
        setLoading(false);
      } else {
        // recalcula
        const r = await recalcularSimulacao(
          Number(data.orcamento_total),
          Number(data.num_convidados),
          data.cidade || "",
          (data.estilo as Estilo) || "elegante",
          false,
        );
        setResultado({ simulacaoId: id, ...r });
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Pre-preenche modal
  useEffect(() => {
    if (sim && !nomePlano) {
      setNomePlano(`Casamento em ${sim.cidade || "minha cidade"}`);
    }
  }, [sim, nomePlano]);

  // Abre modal automaticamente após login
  useEffect(() => {
    if (assumirOnLoad && user && resultado) {
      setOpenAssumir(true);
    }
  }, [assumirOnLoad, user, resultado]);

  const recalcular = async (novoOcioso: boolean) => {
    if (!sim) return;
    setAceitaOciosas(novoOcioso);
    setRecalculando(true);
    try {
      const r = await recalcularSimulacao(
        Number(sim.orcamento_total),
        Number(sim.num_convidados),
        sim.cidade || "",
        (sim.estilo as Estilo) || "elegante",
        novoOcioso,
        sim.categorias_selecionadas || null,
      );
      setResultado({ simulacaoId: id, ...r });
      // persiste no banco
      await (supabase.from("home_simulacoes" as any) as any)
        .update({ resultado: { ...r, simulacaoId: id } })
        .eq("id", id);
    } catch (e: any) {
      toast({ title: "Erro ao recalcular", description: e.message, variant: "destructive" });
    } finally {
      setRecalculando(false);
    }
  };

  // Ajusta a verba de uma categoria e recalcula apenas ela.
  // Atualiza também o orçamento total da simulação (sem criar uma nova).
  const aplicarAjusteCategoria = async (catKey: string) => {
    if (!sim || !resultado) return;
    const novaVerba = Number(novaVerbaCat.replace(/\D/g, ""));
    if (!novaVerba || novaVerba < 0) {
      toast({ title: "Informe uma verba válida", variant: "destructive" });
      return;
    }
    setRecalculandoCat(catKey);
    try {
      const novaCat = await recalcularCategoria(
        catKey,
        novaVerba,
        Number(sim.num_convidados),
        sim.cidade || "",
        aceitaOciosas,
      );
      if (!novaCat) throw new Error("Categoria inválida");

      const novoPlano = { ...resultado.plano, [catKey]: { ...novaCat, percentual: resultado.plano[catKey]?.percentual || 0 } };
      const totalAlocado = Object.values(novoPlano).reduce((s, c) => s + (c?.verba || 0), 0);
      const orcamentoTotal = Math.max(totalAlocado, resultado.resumo.orcamentoTotal);
      const comFornecedor = Object.values(novoPlano).filter((c) => c.encontrou).length;
      const totalCategorias = Object.keys(novoPlano).length;

      const novoResumo = {
        ...resultado.resumo,
        orcamentoTotal,
        totalAlocado,
        sobraOrcamento: orcamentoTotal - totalAlocado,
        categoriasComFornecedor: comFornecedor,
        totalCategorias,
        cobertura: Math.round((comFornecedor / totalCategorias) * 100),
      };

      const novo: SimRes = { ...resultado, plano: novoPlano, resumo: novoResumo };
      setResultado(novo);
      await (supabase.from("home_simulacoes" as any) as any)
        .update({
          resultado: { ...novo, simulacaoId: id },
          orcamento_total: orcamentoTotal,
        })
        .eq("id", id);
      setEditandoCat(null);
      setNovaVerbaCat("");
      toast({ title: "Categoria recalculada" });
    } catch (e: any) {
      toast({ title: "Erro ao recalcular categoria", description: e.message, variant: "destructive" });
    } finally {
      setRecalculandoCat(null);
    }
  };

  const toggleFornecedor = (catKey: string, supplierId: string) => {
    setSelecionados((prev) => {
      const set = new Set(prev[catKey] || []);
      if (set.has(supplierId)) set.delete(supplierId);
      else set.add(supplierId);
      return { ...prev, [catKey]: set };
    });
  };

  const onAssumir = () => {
    if (!user) {
      toast({ title: "Crie sua conta para assumir o plano" });
      navigate(`/cadastro?redirect=${encodeURIComponent(`/simulador/resultado?id=${id}&assumir=1`)}`);
      return;
    }
    setOpenAssumir(true);
  };

  const confirmarAssumir = async () => {
    if (!resultado || !nomePlano.trim() || !dataPrevista) {
      toast({ title: "Preencha nome e data", variant: "destructive" });
      return;
    }
    setCriando(true);
    try {
      // Junta as seleções de cada categoria
      const todos = new Set<string>();
      for (const cat of Object.values(resultado.plano)) {
        const escolhidos = selecionados[cat.key];
        if (escolhidos && escolhidos.size > 0) {
          escolhidos.forEach((s) => todos.add(s));
        } else if (cat.fornecedores[0]) {
          // padrão: primeiro fornecedor da categoria
          todos.add(cat.fornecedores[0].id);
        }
      }
      await criarPlano(id, resultado, nomePlano.trim(), dataPrevista, todos);
      toast({ title: "Plano criado!", description: "Tudo pronto para começar a planejar." });
      setOpenAssumir(false);
      navigate("/meu-casamento/plano");
    } catch (e: any) {
      toast({ title: "Erro ao criar plano", description: e.message, variant: "destructive" });
    } finally {
      setCriando(false);
    }
  };

  const cobertura = resultado?.resumo.cobertura ?? 0;
  const corCobertura = useMemo(() => {
    if (cobertura >= 80) return { bg: "hsl(132 18% 91%)", fg: "hsl(145 24% 28%)", border: "hsl(145 24% 60%)" };
    if (cobertura >= 50) return { bg: "hsl(45 92% 92%)", fg: "hsl(32 60% 28%)", border: "hsl(38 80% 60%)" };
    return { bg: "hsl(0 70% 95%)", fg: "hsl(0 60% 35%)", border: "hsl(0 60% 65%)" };
  }, [cobertura]);

  if (loading || !resultado || !sim) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "hsl(var(--color-bg))" }}>
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin" style={{ color: "hsl(var(--color-primary))" }} />
          <p style={{ color: "hsl(var(--color-text-muted))" }}>Montando seu plano…</p>
        </div>
      </div>
    );
  }

  const planoCats = Object.values(resultado.plano);

  return (
    <div className="min-h-screen pb-32" style={{ background: "hsl(var(--color-bg))" }}>
      {/* Navbar simples */}
      <header className="border-b sticky top-0 z-30 backdrop-blur bg-background/90" style={{ borderColor: "hsl(var(--color-border))" }}>
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Heart className="h-5 w-5" style={{ color: "hsl(var(--color-primary))" }} fill="currentColor" />
            <span className="text-lg font-semibold tracking-wide">casamenteiro</span>
          </Link>
          {!user ? (
            <Button variant="ghost" size="sm" asChild>
              <Link to="/login">Entrar</Link>
            </Button>
          ) : (
            <Button variant="ghost" size="sm" asChild>
              <Link to="/dashboard"><ArrowLeft className="w-4 h-4 mr-1" /> Painel</Link>
            </Button>
          )}
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-12">
        {/* Resumo */}
        <div className="mb-6">
          <h1 className="text-3xl md:text-4xl mb-3" style={{ fontWeight: 700, letterSpacing: "-0.02em" }}>
            Seu plano está pronto ✓
          </h1>
          <p className="text-sm md:text-base" style={{ color: "hsl(var(--color-text-muted))" }}>
            <strong>{formatarReais(resultado.resumo.orcamentoTotal)}</strong> · {resultado.resumo.convidados} convidados ·{" "}
            {resultado.resumo.cidade || "—"} · estilo {estiloLabel[resultado.resumo.estilo]}
          </p>

          <div
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full text-sm font-medium"
            style={{ background: corCobertura.bg, color: corCobertura.fg, border: `1px solid ${corCobertura.border}` }}
          >
            {cobertura >= 80 && "Ótimo!"}{" "}
            Encontramos fornecedores em {resultado.resumo.categoriasComFornecedor} de {resultado.resumo.totalCategorias} categorias.
          </div>
        </div>

        {/* Alertas */}
        {resultado.alertas.length > 0 && (
          <div className="space-y-3 mb-6">
            {resultado.alertas.map((a, i) => (
              <AlertaBanner
                key={i}
                alerta={a}
                onAcao={(codigo) => {
                  if (codigo === "ATIVAR_OCIOSAS") recalcular(true);
                }}
              />
            ))}
          </div>
        )}

        {/* Toggle datas ociosas */}
        <div
          className="sticky top-[57px] z-20 mb-6 rounded-xl p-3 flex items-center justify-between gap-3"
          style={{ background: "hsl(var(--color-secondary))", border: "1px solid hsl(var(--color-border))" }}
        >
          <div>
            <Label htmlFor="ociosas" className="text-sm font-semibold" style={{ color: "hsl(var(--color-dark))" }}>
              Mostrar fornecedores com desconto em dias úteis
            </Label>
            <p className="text-xs" style={{ color: "hsl(var(--color-text-muted))" }}>
              Pode reduzir bastante o custo total do casamento.
            </p>
          </div>
          <Switch id="ociosas" checked={aceitaOciosas} disabled={recalculando} onCheckedChange={recalcular} />
        </div>

        {/* Categorias */}
        <div className="space-y-7">
          {planoCats.map((cat) => (
            <section key={cat.key}>
              <div className="flex items-baseline justify-between mb-3 gap-3 flex-wrap">
                <h2 className="text-lg md:text-xl font-semibold" style={{ color: "hsl(var(--color-dark))" }}>
                  <span className="mr-2">{cat.icon}</span>{cat.label}
                </h2>
                <p className="text-sm" style={{ color: "hsl(var(--color-text-muted))" }}>
                  <strong style={{ color: "hsl(var(--color-dark))" }}>{formatarReais(cat.verba)}</strong>{" "}
                  ({Math.round(cat.percentual * 100)}%)
                </p>
              </div>

              {recalculando ? (
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-64 flex-shrink-0 rounded-xl" />)}
                </div>
              ) : cat.fornecedores.length === 0 ? (
                <div className="rounded-xl p-4 text-sm" style={{ background: "hsl(var(--color-secondary))", color: "hsl(var(--color-text-muted))" }}>
                  Nenhum fornecedor encontrado nesta faixa em {sim.cidade || "sua cidade"}.{" "}
                  <Link to={`/buscar?categoria=${cat.slug}`} className="underline font-medium" style={{ color: "hsl(var(--color-primary))" }}>
                    Ver todos os fornecedores desta categoria →
                  </Link>
                </div>
              ) : (
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
                  {cat.fornecedores.map((f) => (
                    <article
                      key={f.id}
                      className="flex-shrink-0 w-72 rounded-xl p-4 snap-start"
                      style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--color-border))" }}
                    >
                      <div className="flex items-start gap-3 mb-3">
                        {f.foto_perfil_url ? (
                          <img src={f.foto_perfil_url} alt={f.nome} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                        ) : (
                          <div
                            className="w-12 h-12 rounded-full flex items-center justify-center text-base font-bold flex-shrink-0"
                            style={{ background: "hsl(var(--color-secondary))", color: "hsl(var(--color-primary))" }}
                          >
                            {f.nome.charAt(0)}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <Link to={`/fornecedor/${f.id}`} className="block text-sm font-semibold truncate hover:underline" style={{ color: "hsl(var(--color-dark))" }}>
                            {f.nome}
                          </Link>
                          {f.cidade && (
                            <p className="text-xs truncate" style={{ color: "hsl(var(--color-text-muted))" }}>{f.cidade}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1.5 mb-3">
                        <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold" style={{ background: "hsl(var(--color-secondary))", color: "hsl(var(--color-text-body))" }}>
                          {f.faixa_preco}
                        </span>
                        {f.temDesconto && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold inline-flex items-center gap-1" style={{ background: "hsl(132 18% 91%)", color: "hsl(145 24% 28%)" }}>
                            <Tag className="w-2.5 h-2.5" /> -{f.desconto}% data ociosa
                          </span>
                        )}
                        {f.destaque && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold" style={{ background: "hsl(var(--color-primary) / 0.15)", color: "hsl(var(--color-primary))" }}>
                            destaque
                          </span>
                        )}
                      </div>

                      {f.linkWhatsApp ? (
                        <a
                          href={f.linkWhatsApp}
                          target="_blank"
                          rel="noreferrer"
                          className="block text-center w-full rounded-full py-2 text-xs font-semibold transition hover:opacity-90"
                          style={{ background: "hsl(var(--color-accent))", color: "hsl(var(--accent-foreground))" }}
                        >
                          <MessageCircle className="w-3.5 h-3.5 inline mr-1" /> Falar pelo WhatsApp
                        </a>
                      ) : (
                        <Link
                          to={`/fornecedor/${f.id}`}
                          className="block text-center w-full rounded-full py-2 text-xs font-semibold transition hover:opacity-90"
                          style={{ background: "hsl(var(--color-secondary))", color: "hsl(var(--color-text-body))" }}
                        >
                          <ExternalLink className="w-3.5 h-3.5 inline mr-1" /> Ver perfil
                        </Link>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      </div>

      {/* CTA fixo */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 border-t backdrop-blur"
        style={{ background: "hsl(var(--color-bg) / 0.95)", borderColor: "hsl(var(--color-border))" }}
      >
        <div className="max-w-3xl mx-auto px-4 py-3 flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            className="rounded-full flex-1 sm:flex-initial"
            asChild
          >
            <Link to="/simulador">Simular novamente</Link>
          </Button>
          <Button
            onClick={onAssumir}
            className="rounded-full flex-1"
            style={{ background: "hsl(var(--color-primary))", color: "hsl(var(--color-bg))" }}
          >
            Assumir este plano →
          </Button>
        </div>
      </div>

      {/* Modal Assumir */}
      <Dialog open={openAssumir} onOpenChange={setOpenAssumir}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assumir este plano</DialogTitle>
            <DialogDescription>
              Vamos criar seu plano com os fornecedores sugeridos. Você pode editar tudo depois.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Nome do plano</Label>
              <Input
                value={nomePlano}
                onChange={(e) => setNomePlano(e.target.value)}
                placeholder="Ex: Casamento Silva & Fernandes"
                disabled={criando}
              />
            </div>
            <div>
              <Label className="text-xs">Data prevista do casamento</Label>
              <Input
                type="date"
                value={dataPrevista}
                onChange={(e) => setDataPrevista(e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
                disabled={criando}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpenAssumir(false)} disabled={criando}>Cancelar</Button>
            <Button
              onClick={confirmarAssumir}
              disabled={criando || !nomePlano.trim() || !dataPrevista}
              style={{ background: "hsl(var(--color-primary))", color: "hsl(var(--color-bg))" }}
            >
              {criando ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Criando...</> : "Criar meu plano →"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AlertaBanner({
  alerta, onAcao,
}: { alerta: import("@/lib/simulador").Alerta; onAcao: (codigo: "ATIVAR_OCIOSAS") => void }) {
  const cfg =
    alerta.tipo === "aviso"
      ? { bg: "hsl(45 92% 95%)", border: "hsl(38 80% 70%)", fg: "hsl(32 60% 25%)", Icon: AlertTriangle }
      : alerta.tipo === "oportunidade"
        ? { bg: "hsl(132 18% 93%)", border: "hsl(145 24% 60%)", fg: "hsl(145 24% 28%)", Icon: Sparkles }
        : { bg: "hsl(210 60% 95%)", border: "hsl(210 60% 70%)", fg: "hsl(210 60% 28%)", Icon: Lightbulb };

  return (
    <div
      className="rounded-xl p-4 flex gap-3"
      style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.fg }}
    >
      <cfg.Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-relaxed">{alerta.mensagem}</p>
        {alerta.sugestoes && alerta.sugestoes.length > 0 && (
          <ul className="text-xs mt-2 list-disc list-inside space-y-0.5 opacity-90">
            {alerta.sugestoes.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        )}
        {alerta.acao && (
          <button
            onClick={() => onAcao(alerta.acao!.codigo)}
            className="mt-3 text-xs font-semibold underline-offset-2 hover:underline"
            style={{ color: cfg.fg }}
          >
            {alerta.acao.label} →
          </button>
        )}
      </div>
    </div>
  );
}