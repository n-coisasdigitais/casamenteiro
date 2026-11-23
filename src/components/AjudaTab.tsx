import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { traduzirErro } from "@/lib/errorMessages";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LifeBuoy } from "lucide-react";
import FormFeedback, {
  TIPOS_FEEDBACK,
  type OrigemFeedback,
  type TipoFeedback,
} from "@/components/feedback/FormFeedback";

type Reporte = {
  id: string;
  assunto: string;
  descricao: string;
  tipo: TipoFeedback | null;
  status: "aberto" | "respondido" | "resolvido";
  created_at: string;
};

const STATUS_LABEL: Record<Reporte["status"], string> = {
  aberto: "Aberto",
  respondido: "Respondido",
  resolvido: "Resolvido",
};

export default function AjudaTab({ origem }: { origem: OrigemFeedback }) {
  const { user } = useAuth();
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = async () => {
    if (!user) return;
    setErro(null);
    const { data, error } = await supabase
      .from("suporte_reportes")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) { setErro(traduzirErro(error)); return; }
    setReportes((data as unknown as Reporte[]) || []);
  };

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <LifeBuoy className="h-5 w-5 text-primary" />
            Ajuda, erros e ideias
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Reporte um erro, sugira uma melhoria ou mande uma ideia nova. Você recebe a resposta por e-mail.
          </p>
          <FormFeedback origem={origem} onEnviado={carregar} />
        </CardContent>
      </Card>

      {erro && (
        <div role="alert" className="space-y-2 text-sm">
          <p>Não foi possível carregar seus envios. {erro}</p>
          <Button variant="outline" onClick={carregar}>Tentar novamente</Button>
        </div>
      )}
      {reportes.length > 0 && !erro && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Seus envios</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {reportes.map((r) => (
              <div
                key={r.id}
                className="flex items-start justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{r.assunto}</p>
                  <p className="text-xs text-muted-foreground">
                    {TIPOS_FEEDBACK.find((t) => t.valor === (r.tipo ?? "erro"))?.rotulo} ·{" "}
                    {new Date(r.created_at).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <Badge variant={r.status === "aberto" ? "secondary" : "default"}>{STATUS_LABEL[r.status]}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
