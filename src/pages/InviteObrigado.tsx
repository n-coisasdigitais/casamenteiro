import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, CheckCircle2, XCircle, Pencil } from "lucide-react";

export default function InviteObrigado() {
  const { token } = useParams();
  const [params] = useSearchParams();
  const response = params.get("r"); // confirmed | declined
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!token) return;
    (supabase as any).rpc("get_invite_by_token", { _token: token }).then(({ data: rows }: any) => {
      setData(rows?.[0] || null);
    });
  }, [token]);

  const confirmed = response === "confirmed" || data?.rsvp_response === "confirmed";
  const total = confirmed ? 1 + (data?.rsvp_companions || 0) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-secondary/20 to-background py-12 px-4 flex items-center justify-center">
      <Card className="max-w-lg w-full p-8 text-center space-y-5">
        <Heart className="h-10 w-10 mx-auto text-primary" fill="currentColor" />
        {confirmed ? (
          <>
            <CheckCircle2 className="h-12 w-12 mx-auto text-green-600" />
            <h1 className="text-2xl font-serif">Presença confirmada! 💖</h1>
            <p className="text-muted-foreground">
              Obrigado, <strong>{data?.guest_name}</strong>! Sua presença ({total} pessoa{total > 1 ? "s" : ""}) está registrada.
            </p>
          </>
        ) : (
          <>
            <XCircle className="h-12 w-12 mx-auto text-muted-foreground" />
            <h1 className="text-2xl font-serif">Sentiremos sua falta</h1>
            <p className="text-muted-foreground">
              Obrigado por avisar, <strong>{data?.guest_name}</strong>. Sua resposta foi registrada.
            </p>
          </>
        )}

        <p className="text-sm text-muted-foreground">
          Mudou de ideia? Você pode editar sua resposta a qualquer momento.
        </p>

        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Button asChild variant="outline">
            <Link to={`/convite/${token}`}><Pencil className="h-4 w-4 mr-2" />Editar minha resposta</Link>
          </Button>
        </div>

        <p className="text-xs text-muted-foreground pt-4">Convite enviado pelo Casamenteiro</p>
      </Card>
    </div>
  );
}