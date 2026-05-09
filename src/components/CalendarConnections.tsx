import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Link2, RefreshCw, Trash2, CalendarCheck2 } from "lucide-react";

type Props = { supplierId: string };
type Conn = {
  id: string;
  provider: "google" | "outlook";
  account_email: string | null;
  last_synced_at: string | null;
  sync_enabled: boolean;
};

export default function CalendarConnections({ supplierId }: Props) {
  const { toast } = useToast();
  const [conns, setConns] = useState<Conn[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from("supplier_calendar_connections")
      .select("id, provider, account_email, last_synced_at, sync_enabled")
      .eq("supplier_id", supplierId);
    setConns((data || []) as Conn[]);
  };

  useEffect(() => {
    load();
    const u = new URL(window.location.href);
    if (u.searchParams.get("calendar") === "ok") {
      toast({ title: "Agenda conectada!", description: "Eventos sincronizados como datas indisponíveis." });
      u.searchParams.delete("calendar");
      window.history.replaceState({}, "", u.toString());
    } else if (u.searchParams.get("calendar") === "error") {
      toast({ title: "Falha ao conectar agenda", variant: "destructive" });
      u.searchParams.delete("calendar");
      window.history.replaceState({}, "", u.toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplierId]);

  const connect = async (provider: "google" | "outlook") => {
    setBusy(provider);
    const { data, error } = await supabase.functions.invoke("oauth-calendar-init", {
      body: { provider, return_to: "/fornecedor/painel" },
    });
    setBusy(null);
    if (error || !data?.url) {
      toast({ title: "Erro", description: error?.message || "Não foi possível iniciar a conexão", variant: "destructive" });
      return;
    }
    window.location.href = data.url;
  };

  const sync = async (id: string) => {
    setBusy(id);
    const { error } = await supabase.functions.invoke("calendar-sync-cron", {
      body: { supplier_id: supplierId },
    });
    setBusy(null);
    if (error) toast({ title: "Erro ao sincronizar", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Sincronizado", description: "Datas atualizadas a partir da agenda." });
      load();
    }
  };

  const disconnect = async (id: string, provider: string) => {
    if (!confirm("Desconectar esta agenda? Os bloqueios importados serão removidos.")) return;
    setBusy(id);
    await supabase.from("supplier_blocked_dates")
      .delete().eq("supplier_id", supplierId).eq("source", `calendar:${provider}`);
    await supabase.from("supplier_calendar_connections").delete().eq("id", id);
    setBusy(null);
    toast({ title: "Agenda desconectada" });
    load();
  };

  const has = (p: string) => conns.find((c) => c.provider === p);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarCheck2 className="h-4 w-4 text-primary" />
          Sincronizar agenda externa
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Conecte sua agenda Google ou Outlook. Eventos confirmados viram datas indisponíveis aqui automaticamente (atualizado a cada 6 horas).
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {(["google", "outlook"] as const).map((p) => {
          const c = has(p);
          const label = p === "google" ? "Google Agenda" : "Outlook / Microsoft 365";
          return (
            <div key={p} className="flex items-center justify-between gap-3 p-3 border border-border rounded-lg">
              <div className="min-w-0">
                <p className="text-sm font-medium">{label}</p>
                {c ? (
                  <p className="text-xs text-muted-foreground truncate">
                    {c.account_email || "conta conectada"}
                    {c.last_synced_at && (
                      <span> · sincronizado em {new Date(c.last_synced_at).toLocaleString("pt-BR")}</span>
                    )}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">Não conectado</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {c ? (
                  <>
                    <Badge variant="secondary" className="hidden sm:inline-flex">Ativo</Badge>
                    <Button size="sm" variant="outline" disabled={busy === c.id} onClick={() => sync(c.id)}>
                      {busy === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    </Button>
                    <Button size="sm" variant="ghost" disabled={busy === c.id} onClick={() => disconnect(c.id, p)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </>
                ) : (
                  <Button size="sm" disabled={busy === p} onClick={() => connect(p)}>
                    {busy === p ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Link2 className="h-3.5 w-3.5 mr-1.5" />}
                    Conectar
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}