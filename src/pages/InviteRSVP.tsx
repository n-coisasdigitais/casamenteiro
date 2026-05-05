import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Heart, MapPin, Calendar, Phone, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type InviteData = {
  invite_id: string;
  guest_name: string;
  rsvp_response: string | null;
  rsvp_companions: number | null;
  rsvp_note: string | null;
  responded_at: string | null;
  partner_name: string | null;
  user_full_name: string | null;
  wedding_date: string | null;
  ceremony_time: string | null;
  ceremony_address: string | null;
  reception_address: string | null;
  invite_message: string | null;
  invite_photo_url: string | null;
  contact_phone: string | null;
  dress_code: string | null;
};

function buildIcsUrl(data: InviteData): string {
  if (!data.wedding_date) return "#";
  const date = data.wedding_date.replace(/-/g, "");
  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "BEGIN:VEVENT",
    `SUMMARY:Casamento de ${data.user_full_name || ""} & ${data.partner_name || ""}`,
    `DTSTART;VALUE=DATE:${date}`,
    `DTEND;VALUE=DATE:${date}`,
    `LOCATION:${data.ceremony_address || data.reception_address || ""}`,
    `DESCRIPTION:${data.invite_message || ""}`,
    "END:VEVENT", "END:VCALENDAR",
  ].join("\n");
  return "data:text/calendar;charset=utf8," + encodeURIComponent(ics);
}

export default function InviteRSVP() {
  const { token } = useParams();
  const { toast } = useToast();
  const [data, setData] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [companions, setCompanions] = useState(0);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    (supabase as any).rpc("get_invite_by_token", { _token: token }).then(({ data: rows }: any) => {
      const row = rows?.[0];
      if (row) {
        setData(row);
        setCompanions(row.rsvp_companions || 0);
        setNote(row.rsvp_note || "");
        setDone(row.rsvp_response);
      }
      setLoading(false);
    });
  }, [token]);

  const respond = async (response: "confirmed" | "declined") => {
    if (!token) return;
    setSubmitting(true);
    const { data: ok, error } = await (supabase as any).rpc("respond_invite", {
      _token: token, _response: response, _companions: companions, _note: note || null,
    });
    setSubmitting(false);
    if (error || !ok) {
      toast({ title: "Erro ao registrar resposta", variant: "destructive" });
      return;
    }
    setDone(response);
    toast({ title: response === "confirmed" ? "Presença confirmada! 💖" : "Resposta registrada" });
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Carregando convite...</div>;
  if (!data) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md p-8 text-center">
        <p>Convite não encontrado ou link inválido.</p>
      </Card>
    </div>
  );

  const dateLabel = data.wedding_date
    ? new Date(data.wedding_date + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : "";
  const mapsUrl = data.ceremony_address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.ceremony_address)}` : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-secondary/20 to-background py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {data.invite_photo_url && (
          <img src={data.invite_photo_url} alt="" className="w-full h-64 object-cover rounded-lg mb-6" />
        )}

        <Card className="p-8 text-center mb-6">
          <Heart className="h-8 w-8 mx-auto text-primary mb-2" />
          <h1 className="text-3xl font-serif mb-2">{data.user_full_name} & {data.partner_name}</h1>
          <p className="text-lg text-muted-foreground capitalize">{dateLabel}</p>
          {data.ceremony_time && <p className="text-muted-foreground">{data.ceremony_time}</p>}
        </Card>

        <Card className="p-6 mb-6">
          <p className="text-center text-lg mb-4">Olá, <span className="font-semibold">{data.guest_name}</span> 💌</p>
          {data.invite_message && (
            <p className="text-center whitespace-pre-line text-muted-foreground">{data.invite_message}</p>
          )}
        </Card>

        <Card className="p-6 mb-6 space-y-4">
          {data.ceremony_address && (
            <div className="flex gap-3">
              <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium">Cerimônia</p>
                <p className="text-sm text-muted-foreground">{data.ceremony_address}</p>
                {mapsUrl && <a href={mapsUrl} target="_blank" rel="noopener" className="text-sm text-primary underline">Ver no mapa</a>}
              </div>
            </div>
          )}
          {data.reception_address && (
            <div className="flex gap-3">
              <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium">Recepção</p>
                <p className="text-sm text-muted-foreground">{data.reception_address}</p>
              </div>
            </div>
          )}
          {data.dress_code && (
            <p className="text-sm"><span className="font-medium">Traje:</span> {data.dress_code}</p>
          )}
          {data.contact_phone && (
            <div className="flex gap-3 items-center">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <a href={`tel:${data.contact_phone}`} className="text-sm">{data.contact_phone}</a>
            </div>
          )}
          <Button asChild variant="outline" className="w-full">
            <a href={buildIcsUrl(data)} download="casamento.ics"><Calendar className="h-4 w-4 mr-2" />Adicionar ao calendário</a>
          </Button>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold text-center mb-4">Você poderá comparecer?</h2>
          {done === "confirmed" && (
            <div className="text-center text-green-700 mb-4 flex items-center justify-center gap-2">
              <CheckCircle2 className="h-5 w-5" /> Presença confirmada
            </div>
          )}
          {done === "declined" && (
            <div className="text-center text-muted-foreground mb-4 flex items-center justify-center gap-2">
              <XCircle className="h-5 w-5" /> Você marcou que não poderá ir
            </div>
          )}
          <div className="space-y-3">
            <div>
              <Label htmlFor="comp">Acompanhantes</Label>
              <Input id="comp" type="number" min={0} value={companions} onChange={(e) => setCompanions(parseInt(e.target.value) || 0)} />
            </div>
            <div>
              <Label htmlFor="note">Observações (restrição alimentar, etc.)</Label>
              <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button onClick={() => respond("confirmed")} disabled={submitting} className="w-full">
                <CheckCircle2 className="h-4 w-4 mr-2" />Confirmar presença
              </Button>
              <Button onClick={() => respond("declined")} disabled={submitting} variant="outline" className="w-full">
                <XCircle className="h-4 w-4 mr-2" />Não poderei ir
              </Button>
            </div>
          </div>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">Convite enviado pelo Casamenteiro</p>
      </div>
    </div>
  );
}