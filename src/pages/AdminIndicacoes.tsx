import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";
import SEO from "@/components/SEO";
import { toast } from "sonner";

type Row = {
  id: string;
  codigo: string;
  cliques: number;
  conversoes: number;
  ativo: boolean;
  created_at: string;
  couple_id: string;
  couple_name?: string | null;
};

export default function AdminIndicacoes() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data: refs } = await supabase.from("referrals").select("*").order("conversoes", { ascending: false });
    if (refs?.length) {
      const ids = refs.map((r) => r.couple_id);
      const { data: profs } = await supabase
        .from("couple_public_profiles")
        .select("couple_id, nome_casal")
        .in("couple_id", ids);
      const map = new Map(profs?.map((p) => [p.couple_id, p.nome_casal]) ?? []);
      setRows(refs.map((r) => ({ ...r, couple_name: map.get(r.couple_id) ?? null })));
    } else setRows([]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState<"todos" | "ativo" | "inativo">("todos");
  const [ordem, setOrdem] = useState<"conversoes" | "cliques" | "recentes">("conversoes");

  const view = useMemo(() => {
    let list = [...rows];
    const q = busca.trim().toLowerCase();
    if (q)
      list = list.filter(
        (r) => (r.couple_name || "").toLowerCase().includes(q) || (r.codigo || "").toLowerCase().includes(q),
      );
    if (status !== "todos") list = list.filter((r) => (status === "ativo" ? r.ativo : !r.ativo));
    if (ordem === "cliques") list.sort((a, b) => b.cliques - a.cliques);
    else if (ordem === "recentes") list.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    else list.sort((a, b) => b.conversoes - a.conversoes);
    return list;
  }, [rows, busca, status, ordem]);

  const toggleActive = async (id: string, ativo: boolean) => {
    const { error } = await supabase.from("referrals").update({ ativo: !ativo }).eq("id", id);
    if (error) {
      toast.error("Falha ao atualizar");
      return;
    }
    toast.success("Atualizado");
    load();
  };

  const totals = rows.reduce((a, r) => ({ cliques: a.cliques + r.cliques, conversoes: a.conversoes + r.conversoes }), {
    cliques: 0,
    conversoes: 0,
  });
  const taxa = totals.cliques > 0 ? ((totals.conversoes / totals.cliques) * 100).toFixed(1) : "—";

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <SEO title="Indicações — Admin" noIndex />
      <h1 className="text-3xl font-serif">Indicações</h1>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Cliques</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{totals.cliques}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Conversões</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{totals.conversoes}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Taxa</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{taxa}%</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Todos os links</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 items-center mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por casal ou código"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="todos">Todos os status</option>
              <option value="ativo">Ativos</option>
              <option value="inativo">Inativos</option>
            </select>
            <select
              value={ordem}
              onChange={(e) => setOrdem(e.target.value as any)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="conversoes">Mais conversões</option>
              <option value="cliques">Mais cliques</option>
              <option value="recentes">Mais recentes</option>
            </select>
          </div>
          {loading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Casal</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead className="text-right">Cliques</TableHead>
                  <TableHead className="text-right">Conversões</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {view.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Nenhuma indicação com esses filtros.
                    </TableCell>
                  </TableRow>
                )}
                {view.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.couple_name ?? r.couple_id.slice(0, 8)}</TableCell>
                    <TableCell className="font-mono text-xs">{r.codigo}</TableCell>
                    <TableCell className="text-right">{r.cliques}</TableCell>
                    <TableCell className="text-right">{r.conversoes}</TableCell>
                    <TableCell>{r.ativo ? "Ativo" : "Inativo"}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => toggleActive(r.id, r.ativo)}>
                        {r.ativo ? "Desativar" : "Ativar"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
