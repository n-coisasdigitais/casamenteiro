import { useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { traduzirErro } from "@/lib/errorMessages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Bug, Lightbulb, Loader2, Paperclip, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type OrigemFeedback = "fornecedor" | "profissional" | "casal" | "generico";
export type TipoFeedback = "erro" | "sugestao" | "melhoria";

export const TIPOS_FEEDBACK: {
  valor: TipoFeedback;
  rotulo: string;
  icone: typeof Bug;
  assunto: string;
  descricao: string;
}[] = [
  {
    valor: "erro",
    rotulo: "Algo deu erro",
    icone: Bug,
    assunto: "Ex.: Não consigo salvar as fotos do perfil",
    descricao: "O que você tentou fazer, o que aconteceu e em qual tela estava?",
  },
  {
    valor: "melhoria",
    rotulo: "Melhorar algo",
    icone: Sparkles,
    assunto: "Ex.: A busca poderia filtrar por bairro",
    descricao: "O que existe hoje e como ficaria melhor para você?",
  },
  {
    valor: "sugestao",
    rotulo: "Ideia nova",
    icone: Lightbulb,
    assunto: "Ex.: Ter um checklist do dia do casamento",
    descricao: "Qual a ideia e que problema ela resolveria?",
  },
];

const MAX_ANEXO_MB = 10;

/** Formulário de feedback (erro, melhoria ou ideia). Usado na aba Ajuda e no botão flutuante. */
export default function FormFeedback({
  origem,
  tipoInicial = "erro",
  onEnviado,
}: {
  origem: OrigemFeedback;
  tipoInicial?: TipoFeedback;
  onEnviado?: () => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { pathname } = useLocation();
  const [tipo, setTipo] = useState<TipoFeedback>(tipoInicial);
  const [assunto, setAssunto] = useState("");
  const [descricao, setDescricao] = useState("");
  const [solucao, setSolucao] = useState("");
  const [anexo, setAnexo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);

  const t = TIPOS_FEEDBACK.find((x) => x.valor === tipo)!;

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
        const nomeSeguro = anexo.name.replace(/[^\w.-]/g, "_");
        anexoPath = `${user.id}/${Date.now()}-${nomeSeguro}`;
        const { error: upErr } = await supabase.storage.from("suporte").upload(anexoPath, anexo);
        if (upErr) throw upErr;
      }
      const { error } = await supabase.functions.invoke("reportar-erro", {
        body: {
          origem,
          tipo,
          assunto: assunto.trim(),
          descricao: descricao.trim(),
          solucao_sugerida: solucao.trim() || null,
          pagina: pathname,
          anexo_path: anexoPath,
        },
      });
      if (error) throw error;
      toast({
        title: tipo === "erro" ? "Reporte enviado!" : "Obrigado pela ideia!",
        description: "A equipe recebe na hora e responde por e-mail.",
      });
      setAssunto("");
      setDescricao("");
      setSolucao("");
      setAnexo(null);
      onEnviado?.();
    } catch (e) {
      toast({ title: "Não foi possível enviar", description: traduzirErro(e), variant: "destructive" });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Tipo de feedback">
        {TIPOS_FEEDBACK.map((x) => (
          <button
            key={x.valor}
            type="button"
            role="radio"
            aria-checked={tipo === x.valor}
            onClick={() => setTipo(x.valor)}
            className={cn(
              "flex flex-col items-center gap-1 rounded-xl border p-3 text-xs font-medium transition",
              tipo === x.valor
                ? "border-primary bg-primary/10 text-foreground"
                : "text-muted-foreground hover:border-primary/50",
            )}
          >
            <x.icone className="h-5 w-5" />
            {x.rotulo}
          </button>
        ))}
      </div>

      <div>
        <Label>Assunto</Label>
        <Input value={assunto} onChange={(e) => setAssunto(e.target.value)} placeholder={t.assunto} maxLength={120} />
      </div>
      <div>
        <Label>{tipo === "erro" ? "O que aconteceu?" : "Conte com detalhes"}</Label>
        <Textarea
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          rows={4}
          placeholder={t.descricao}
          maxLength={2000}
        />
      </div>
      <div>
        <Label>
          Como você resolveria? <span className="font-normal text-muted-foreground">(opcional)</span>
        </Label>
        <Textarea
          value={solucao}
          onChange={(e) => setSolucao(e.target.value)}
          rows={2}
          placeholder="Se tiver uma ideia de solução, conta pra gente."
          maxLength={1000}
        />
      </div>
      <div>
        <Label>
          Print ou arquivo <span className="font-normal text-muted-foreground">(opcional, até {MAX_ANEXO_MB} MB)</span>
        </Label>
        {anexo ? (
          <div className="flex items-center gap-2 mt-1 text-sm">
            <Paperclip className="h-4 w-4 text-muted-foreground" />
            <span className="truncate flex-1">{anexo.name}</span>
            <Button type="button" size="sm" variant="ghost" onClick={() => setAnexo(null)} aria-label="Remover anexo">
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
        {enviando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        {enviando ? "Enviando..." : "Enviar"}
      </Button>
    </div>
  );
}
