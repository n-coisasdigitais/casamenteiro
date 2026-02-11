import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Send, Paperclip, FileText } from "lucide-react";

type Message = {
  id: string;
  sender_id: string;
  message: string;
  attachment_url: string | null;
  is_template: boolean;
  created_at: string;
};

type Props = {
  quoteId: string;
  currentUserId: string;
};

export default function QuoteThread({ quoteId, currentUserId }: Props) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadMessages();
  }, [quoteId]);

  const loadMessages = async () => {
    const { data } = await supabase
      .from("quote_messages")
      .select("*")
      .eq("quote_id", quoteId)
      .order("created_at", { ascending: true });
    setMessages(data || []);
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    setSending(true);

    let attachmentUrl: string | null = null;

    if (attachment) {
      const filePath = `${quoteId}/${Date.now()}-${attachment.name}`;
      const { error: uploadErr } = await supabase.storage
        .from("quote-attachments")
        .upload(filePath, attachment);
      if (!uploadErr) {
        const { data: { publicUrl } } = supabase.storage
          .from("quote-attachments")
          .getPublicUrl(filePath);
        attachmentUrl = publicUrl;
      }
    }

    const { error } = await supabase.from("quote_messages").insert({
      quote_id: quoteId,
      sender_id: currentUserId,
      message: newMessage.trim(),
      attachment_url: attachmentUrl,
    });

    if (error) {
      toast({ title: "Erro ao enviar", description: error.message, variant: "destructive" });
    } else {
      setNewMessage("");
      setAttachment(null);
      loadMessages();
    }
    setSending(false);
  };

  const TEMPLATES = [
    "Olá! Obrigado pelo seu interesse. Segue em anexo nosso catálogo com preços atualizados.",
    "Agradecemos o contato! Temos disponibilidade para a data informada. Gostaria de agendar uma visita?",
    "Obrigado pela mensagem! Para essa quantidade de convidados, nosso pacote mais indicado é...",
  ];

  const useTemplate = (tpl: string) => {
    setNewMessage(tpl);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 p-4 max-h-80">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhuma mensagem ainda.</p>
        )}
        {messages.map((msg) => {
          const isMe = msg.sender_id === currentUserId;
          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-lg p-3 text-sm ${isMe ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                <p className="whitespace-pre-line">{msg.message}</p>
                {msg.attachment_url && (
                  <a
                    href={msg.attachment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-1 mt-2 text-xs underline ${isMe ? "text-primary-foreground/80" : "text-primary"}`}
                  >
                    <FileText className="h-3 w-3" /> Anexo
                  </a>
                )}
                <p className={`text-[10px] mt-1 ${isMe ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                  {new Date(msg.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Templates (for suppliers) */}
      <div className="px-4 pb-2">
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            Usar template de resposta
          </summary>
          <div className="mt-2 space-y-1">
            {TEMPLATES.map((tpl, i) => (
              <button
                key={i}
                onClick={() => useTemplate(tpl)}
                className="block w-full text-left p-2 rounded border border-border text-xs hover:bg-accent transition-colors"
              >
                {tpl.slice(0, 80)}...
              </button>
            ))}
          </div>
        </details>
      </div>

      {/* Input */}
      <div className="border-t border-border p-3">
        <div className="flex gap-2">
          <div className="flex-1 space-y-2">
            <Textarea
              placeholder="Escreva sua mensagem..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              rows={2}
              className="resize-none text-sm"
              maxLength={2000}
            />
            {attachment && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Paperclip className="h-3 w-3" /> {attachment.name}
                <button onClick={() => setAttachment(null)} className="text-destructive ml-1">✕</button>
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <label className="cursor-pointer p-2 rounded-md hover:bg-accent transition-colors">
              <Paperclip className="h-4 w-4 text-muted-foreground" />
              <input
                type="file"
                className="hidden"
                onChange={(e) => setAttachment(e.target.files?.[0] || null)}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              />
            </label>
            <Button size="icon" onClick={sendMessage} disabled={sending || !newMessage.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
