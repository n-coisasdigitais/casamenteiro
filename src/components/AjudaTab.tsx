import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { traduzirErro } from "@/lib/errorMessages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LifeBuoy, Paperclip, X } from "lucide-react";

type Reporte = {
  id: string;
  assunto: string;
  descricao: string;
  status: "aberto" | "respondido" | "resolvido";
  created_at: string;
};

const STATUS_LABEL: Record<Reporte["status"], string> = {
  aberto: "Aberto",
  respondido: "Respondido",
  resolvido: "Resolvido",
};

const MAX_ANEXO_MB = 10;

export default function AjudaTab({ origem }: { origem: "fornecedor" | "profissional" }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [assunto, setAssunto] = useState("");
  const [descricao, setDescricao] = useState("");
  const [anexo, setAnexo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [reportes, setReportes] = useState<Reporte[]>([]);

  const carregar = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("suporte_reportes")
      .select("id, assunto, descricao, status, created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    setReportes((data as Reporte[]) || []);
  };

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const enviar = async () => {
    if (!user) return;
    if (!assunto.trim() || !descricao.trim()) {
      toast({ title: "Preencha o assunto e a descrição", variant: "destructive" });
      return;
    }
    if (anexo && anexo.size > MAX_ANEXO_MB * 1024 * 1024) {
      toast({ title: `O anexo deve ter no máximo ${MAX_ANEXO_MB} MB`, variant: "destructive" });
      return;
    }
    setEnviando(true);
    try {
      let anexoPath: string | null = null;
      if (anexo) {
        const nomeSeguro = anexo.name.replace(/[^\w.\-]/g, "_");
        anexoPath = `${user.id}/${Date.now()}-${nomeSeguro}`;
        const { error: upErr } = await supabase.storage.from("suporte").upload(anexoPath, anexo);
        if (upErr) throw upErr;
      }
      const { error } = await supabase.functions.invoke("reportar-erro", {
        body: {
          origem,
          assunto: assunto.trim(),
          descricao: descricao.trim(),
          anexo_path: anexoPath,
        },
      });
      if (error) throw error;
      toast({ title: "Reporte enviado!", description: "Vamos responder por e-mail em breve." });
      setAssunto("");
      setDescricao("");
      setAnexo(null);
      carregar();
    } catch (e: any) {
      toast({ title: "Não foi possível enviar", description: traduzirErro(e), variant: "destructive" });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <LifeBuoy className="h-5 w-5 text-primary" />
            Reportar um erro ou pedir ajuda
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Conte o que aconteceu e como isso te atrapalha. Você receberá a resposta por e-mail.
          </p>
          <div>
            <Label>Assunto</Label>
            <Input
              value={assunto}
              onChange={(e) => setAssunto(e.target.value)}
              placeholder="Ex.: Não consigo salvar as fotos do perfil"
              maxLength={120}
            />
          </div>
          <div>
            <Label>Descreva o erro e como ele te atrapalha</Label>
            <Textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={5}
              placeholder="O que você tentou fazer, o que aconteceu e em qual tela estava?"
              maxLength={2000}
            />
          </div>
          <div>
            <Label>Anexo (opcional) — print ou arquivo de até {MAX_ANEXO_MB} MB</Label>
            {anexo ? (
              <div className="flex items-center gap-2 mt-1 text-sm">
                <Paperclip className="h-4 w-4 text-muted-foreground" />
                <span className="truncate flex-1">{anexo.name}</span>
                <Button type="button" size="sm" variant="ghost" onClick={() => setAnexo(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Input
                type="file"
                accept="image/*,.pdf"
                className="mt-1"
                onChange={(e) => setAnexo(e.target.files?.[0] ?? null)}
              />
            )}
          </div>
          <Button onClick={enviar} disabled={enviando} className="w-full">
            {enviando ? "Enviando..." : "Enviar reporte"}
          </Button>
        </CardContent>
      </Card>

      {reportes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Seus reportes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {reportes.map((r) => (
              <div key={r.id} className="flex items-start justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
                <div className="min-w-0">
                  <p className="font-medium truncate">{r.assunto}</p>
                  <p className="text-xs text-muted-foreground">
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
