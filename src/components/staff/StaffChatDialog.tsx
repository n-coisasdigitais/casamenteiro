import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Phone, MessageCircle, Lock } from "lucide-react";
import { buildWhatsAppLink } from "@/lib/phone";
import { appStatusLabel, fetchStaffContact } from "@/lib/staff";
import { traduzirErro } from "@/lib/errorMessages";

type Msg = {
  id: string;
  sender_user_id: string;
  sender_tipo: string;
  body: string;
  created_at: string;
};

export default function StaffChatDialog({
  open, onOpenChange, application, job, currentUserId, isSupplier,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  application: any;
  job: any;
  currentUserId: string;
  isSupplier: boolean;
}) {
  const { toast } = useToast();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [contato, setContato] = useState<{ telefone?: string | null; email?: string | null } | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const liberado = application?.status === "aceito" || application?.status === "concluido";

  const load = async () => {
    if (!application?.id) return;
    const { data } = await (supabase.from("staff_messages" as any) as any)
      .select("*").eq("application_id", application.id).order("created_at", { ascending: true });
    setMsgs((data || []) as Msg[]);
  };

  useEffect(() => {
    if (!open || !application?.id) return;
    load();
    const channel = supabase
      .channel(`staff_messages_${application.id}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "staff_messages", filter: `application_id=eq.${application.id}` },
        (payload) => setMsgs((m) => (m.some((x) => x.id === (payload.new as any).id) ? m : [...m, payload.new as Msg])))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line
  }, [open, application?.id]);

  useEffect(() => {
    let cancel = false;
    (async () => {
      if (!open || !liberado) { setContato(null); return; }
      try {
        if (isSupplier) {
          const c = await fetchStaffContact(job.id, application.staff_id || application.staff?.id);
          if (!cancel) setContato(c);
        } else {
          const { data } = await (supabase.rpc as any)("get_supplier_contact", { _supplier_id: job.supplier_id });
          const row = Array.isArray(data) ? data[0] : data;
          if (!cancel) setContato({ telefone: row?.whatsapp || row?.phone || null, email: null });
        }
      } catch {
        if (!cancel) setContato(null);
      }
    })();
    return () => { cancel = true; };
    // eslint-disable-next-line
  }, [open, liberado, isSupplier, job?.id]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs.length]);

  const enviar = async () => {
    const body = text.trim();
    if (!body || !application?.id) return;
    setSending(true);
    const { error } = await (supabase.from("staff_messages" as any) as any).insert({
      application_id: application.id,
      sender_user_id: currentUserId,
      sender_tipo: isSupplier ? "fornecedor" : "profissional",
      body,
    });
    setSending(false);
    if (error) return toast({ title: "Erro ao enviar", description: traduzirErro(error), variant: "destructive" });
    setText("");
    load();
  };

  const waLink = contato?.telefone ? buildWhatsAppLink(contato.telefone, "Olá! Falo pelo Casamenteiro sobre a vaga.") : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 flex flex-col max-h-[85vh]">
        <DialogHeader className="p-4 pb-3 border-b">
          <DialogTitle className="text-base flex items-center gap-2 flex-wrap">
            <span>{job?.funcao}</span>
            <Badge variant="secondary">{appStatusLabel(application?.status)}</Badge>
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            {job?.data && new Date(job.data + "T00:00:00").toLocaleDateString("pt-BR")} • {job?.cidade || job?.local}
          </p>
          {liberado ? (
            <div className="flex items-center gap-3 pt-1 text-xs">
              {contato?.telefone && (
                <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {contato.telefone}</span>
              )}
              {waLink && (
                <a href={waLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-emerald-700 hover:underline">
                  <MessageCircle className="h-3 w-3" /> WhatsApp
                </a>
              )}
              {!contato?.telefone && <span className="text-muted-foreground">Contato sem telefone cadastrado.</span>}
            </div>
          ) : (
            <p className="flex items-center gap-1 text-xs text-muted-foreground pt-1">
              <Lock className="h-3 w-3" /> Telefone e WhatsApp são liberados após o aceite.
            </p>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-[200px]">
          {msgs.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-6">
              Nenhuma mensagem ainda. Combine detalhes da vaga por aqui.
            </p>
          )}
          {msgs.map((m) => {
            const mine = m.sender_user_id === currentUserId;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p className={`text-[10px] mt-1 ${mine ? "opacity-70" : "text-muted-foreground"}`}>
                    {new Date(m.created_at).toLocaleString("pt-BR")}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>

        <div className="p-3 border-t flex gap-2 items-end">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Escreva uma mensagem..."
            rows={2}
            className="resize-none"
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); } }}
          />
          <Button onClick={enviar} disabled={sending || !text.trim()}>Enviar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}