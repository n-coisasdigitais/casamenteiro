import { traduzirErro } from "@/lib/errorMessages";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Send, Mail, MessageCircle, AlertTriangle } from "lucide-react";
import type { PlanSupplier } from "./PlanKanban";

type Channel = "platform" | "email";
type SupplierMeta = { id: string; email: string | null; whatsapp: string | null; phone: string | null };

export default function BulkContactTab({
  coupleId, items, onChange, contextoMensagem,
}: {
  coupleId: string;
  items: PlanSupplier[];
  onChange: () => void;
  contextoMensagem: { nomeCasal: string; data: string; cidade: string; convidados: number };
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [channel, setChannel] = useState<Channel>("platform");
  const [categoria, setCategoria] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [meta, setMeta] = useState<Record<string, SupplierMeta>>({});
  const [template, setTemplate] = useState(
    "Olá {{nome}}! Somos {{casal}}. Estamos planejando nosso casamento para {{data}} em {{cidade}}, com {{convidados}} convidados. Gostaríamos de receber um orçamento para {{categoria}}. Poderia nos enviar uma proposta?",
  );
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const ids = items.map((i) => i.supplier_id).filter(Boolean) as string[];
    if (ids.length === 0) return;
    supabase.from("suppliers").select("id, email, whatsapp, phone").in("id", ids).then(({ data }) => {
      const map: Record<string, SupplierMeta> = {};
      (data || []).forEach((s: any) => { map[s.id] = s; });
      setMeta(map);
    });
  }, [items]);

  const categorias = useMemo(() => {
    const s = new Map<string, string>();
    for (const it of items) if (it.category_slug) s.set(it.category_slug, it.category_name || it.category_slug);
    return Array.from(s.entries()).map(([slug, name]) => ({ slug, name }));
  }, [items]);

  const filtered = useMemo(() => items.filter((i) => {
    if (i.is_external) return false;
    if (!i.supplier_id) return false;
    if (categoria !== "all" && i.category_slug !== categoria) return false;
    if (status !== "all" && i.kanban_status !== status) return false;
    return true;
  }), [items, categoria, status]);

  const canSend = (item: PlanSupplier) => {
    const m = item.supplier_id ? meta[item.supplier_id] : null;
    if (channel === "platform") return true;
    if (channel === "email") return !!m?.email;
    return false;
  };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const selectAll = () => {
    const eligible = filtered.filter(canSend);
    if (eligible.every((i) => selected.has(i.id))) setSelected(new Set());
    else setSelected(new Set(eligible.map((i) => i.id)));
  };

  const renderMsg = (item: PlanSupplier) => {
    const c = contextoMensagem;
    return template
      .split("{{nome}}").join(item.company_name)
      .split("{{casal}}").join(c.nomeCasal || "um casal")
      .split("{{categoria}}").join((item.category_name || "o seu serviço").toLowerCase())
      .split("{{data}}").join(c.data || "em breve")
      .split("{{cidade}}").join(c.cidade || "nossa cidade")
      .split("{{convidados}}").join(String(c.convidados || "alguns"));
  };

  const previewItem = filtered.find(canSend) || filtered[0];

  const enviar = async () => {
    const escolhidos = filtered.filter((i) => selected.has(i.id) && canSend(i));
    if (escolhidos.length === 0) {
      toast({ title: "Selecione ao menos um fornecedor", variant: "destructive" });
      return;
    }
    if (!user) return;
    setSending(true);
    try {
      if (channel === "platform") {
        let ok = 0, fail = 0;
        for (const it of escolhidos) {
          const { error } = await supabase.from("quotes").insert({
            couple_id: coupleId,
            supplier_id: it.supplier_id!,
            user_id: user.id,
            message: renderMsg(it),
            phone_visible: false,
          });
          if (error) fail++; else ok++;
        }
        toast({
          title: `${ok} pedido(s) enviado(s)${fail ? `, ${fail} com erro` : ""}`,
          description: "Pedidos internos são rastreados em Meus Fornecedores e no Kanban.",
        });
      } else if (channel === "email") {
        const payload = {
          couple_id: coupleId,
          messages: escolhidos.map((it) => ({
            supplier_id: it.supplier_id,
            couple_supplier_id: it.id,
            to_name: it.company_name,
            to_email: meta[it.supplier_id!]?.email,
            subject: `Pedido de orçamento para ${it.category_name || "casamento"}`,
            body: renderMsg(it),
          })),
        };
        const { data, error } = await supabase.functions.invoke("send-bulk-supplier-emails", { body: payload });
        if (error) throw error;
        toast({
          title: `${data?.queued || 0} e-mail(s) enviados`,
          description: "As respostas chegam normalmente ao seu e-mail.",
        });
      }
      setSelected(new Set());
      onChange();
    } catch (e: any) {
      toast({ title: "Erro ao enviar", description: traduzirErro(e) || "Tente novamente", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <Alert>
        <MessageCircle className="h-4 w-4" />
        <AlertDescription className="text-xs">
          <b>WhatsApp em massa não é permitido.</b> A política do WhatsApp bloqueia envios automatizados para vários contatos.
          Use <b>Pedido interno</b> (rastreado dentro da plataforma) ou <b>E-mail</b>. Para falar por WhatsApp,
          abra o fornecedor individualmente no Kanban.
        </AlertDescription>
      </Alert>

      <Card className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">Canal</Label>
            <Select value={channel} onValueChange={(v) => setChannel(v as Channel)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="platform">
                  <div className="flex items-center gap-2"><Send className="h-3.5 w-3.5" /> Pedido interno (rastreado)</div>
                </SelectItem>
                <SelectItem value="email">
                  <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> E-mail</div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Categoria</Label>
            <Select value={categoria} onValueChange={setCategoria}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {categorias.map((c) => <SelectItem key={c.slug} value={c.slug} className="capitalize">{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="nao_iniciado">Não iniciado</SelectItem>
                <SelectItem value="em_orcamento">Em orçamento</SelectItem>
                <SelectItem value="negociando">Negociando</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label className="text-xs mb-1 block">
            Mensagem — use <code>{"{{nome}}"}</code>, <code>{"{{casal}}"}</code>, <code>{"{{categoria}}"}</code>, <code>{"{{data}}"}</code>, <code>{"{{cidade}}"}</code>, <code>{"{{convidados}}"}</code>
          </Label>
          <Textarea rows={4} value={template} onChange={(e) => setTemplate(e.target.value)} maxLength={1500} />
        </div>

        {previewItem && (
          <div className="rounded-md bg-muted/40 p-3">
            <Label className="text-xs">Preview (para {previewItem.company_name})</Label>
            <Textarea readOnly rows={4} className="mt-1 text-xs bg-background" value={renderMsg(previewItem)} />
          </div>
        )}
      </Card>

      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="font-semibold text-sm">Fornecedores</h3>
            <p className="text-xs text-muted-foreground">{filtered.length} fornecedor(es) no filtro atual.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={selectAll}>
              {filtered.filter(canSend).every((i) => selected.has(i.id)) && selected.size > 0 ? "Limpar" : "Selecionar todos"}
            </Button>
            <Button size="sm" disabled={selected.size === 0 || sending} onClick={enviar}>
              {channel === "platform" ? <Send className="h-4 w-4 mr-1" /> : <Mail className="h-4 w-4 mr-1" />}
              {sending ? "Enviando..." : `Enviar para ${selected.size}`}
            </Button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Nenhum fornecedor com esses filtros.</p>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((it) => {
              const m = it.supplier_id ? meta[it.supplier_id] : null;
              const eligible = canSend(it);
              return (
                <div key={it.id} className="flex items-center gap-3 py-2">
                  <Checkbox checked={selected.has(it.id)} onCheckedChange={() => toggle(it.id)} disabled={!eligible} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{it.company_name}</p>
                    <p className="text-xs text-muted-foreground capitalize truncate">
                      {it.category_name || it.category_slug || "—"}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-[10px] capitalize">{it.kanban_status.replace("_", " ")}</Badge>
                  {channel === "email" && !m?.email && (
                    <span className="text-[11px] text-destructive flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> sem e-mail
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}