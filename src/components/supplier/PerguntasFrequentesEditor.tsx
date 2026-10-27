import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { traduzirErro } from "@/lib/errorMessages";

type Faq = { id: string; pergunta: string; resposta: string; ordem: number };

const SUGESTOES = [
  "Qual é a forma de pagamento?",
  "Com quanto tempo de antecedência preciso reservar?",
  "O que está incluso no valor?",
  "Atende em outras cidades? Tem taxa de deslocamento?",
];

const tabela = () => supabase.from("supplier_faqs" as any) as any;

/** Card do painel do fornecedor: perguntas frequentes que aparecem no perfil público. */
export default function PerguntasFrequentesEditor({ supplierId }: { supplierId: string }) {
  const { toast } = useToast();
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [editando, setEditando] = useState<string | "nova" | null>(null);
  const [pergunta, setPergunta] = useState("");
  const [resposta, setResposta] = useState("");
  const [salvando, setSalvando] = useState(false);

  const carregar = async () => {
    const { data } = await tabela().select("id, pergunta, resposta, ordem").eq("supplier_id", supplierId).order("ordem");
    setFaqs(data || []);
  };

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplierId]);

  const abrir = (f?: Faq, sugestao?: string) => {
    setEditando(f ? f.id : "nova");
    setPergunta(f?.pergunta ?? sugestao ?? "");
    setResposta(f?.resposta ?? "");
  };

  const salvar = async () => {
    const p = pergunta.trim();
    const r = resposta.trim();
    if (p.length < 5 || r.length < 2) {
      toast({ title: "Preencha a pergunta e a resposta", variant: "destructive" });
      return;
    }
    setSalvando(true);
    const { error } =
      editando === "nova"
        ? await tabela().insert({ supplier_id: supplierId, pergunta: p, resposta: r, ordem: faqs.length })
        : await tabela().update({ pergunta: p, resposta: r, updated_at: new Date().toISOString() }).eq("id", editando);
    setSalvando(false);
    if (error) {
      toast({ title: "Não foi possível salvar", description: traduzirErro(error), variant: "destructive" });
      return;
    }
    setEditando(null);
    carregar();
  };

  const remover = async (id: string) => {
    const { error } = await tabela().delete().eq("id", id);
    if (error) toast({ title: "Não foi possível remover", description: traduzirErro(error), variant: "destructive" });
    else setFaqs((l) => l.filter((f) => f.id !== id));
  };

  const mover = async (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= faqs.length) return;
    const nova = [...faqs];
    [nova[i], nova[j]] = [nova[j], nova[i]];
    setFaqs(nova);
    await Promise.all(nova.map((f, k) => tabela().update({ ordem: k }).eq("id", f.id)));
  };

  const formulario = (
    <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
      <Input placeholder="Pergunta" value={pergunta} maxLength={200} onChange={(e) => setPergunta(e.target.value)} />
      <Textarea placeholder="Resposta" value={resposta} maxLength={1500} rows={3} onChange={(e) => setResposta(e.target.value)} />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={() => setEditando(null)}>
          Cancelar
        </Button>
        <Button size="sm" onClick={salvar} disabled={salvando}>
          {salvando ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </div>
  );

  const restantes = SUGESTOES.filter((s) => !faqs.some((f) => f.pergunta.trim().toLowerCase() === s.toLowerCase()));

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-lg">Perguntas frequentes</CardTitle>
        <p className="text-sm text-muted-foreground">
          Responda as dúvidas que os casais sempre fazem. Elas aparecem no seu perfil e economizam mensagens.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {faqs.map((f, i) =>
          editando === f.id ? (
            <div key={f.id}>{formulario}</div>
          ) : (
            <div key={f.id} className="flex items-start gap-2 rounded-lg border border-border p-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{f.pergunta}</p>
                <p className="mt-0.5 line-clamp-2 whitespace-pre-line text-sm text-muted-foreground">{f.resposta}</p>
              </div>
              <div className="flex shrink-0 items-center">
                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={i === 0} onClick={() => mover(i, -1)} aria-label="Subir">
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={i === faqs.length - 1} onClick={() => mover(i, 1)} aria-label="Descer">
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => abrir(f)} aria-label="Editar">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remover(f.id)} aria-label="Remover">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ),
        )}

        {editando === "nova" ? (
          formulario
        ) : (
          <>
            {faqs.length < 15 && (
              <Button variant="outline" className="w-full" onClick={() => abrir()}>
                <Plus className="mr-2 h-4 w-4" /> Adicionar pergunta
              </Button>
            )}
            {restantes.length > 0 && faqs.length < 15 && (
              <div className="flex flex-wrap gap-1.5">
                <span className="w-full text-xs text-muted-foreground">Sugestões:</span>
                {restantes.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="rounded-full border border-border px-2.5 py-1 text-xs hover:bg-muted"
                    onClick={() => abrir(undefined, s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
