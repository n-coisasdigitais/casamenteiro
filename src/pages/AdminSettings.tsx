import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Heart, ArrowLeft, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const DEFAULTS = { locacao:25, buffet:20, decoracao:12, foto_video:10, musica:8, trajes:7, convites:3, beleza:3, lua_de_mel:7, outros:5 };

export default function AdminSettings() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [checked, setChecked] = useState(false);
  const [dist, setDist] = useState<Record<string, number>>(DEFAULTS);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login"); return; }
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }).then(async ({ data }) => {
      if (!data) { navigate("/"); return; }
      setChecked(true);
      const { data: row } = await (supabase.from("system_settings" as any).select("value").eq("key", "budget_distribution").maybeSingle() as any);
      if (row?.value) setDist({ ...DEFAULTS, ...(row.value as any) });
    });
  }, [user, authLoading, navigate]);

  const total = Object.values(dist).reduce((a, b) => a + Number(b || 0), 0);

  const save = async () => {
    if (Math.abs(total - 100) > 0.01) {
      toast({ title: "Soma inválida", description: `O total precisa ser 100% (atual: ${total}%)`, variant: "destructive" });
      return;
    }
    const { error } = await (supabase.from("system_settings" as any) as any).upsert({
      key: "budget_distribution", value: dist, description: "Percentuais padrão de distribuição do orçamento", updated_by: user!.id, updated_at: new Date().toISOString(),
    });
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else toast({ title: "Configurações salvas" });
  };

  if (!checked) return <div className="min-h-screen flex items-center justify-center">Verificando...</div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b sticky top-0 z-40">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild><Link to="/admin"><ArrowLeft className="h-4 w-4" /></Link></Button>
            <Heart className="h-5 w-5 text-primary fill-primary" />
            <span className="font-bold">Configurações globais</span>
          </div>
          <Button onClick={save}><Save className="h-4 w-4 mr-1" />Salvar</Button>
        </div>
      </header>
      <main className="container py-6 max-w-2xl">
        <h2 className="text-lg font-semibold mb-1">Distribuição padrão do orçamento</h2>
        <p className="text-sm text-muted-foreground mb-4">Percentuais aplicados quando o casal não personaliza. A soma precisa ser 100%.</p>
        <div className="space-y-3 border rounded-lg p-4">
          {Object.entries(dist).map(([k, v]) => (
            <div key={k} className="flex items-center gap-3">
              <Label className="w-32 capitalize">{k.replace(/_/g, " ")}</Label>
              <Input type="number" value={v} onChange={e => setDist({ ...dist, [k]: Number(e.target.value) })} className="w-24" />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          ))}
          <div className={`pt-3 border-t font-medium ${Math.abs(total - 100) > 0.01 ? "text-destructive" : "text-primary"}`}>
            Total: {total}%
          </div>
        </div>
      </main>
    </div>
  );
}