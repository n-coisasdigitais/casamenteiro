import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Heart, MapPin, Calendar, Phone, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

type InviteData = {
  invite_id: string;
  guest_name: string;
  rsvp_response: string | null;
  rsvp_companions: number | null;
  max_companions: number | null;
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
  ceremony_lat: number | null;
  ceremony_lng: number | null;
  ceremony_local_nome: string | null;
  reception_lat: number | null;
  reception_lng: number | null;
  reception_local_nome: string | null;
  invite_video_url: string | null;
  invite_album: string[] | null;
};

function buildEventInfo(data: InviteData) {
  const title = `Casamento de ${data.user_full_name || ""} & ${data.partner_name || ""}`;
  const location = data.ceremony_address || data.reception_address || "";
  const description = data.invite_message || "";
  const dateOnly = (data.wedding_date || "").replace(/-/g, "");
  // Hora opcional (ceremony_time tipo "19:00")
  let startISO = dateOnly;
  let endISO = dateOnly;
  if (data.ceremony_time && /^\d{2}:\d{2}/.test(data.ceremony_time)) {
    const [hh, mm] = data.ceremony_time.split(":");
    startISO = `${dateOnly}T${hh}${mm}00`;
    // +4h
    const endDate = new Date(`${data.wedding_date}T${hh}:${mm}:00`);
    endDate.setHours(endDate.getHours() + 4);
    const pad = (n: number) => String(n).padStart(2, "0");
    endISO = `${endDate.getFullYear()}${pad(endDate.getMonth() + 1)}${pad(endDate.getDate())}T${pad(endDate.getHours())}${pad(endDate.getMinutes())}00`;
  }
  return { title, location, description, startISO, endISO };
}

function googleCalendarUrl(data: InviteData) {
  const { title, location, description, startISO, endISO } = buildEventInfo(data);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${startISO}/${endISO}`,
    location,
    details: description,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function outlookCalendarUrl(data: InviteData) {
  const { title, location, description, startISO } = buildEventInfo(data);
  const start = startISO.length > 8
    ? `${startISO.slice(0, 4)}-${startISO.slice(4, 6)}-${startISO.slice(6, 8)}T${startISO.slice(9, 11)}:${startISO.slice(11, 13)}:00`
    : `${startISO.slice(0, 4)}-${startISO.slice(4, 6)}-${startISO.slice(6, 8)}`;
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: title,
    startdt: start,
    location,
    body: description,
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

function downloadIcs(data: InviteData) {
  const { title, location, description, startISO, endISO } = buildEventInfo(data);
  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Casamenteiro//PT-BR",
    "BEGIN:VEVENT",
    `UID:${data.invite_id}@casamenteiro`,
    `SUMMARY:${title}`,
    startISO.length > 8 ? `DTSTART:${startISO}` : `DTSTART;VALUE=DATE:${startISO}`,
    startISO.length > 8 ? `DTEND:${endISO}` : `DTEND;VALUE=DATE:${endISO}`,
    `LOCATION:${location}`,
    `DESCRIPTION:${description.replace(/\n/g, "\\n")}`,
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "casamento.ics"; a.click();
  URL.revokeObjectURL(url);
}

export default function InviteRSVP() {
  const { token } = useParams();
  const { toast } = useToast();
  const navigate = useNavigate();
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
      toast({ title: "Erro ao registrar resposta", description: error?.message, variant: "destructive" });
      return;
    }
    setDone(response);
    navigate(`/convite/${token}/obrigado?r=${response}`);
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
  const ceremonyMapUrl = data.ceremony_lat && data.ceremony_lng
    ? `https://www.google.com/maps/search/?api=1&query=${data.ceremony_lat},${data.ceremony_lng}`
    : data.ceremony_address
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.ceremony_address)}`
      : null;
  const receptionMapUrl = data.reception_lat && data.reception_lng
    ? `https://www.google.com/maps/search/?api=1&query=${data.reception_lat},${data.reception_lng}`
    : data.reception_address
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.reception_address)}`
      : null;

  // Extrai ID do YouTube (suporta youtu.be/, watch?v=, embed/)
  const youtubeId = (() => {
    if (!data.invite_video_url) return null;
    const m = data.invite_video_url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
    return m?.[1] || null;
  })();
  const album = Array.isArray(data.invite_album) ? data.invite_album : [];

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

        {youtubeId && (
          <Card className="overflow-hidden mb-6">
            <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
              <iframe
                src={`https://www.youtube.com/embed/${youtubeId}`}
                title="Vídeo do convite"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              />
            </div>
          </Card>
        )}

        {album.length > 0 && (
          <Card className="p-4 mb-6">
            <p className="text-sm text-muted-foreground text-center mb-3">Nossa galeria</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {album.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener" className="block aspect-square rounded-md overflow-hidden bg-muted">
                  <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover hover:scale-105 transition" loading="lazy" />
                </a>
              ))}
            </div>
          </Card>
        )}

        <Card className="p-6 mb-6 space-y-4">
          {(data.ceremony_address || data.ceremony_local_nome) && (
            <div className="flex gap-3">
              <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium">Cerimônia</p>
                {data.ceremony_local_nome && <p className="text-sm font-medium">{data.ceremony_local_nome}</p>}
                <p className="text-sm text-muted-foreground">{data.ceremony_address}</p>
                {ceremonyMapUrl && <a href={ceremonyMapUrl} target="_blank" rel="noopener" className="text-sm text-primary underline">Ver no mapa</a>}
              </div>
            </div>
          )}
          {(data.reception_address || data.reception_local_nome) && (
            <div className="flex gap-3">
              <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium">Recepção</p>
                {data.reception_local_nome && <p className="text-sm font-medium">{data.reception_local_nome}</p>}
                <p className="text-sm text-muted-foreground">{data.reception_address}</p>
                {receptionMapUrl && <a href={receptionMapUrl} target="_blank" rel="noopener" className="text-sm text-primary underline">Ver no mapa</a>}
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full"><Calendar className="h-4 w-4 mr-2" />Adicionar ao calendário</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuItem asChild>
                <a href={googleCalendarUrl(data)} target="_blank" rel="noopener">Google Agenda</a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href={outlookCalendarUrl(data)} target="_blank" rel="noopener">Outlook</a>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => downloadIcs(data)}>Apple / iOS (.ics)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
            {(data.max_companions ?? 0) > 0 && (
              <div>
                <Label htmlFor="comp">Acompanhantes (máx. {data.max_companions})</Label>
                <Input id="comp" type="number" min={0} max={data.max_companions ?? 0} value={companions} onChange={(e) => setCompanions(Math.min(parseInt(e.target.value) || 0, data.max_companions ?? 0))} />
              </div>
            )}
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