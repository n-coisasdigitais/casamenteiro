import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Users, Baby, Download, Printer, MoreHorizontal, Trash2, Edit, Send, Link as LinkIcon, MessageCircle, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import DashboardHeader from "@/components/DashboardHeader";
import DashboardNav from "@/components/DashboardNav";
import AddGuestDialog from "@/components/AddGuestDialog";
import AddGroupDialog from "@/components/AddGroupDialog";
import ImportGuestsDialog from "@/components/ImportGuestsDialog";
import { buildWhatsAppLink } from "@/lib/phone";

type Guest = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  guest_type: string;
  rsvp_status: string;
  menu_preference: string | null;
  table_number: number | null;
  group_id: string | null;
  max_companions?: number | null;
};

type InviteMap = Record<string, { token: string; sent_at: string | null; opened_at: string | null; responded_at: string | null; rsvp_companions?: number | null }>;

type Group = { id: string; name: string };

export default function WeddingGuests() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [invites, setInvites] = useState<InviteMap>({});
  const [filterRsvp, setFilterRsvp] = useState<string>("all");
  const [filterGroup, setFilterGroup] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterInvite, setFilterInvite] = useState<string>("all");
  const [sendingEmails, setSendingEmails] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("couples").select("id, onboarding_completed").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (!data || !data.onboarding_completed) { navigate("/onboarding"); return; }
      setCoupleId(data.id);
      loadData(data.id);
    });
  }, [user]);

  const loadData = async (cId: string) => {
    const [gRes, grRes, invRes] = await Promise.all([
      supabase.from("wedding_guests").select("*").eq("couple_id", cId).order("name"),
      supabase.from("guest_groups").select("*").eq("couple_id", cId).order("name"),
      (supabase as any).from("guest_invites").select("guest_id, token, sent_at, opened_at, responded_at, rsvp_companions").eq("couple_id", cId),
    ]);
    setGuests(gRes.data || []);
    setGroups(grRes.data || []);
    const map: InviteMap = {};
    (invRes.data || []).forEach((i: any) => { map[i.guest_id] = i; });
    setInvites(map);
  };

  const ensureInvite = async (guestId: string): Promise<string | null> => {
    if (!coupleId) return null;
    if (invites[guestId]) return invites[guestId].token;
    const { data, error } = await (supabase as any)
      .from("guest_invites")
      .insert({ guest_id: guestId, couple_id: coupleId })
      .select("token")
      .maybeSingle();
    if (error || !data) {
      toast({ title: "Erro ao gerar convite", description: error?.message, variant: "destructive" });
      return null;
    }
    setInvites(prev => ({ ...prev, [guestId]: { token: data.token, sent_at: null, opened_at: null, responded_at: null } }));
    return data.token;
  };

  const sendInvite = async (guest: Guest) => {
    const token = await ensureInvite(guest.id);
    if (!token) return;
    // Usa o domínio publicado para garantir que o link funcione fora do preview
    const origin = window.location.hostname.includes("lovable")
      ? "https://ocasamenteiro.lovable.app"
      : window.location.origin;
    const url = `${origin}/convite/${token}`;
    await navigator.clipboard.writeText(url).catch(() => {});
    await (supabase as any).from("guest_invites").update({ sent_at: new Date().toISOString() }).eq("guest_id", guest.id);
    setInvites(prev => ({ ...prev, [guest.id]: { ...prev[guest.id], token, sent_at: new Date().toISOString() } }));
    toast({ title: "Link do convite copiado!", description: "Cole no WhatsApp ou compartilhe. O envio por email é ativado quando o domínio estiver configurado." });
  };

  const sendInviteWhatsApp = async (guest: Guest) => {
    if (!guest.phone) {
      toast({ title: "Convidado sem WhatsApp", description: "Edite o convidado e adicione um número.", variant: "destructive" });
      return;
    }
    const token = await ensureInvite(guest.id);
    if (!token) return;
    const origin = window.location.hostname.includes("lovable")
      ? "https://ocasamenteiro.lovable.app"
      : window.location.origin;
    const url = `${origin}/convite/${token}`;
    const msg = `Olá, ${guest.name}! 💍 Você está convidado(a) para o nosso casamento. Confirme sua presença aqui: ${url}`;
    const wa = buildWhatsAppLink(guest.phone, msg);
    if (!wa) {
      toast({ title: "WhatsApp inválido", description: "Confira o telefone do convidado (DDD + número).", variant: "destructive" });
      return;
    }
    await (supabase as any).from("guest_invites").update({ sent_at: new Date().toISOString() }).eq("guest_id", guest.id);
    setInvites(prev => ({ ...prev, [guest.id]: { ...prev[guest.id], token, sent_at: new Date().toISOString() } }));
    window.open(wa, "_blank");
  };

  const sendInvitesGroup = async (groupGuests: Guest[]) => {
    for (const g of groupGuests) await ensureInvite(g.id);
    toast({ title: `${groupGuests.length} convite(s) gerado(s)`, description: "Use o ícone de link em cada convidado para copiar." });
  };

  const addGuest = async (guest: { name: string; email?: string; phone?: string; guest_type: string; group_id?: string; max_companions?: number }) => {
    if (!coupleId) return;
    const insertData: any = { couple_id: coupleId, name: guest.name, guest_type: guest.guest_type, max_companions: guest.max_companions || 0 };
    if (guest.email) insertData.email = guest.email;
    if (guest.phone) insertData.phone = guest.phone;
    if (guest.group_id && guest.group_id !== "none") insertData.group_id = guest.group_id;
    const { data } = await supabase.from("wedding_guests").insert(insertData).select().single();
    if (data) setGuests((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
  };

  const addGroup = async (name: string) => {
    if (!coupleId) return;
    const { data } = await supabase.from("guest_groups").insert({ couple_id: coupleId, name }).select().single();
    if (data) setGroups((prev) => [...prev, data]);
  };

  const updateRsvp = async (id: string, status: string) => {
    setGuests((prev) => prev.map((g) => g.id === id ? { ...g, rsvp_status: status } : g));
    await supabase.from("wedding_guests").update({ rsvp_status: status }).eq("id", id);
  };

  const updateTable = async (id: string, table: string) => {
    const num = table ? parseInt(table) : null;
    setGuests((prev) => prev.map((g) => g.id === id ? { ...g, table_number: num } : g));
    await supabase.from("wedding_guests").update({ table_number: num }).eq("id", id);
  };

  const deleteGuest = async (id: string) => {
    setGuests((prev) => prev.filter((g) => g.id !== id));
    await supabase.from("wedding_guests").delete().eq("id", id);
  };

  const deleteSelected = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    setGuests((prev) => prev.filter((g) => !selected.has(g.id)));
    setSelected(new Set());
    await supabase.from("wedding_guests").delete().in("id", ids);
    toast({ title: `${ids.length} convidado(s) removido(s)` });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((g) => g.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const filtered = useMemo(() => {
    let list = guests;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((g) => g.name.toLowerCase().includes(q) || g.email?.toLowerCase().includes(q));
    }
    if (filterRsvp !== "all") list = list.filter((g) => g.rsvp_status === filterRsvp);
    if (filterGroup !== "all") list = list.filter((g) => (filterGroup === "none" ? !g.group_id : g.group_id === filterGroup));
    if (filterType !== "all") list = list.filter((g) => g.guest_type === filterType);
    if (filterInvite !== "all") {
      list = list.filter((g) => {
        const inv = invites[g.id];
        if (filterInvite === "none") return !inv;
        if (filterInvite === "sent") return inv?.sent_at && !inv?.opened_at;
        if (filterInvite === "opened") return inv?.opened_at && !inv?.responded_at;
        if (filterInvite === "responded") return !!inv?.responded_at;
        return true;
      });
    }
    return list;
  }, [guests, search, filterRsvp, filterGroup, filterType, filterInvite, invites]);

  // Group guests
  const grouped = useMemo(() => {
    const map: Record<string, Guest[]> = { ungrouped: [] };
    for (const gr of groups) map[gr.id] = [];
    for (const g of filtered) {
      if (g.group_id && map[g.group_id]) map[g.group_id].push(g);
      else map.ungrouped.push(g);
    }
    return map;
  }, [filtered, groups]);

  const adults = guests.filter((g) => g.guest_type === "adult").length;
  const children = guests.filter((g) => g.guest_type === "child").length;
  const babies = guests.filter((g) => g.guest_type === "baby").length;
  const confirmedGuests = guests.filter((g) => g.rsvp_status === "confirmed");
  const confirmed = confirmedGuests.length;
  const totalConfirmedPeople = confirmedGuests.reduce((s, g) => s + 1 + (invites[g.id]?.rsvp_companions || 0), 0);
  const pending = guests.filter((g) => g.rsvp_status === "pending").length;
  const declined = guests.filter((g) => g.rsvp_status === "declined").length;

  const handleExport = () => {
    const csv = ["Nome,Email,Telefone,Tipo,RSVP,Acompanhantes,Mesa,Grupo"]
      .concat(guests.map((g) => {
        const groupName = groups.find((gr) => gr.id === g.group_id)?.name || "";
        const acomp = `${invites[g.id]?.rsvp_companions ?? 0}/${g.max_companions ?? 0}`;
        return `"${g.name}","${g.email || ""}","${g.phone || ""}","${g.guest_type}","${g.rsvp_status}","${acomp}","${g.table_number || ""}","${groupName}"`;
      }))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "convidados-casamento.csv"; a.click();
  };

  const sendInvitesEmailBulk = async () => {
    if (selected.size === 0 || !coupleId) return;
    const ids = Array.from(selected);
    setSendingEmails(true);
    try {
      const { error } = await supabase.functions.invoke("send-invite-emails", {
        body: { couple_id: coupleId, guest_ids: ids },
      });
      if (error) throw error;
      toast({ title: `Convites enviados`, description: `${ids.length} convite(s) entraram na fila de envio.` });
      setSelected(new Set());
      loadData(coupleId);
    } catch (e: any) {
      toast({ title: "Erro ao enviar emails", description: e.message, variant: "destructive" });
    } finally {
      setSendingEmails(false);
    }
  };

  const rsvpVariant = (s: string): "default" | "secondary" | "destructive" | "outline" => {
    if (s === "confirmed") return "default";
    if (s === "declined") return "destructive";
    return "secondary";
  };

  const rsvpLabel = (s: string) => {
    if (s === "confirmed") return "Confirmado";
    if (s === "declined") return "Recusado";
    return "Pendente";
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <DashboardNav />
      <main className="container px-4 py-8">
        {/* Dashboard header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Meus Convidados</h1>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
          <Card><CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">{guests.length}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent></Card>
          <Card><CardContent className="p-3 text-center">
            <Users className="h-4 w-4 mx-auto text-primary mb-1" />
            <p className="text-lg font-bold">{adults}</p>
            <p className="text-xs text-muted-foreground">Adultos</p>
          </CardContent></Card>
          <Card><CardContent className="p-3 text-center">
            <Baby className="h-4 w-4 mx-auto text-primary mb-1" />
            <p className="text-lg font-bold">{children + babies}</p>
            <p className="text-xs text-muted-foreground">Crianças/Bebês</p>
          </CardContent></Card>
          <Card><CardContent className="p-3 text-center">
            <p className="text-lg font-bold text-primary">{confirmed}</p>
            <p className="text-xs text-muted-foreground">Confirmados</p>
          </CardContent></Card>
          <Card><CardContent className="p-3 text-center">
            <p className="text-lg font-bold text-muted-foreground">{pending}</p>
            <p className="text-xs text-muted-foreground">Pendentes</p>
          </CardContent></Card>
          <Card><CardContent className="p-3 text-center">
            <p className="text-lg font-bold text-destructive">{declined}</p>
            <p className="text-xs text-muted-foreground">Recusados</p>
          </CardContent></Card>
        </div>

        {/* Actions bar */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <AddGuestDialog groups={groups} onAdd={addGuest} />
          <AddGroupDialog onAdd={addGroup} />
          {coupleId && <ImportGuestsDialog coupleId={coupleId} groups={groups} onImported={() => loadData(coupleId)} />}
          {selected.size > 0 && (
            <Button variant="destructive" size="sm" onClick={deleteSelected}>
              <Trash2 className="mr-2 h-4 w-4" />
              Remover ({selected.size})
            </Button>
          )}
          {selected.size > 0 && (
            <Button size="sm" onClick={sendInvitesEmailBulk} disabled={sendingEmails}>
              <Mail className="mr-2 h-4 w-4" />
              {sendingEmails ? "Enviando..." : `Enviar convite por email (${selected.size})`}
            </Button>
          )}
          <Select value={filterRsvp} onValueChange={setFilterRsvp}>
            <SelectTrigger className="h-9 w-[140px]"><SelectValue placeholder="Presença" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas presenças</SelectItem>
              <SelectItem value="confirmed">Confirmados</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="declined">Recusados</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterInvite} onValueChange={setFilterInvite}>
            <SelectTrigger className="h-9 w-[150px]"><SelectValue placeholder="Convite" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos convites</SelectItem>
              <SelectItem value="none">Sem convite</SelectItem>
              <SelectItem value="sent">Enviado</SelectItem>
              <SelectItem value="opened">Aberto</SelectItem>
              <SelectItem value="responded">Respondido</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="h-9 w-[120px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos tipos</SelectItem>
              <SelectItem value="adult">Adulto</SelectItem>
              <SelectItem value="child">Criança</SelectItem>
              <SelectItem value="baby">Bebê</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex-1" />
          <Input
            placeholder="Buscar convidado..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
          <Button variant="outline" size="icon" onClick={handleExport} title="Baixar CSV">
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => window.print()} title="Imprimir">
            <Printer className="h-4 w-4" />
          </Button>
        </div>

        {/* Guest table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="p-3 w-10">
                      <Checkbox
                        checked={filtered.length > 0 && selected.size === filtered.length}
                        onCheckedChange={toggleAll}
                      />
                    </th>
                    <th className="p-3 text-left font-medium">Nome</th>
                    <th className="p-3 text-left font-medium hidden md:table-cell">Contato</th>
                    <th className="p-3 text-left font-medium">Presença</th>
                    <th className="p-3 text-left font-medium hidden sm:table-cell">Mesa</th>
                    <th className="p-3 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((group) => {
                    const groupGuests = grouped[group.id] || [];
                    if (groupGuests.length === 0) return null;
                    return (
                      <GuestGroupSection
                        key={group.id}
                        groupName={group.name}
                        guests={groupGuests}
                        selected={selected}
                        onToggleSelect={toggleSelect}
                        onUpdateRsvp={updateRsvp}
                        onUpdateTable={updateTable}
                        onDelete={deleteGuest}
                        rsvpVariant={rsvpVariant}
                        rsvpLabel={rsvpLabel}
                        invites={invites}
                        onSendInvite={sendInvite}
                        onSendWhatsApp={sendInviteWhatsApp}
                        onSendGroup={() => sendInvitesGroup(groupGuests)}
                      />
                    );
                  })}
                  {(grouped.ungrouped || []).length > 0 && (
                    <GuestGroupSection
                      groupName={groups.length > 0 ? "Sem grupo" : undefined}
                      guests={grouped.ungrouped}
                      selected={selected}
                      onToggleSelect={toggleSelect}
                      onUpdateRsvp={updateRsvp}
                      onUpdateTable={updateTable}
                      onDelete={deleteGuest}
                      rsvpVariant={rsvpVariant}
                      rsvpLabel={rsvpLabel}
                      invites={invites}
                      onSendInvite={sendInvite}
                      onSendWhatsApp={sendInviteWhatsApp}
                    />
                  )}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <p className="text-center text-muted-foreground py-12">
                  Nenhum convidado adicionado ainda.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

// Sub-component for guest group rows
function GuestGroupSection({
  groupName,
  guests,
  selected,
  onToggleSelect,
  onUpdateRsvp,
  onUpdateTable,
  onDelete,
  rsvpVariant,
  rsvpLabel,
  invites,
  onSendInvite,
  onSendWhatsApp,
  onSendGroup,
}: {
  groupName?: string;
  guests: Guest[];
  selected: Set<string>;
  onToggleSelect: (id: string) => void;
  onUpdateRsvp: (id: string, status: string) => void;
  onUpdateTable: (id: string, table: string) => void;
  onDelete: (id: string) => void;
  rsvpVariant: (s: string) => "default" | "secondary" | "destructive" | "outline";
  rsvpLabel: (s: string) => string;
  invites: InviteMap;
  onSendInvite: (g: Guest) => void;
  onSendWhatsApp?: (g: Guest) => void;
  onSendGroup?: () => void;
}) {
  return (
    <>
      {groupName && (
        <tr className="bg-muted/30">
          <td colSpan={6} className="p-2 pl-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase text-muted-foreground">{groupName} ({guests.length})</span>
              {onSendGroup && (
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={onSendGroup}>
                  <Send className="h-3 w-3 mr-1" /> Enviar convites do grupo
                </Button>
              )}
            </div>
          </td>
        </tr>
      )}
      {guests.map((g) => (
        <tr key={g.id} className="border-b border-border hover:bg-muted/20 transition-colors">
          <td className="p-3">
            <Checkbox checked={selected.has(g.id)} onCheckedChange={() => onToggleSelect(g.id)} />
          </td>
          <td className="p-3">
            <p className="font-medium">{g.name}</p>
            <p className="text-xs text-muted-foreground capitalize">
              {g.guest_type === "adult" ? "Adulto" : g.guest_type === "child" ? "Criança" : "Bebê"}
              {invites[g.id]?.responded_at && <span className="ml-2 text-green-700">• respondeu</span>}
              {invites[g.id]?.opened_at && !invites[g.id]?.responded_at && <span className="ml-2 text-blue-700">• abriu</span>}
              {invites[g.id]?.sent_at && !invites[g.id]?.opened_at && <span className="ml-2">• enviado</span>}
            </p>
          </td>
          <td className="p-3 hidden md:table-cell">
            <p className="text-xs">{g.email || "-"}</p>
            <p className="text-xs">{g.phone || ""}</p>
          </td>
          <td className="p-3">
            <Select value={g.rsvp_status} onValueChange={(v) => onUpdateRsvp(g.id, v)}>
              <SelectTrigger className="h-8 w-32">
                <Badge variant={rsvpVariant(g.rsvp_status)} className="text-xs">{rsvpLabel(g.rsvp_status)}</Badge>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="confirmed">Confirmado</SelectItem>
                <SelectItem value="declined">Recusado</SelectItem>
              </SelectContent>
            </Select>
          </td>
          <td className="p-3 hidden sm:table-cell">
            <Input
              type="number"
              className="h-8 w-16"
              placeholder="-"
              value={g.table_number ?? ""}
              onChange={(e) => onUpdateTable(g.id, e.target.value)}
            />
          </td>
          <td className="p-3">
            <div className="flex items-center gap-1">
              {onSendWhatsApp && g.phone && (
                <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-700" onClick={() => onSendWhatsApp(g)} title="Enviar pelo WhatsApp">
                  <MessageCircle className="h-4 w-4" />
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onSendInvite(g)} title="Copiar link do convite">
                <LinkIcon className="h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onSendInvite(g)}>
                    <LinkIcon className="mr-2 h-4 w-4" />
                    Copiar link do convite
                  </DropdownMenuItem>
                  {onSendWhatsApp && g.phone && (
                    <DropdownMenuItem onClick={() => onSendWhatsApp(g)}>
                      <MessageCircle className="mr-2 h-4 w-4" />
                      Enviar pelo WhatsApp
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => onDelete(g.id)} className="text-destructive focus:text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remover
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}
