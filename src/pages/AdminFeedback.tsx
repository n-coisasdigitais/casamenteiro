import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { traduzirErro } from "@/lib/errorMessages";
import { useToast } from "@/hooks/use-toast";
import SEO from "@/components/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Bug, CheckCircle2, ExternalLink, Lightbulb, Loader2, Mail, Paperclip, Send, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type Status = "aberto" | "respondido" | "resolvido";
type Tipo = "erro" | "melhoria" | "sugestao";

type Item = {
  id: string;
  created_at: string;
  user_id: string;
  nome: string | null;
  email: string | null;
  conta: string | null;
  origem: string;
  tipo: Tipo;
  assunto: string;
  descricao: string;
  solucao_sugerida: string | null;
  pagina: string | null;
  anexo_path: string | null;
  status: Status;
  resposta: string | null;
  respondido_em: string | null;
};

const TIPO: Record<Tipo, { rotulo: string; icone: typeof Bug; cor: string }> = {
  erro: { rotulo: "Erro", icone: Bug, cor: "bg-red-50 text-red-800 border-red-200" },
  melhoria: { rotulo: "Melhoria", icone: Sparkles, cor: "bg-amber-50 text-amber-900 border-amber-200" },
  sugestao: { rotulo: "Ideia nova", icone: Lightbulb, cor: "bg-sky-50 text-sky-900 border-sky-200" },
};

const STATUS: Record<Status, string> = { aberto: "Aberto", respondido: "Respondido", resolvido: "Resolvido" };

const CONTA: Record<string, string> = {
  couple: "Casal",
  supplier: "Fornecedor",
  profissional: "Profissional",
  generico: "Perfil sonho",
  admin: "Admin",
};

const dataHora = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });

