import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { linkFornecedor } from "@/lib/linkFornecedor";

type Sugestao = {
  id: string;
  nome: string;
  nome_normalizado: string;
  status: "pendente" | "aprovada" | "recusada";
  created_at: string;
  decidido_em: string | null;
  suppliers: { id: string; slug: string | null; company_name: string; city: string | null; state: string | null } | null;
};

const ROTULO: Record<Sugestao["status"], string> = { pendente: "Pendente", aprovada: "Aprovada", recusada: "Recusada" };

export default function AdminCategoriasSugeridas() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [lista, setLista] = useState<Sugestao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtro, setFiltro] = useState<"todas" | Sugestao["status"]>("pendente");

  const carregar = async () => {
    setCarregando(true);
    const { data, error } = await (supabase.from("categoria_sugestoes") as any)
      .select("id, nome, nome_normalizado, status, created_at, decidido_em, suppliers(id, slug, company_name, city, state)")
      .order("created_at", { ascending: false });
    if (error) toast({ title: "Erro ao carregar sugestões", description: error.message, variant: "destructive" });
    setLista((data || []) as Sugestao[]);
    setCarregando(false);
  };

  useEffect(() => { carregar(); }, []);

  const decidir = async (ids: string[], status: Sugestao["status"]) => {
    const { error } = await (supabase.from("categoria_sugestoes") as any)
      .update({ status, decidido_em: status === "pendente" ? null : new Date().toISOString(), decidido_por: user?.id ?? null })
      .in("id", ids);
    if (error) { toast({ title: "Não foi possível atualizar", description: error.message, variant: "destructive" }); return; }
    toast({ title: `Sugestão marcada como ${ROTULO[status].toLowerCase()}` });
    carregar();
  };

  // Agrupa sugestões parecidas (mesmo nome sem acento/maiúsculas)
  const grupos = useMemo(() => {
    const m = new Map<string, Sugestao[]>();
    lista.filter((s) => filtro === "todas" || s.status === filtro).forEach((s) => {
      const arr = m.get(s.nome_normalizado) || [];
      arr.push(s);
      m.set(s.nome_normalizado, arr);
    });
    return Array.from(m.values()).sort((a, b) => b.length - a.length);
  }, [lista, filtro]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Categorias sugeridas</h1>
        <p className="text-sm text-muted-foreground">
          Serviços descritos por fornecedores que escolheram "Outros". Aprovar não cria a categoria automaticamente — crie-a em Categorias quando decidir.
        </p>
      </div>

      <Tabs value={filtro} onValueChange={(v) => setFiltro(v as any)}>
        <TabsList>
          <TabsTrigger value="pendente">Pendentes</TabsTrigger>
          <TabsTrigger value="aprovada">Aprovadas</TabsTrigger>
          <TabsTrigger value="recusada">Recusadas</TabsTrigger>
          <TabsTrigger value="todas">Todas</TabsTrigger>
        </TabsList>
      </Tabs>

      {carregando ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : grupos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma sugestão por aqui.</p>
      ) : (
        <div className="grid gap-6">
          {grupos.map((g) => {
            const pendentes = g.filter((s) => s.status === "pendente").map((s) => s.id);
            return (
              <Card key={g[0].nome_normalizado}>
                <CardHeader className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 space-y-0 p-5 sm:p-6 pb-3">
                  <div className="space-y-2">
                    <CardTitle className="text-lg leading-snug">{g[0].nome}</CardTitle>
                    {g.length > 1 && <Badge variant="secondary">{g.length} sugestões parecidas</Badge>}
                  </div>
                  {pendentes.length > 0 && (
                    <div className="flex flex-wrap gap-2 shrink-0">
                      <Button size="sm" onClick={() => decidir(pendentes, "aprovada")}>Aprovar</Button>
                      <Button size="sm" variant="outline" onClick={() => decidir(pendentes, "recusada")}>Recusar</Button>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="px-5 sm:px-6 pb-5">
                  <ul className="divide-y divide-border text-sm">
                    {g.map((s) => (
                      <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                        <div className="space-y-1 min-w-0">
                          {s.suppliers ? (
                            <Link to={linkFornecedor(s.suppliers)} target="_blank" className="font-medium underline-offset-2 hover:underline">
                              {s.suppliers.company_name}
                            </Link>
                          ) : <span className="font-medium">Fornecedor removido</span>}
                          <p className="text-muted-foreground text-xs leading-relaxed">
                            {s.suppliers?.city ? `${s.suppliers.city}/${s.suppliers.state ?? ""} · ` : ""}"{s.nome}" · {new Date(s.created_at).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={s.status === "aprovada" ? "default" : s.status === "recusada" ? "destructive" : "outline"}>{ROTULO[s.status]}</Badge>
                          {s.status !== "pendente" && (
                            <Button size="sm" variant="ghost" onClick={() => decidir([s.id], "pendente")}>Reabrir</Button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
