import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function AdminSimulacoes() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login"); return; }
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }).then(async ({ data }) => {
      if (!data) { navigate("/"); return; }
      const { data: rows } = await (supabase
        .from("home_simulacoes" as any)
        .select("*")
        .order("criado_em", { ascending: false }) as any);
      setItems(rows || []);
      setLoading(false);
    });
  }, [user, authLoading, navigate]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Simulações dos clientes</h1>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/admin"><ArrowLeft className="w-4 h-4 mr-1" /> Painel admin</Link>
          </Button>
        </div>
      </header>
      <div className="container py-8 space-y-3">
        <p className="text-sm text-muted-foreground mb-4">{items.length} simulação(ões) registrada(s)</p>
        {items.map((s) => (
          <Card key={s.id} className="p-4 flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="font-semibold">
                R$ {Number(s.orcamento_total).toLocaleString("pt-BR")} · {s.num_convidados} convidados · {s.cidade || "—"}
              </div>
              <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                <span>{s.estilo}</span>
                {s.data_evento && <Badge variant="secondary">data: {new Date(s.data_evento + "T00:00:00").toLocaleDateString("pt-BR")}</Badge>}
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
  );
}