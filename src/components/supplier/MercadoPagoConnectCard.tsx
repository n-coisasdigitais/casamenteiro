import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Link2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useFeatureFlag } from "@/contexts/FeatureFlagsContext";
import { toast } from "sonner";

type Props = { supplierId: string };

export default function MercadoPagoConnectCard({ supplierId }: Props) {
  const corretagemOn = useFeatureFlag("corretagem_datas_ociosas", false);
  const [loading, setLoading] = useState(true);
  const [conectando, setConectando] = useState(false);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [conectadoEm, setConectadoEm] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    (async () => {
      const { data } = await supabase
        .from("suppliers")
        .select("mp_account_id, mp_connected_at")
        .eq("id", supplierId)
        .maybeSingle();
      if (!ativo) return;
      setAccountId((data as any)?.mp_account_id ?? null);
      setConectadoEm((data as any)?.mp_connected_at ?? null);
      setLoading(false);
    })();
    return () => {
      ativo = false;
    };
  }, [supplierId]);

  const conectar = async () => {
    setConectando(true);
    const { data, error } = await supabase.functions.invoke("mp-oauth-start", {
      body: { supplier_id: supplierId },
    });
    setConectando(false);
    const url = (data as any)?.url as string | undefined;
    if (error || !url) {
      let motivo = (data as any)?.error as string | undefined;
      // funções retornam o motivo no corpo mesmo em status de erro
      const ctx = (error as any)?.context;
      if (!motivo && ctx?.json) motivo = (await ctx.json().catch(() => null))?.error;
      toast.error(motivo ?? "Não foi possível iniciar a conexão com o Mercado Pago.");
      return;
    }
    window.location.href = url;
  };


  const desconectar = async () => {
    const { error } = await supabase
      .from("suppliers")
      .update({ mp_account_id: null, mp_connected_at: null } as any)
      .eq("id", supplierId);
    if (error) {
      toast.error("Não foi possível desconectar a conta.");
      return;
    }
    setAccountId(null);
    setConectadoEm(null);
    toast.success("Conta Mercado Pago desconectada.");
  };

  if (!corretagemOn || loading) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Link2 className="h-5 w-5" /> Recebimento de reservas (Mercado Pago)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Ao vender uma data sua com desconto, o casal paga pela plataforma. Você recebe o valor combinado direto na
          sua conta Mercado Pago; a plataforma retém apenas a comissão.
        </p>

        {accountId ? (
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="secondary" className="gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Mercado Pago conectado
            </Badge>
            {conectadoEm && (
              <span className="text-xs text-muted-foreground">
                desde {new Date(conectadoEm).toLocaleDateString("pt-BR")}
              </span>
            )}
            <Button variant="outline" size="sm" onClick={desconectar}>
              Desconectar
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm">
              Conecte seu Mercado Pago para receber pagamentos de reservas vendidas pela plataforma.
            </p>
            <Button onClick={conectar} disabled={conectando}>
              {conectando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Conectar Mercado Pago
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
