import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, ArrowLeft } from "lucide-react";

export default function AdminAuditLog() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login"); return; }
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }).then(async ({ data }) => {
      if (!data) { navigate("/"); return; }
      setChecked(true);
      const { data: logs } = await supabase.from("admin_audit_log").select("*").order("created_at", { ascending: false }).limit(500);
      setRows(logs || []);
    });
  }, [user, authLoading, navigate]);

  if (!checked) return <div className="min-h-screen flex items-center justify-center">Verificando...</div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b sticky top-0 z-40">
        <div className="container flex items-center gap-3 h-16">
          <Button variant="ghost" size="icon" asChild><Link to="/admin"><ArrowLeft className="h-4 w-4" /></Link></Button>
          <Heart className="h-5 w-5 text-primary fill-primary" />
          <span className="font-bold">Logs de auditoria</span>
        </div>
      </header>
      <main className="container py-6">
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="p-2 text-left">Quando</th>
                <th className="p-2 text-left">Admin</th>
                <th className="p-2 text-left">Ação</th>
                <th className="p-2 text-left">Tabela</th>
                <th className="p-2 text-left">ID alvo</th>
                <th className="p-2 text-left">Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-t">
                  <td className="p-2 whitespace-nowrap">{new Date(r.created_at).toLocaleString("pt-BR")}</td>
                  <td className="p-2 font-mono text-xs">{r.admin_id?.slice(0, 8)}</td>
                  <td className="p-2"><Badge variant="outline">{r.action}</Badge></td>
                  <td className="p-2">{r.target_table || "—"}</td>
                  <td className="p-2 font-mono text-xs">{r.target_id?.slice(0, 8) || "—"}</td>
                  <td className="p-2 max-w-md"><code className="text-xs">{r.details ? JSON.stringify(r.details) : "—"}</code></td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhum registro.</td></tr>}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}