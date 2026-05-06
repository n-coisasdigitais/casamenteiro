import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Send, Calendar, Users, Phone } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Link } from "react-router-dom";

type Props = {
  supplierId: string;
  supplierName: string;
  trigger?: React.ReactNode;
};

export default function QuoteRequestForm({ supplierId, supplierName, trigger }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [eventDate, setEventDate] = useState("");
  const [guestCount, setGuestCount] = useState("");
  const [message, setMessage] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneVisible, setPhoneVisible] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);

  // Pré-preenche com dados do casal/profile ao abrir
  useEffect(() => {
    if (!open || !user) return;
    (async () => {
      const [{ data: couple }, { data: profile }] = await Promise.all([
        supabase.from("couples").select("wedding_date, estimated_guests, contact_phone").eq("user_id", user.id).maybeSingle(),
        supabase.from("profiles").select("full_name").eq("user_id", user.id).maybeSingle(),
      ]);
      if (couple?.wedding_date && !eventDate) setEventDate(couple.wedding_date);
      if (couple?.estimated_guests && !guestCount) setGuestCount(String(couple.estimated_guests));
      if (couple?.contact_phone && !phone) setPhone(couple.contact_phone);
      // suprime no-op de profile (mantém para futuras extensões)
      void profile;
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user]);

  const handleSubmit = async () => {
    if (!user) {
      toast({ title: "Faça login para pedir orçamento", variant: "destructive" });
      return;
    }
    if (!message.trim()) {
      toast({ title: "Escreva uma mensagem", variant: "destructive" });
      return;
    }

    setLoading(true);

    // Get couple_id
    const { data: couple } = await supabase
      .from("couples")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!couple) {
      toast({ title: "Apenas casais podem pedir orçamento", variant: "destructive" });
      setLoading(false);
      return;
    }

    // Create quote
    const { data: quote, error } = await supabase
      .from("quotes")
      .insert({
        couple_id: couple.id,
        supplier_id: supplierId,
        user_id: user.id,
        event_date: eventDate || null,
        guest_count: guestCount ? parseInt(guestCount) : null,
        message: message.trim(),
        phone: phone.trim() || null,
        phone_visible: phoneVisible,
      })
      .select()
      .maybeSingle();

    if (error) {
      toast({ title: "Erro ao enviar", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    // Upload attachment if any
    if (attachment && quote) {
      const filePath = `${quote.id}/${Date.now()}-${attachment.name}`;
      const { error: uploadErr } = await supabase.storage
        .from("quote-attachments")
        .upload(filePath, attachment);

      if (!uploadErr) {
        const { data: { publicUrl } } = supabase.storage
          .from("quote-attachments")
          .getPublicUrl(filePath);

        await supabase.from("quote_messages").insert({
          quote_id: quote.id,
          sender_id: user.id,
          message: message.trim(),
          attachment_url: publicUrl,
        });
      }
    }

    toast({ title: "Orçamento solicitado!", description: `Seu pedido foi enviado para ${supplierName}.` });
    setOpen(false);
    setMessage("");
    setEventDate("");
    setGuestCount("");
    setPhone("");
    setPhoneVisible(false);
    setAttachment(null);
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="flex-1 h-12 text-base font-semibold">
            Pedir Orçamento Grátis
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">Pedir Orçamento Grátis</DialogTitle>
          <p className="text-sm text-muted-foreground">para {supplierName}</p>
        </DialogHeader>

        {!user ? (
          <div className="space-y-3 mt-2 text-center">
            <p className="text-sm text-muted-foreground">
              Crie sua conta gratuita para pedir orçamento sem complicação.
            </p>
            <div className="flex gap-2 justify-center">
              <Button asChild variant="outline"><Link to="/login">Entrar</Link></Button>
              <Button asChild><Link to="/cadastro">Criar conta</Link></Button>
            </div>
          </div>
        ) : (
        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs flex items-center gap-1 mb-1.5">
                <Calendar className="h-3.5 w-3.5" /> Data do evento
              </Label>
              <Input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs flex items-center gap-1 mb-1.5">
                <Users className="h-3.5 w-3.5" /> Nº convidados
              </Label>
              <Input
                type="number"
                placeholder="150"
                value={guestCount}
                onChange={(e) => setGuestCount(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label className="text-xs mb-1.5 block">Mensagem *</Label>
            <Textarea
              placeholder="Olá! Gostaria de saber mais sobre seus serviços para o meu casamento..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              maxLength={2000}
            />
          </div>

          <div>
            <Label className="text-xs flex items-center gap-1 mb-1.5">
              <Phone className="h-3.5 w-3.5" /> Telefone (opcional)
            </Label>
            <Input
              type="tel"
              placeholder="(11) 99999-9999"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            {phone && (
              <div className="flex items-center gap-2 mt-2">
                <Switch
                  checked={phoneVisible}
                  onCheckedChange={setPhoneVisible}
                  id="phone-visible"
                />
                <Label htmlFor="phone-visible" className="text-xs text-muted-foreground cursor-pointer">
                  Permitir que o fornecedor veja meu telefone
                </Label>
              </div>
            )}
          </div>

          <div>
            <Label className="text-xs mb-1.5 block">Anexar arquivo (opcional)</Label>
            <Input
              type="file"
              onChange={(e) => setAttachment(e.target.files?.[0] || null)}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            />
            {attachment && (
              <p className="text-xs text-muted-foreground mt-1">{attachment.name}</p>
            )}
          </div>

          <Button onClick={handleSubmit} disabled={loading || !message.trim()} className="w-full h-11">
            <Send className="h-4 w-4 mr-2" />
            {loading ? "Enviando..." : "Enviar pedido de orçamento"}
          </Button>
        </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
