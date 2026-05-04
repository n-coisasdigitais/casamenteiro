import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, MessageSquare, Send, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Metrics = {
  views30: number;
  quotes30: number;
  proposalsSent30: number;
  contracted30: number;
};

export default function SupplierMetrics({ supplierId }: { supplierId: string }) {
  const [m, setM] = useState<Metrics>({ views30: 0, quotes30: 0, proposalsSent30: 0, contracted30: 0 });
  const [recentLeads, setRecentLeads] = useState<any[]>([]);

  useEffect(() => {
    if (!supplierId) return;
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    (async () => {
      const [{ count: views }, { count: quotes }, { count: contracted }, { data: leads }] = await Promise.all([
        supabase.from("supplier_profile_views").select("id", { count: "exact", head: true })
          .eq("supplier_id", supplierId).gte("viewed_at", since),
        supabase.from("quotes").select("id", { count: "exact", head: true })
          .eq("supplier_id", supplierId).gte("created_at", since),
        supabase.from("couple_suppliers").select("id", { count: "exact", head: true })
          .eq("supplier_id", supplierId).eq("kanban_status", "contratado").gte("updated_at", since),
        supabase.from("supplier_leads").select("id, nome_casal, cidade_evento, data_evento, created_at, status_lead")
          .eq("supplier_id", supplierId).order("created_at", { ascending: false }).limit(5),
      ]);

      // proposals sent: mensagens com amount enviadas pelo fornecedor
      const { data: supplierData } = await supabase.from("suppliers").select("user_id").eq("id", supplierId).maybeSingle();
      let proposalsSent = 0;
      if (supplierData?.user_id) {
        const { count } = await supabase.from("quote_messages")
          .select("id", { count: "exact", head: true })
          .eq("sender_id", supplierData.user_id)
          .not("amount", "is", null)
          .gte("created_at", since);
        proposalsSent = count || 0;
      }

      setM({
        views30: views || 0,
        quotes30: quotes || 0,
        proposalsSent30: proposalsSent,
        contracted30: contracted || 0,
      });
      setRecentLeads(leads || []);
    })();
  }, [supplierId]);

  const cards = [
    { label: "Visitas no perfil", value: m.views30, icon: Eye, color: "text-sky-700 bg-sky-100" },
    { label: "Pedidos de orçamento", value: m.quotes30, icon: MessageSquare, color: "text-amber-700 bg-amber-100" },
    { label: "Propostas enviadas", value: m.proposalsSent30, icon: Send, color: "text-violet-700 bg-violet-100" },
    { label: "Contratos fechados", value: m.contracted30, icon: CheckCircle2, color: "text-emerald-700 bg-emerald-100" },
  ];

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-muted-foreground mb-2">Últimos 30 dias</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <Card key={c.label}>
                <CardContent className="p-4">
                  <div className={`inline-flex items-center justify-center h-9 w-9 rounded-full ${c.color} mb-2`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className="text-2xl font-bold leading-none">{c.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{c.label}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {recentLeads.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-semibold mb-3">Últimos leads</p>
            <ul className="space-y-2">
              {recentLeads.map((l) => (
                <li key={l.id} className="flex items-center justify-between text-sm border-b border-border last:border-0 pb-2 last:pb-0">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{l.nome_casal || "Casal interessado"}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {l.cidade_evento || "—"}{l.data_evento ? ` • ${new Date(l.data_evento).toLocaleDateString("pt-BR")}` : ""}
                    </p>
                  </div>
                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{l.status_lead}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}