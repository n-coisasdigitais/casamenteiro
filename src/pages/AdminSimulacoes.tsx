import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, TrendingUp, Users, MapPin, Calculator } from "lucide-react";

const fmtBRL = (n: number) => "R$ " + Number(n || 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 });

export default function AdminSimulacoes() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [busca, setBusca] = useState("");
  const [periodo, setPeriodo] = useState<"tudo" | "7" | "30" | "90">("tudo");
  const [faixa, setFaixa] = useState<"todas" | "ate30" | "30a60" | "60a100" | "mais100">("todas");
  const [ordem, setOrdem] = useState<"recentes" | "maior" | "menor">("recentes");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/login");
      return;
    }
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }).then(async ({ data }) => {
      if (!data) {
        navigate("/");
        return;
      }
      const { data: rows } = await (supabase
        .from("home_simulacoes" as any)
        .select("*")
        .order("criado_em", { ascending: false }) as any);
      setItems(rows || []);
      setLoading(false);
    });
  }, [user, authLoading, navigate]);

  const view = useMemo(() => {
    let list = [...items];
    const q = busca.trim().toLowerCase();
    if (q)
      list = list.filter(
        (s) => (s.cidade || "").toLowerCase().includes(q) || (s.estilo || "").toLowerCase().includes(q),
      );
    if (periodo !== "tudo") {
      const dias = Number(periodo);
      const limite = Date.now() - dias * 864e5;
      list = list.filter((s) => new Date(s.criado_em).getTime() >= limite);
    }
    if (faixa !== "todas") {
      list = list.filter((s) => {
        const v = Number(s.orcamento_total) || 0;
        if (faixa === "ate30") return v < 30000;
        if (faixa === "30a60") return v >= 30000 && v < 60000;
        if (faixa === "60a100") return v >= 60000 && v < 100000;
        return v >= 100000;
      });
    }
    if (ordem === "maior") list.sort((a, b) => (b.orcamento_total ?? 0) - (a.orcamento_total ?? 0));
    else if (ordem === "menor") list.sort((a, b) => (a.orcamento_total ?? 0) - (b.orcamento_total ?? 0));
    else list.sort((a, b) => (a.criado_em < b.criado_em ? 1 : -1));
    return list;
  }, [items, busca, periodo, faixa, ordem]);

  // Métricas (sobre o resultado filtrado)
  const metrics = useMemo(() => {
    const n = view.length;
    const somaOrc = view.reduce((acc, s) => acc + (Number(s.orcamento_total) || 0), 0);
    const somaConv = view.reduce((acc, s) => acc + (Number(s.num_convidados) || 0), 0);
    const porCidade: Record<string, number> = {};
    view.forEach((s) => {
      const c = s.cidade || "—";
      porCidade[c] = (porCidade[c] || 0) + 1;
    });
    const topCidade = Object.entries(porCidade).sort((a, b) => b[1] - a[1])[0];
    return {
      total: n,
      orcMedio: n ? somaOrc / n : 0,
      convMedio: n ? Math.round(somaConv / n) : 0,
      topCidade: topCidade ? `${topCidade[0]} (${topCidade[1]})` : "—",
    };
  }, [view]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Simulações dos clientes</h1>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/admin">
              <ArrowLeft className="w-4 h-4 mr-1" /> Painel admin
            </Link>
          </Button>
        </div>
      </header>

      <div className="container py-8 space-y-6">
        {/* Métricas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Calculator className="h-3.5 w-3.5" /> Simulações
            </div>
            <div className="text-2xl font-bold">{metrics.total}</div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <TrendingUp className="h-3.5 w-3.5" /> Orçamento médio
            </div>
            <div className="text-2xl font-bold">{fmtBRL(metrics.orcMedio)}</div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Users className="h-3.5 w-3.5" /> Convidados médios
            </div>
            <div className="text-2xl font-bold">{metrics.convMedio}</div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <MapPin className="h-3.5 w-3.5" /> Cidade top
            </div>
            <div className="text-lg font-bold truncate">{metrics.topCidade}</div>
          </Card>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por cidade ou estilo"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9"
            />
          </div>
          <select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value as any)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="tudo">Todo período</option>
            <option value="7">Últimos 7 dias</option>
            <option value="30">Últimos 30 dias</option>
            <option value="90">Últimos 90 dias</option>
          </select>
          <select
            value={faixa}
            onChange={(e) => setFaixa(e.target.value as any)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="todas">Qualquer orçamento</option>
            <option value="ate30">Até R$ 30 mil</option>
            <option value="30a60">R$ 30–60 mil</option>
            <option value="60a100">R$ 60–100 mil</option>
            <option value="mais100">Acima de R$ 100 mil</option>
          </select>
          <select
            value={ordem}
            onChange={(e) => setOrdem(e.target.value as any)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="recentes">Mais recentes</option>
            <option value="maior">Maior orçamento</option>
            <option value="menor">Menor orçamento</option>
          </select>
        </div>

        {/* Lista */}
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {view.length} de {items.length} simulação(ões)
          </p>
          {view.length === 0 && (
            <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma simulação com esses filtros.</p>
          )}
          {view.map((s) => (
            <Card key={s.id} className="p-4 flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="font-semibold">
                  {fmtBRL(s.orcamento_total)} · {s.num_convidados} convidados · {s.cidade || "—"}
                </div>
                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                  <span>{s.estilo}</span>
                  {s.data_evento && (
                    <Badge variant="secondary">
                      data: {new Date(s.data_evento + "T00:00:00").toLocaleDateString("pt-BR")}
                    </Badge>
                  )}
                  {s.prazo_meses && <Badge variant="outline">prazo: {s.prazo_meses} meses</Badge>}
                  <span>· {new Date(s.criado_em).toLocaleString("pt-BR")}</span>
                </div>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link to={`/simulador/resultado?id=${s.id}`}>Ver resultado</Link>
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
