import { traduzirErro } from "@/lib/errorMessages";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeft, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isDemoSession } from "@/lib/demoScope";
import { filtroComunicacao, type FiltroPendencia, type SegmentoComunicacao } from "@/lib/comunicacao";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MensagemParaPessoa from "@/components/admin/MensagemParaPessoa";

export default function AdminBroadcast() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [ok, setOk] = useState(false);
  const [segment, setSegment] = useState<SegmentoComunicacao>("couples");
  const [pendencia, setPendencia] = useState<FiltroPendencia>("todos");
  const [push, setPush] = useState(true);
  const [email, setEmail] = useState(false);
  const [destinatarios, setDestinatarios] = useState<number | null>(null);
  const [erroDestinatarios, setErroDestinatarios] = useState(false);
  const demo = isDemoSession();
  const filtro = filtroComunicacao(segment, pendencia);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [sending, setSending] = useState(false);
  const [counts, setCounts] = useState({ couples: 0, suppliers: 0, profissionais: 0, genericos: 0, all: 0 });
  const [params] = useSearchParams();
  const paraInicial = params.get("para");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/login");
      return;
    }
    Promise.resolve(supabase.rpc("has_role", { _user_id: user.id, _role: "admin" })).then(async ({ data }) => {
      if (!data) {
        navigate("/");
        return;
      }
      setOk(true);
      const segmentos = ["couples", "suppliers", "profissionais", "genericos", "all"] as const;
      const valores = await Promise.all(segmentos.map(async (s) => {
        const { data, error } = await supabase.rpc("admin_destinatarios_comunicacao", { _segment: s, _pendencia: "todos", _demo: demo });
        if (error) throw error;
        return [s, data?.length || 0] as const;
      }));
      setCounts(Object.fromEntries(valores) as typeof counts);
    }).catch((error) => {
      toast({ title: "Não foi possível contar destinatários", description: traduzirErro(error), variant: "destructive" });
    });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!ok) return;
    let ativo = true;
    setDestinatarios(null);
    setErroDestinatarios(false);
    supabase.rpc("admin_destinatarios_comunicacao", { _segment: segment, _pendencia: filtro, _demo: demo }).then(({ data, error }) => {
      if (!ativo) return;
      setErroDestinatarios(Boolean(error));
      if (!error) setDestinatarios(data?.length || 0);
    });
    return () => { ativo = false; };
  }, [ok, segment, filtro, demo]);

  const send = async () => {
    if (!title.trim() || !destinatarios || (!push && !email) || sending) return;
    const canais = [push && "plataforma", email && "e-mail"].filter(Boolean).join(" e ");
    if (!confirm(`Enviar para ${destinatarios} destinatários por ${canais}?`)) return;
    setSending(true);
    const { data, error } = await supabase.functions.invoke("admin-comunicacao-grupo", {
      body: { segment, pendencia: filtro, titulo: title.trim(), mensagem: body.trim(), link: link.trim() || null, push, email, demo },
    });
    setSending(false);
    if (error) toast({ title: "Erro", description: traduzirErro(error), variant: "destructive" });
    else if (data?.ok) {
      toast({ title: `${data.plataforma} avisos na plataforma e ${data.emails} e-mails enviados`, description: data.falhas ? `${data.falhas} envios não concluídos. Confira o histórico.` : undefined, variant: data.falhas ? "destructive" : undefined });
      if (data.falhas) return;
      setTitle("");
      setBody("");
      setLink("");
    }
  };

  if (!ok) return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Comunicação</h1>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/admin">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Painel
            </Link>
          </Button>
        </div>
      </header>
      <div className="container py-8 max-w-2xl space-y-4">
        <Tabs defaultValue={paraInicial ? "pessoa" : "grupo"}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="grupo">Para um grupo</TabsTrigger>
            <TabsTrigger value="pessoa">Para uma pessoa</TabsTrigger>
          </TabsList>
          <TabsContent value="pessoa" className="mt-4">
            <MensagemParaPessoa inicial={paraInicial} />
          </TabsContent>
          <TabsContent value="grupo" className="mt-4">
            <Card>
              <CardContent className="p-4 space-y-4">
                <div>
                  <Label>Segmento</Label>
                  <RadioGroup value={segment} onValueChange={(v) => { setSegment(v as SegmentoComunicacao); setPendencia("todos"); }} className="mt-2 space-y-2">
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="couples" id="s1" />
                      <Label htmlFor="s1" className="font-normal">
                        Casais ({counts.couples})
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="suppliers" id="s2" />
                      <Label htmlFor="s2" className="font-normal">
                        Fornecedores ({counts.suppliers})
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="profissionais" id="s4" />
                      <Label htmlFor="s4" className="font-normal">
                        Profissionais ({counts.profissionais})
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="genericos" id="s5" />
                      <Label htmlFor="s5" className="font-normal">
                        Perfis sonho — fizeram o quiz e criaram conta ({counts.genericos})
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="all" id="s3" />
                      <Label htmlFor="s3" className="font-normal">
                        Todos ({counts.all})
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
                {(segment === "suppliers" || segment === "profissionais") && (
                  <div className="space-y-2">
                    <Label htmlFor="pendencia-cadastro">Situação do cadastro</Label>
                    <Select value={filtro} onValueChange={(v) => setPendencia(v as FiltroPendencia)}>
                      <SelectTrigger id="pendencia-cadastro"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos os cadastros</SelectItem>
                        <SelectItem value="dados">Dados cadastrais incompletos</SelectItem>
                        {segment === "profissionais" && <SelectItem value="documentos">Sem documentos ou com documentos recusados</SelectItem>}
                        {segment === "profissionais" && <SelectItem value="incompleto">Dados ou documentos incompletos</SelectItem>}
                      </SelectContent>
                    </Select>
                    {filtro !== "todos" && <Button variant="outline" size="sm" onClick={() => {
                      setTitle("Complete seu cadastro no Casamenteiro");
                      setBody(segment === "suppliers" ? "Olá! Ainda há informações pendentes no seu cadastro. Acesse seu painel, confira os itens indicados e complete os dados para dar continuidade à análise." : filtro === "dados" ? "Olá! Ainda há dados cadastrais pendentes no seu perfil. Acesse seu painel e complete as informações para dar continuidade ao cadastro." : "Olá! Há pendências nos dados cadastrais ou nos documentos de verificação do seu perfil. Acesse seu painel, confira suas informações e a seção de documentos e complete os itens pendentes.");
                      setLink(segment === "suppliers" ? "/fornecedor/painel" : "/profissional/painel?tab=perfil");
                    }}>Usar aviso de cadastro pendente</Button>}
                  </div>
                )}
                <p className="text-sm text-muted-foreground">{erroDestinatarios ? "Não foi possível consultar os destinatários. Atualize a página para tentar novamente." : destinatarios === null ? "Consultando destinatários…" : `${destinatarios} destinatários selecionados`}</p>
                <div>
                  <Label htmlFor="title">Título *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Nova promoção disponível!"
                    maxLength={120}
                  />
                </div>
                <div>
                  <Label htmlFor="body">Mensagem</Label>
                  <Textarea
                    id="body"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={4}
                    placeholder="Detalhes da mensagem..."
                    maxLength={3000}
                  />
                </div>
                <div>
                  <Label htmlFor="link">Link de ação (opcional)</Label>
                  <Input
                    id="link"
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    placeholder="/buscar ou /meu-plano"
                  />
                </div>
                <div className="flex flex-wrap gap-6">
                  <label className="flex items-center gap-2 text-sm"><Checkbox checked={push} onCheckedChange={(v) => setPush(v === true)} /> Plataforma (sininho)</label>
                  <label className="flex items-center gap-2 text-sm"><Checkbox checked={email} disabled={demo} onCheckedChange={(v) => setEmail(v === true)} /> E-mail</label>
                </div>
                <Button onClick={send} disabled={sending || !title.trim() || !destinatarios || (!push && !email) || erroDestinatarios} className="w-full">
                  <Send className="w-4 h-4 mr-2" />
                  {sending ? "Enviando..." : "Enviar agora"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
