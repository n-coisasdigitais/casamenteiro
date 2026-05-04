import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Heart, Search, ShieldCheck, ShieldOff, Ban, RotateCcw, Trash2, ArrowLeft } from "lucide-react";

type Row = {
  user_id: string;
  full_name: string | null;
  account_type: string;
  suspended: boolean;
  suspended_reason: string | null;
  created_at: string;
  is_admin: boolean;
};

export default function AdminUsers() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [ready, setReady] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "couple" | "supplier" | "admin" | "suspended">("all");

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login"); return; }
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }).then(({ data }) => {
      if (!data) { navigate("/"); return; }
      setReady(true);
      load();
    });
  }, [user, authLoading]);

  const load = async () => {
    const { data: profiles } = await (supabase.from("profiles") as any)
      .select("user_id, full_name, account_type, suspended, suspended_reason, created_at")
      .order("created_at", { ascending: false });
    const { data: roles } = await supabase.from("user_roles").select("user_id, role").eq("role", "admin");
    const adminSet = new Set((roles || []).map((r: any) => r.user_id));
    setRows((profiles || []).map((p: any) => ({ ...p, is_admin: adminSet.has(p.user_id) })));
  };

  const filtered = rows.filter(r => {
    if (filter === "suspended" && !r.suspended) return false;
    if (filter === "admin" && !r.is_admin) return false;
    if ((filter === "couple" || filter === "supplier") && r.account_type !== filter) return false;
    if (q && !(r.full_name || "").toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const toggleSuspend = async (r: Row) => {
    const reason = r.suspended ? null : prompt("Motivo da suspensão (opcional):") || null;
    const { error } = await supabase.rpc("admin_set_user_suspended", {
      _user_id: r.user_id, _suspended: !r.suspended, _reason: reason,
    });
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: r.suspended ? "Usuário reativado" : "Usuário suspenso" }); load(); }
  };

  const toggleAdmin = async (r: Row) => {
    if (!confirm(r.is_admin ? "Remover papel de admin?" : "Promover a admin?")) return;
    const { error } = await supabase.rpc("admin_toggle_admin_role", {
      _user_id: r.user_id, _make_admin: !r.is_admin,
    });
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: "Papel atualizado" }); load(); }
  };

  if (!ready) return <div className="min-h-screen flex items-center justify-center">Verificando...</div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b sticky top-0 z-40">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild><Link to="/admin"><ArrowLeft className="h-4 w-4" /></Link></Button>
            <Heart className="h-5 w-5 text-primary fill-primary" />
            <span className="font-bold">Admin · Usuários</span>
          </div>
        </div>
      </header>
      <main className="container py-8 space-y-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome..." value={q} onChange={e => setQ(e.target.value)} className="pl-9" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {(["all","couple","supplier","admin","suspended"] as const).map(f => (
              <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>
                {f === "all" ? "Todos" : f === "couple" ? "Casais" : f === "supplier" ? "Fornecedores" : f === "admin" ? "Admins" : "Suspensos"}
              </Button>
            ))}
          </div>
        </div>

        <p className="text-sm text-muted-foreground">{filtered.length} usuário(s)</p>

        <div className="space-y-2">
          {filtered.map(r => (
            <Card key={r.user_id}>
              <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-medium">{r.full_name || "(sem nome)"}</h3>
                    <Badge variant="secondary">{r.account_type}</Badge>
                    {r.is_admin && <Badge>admin</Badge>}
                    {r.suspended && <Badge variant="destructive">suspenso</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">ID: {r.user_id.slice(0,8)}... · Criado {new Date(r.created_at).toLocaleDateString("pt-BR")}</p>
                  {r.suspended_reason && <p className="text-xs text-destructive mt-1">Motivo: {r.suspended_reason}</p>}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline" onClick={() => toggleAdmin(r)}>
                    {r.is_admin ? <><ShieldOff className="h-3 w-3 mr-1" />Remover admin</> : <><ShieldCheck className="h-3 w-3 mr-1" />Tornar admin</>}
                  </Button>
                  <Button size="sm" variant={r.suspended ? "outline" : "destructive"} onClick={() => toggleSuspend(r)}>
                    {r.suspended ? <><RotateCcw className="h-3 w-3 mr-1" />Reativar</> : <><Ban className="h-3 w-3 mr-1" />Suspender</>}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}