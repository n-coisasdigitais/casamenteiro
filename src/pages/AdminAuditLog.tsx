import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";

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

  if (!checked) return <div className="p-8 text-center">Verificando...</div>;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Logs de auditoria</h1>
        <span className="text-xs text-muted-foreground">{rows.length} registro(s)</span>
      </div>
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
    </div>
  );
}