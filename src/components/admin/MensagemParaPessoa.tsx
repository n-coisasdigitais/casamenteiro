import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { traduzirErro } from "@/lib/errorMessages";
import { erroComunicacao } from "@/lib/comunicacao";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import UserAvatar from "@/components/UserAvatar";
import { Bell, Loader2, Mail, Search, Send, X } from "lucide-react";

export type Destinatario = {
  user_id: string;
  nome: string | null;
  email: string | null;
  tipo: string | null;
  avatar_url?: string | null;
};

const TIPO_LABEL: Record<string, string> = {
  couple: "Casal",
  supplier: "Fornecedor",
  profissional: "Profissional",
  generico: "Perfil sonho",
};

/**
 * Admin › Comunicação › "Uma pessoa": busca um usuário e envia mensagem
 * pelo sininho (notificação no site) e/ou e-mail.
 * Aceita `inicial` (user_id) para abrir já com a pessoa escolhida (ex.: /admin/comunicacao?para=<id>).
 */
export default function MensagemParaPessoa({ inicial }: { inicial?: string | null }) {
  const { toast } = useToast();
  const [termo, setTermo] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [resultados, setResultados] = useState<Destinatario[]>([]);
  const [para, setPara] = useState<Destinatario | null>(null);
  const [titulo, setTitulo] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [link, setLink] = useState("");
  const [push, setPush] = useState(true);
  const [email, setEmail] = useState(true);
  const [enviando, setEnviando] = useState(false);

  const buscar = async (t: string) => {
    const { data, error } = await supabase.rpc("admin_buscar_usuarios" as never, { _termo: t } as never);
    if (error) throw error;
    return (data as unknown as Destinatario[]) || [];
  };

  // Pré-seleção via ?para=<user_id>
  useEffect(() => {
    if (!inicial) return;
    buscar(inicial)
      .then((r) => r[0] && setPara(r[0]))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inicial]);

  // Busca com espera de 350 ms
  useEffect(() => {
    const t = termo.trim();
    if (t.length < 2) {
      setResultados([]);
      return;
    }
    setBuscando(true);
    const id = setTimeout(() => {
      buscar(t)
        .then(setResultados)
        .catch((e) => toast({ title: "Erro na busca", description: traduzirErro(e), variant: "destructive" }))
        .finally(() => setBuscando(false));
    }, 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [termo]);

  const enviar = async () => {
    if (!para || !titulo.trim() || (!push && !email) || enviando) return;
    const canais = [push && "sininho", email && "e-mail"].filter(Boolean).join(" e ");
    if (!confirm(`Enviar para ${para.nome || para.email} por ${canais}?`)) return;
    setEnviando(true);
    const { data, error } = await supabase.functions.invoke("admin-mensagem-pessoa", {
      body: {
        user_id: para.user_id,
        titulo: titulo.trim(),
        mensagem: mensagem.trim(),
        link: link.trim() || null,
        push,
        email,
      },
    });
    setEnviando(false);
    if (error) {
      toast({ title: "Não foi possível enviar", description: await erroComunicacao(error), variant: "destructive" });
      return;
    }
    const r = data as { ok?: boolean; push?: boolean; email?: boolean; emailErro?: string | null } | null;
    if (!r?.ok || (!r.push && !r.email)) {
      toast({ title: "Nenhum canal confirmou o envio", variant: "destructive" });
      return;
    }
    const ok = [r.push && "sininho", r.email && "e-mail"].filter(Boolean).join(" e ");
    toast({
      title: `Mensagem enviada por ${ok}!`,
      description: email && !r.email ? r.emailErro ?? "O e-mail não foi enviado." : push && !r.push ? "O aviso na plataforma não foi enviado." : undefined,
      variant: (email && !r.email) || (push && !r.push) ? "destructive" : undefined,
    });
    if ((email && !r.email) || (push && !r.push)) {
      if (r.push) setPush(false);
      if (r.email) setEmail(false);
      return;
    }
    setTitulo("");
    setMensagem("");
    setLink("");
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div>
          <Label>Para quem</Label>
          {para ? (
            <div className="mt-2 flex items-center gap-3 rounded-lg border p-3">
              <UserAvatar fullName={para.nome} avatarUrl={para.avatar_url} />
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{para.nome || "Sem nome"}</p>
                <p className="text-xs text-muted-foreground truncate">{para.email}</p>
              </div>
              {para.tipo && <Badge variant="secondary">{TIPO_LABEL[para.tipo] || para.tipo}</Badge>}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Trocar destinatário"
                onClick={() => setPara(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="mt-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={termo}
                  onChange={(e) => setTermo(e.target.value)}
                  placeholder="Nome, empresa ou e-mail"
                  className="pl-9"
                />
                {buscando && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
              {resultados.length > 0 && (
                <ul className="mt-2 max-h-72 overflow-auto rounded-lg border divide-y">
                  {resultados.map((r) => (
                    <li key={r.user_id}>
                      <button
                        type="button"
                        onClick={() => {
                          setPara(r);
                          setTermo("");
                          setResultados([]);
                        }}
                        className="flex w-full items-center gap-3 p-3 text-left hover:bg-muted/60"
                      >
                        <UserAvatar fullName={r.nome} avatarUrl={r.avatar_url} className="h-8 w-8" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium truncate">{r.nome || "Sem nome"}</span>
                          <span className="block text-xs text-muted-foreground truncate">{r.email}</span>
                        </span>
                        {r.tipo && <Badge variant="outline">{TIPO_LABEL[r.tipo] || r.tipo}</Badge>}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {!buscando && termo.trim().length >= 2 && resultados.length === 0 && (
                <p className="mt-2 text-sm text-muted-foreground">Ninguém encontrado.</p>
              )}
            </div>
          )}
        </div>

        <div>
          <Label htmlFor="p-titulo">Título *</Label>
          <Input
            id="p-titulo"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            maxLength={120}
            placeholder="Ex.: Seu cadastro foi aprovado!"
          />
        </div>
        <div>
          <Label htmlFor="p-msg">Mensagem</Label>
          <Textarea
            id="p-msg"
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            rows={5}
            maxLength={3000}
            placeholder="Escreva a mensagem..."
          />
        </div>
        <div>
          <Label htmlFor="p-link">Link de ação (opcional)</Label>
          <Input
            id="p-link"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="/fornecedor/painel ou https://..."
          />
        </div>

        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox checked={push} onCheckedChange={(v) => setPush(!!v)} />
            <Bell className="h-4 w-4 text-muted-foreground" /> Sininho (no site)
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox checked={email} onCheckedChange={(v) => setEmail(!!v)} />
            <Mail className="h-4 w-4 text-muted-foreground" /> E-mail
          </label>
        </div>

        <Button onClick={enviar} disabled={enviando || !para || !titulo.trim() || (!push && !email)} className="w-full">
          {enviando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
          {enviando ? "Enviando..." : "Enviar para esta pessoa"}
        </Button>
      </CardContent>
    </Card>
  );
}
