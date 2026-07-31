import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Star } from "lucide-react";
import SEO from "@/components/SEO";
import { toast } from "sonner";

type Row = {
  id: string;
  autor_nome: string | null;
  rating: number;
  comentario: string | null;
  aprovado: boolean;
  destaque: boolean;
  created_at: string;
};

export default function AdminPlatformReviews() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<"todas" | "pendentes" | "aprovadas">("pendentes");

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase.from("platform_reviews" as any)
      .select("*")
      .order("created_at", { ascending: false }) as any);
    setRows((data as Row[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const atualizar = async (id: string, patch: Partial<Row>) => {
    const { error } = await (supabase.from("platform_reviews" as any).update(patch).eq("id", id) as any);
    if (error) { toast.error("Falha ao atualizar"); return; }
    toast.success("Atualizado");
    load();
  };

  const excluir = async (id: string) => {
    const { error } = await (supabase.from("platform_reviews" as any).delete().eq("id", id) as any);
    if (error) { toast.error("Falha ao excluir"); return; }
    toast.success("Avaliação excluída");
    load();
  };

  const visiveis = rows.filter((r) =>
    filtro === "todas" ? true : filtro === "pendentes" ? !r.aprovado : r.aprovado
  );

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <SEO title="Avaliações da plataforma — Admin" noIndex />
      <h1 className="text-3xl font-serif">Avaliações da plataforma</h1>

      <div className="flex gap-2">
        {(["pendentes", "aprovadas", "todas"] as const).map((f) => (
          <Button key={f} size="sm" variant={filtro === f ? "default" : "outline"} onClick={() => setFiltro(f)}>
            {f === "pendentes" ? "Pendentes" : f === "aprovadas" ? "Aprovadas" : "Todas"}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Depoimentos dos casais</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {loading ? <Skeleton className="h-40 w-full" /> : visiveis.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma avaliação nesse filtro.</p>
          ) : visiveis.map((r) => (
            <div key={r.id} className="border rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-4 w-4 ${i < r.rating ? "fill-primary text-primary" : "text-muted"}`} />
                    ))}
                  </div>
                  <span className="text-sm font-medium">{r.autor_nome || "Casal"}</span>
                  {r.aprovado ? <Badge>Aprovada</Badge> : <Badge variant="outline">Pendente</Badge>}
                  {r.destaque && <Badge variant="secondary">Destaque</Badge>}
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString("pt-BR")}
                </span>
              </div>
              {r.comentario && <p className="text-sm text-foreground/80">{r.comentario}</p>}
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => atualizar(r.id, { aprovado: !r.aprovado })}>
                  {r.aprovado ? "Despublicar" : "Aprovar"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => atualizar(r.id, { destaque: !r.destaque })}>
                  {r.destaque ? "Remover destaque" : "Destacar"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => excluir(r.id)}>Excluir</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
