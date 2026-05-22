import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
    const { data: refs } = await supabase
      .from("referrals")
      .select("*")
      .order("conversoes", { ascending: false });
    if (refs?.length) {
      const ids = refs.map((r) => r.couple_id);
      const { data: profs } = await supabase
        .from("couple_public_profiles")
        .select("couple_id, nome_casal").in("couple_id", ids);
      const map = new Map(profs?.map((p) => [p.couple_id, p.nome_casal]) ?? []);
      setRows(refs.map((r) => ({ ...r, couple_name: map.get(r.couple_id) ?? null })));
    } else setRows([]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleActive = async (id: string, ativo: boolean) => {
    const { error } = await supabase.from("referrals").update({ ativo: !ativo }).eq("id", id);
    if (error) { toast.error("Falha ao atualizar"); return; }
    toast.success("Atualizado");
    load();
  };

  const totals = rows.reduce(
    (a, r) => ({ cliques: a.cliques + r.cliques, conversoes: a.conversoes + r.conversoes }),
    { cliques: 0, conversoes: 0 }
  );
  const taxa = totals.cliques > 0 ? ((totals.conversoes / totals.cliques) * 100).toFixed(1) : "—";

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <SEO title="Indicações — Admin" noIndex />
      <h1 className="text-3xl font-serif">Indicações</h1>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardHeader><CardTitle className="text-sm">Cliques</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{totals.cliques}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Conversões</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{totals.conversoes}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Taxa</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{taxa}%</CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Todos os links</CardTitle></CardHeader>
        <CardContent>
          {loading ? <Skeleton className="h-40 w-full" /> : (
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
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.couple_name ?? r.couple_id.slice(0, 8)}</TableCell>
                    <TableCell className="font-mono text-xs">{r.codigo}</TableCell>
                    <TableCell className="text-right">{r.cliques}</TableCell>
                    <TableCell className="text-right">{r.conversoes}</TableCell>
                    <TableCell>{r.ativo ? "Ativo" : "Inativo"}</TableCell>
                    <TableCell><Button size="sm" variant="outline" onClick={() => toggleActive(r.id, r.ativo)}>{r.ativo ? "Desativar" : "Ativar"}</Button></TableCell>
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