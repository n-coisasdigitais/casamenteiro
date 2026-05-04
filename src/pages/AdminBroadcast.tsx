import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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

export default function AdminBroadcast() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [ok, setOk] = useState(false);
  const [segment, setSegment] = useState<"couples" | "suppliers" | "all">("couples");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [sending, setSending] = useState(false);
  const [counts, setCounts] = useState({ couples: 0, suppliers: 0 });

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login"); return; }
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }).then(async ({ data }) => {
      if (!data) { navigate("/"); return; }
      setOk(true);
      const { data: profs } = await supabase.from("profiles").select("account_type");
      setCounts({
        couples: (profs || []).filter((p: any) => p.account_type === "couple").length,
        suppliers: (profs || []).filter((p: any) => p.account_type === "supplier").length,
      });
    });
  }, [user, authLoading, navigate]);

  const send = async () => {
    if (!title.trim()) return;
    if (!confirm(`Enviar para ${segment === "couples" ? counts.couples + " casais" : segment === "suppliers" ? counts.suppliers + " fornecedores" : (counts.couples + counts.suppliers) + " usuários"}?`)) return;
    setSending(true);
    const { data, error } = await supabase.rpc("admin_broadcast_notification" as any, {
      _segment: segment,
      _title: title,
      _body: body || null,
      _link: link || null,
    });
    setSending(false);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: `Mensagem enviada para ${data} usuários!` }); setTitle(""); setBody(""); setLink(""); }
  };

  if (!ok) return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Comunicação em massa (push in-app)</h1>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/admin"><ArrowLeft className="w-4 h-4 mr-1" />Painel</Link>
          </Button>
        </div>
      </header>
      <div className="container py-8 max-w-2xl space-y-4">
        <Card>
          <CardContent className="p-4 space-y-4">
            <div>
              <Label>Segmento</Label>
              <RadioGroup value={segment} onValueChange={(v) => setSegment(v as any)} className="mt-2 space-y-2">
                <div className="flex items-center gap-2"><RadioGroupItem value="couples" id="s1" /><Label htmlFor="s1" className="font-normal">Casais ({counts.couples})</Label></div>
                <div className="flex items-center gap-2"><RadioGroupItem value="suppliers" id="s2" /><Label htmlFor="s2" className="font-normal">Fornecedores ({counts.suppliers})</Label></div>
                <div className="flex items-center gap-2"><RadioGroupItem value="all" id="s3" /><Label htmlFor="s3" className="font-normal">Todos ({counts.couples + counts.suppliers})</Label></div>
              </RadioGroup>
            </div>
            <div>
              <Label htmlFor="title">Título *</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Nova promoção disponível!" />
            </div>
            <div>
              <Label htmlFor="body">Mensagem</Label>
              <Textarea id="body" value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder="Detalhes da mensagem..." />
            </div>
            <div>
              <Label htmlFor="link">Link de ação (opcional)</Label>
              <Input id="link" value={link} onChange={(e) => setLink(e.target.value)} placeholder="/buscar ou /meu-plano" />
            </div>
            <Button onClick={send} disabled={sending || !title.trim()} className="w-full">
              <Send className="w-4 h-4 mr-2" />{sending ? "Enviando..." : "Enviar agora"}
            </Button>
            <p className="text-xs text-muted-foreground">As mensagens aparecem no sininho de notificações dos usuários. O envio por e-mail será habilitado quando você configurar um domínio próprio.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}