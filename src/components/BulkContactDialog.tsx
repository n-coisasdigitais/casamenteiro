import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Send, MessageCircle, ExternalLink } from "lucide-react";
import { buildWhatsAppLink } from "@/lib/phone";

export type BulkSupplier = {
  id: string;
  company_name: string;
  whatsapp?: string | null;
  phone?: string | null;
  categories?: { name: string } | null;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  suppliers: BulkSupplier[];
  mode: "platform" | "whatsapp";
  onDone?: () => void;
};

export default function BulkContactDialog({ open, onOpenChange, suppliers, mode, onDone }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [template, setTemplate] = useState(
    "Olá {{nome}}! Vim pelo Casamenteiro e gostaria de pedir um orçamento para {{categoria}} para o meu casamento. Pode me ajudar?",
  );
  const [eventDate, setEventDate] = useState("");
  const [guestCount, setGuestCount] = useState("");
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!open || !user) return;
    (async () => {
      const { data: couple } = await supabase
        .from("couples").select("wedding_date, estimated_guests")
        .eq("user_id", user.id).maybeSingle();
      if (couple?.wedding_date) setEventDate(couple.wedding_date);
      if (couple?.estimated_guests) setGuestCount(String(couple.estimated_guests));
    })();
  }, [open, user]);

  const renderMsg = (s: BulkSupplier) =>
    template
      .split("{{nome}}").join(s.company_name)
      .split("{{categoria}}").join(s.categories?.name?.toLowerCase() || "o seu serviço");

  const sendPlatform = async () => {
    if (!user) return;
    setSending(true);
    setProgress(0);
    const { data: couple } = await supabase
      .from("couples").select("id").eq("user_id", user.id).maybeSingle();
    if (!couple) {
      toast({ title: "Apenas casais podem pedir orçamento", variant: "destructive" });
      setSending(false); return;
    }
    let ok = 0, fail = 0;
    for (const s of suppliers) {
      const { error } = await supabase.from("quotes").insert({
        couple_id: couple.id,
        supplier_id: s.id,
        user_id: user.id,
        event_date: eventDate || null,
        guest_count: guestCount ? parseInt(guestCount) : null,
        message: renderMsg(s),
        phone_visible: false,
      });
      if (error) fail++; else ok++;
      setProgress((p) => p + 1);
    }
    setSending(false);
    toast({
      title: `${ok} enviados${fail ? `, ${fail} com erro` : ""}`,
      description: "Acompanhe as respostas em Meus Fornecedores.",
    });
    onOpenChange(false);
    onDone?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === "platform" ? <Send className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}
            {mode === "platform"
              ? `Enviar pela plataforma para ${suppliers.length} fornecedor(es)`
              : `Abrir WhatsApp para ${suppliers.length} fornecedor(es)`}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Use <code>{"{{nome}}"}</code> e <code>{"{{categoria}}"}</code> no texto. Eles serão substituídos automaticamente em cada mensagem.
          </p>
        </DialogHeader>

        {mode === "platform" && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Data do evento</Label>
              <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Nº de convidados</Label>
              <Input type="number" value={guestCount} onChange={(e) => setGuestCount(e.target.value)} placeholder="150" />
            </div>
          </div>
        )}

        <div>
          <Label className="text-xs mb-1 block">Mensagem</Label>
          <Textarea rows={5} value={template} onChange={(e) => setTemplate(e.target.value)} maxLength={1500} />
        </div>

        {mode === "platform" ? (
          <Button disabled={sending || !template.trim()} onClick={sendPlatform} className="w-full">
            <Send className="h-4 w-4 mr-2" />
            {sending ? `Enviando ${progress}/${suppliers.length}...` : `Enviar para ${suppliers.length} fornecedor(es)`}
          </Button>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto border rounded-lg p-2">
            <p className="text-xs text-muted-foreground px-1">
              Clique em cada fornecedor para abrir o WhatsApp com a mensagem personalizada. Envios pelo WhatsApp são feitos um a um.
            </p>
            {suppliers.map((s) => {
              const link = buildWhatsAppLink(s.whatsapp || s.phone || "", renderMsg(s));
              return (
                <div key={s.id} className="flex items-center justify-between gap-2 p-2 rounded border border-border bg-card">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{s.company_name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{s.categories?.name || ""}</p>
                  </div>
                  {link ? (
                    <Button asChild size="sm" variant="outline" className="shrink-0">
                      <a href={link} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3.5 w-3.5 mr-1" /> Abrir
                      </a>
                    </Button>
                  ) : (
                    <span className="text-[11px] text-destructive shrink-0">Sem WhatsApp</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}