/** Admin › Feedback: erros, melhorias e ideias enviados pelo botão Feedback e pela aba Ajuda. */
export default function AdminFeedback() {
  const { toast } = useToast();
  const [itens, setItens] = useState<Item[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [status, setStatus] = useState<Status | "todos">("aberto");
  const [tipo, setTipo] = useState<Tipo | "todos">("todos");
  const [aberto, setAberto] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = async () => {
    setCarregando(true);
    setErro(null);
    const { data, error } = await supabase.rpc("admin_listar_feedback" as never, {
      _status: status === "todos" ? null : status,
      _tipo: tipo === "todos" ? null : tipo,
    } as never);
    if (error) {
      setErro(traduzirErro(error));
      toast({ title: "Erro ao carregar", description: traduzirErro(error), variant: "destructive" });
    }
    setItens(((data as unknown) as Item[]) || []);
    setCarregando(false);
  };

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, tipo]);

  return (
    <div className="space-y-5 px-4 py-6 md:px-8">
      <SEO title="Feedback | Admin" noIndex />
      <div>
        <h1 className="text-2xl font-semibold">Feedback dos usuários</h1>
        <p className="text-sm text-muted-foreground">
          Erros, melhorias e ideias enviados pelo botão Feedback e pela aba Ajuda. A resposta chega por e-mail e no sininho.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["aberto", "respondido", "resolvido", "todos"] as const).map((s) => (
          <Button key={s} size="sm" variant={status === s ? "default" : "outline"} className="rounded-full" onClick={() => setStatus(s)}>
            {s === "todos" ? "Todos" : STATUS[s]}
          </Button>
        ))}
        <span className="mx-1 w-px bg-border" aria-hidden="true" />
        {(["todos", "erro", "melhoria", "sugestao"] as const).map((t) => (
          <Button key={t} size="sm" variant={tipo === t ? "secondary" : "ghost"} className="rounded-full" onClick={() => setTipo(t)}>
            {t === "todos" ? "Todos os tipos" : TIPO[t].rotulo}
          </Button>
        ))}
      </div>

      {carregando ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : erro ? (
        <div role="alert" className="space-y-3">
          <p className="text-sm">Não foi possível carregar os feedbacks. {erro}</p>
          <Button variant="outline" onClick={carregar}>Tentar novamente</Button>
        </div>
      ) : itens.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Nada por aqui.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {itens.map((it) => (
            <ItemFeedback
              key={it.id}
              item={it}
              expandido={aberto === it.id}
              onAlternar={() => setAberto(aberto === it.id ? null : it.id)}
              onMudou={carregar}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ItemFeedback({ item, expandido, onAlternar, onMudou }: { item: Item; expandido: boolean; onAlternar: () => void; onMudou: () => void }) {
  const { toast } = useToast();
  const [resposta, setResposta] = useState("");
  const [resolver, setResolver] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [anexoUrl, setAnexoUrl] = useState<string | null>(null);
  const [erroAnexo, setErroAnexo] = useState(false);
  const t = TIPO[item.tipo] ?? TIPO.erro;

  useEffect(() => {
    if (!expandido || !item.anexo_path || anexoUrl) return;
    supabase.storage.from("suporte").createSignedUrl(item.anexo_path, 60 * 30).then(({ data, error }) => {
      setAnexoUrl(data?.signedUrl ?? null);
      setErroAnexo(Boolean(error || !data?.signedUrl));
    });
  }, [expandido, item.anexo_path, anexoUrl]);

  const anexoEhImagem = useMemo(() => /\.(png|jpe?g|webp|gif|heic)$/i.test(item.anexo_path || ""), [item.anexo_path]);

  const mudarStatus = async (novo: Status) => {
    const { error } = await supabase.rpc("admin_atualizar_feedback" as never, { _id: item.id, _status: novo, _resposta: null } as never);
    if (error) toast({ title: "Erro", description: traduzirErro(error), variant: "destructive" });
    else onMudou();
  };

  const responder = async () => {
    if (!resposta.trim()) return;
    setEnviando(true);
    const { data: envio, error: e1 } = await supabase.functions.invoke("admin-mensagem-pessoa", {
      body: {
        user_id: item.user_id,
        titulo: `Sobre o seu ${item.tipo === "erro" ? "reporte" : "feedback"}: ${item.assunto}`.slice(0, 120),
        mensagem: resposta.trim(),
        link: null,
        push: true,
        email: true,
      },
    });
    if (e1 || !envio?.ok || (!envio.push && !envio.email)) {
      setEnviando(false);
      toast({ title: "Não foi possível enviar a resposta", description: e1 ? traduzirErro(e1) : "Nenhum canal confirmou o envio. Tente novamente.", variant: "destructive" });
      return;
    }
    const { error: e2 } = await supabase.rpc("admin_atualizar_feedback" as never, {
      _id: item.id,
      _status: resolver ? "resolvido" : "respondido",
      _resposta: resposta.trim(),
    } as never);
    setEnviando(false);
    if (e2) toast({ title: "Resposta enviada, mas o status não mudou", description: traduzirErro(e2), variant: "destructive" });
    else {
      toast({ title: envio.email && envio.push ? "Resposta enviada por e-mail e no sininho!" : envio.email ? "Resposta enviada por e-mail." : "Resposta enviada no sininho; o e-mail não foi enviado." });
      setResposta("");
      onMudou();
    }
  };

  return (
    <Card className={cn(item.status === "aberto" && "border-primary/40")}>
      <button type="button" onClick={onAlternar} className="flex w-full items-start gap-3 p-4 text-left" aria-expanded={expandido}>
        <span className={cn("mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium", t.cor)}>
          <t.icone className="h-3.5 w-3.5" aria-hidden="true" /> {t.rotulo}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-medium truncate">{item.assunto}</span>
          <span className="block text-xs text-muted-foreground truncate">
            {item.nome || "Sem nome"} · {CONTA[item.conta ?? ""] ?? item.origem} · {dataHora(item.created_at)}
            {item.pagina ? ` · ${item.pagina}` : ""}
          </span>
        </span>
        <Badge variant={item.status === "aberto" ? "default" : "secondary"}>{STATUS[item.status]}</Badge>
      </button>

      {expandido && (
        <CardContent className="space-y-4 border-t pt-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">O que a pessoa escreveu</p>
            <p className="whitespace-pre-wrap text-sm rounded-lg bg-muted/50 p-3">{item.descricao}</p>
          </div>
          {item.solucao_sugerida && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Como ela resolveria</p>
              <p className="whitespace-pre-wrap text-sm rounded-lg bg-emerald-50 p-3">{item.solucao_sugerida}</p>
            </div>
          )}
          {item.anexo_path && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1"><Paperclip className="h-3.5 w-3.5" /> Anexo</p>
              {erroAnexo ? (
                <p className="text-sm text-muted-foreground">Não foi possível abrir o anexo.</p>
              ) : !anexoUrl ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : anexoEhImagem ? (
                <a href={anexoUrl} target="_blank" rel="noreferrer">
                  <img src={anexoUrl} alt="Print enviado pelo usuário" className="max-h-72 rounded-lg border" />
                </a>
              ) : (
                <a href={anexoUrl} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
                  Abrir anexo <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          )}
          <div className="flex flex-wrap gap-3 text-sm">
            {item.email && (
              <a href={`mailto:${item.email}?subject=${encodeURIComponent(item.assunto)}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                <Mail className="h-4 w-4" /> {item.email}
              </a>
            )}
            {item.pagina && (
              <a href={item.pagina} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                <ExternalLink className="h-4 w-4" /> Abrir a tela {item.pagina}
              </a>
            )}
          </div>

          {item.resposta && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">
                Resposta enviada{item.respondido_em ? ` em ${dataHora(item.respondido_em)}` : ""}
              </p>
              <p className="whitespace-pre-wrap text-sm rounded-lg border p-3">{item.resposta}</p>
            </div>
          )}

          <div className="space-y-2">
            <Textarea
              value={resposta}
              onChange={(e) => setResposta(e.target.value)}
              rows={4}
              maxLength={3000}
              placeholder={`Responder ${item.nome?.split(" ")[0] || "a pessoa"}… (vai por e-mail e no sininho)`}
            />
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={resolver} onCheckedChange={(v) => setResolver(!!v)} /> Marcar como resolvido
              </label>
              <div className="ml-auto flex gap-2">
                {item.status !== "resolvido" ? (
                  <Button type="button" variant="outline" size="sm" onClick={() => mudarStatus("resolvido")}>
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Resolver sem responder
                  </Button>
                ) : (
                  <Button type="button" variant="ghost" size="sm" onClick={() => mudarStatus("aberto")}>Reabrir</Button>
                )}
                <Button type="button" size="sm" onClick={responder} disabled={enviando || !resposta.trim()}>
                  {enviando ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
                  Enviar resposta
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}