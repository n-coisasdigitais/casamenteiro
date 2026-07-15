import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Send, DollarSign, CheckCircle2, Loader2, X } from "lucide-react";
import { AttachmentPicker, AttachmentList } from "@/components/QuoteAttachments";
import ConfirmFinishTaskDialog from "@/components/ConfirmFinishTaskDialog";

type TextMsg = {
  id: string;
  sender_id: string;
  message: string;
  attachment_url: string | null;
  attachment_urls: string[] | null;
  created_at: string;
};

type Proposal = {
  id: string;
  sender_id: string;
  kind: string;
  amount: number | null;
  description: string | null;
  status: string;
  created_at: string;
};

type Item =
  | { type: "text"; id: string; senderId: string; createdAt: string; data: TextMsg }
  | { type: "value"; id: string; senderId: string; createdAt: string; data: Proposal };

type Props = {
  quoteId: string;
  currentUserId: string;
  isSupplier: boolean;
  coupleId?: string | null;
  supplierId?: string | null;
  onContracted?: () => void;
};

const TEMPLATES = [
  "Olá! Obrigado pelo seu interesse. Segue em anexo nosso catálogo com preços atualizados.",
  "Agradecemos o contato! Temos disponibilidade para a data informada. Gostaria de agendar uma visita?",
  "Obrigado pela mensagem! Para essa quantidade de convidados, nosso pacote mais indicado é...",
];

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export default function QuoteConversation({
  quoteId,
  currentUserId,
  isSupplier,
  coupleId,
  supplierId,
  onContracted,
}: Props) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<TextMsg[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [valueOpen, setValueOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [sending, setSending] = useState(false);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [confirmTrigger, setConfirmTrigger] = useState(0);
  const [confirmCategory, setConfirmCategory] = useState<string | null>(null);

  const load = async () => {
    const [msgsRes, propsRes] = await Promise.all([
      supabase
        .from("quote_messages")
        .select("*")
        .eq("quote_id", quoteId)
        .order("created_at", { ascending: true }),
      (supabase.from("quote_proposals" as any) as any)
        .select("*")
        .eq("quote_id", quoteId)
        .order("created_at", { ascending: true }),
    ]);
    setMessages((msgsRes.data as any) || []);
    setProposals((propsRes.data as any) || []);
  };

  useEffect(() => {
    load();
  }, [quoteId]);

  const items: Item[] = useMemo(() => {
    const t: Item[] = messages.map((m) => ({
      type: "text",
      id: `m-${m.id}`,
      senderId: m.sender_id,
      createdAt: m.created_at,
      data: m,
    }));
    const p: Item[] = proposals.map((pr) => ({
      type: "value",
      id: `p-${pr.id}`,
      senderId: pr.sender_id,
      createdAt: pr.created_at,
      data: pr,
    }));
    return [...t, ...p].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }, [messages, proposals]);

  // Derived state pill
  const pill = useMemo(() => {
    const accepted = [...proposals].reverse().find((p) => p.status === "accepted");
    if (accepted && accepted.amount != null) {
      return { label: `Fechado · ${formatBRL(Number(accepted.amount))}`, tone: "success" as const };
    }
    const pending = [...proposals].reverse().find((p) => p.status === "pending");
    if (pending && pending.amount != null) {
      return { label: `Proposta na mesa · ${formatBRL(Number(pending.amount))}`, tone: "primary" as const };
    }
    const hasMine = items.some((i) => i.senderId === currentUserId);
    const hasOther = items.some((i) => i.senderId !== currentUserId);
    if (hasMine && hasOther) return { label: "Em conversa", tone: "muted" as const };
    return { label: "Aguardando resposta", tone: "muted" as const };
  }, [items, proposals, currentUserId]);

  const inferKind = (): "proposal" | "discount_request" | "counter" => {
    if (!isSupplier) return "discount_request";
    const mineWithAmount = proposals.some(
      (p) => p.sender_id === currentUserId && p.amount != null,
    );
    return mineWithAmount ? "counter" : "proposal";
  };

  const send = async () => {
    const trimmed = text.trim();
    const hasValue = valueOpen && amount && !isNaN(Number(amount)) && Number(amount) > 0;
    if (!hasValue && !trimmed && attachments.length === 0) return;
    setSending(true);
    try {
      if (hasValue) {
        const { error } = await (supabase.from("quote_proposals" as any) as any).insert({
          quote_id: quoteId,
          sender_id: currentUserId,
          kind: inferKind(),
          amount: Number(amount),
          description: trimmed || null,
        });
        if (error) throw error;
      } else {
        const uploadedUrls: string[] = [];
        for (const file of attachments) {
          const filePath = `${quoteId}/${Date.now()}-${file.name}`;
          const { error: uploadErr } = await supabase.storage
            .from("quote-attachments")
            .upload(filePath, file);
          if (uploadErr) {
            toast({ title: `Falha ao enviar ${file.name}`, description: uploadErr.message, variant: "destructive" });
            continue;
          }
          const { data: { publicUrl } } = supabase.storage
            .from("quote-attachments")
            .getPublicUrl(filePath);
          uploadedUrls.push(publicUrl);
        }
        const { error } = await (supabase.from("quote_messages") as any).insert({
          quote_id: quoteId,
          sender_id: currentUserId,
          message: trimmed || (uploadedUrls.length ? "[anexo]" : ""),
          attachment_url: uploadedUrls[0] || null,
          attachment_urls: uploadedUrls,
        });
        if (error) throw error;
      }
      setText("");
      setAmount("");
      setValueOpen(false);
      setAttachments([]);
      await load();
    } catch (e: any) {
      toast({ title: "Erro ao enviar", description: e.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const aceitarValor = async (p: Proposal) => {
    if (!p.amount) return;
    if (!coupleId || !supplierId) {
      toast({ title: "Não é possível fechar sem casal/fornecedor vinculado", variant: "destructive" });
      return;
    }
    setAccepting(p.id);
    try {
      // 1) marca proposta como aceita (dispara triggers)
      await (supabase.from("quote_proposals" as any) as any).update({ status: "accepted" }).eq("id", p.id);

      // 2) reaproveita lógica de marcarContratado
      const finalAmount = Number(p.amount);
      const { data: sup } = await supabase
        .from("suppliers")
        .select("id, company_name, category_id")
        .eq("id", supplierId)
        .maybeSingle();
      const categoryId = sup?.category_id || null;
      let categorySlug = "outros";
      let categoryName = "";
      if (categoryId) {
        const { data: cat } = await supabase
          .from("categories")
          .select("name, slug")
          .eq("id", categoryId)
          .maybeSingle();
        categorySlug = cat?.slug || "outros";
        categoryName = cat?.name || "";
      }

      const { data: existing } = await supabase
        .from("couple_suppliers")
        .select("id")
        .eq("couple_id", coupleId)
        .eq("supplier_id", supplierId)
        .maybeSingle();
      if (existing) {
        await (supabase.from("couple_suppliers") as any).update({
          status: "contracted",
          final_value: finalAmount,
          contract_value: finalAmount,
          category_id: categoryId,
          contracted_at: new Date().toISOString(),
        }).eq("id", existing.id);
      } else {
        await (supabase.from("couple_suppliers") as any).insert({
          couple_id: coupleId,
          supplier_id: supplierId,
          category_id: categoryId,
          status: "contracted",
          final_value: finalAmount,
          contract_value: finalAmount,
          contracted_at: new Date().toISOString(),
        });
      }

      const { data: existingBI } = await supabase
        .from("budget_items")
        .select("id")
        .eq("couple_id", coupleId)
        .eq("supplier_id", supplierId)
        .maybeSingle();
      const description = sup?.company_name || "Fornecedor contratado";
      if (existingBI) {
        await (supabase.from("budget_items") as any).update({
          estimated_cost: finalAmount,
          final_cost: finalAmount,
          status: "contracted",
          category: categorySlug,
          description,
        }).eq("id", existingBI.id);
      } else {
        await (supabase.from("budget_items") as any).insert({
          couple_id: coupleId,
          supplier_id: supplierId,
          category: categorySlug,
          description,
          estimated_cost: finalAmount,
          final_cost: finalAmount,
          status: "contracted",
        });
      }

      await (supabase.from("quotes") as any)
        .update({ status: "accepted", kanban_status: "fechado" })
        .eq("id", quoteId);

      toast({ title: "Fechado!", description: "Atualizamos fornecedores e orçamento." });
      if (categoryName) {
        setConfirmCategory(categoryName);
        setConfirmTrigger((n) => n + 1);
      }
      await load();
      onContracted?.();
    } catch (e: any) {
      toast({ title: "Erro ao fechar", description: e.message, variant: "destructive" });
    } finally {
      setAccepting(null);
    }
  };

  const pillClass =
    pill.tone === "success"
      ? "bg-primary/15 text-primary border-primary/30"
      : pill.tone === "primary"
      ? "bg-primary/10 text-primary border-primary/20"
      : "bg-muted text-muted-foreground border-border";

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Pill */}
      <div className="px-4 py-2 border-b border-border">
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${pillClass}`}>
          {pill.label}
        </span>
      </div>

      {/* Timeline */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3 md:px-4 py-4 space-y-3 bg-muted/20">
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-10">
            Nenhuma mensagem ainda. Envie a primeira!
          </p>
        )}
        {items.map((it) => {
          const mine = it.senderId === currentUserId;
          const time = new Date(it.createdAt).toLocaleString("pt-BR", {
            day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
          });
          if (it.type === "text") {
            const m = it.data;
            const urls =
              m.attachment_urls && m.attachment_urls.length > 0
                ? m.attachment_urls
                : m.attachment_url
                ? [m.attachment_url]
                : [];
            return (
              <div key={it.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-4 py-3 text-sm md:text-base ${
                    mine ? "bg-primary text-primary-foreground rounded-br-md" : "bg-background border border-border rounded-bl-md"
                  }`}
                >
                  {m.message && <p className="whitespace-pre-line leading-relaxed">{m.message}</p>}
                  <AttachmentList urls={urls} variant={mine ? "dark" : "light"} />
                  <p className={`text-xs mt-1.5 ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{time}</p>
                </div>
              </div>
            );
          }
          // value
          const p = it.data;
          const canAccept = !mine && p.status === "pending" && p.amount != null;
          const statusBadge =
            p.status === "accepted" ? { label: "Aceita", variant: "default" as const }
            : p.status === "rejected" ? { label: "Recusada", variant: "destructive" as const }
            : { label: "Pendente", variant: "secondary" as const };
          return (
            <div key={it.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[90%] md:max-w-[75%] rounded-2xl px-4 py-3 border-2 ${
                  p.status === "accepted"
                    ? "border-primary bg-primary/10"
                    : mine
                    ? "border-primary/40 bg-primary/5"
                    : "border-amber-400/70 bg-amber-50 dark:bg-amber-500/10"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="w-4 h-4 text-primary" />
                  <Badge variant={statusBadge.variant} className="text-[11px]">{statusBadge.label}</Badge>
                </div>
                <div className="text-2xl md:text-3xl font-semibold tabular-nums">
                  {formatBRL(Number(p.amount || 0))}
                </div>
                {p.description && (
                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">{p.description}</p>
                )}
                {canAccept && (
                  <Button
                    size="lg"
                    className="w-full mt-3"
                    onClick={() => aceitarValor(p)}
                    disabled={accepting === p.id}
                  >
                    {accepting === p.id ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                    )}
                    Aceitar este valor
                  </Button>
                )}
                <p className="text-xs text-muted-foreground mt-2">{time}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Composer */}
      <div className="border-t border-border bg-background">
        {isSupplier && (
          <div className="px-4 pt-2">
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                Usar template de resposta
              </summary>
              <div className="mt-2 space-y-1">
                {TEMPLATES.map((tpl, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setText(tpl)}
                    className="block w-full text-left p-2 rounded border border-border text-xs hover:bg-accent transition-colors"
                  >
                    {tpl.slice(0, 80)}...
                  </button>
                ))}
              </div>
            </details>
          </div>
        )}

        {valueOpen && (
          <div className="px-4 pt-3">
            <div className="flex items-center gap-2 rounded-md border-2 border-primary/40 bg-primary/5 px-3 py-2">
              <DollarSign className="w-4 h-4 text-primary shrink-0" />
              <div className="flex-1">
                <label className="text-[11px] text-muted-foreground block">Valor da proposta (R$)</label>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  placeholder="Ex.: 12000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-9 text-base border-0 bg-transparent px-0 focus-visible:ring-0 shadow-none"
                />
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => { setValueOpen(false); setAmount(""); }}
                aria-label="Cancelar valor"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        <div className="p-3 space-y-2">
          <Textarea
            placeholder={valueOpen ? "Adicione uma observação (opcional)..." : "Escreva uma mensagem..."}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            className="resize-none text-base min-h-[52px]"
            maxLength={2000}
          />
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              {!valueOpen && <AttachmentPicker files={attachments} onChange={setAttachments} />}
            </div>
            <div className="flex items-center gap-2">
              {!valueOpen && (
                <Button
                  type="button"
                  variant="outline"
                  size="default"
                  onClick={() => setValueOpen(true)}
                  className="gap-1.5"
                >
                  <DollarSign className="w-4 h-4" />
                  Anexar valor (R$)
                </Button>
              )}
              <Button
                type="button"
                size="default"
                onClick={send}
                disabled={
                  sending ||
                  (valueOpen
                    ? !amount || isNaN(Number(amount)) || Number(amount) <= 0
                    : !text.trim() && attachments.length === 0)
                }
                className="gap-1.5"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Enviar
              </Button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmFinishTaskDialog
        coupleId={coupleId || null}
        supplierId={supplierId || null}
        categoryName={confirmCategory}
        trigger={confirmTrigger}
      />
    </div>
  );
}