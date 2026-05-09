import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

type Linha = {
  cidade: string;
  estado: string | null;
  total: number;
  ultima: string;
  atendida: boolean;
};

export default function AdminCidades() {
  const { toast } = useToast();
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("cidades_interesse")
      .select("cidade, estado, criado_em, atendida")
      .order("criado_em", { ascending: false })
      .limit(1000);
    const map = new Map<string, Linha>();
    for (const r of (data || []) as any[]) {
      const key = `${(r.cidade || "").toLowerCase()}|${r.estado || ""}`;
      const existing = map.get(key);
      if (existing) {
        existing.total += 1;
        if (!r.atendida) existing.atendida = false;
      } else {
        map.set(key, {
          cidade: r.cidade,
          estado: r.estado,
          total: 1,
          ultima: r.criado_em,
          atendida: !!r.atendida,
        });
      }
    }
    setLinhas([...map.values()].sort((a, b) => b.total - a.total));
    setLoading(false);
  };

  useEffect(() => {
    carregar();
  }, []);

  const marcarAtendida = async (cidade: string) => {
    await supabase
      .from("cidades_interesse")
      .update({ atendida: true })
      .ilike("cidade", cidade);
    toast({ title: "Cidade marcada como atendida" });
    carregar();
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Cidades de interesse</h1>
        <p className="text-sm text-muted-foreground">
          Cidades buscadas no simulador onde ainda não temos fornecedores cadastrados.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{linhas.length} cidades únicas</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : linhas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma cidade registrada ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-4">Cidade</th>
                    <th className="py-2 pr-4">Estado</th>
                    <th className="py-2 pr-4">Buscas</th>
                    <th className="py-2 pr-4">Última busca</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {linhas.map((l) => (
                    <tr key={`${l.cidade}-${l.estado}`} className="border-b">
                      <td className="py-3 pr-4 font-medium">{l.cidade}</td>
                      <td className="py-3 pr-4">{l.estado || "—"}</td>
                      <td className="py-3 pr-4">
                        <Badge variant={l.total >= 3 ? "destructive" : "secondary"}>
                          {l.total}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {new Date(l.ultima).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="py-3 pr-4">
                        {l.atendida ? (
                          <Badge variant="default">Atendida</Badge>
                        ) : (
                          <Badge variant="outline">Pendente</Badge>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        {!l.atendida && (
                          <Button size="sm" variant="outline" onClick={() => marcarAtendida(l.cidade)}>
                            Marcar como atendida
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}