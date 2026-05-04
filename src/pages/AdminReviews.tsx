import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, ArrowLeft, Trash2, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminReviews() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [checked, setChecked] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [filter, setFilter] = useState<"all" | "low">("all");

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login"); return; }
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }).then(({ data }) => {
      if (!data) { navigate("/"); return; }
      setChecked(true); load();
    });
  }, [user, authLoading, navigate]);

  const load = async () => {
    const { data } = await supabase
      .from("reviews")
      .select("*, suppliers(company_name), profiles:user_id(full_name)")
      .order("created_at", { ascending: false })
      .limit(500);
    setRows((data as any) || []);
  };

  const removeReview = async (id: string) => {
    if (!confirm("Excluir esta avaliação?")) return;
    const { error } = await supabase.from("reviews").delete().eq("id", id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: "Avaliação excluída" }); load(); }
  };

  const filtered = filter === "low" ? rows.filter(r => r.rating <= 2) : rows;

  if (!checked) return <div className="min-h-screen flex items-center justify-center">Verificando...</div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b sticky top-0 z-40">
        <div className="container flex items-center gap-3 h-16">
          <Button variant="ghost" size="icon" asChild><Link to="/admin"><ArrowLeft className="h-4 w-4" /></Link></Button>
          <Heart className="h-5 w-5 text-primary fill-primary" />
          <span className="font-bold">Moderação de avaliações</span>
        </div>
      </header>
      <main className="container py-6">
        <div className="flex gap-2 mb-4">
          <Button size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>Todas ({rows.length})</Button>
          <Button size="sm" variant={filter === "low" ? "default" : "outline"} onClick={() => setFilter("low")}>Baixas (≤2★) ({rows.filter(r => r.rating <= 2).length})</Button>
        </div>
        <div className="space-y-3">
          {filtered.map(r => (
            <Card key={r.id}>
              <CardContent className="p-4 flex items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">{r.suppliers?.company_name || "—"}</span>
                    <Badge variant="secondary" className="gap-1"><Star className="h-3 w-3 fill-current" />{r.rating}</Badge>
                    <span className="text-xs text-muted-foreground">por {r.profiles?.full_name || "anônimo"} · {new Date(r.created_at).toLocaleDateString("pt-BR")}</span>
                  </div>
                  {r.title && <p className="font-medium text-sm">{r.title}</p>}
                  <p className="text-sm text-muted-foreground">{r.comment}</p>
                </div>
                <Button variant="destructive" size="sm" onClick={() => removeReview(r.id)}><Trash2 className="h-4 w-4 mr-1" />Excluir</Button>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && <p className="text-muted-foreground text-center py-12">Nenhuma avaliação.</p>}
        </div>
      </main>
    </div>
  );
}