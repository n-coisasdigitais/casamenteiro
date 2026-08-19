import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Phone, MessageCircle, Globe, ExternalLink, CheckCircle2, DollarSign, Trash2, Send } from "lucide-react";
import { Link } from "react-router-dom";
import QuoteConversation from "@/components/QuoteConversation";
import { buildWhatsAppLink } from "@/lib/phone";
import type { PlanSupplier } from "./PlanKanban";

const fmt = (n: number) => `R$ ${(n || 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;

const STATUS_LABEL: Record<string, string> = {
  nao_iniciado: "No plano",
  em_orcamento: "Em orçamento",
  negociando: "Negociando",
  contratado: "Contratado",
  descartado: "Descartado",
  fora_da_plataforma: "Fora da plataforma",
};

const EVENT_LABEL: Record<string, string> = {
  created: "Adicionado ao plano",
  status_change: "Status alterado",
  contract: "Contratação registrada",
  quote_sent: "Pedido de orçamento enviado",
  message: "Nova mensagem",
  payment: "Pagamento registrado",
};

type Event = {
  id: string;
  type: string;
  from_status: string | null;
  to_status: string | null;
  payload: any;
  created_at: string;
};

type SupplierMeta = {
  id: string;
  whatsapp: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
};

export default function CardDetailDrawer({
  open, onOpenChange, item, coupleId, currentUserId,
  onOpenContract, onOpenNegotiate, onDiscard, onRegisterPayment, onChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  item: PlanSupplier | null;
  coupleId: string;
  currentUserId: string;
  onOpenContract: (item: PlanSupplier) => void;
  onOpenNegotiate: (item: PlanSupplier) => void;
  onDiscard: (item: PlanSupplier) => void;
  onRegisterPayment: (item: PlanSupplier) => void;
  onChange: () => void;
}) {
  const [events, setEvents] = useState<Event[]>([]);
  const [quoteId, setQuoteId] = useState<string | null>(null);
  const [meta, setMeta] = useState<SupplierMeta | null>(null);
  const [tab, setTab] = useState("dados");

  useEffect(() => {
    if (!open || !item) return;
    setTab("dados");
    // fetch events
    supabase
      .from("couple_supplier_events")
      .select("id, type, from_status, to_status, payload, created_at")
      .eq("couple_supplier_id", item.id)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => setEvents((data || []) as Event[]));
    // fetch quote id (most recent)
    if (item.supplier_id) {
      supabase.from("quotes").select("id, created_at")
        .eq("couple_id", coupleId).eq("supplier_id", item.supplier_id)
        .order("created_at", { ascending: false }).limit(1)
        .then(({ data }) => setQuoteId(data?.[0]?.id || null));
      Promise.all([
        supabase.rpc("my_supplier_contacts", { _ids: [item.supplier_id] }),
        supabase.from("suppliers").select("id, website").eq("id", item.supplier_id).maybeSingle(),
      ]).then(([{ data: contatos }, { data: sup }]) => {
        const c = (contatos as any[])?.[0] || null;
        setMeta({ ...(sup as any), ...(c || {}) } as SupplierMeta | null);
      });
    } else {
      setQuoteId(null);
      setMeta(null);
    }
  }, [open, item, coupleId]);

  if (!item) return null;

  const statusTone =
    item.kanban_status === "contratado" ? "bg-emerald-100 text-emerald-800 border-emerald-200" :
    item.kanban_status === "negociando" ? "bg-blue-100 text-blue-800 border-blue-200" :
    item.kanban_status === "em_orcamento" ? "bg-amber-100 text-amber-800 border-amber-200" :
    item.kanban_status === "descartado" ? "bg-rose-50 text-rose-700 border-rose-200" :
    "bg-slate-100 text-slate-700 border-slate-200";

  const wpp = meta ? (meta.whatsapp || meta.phone || "") : "";
  const waLink = wpp ? buildWhatsAppLink(wpp, `Olá! Falo pelo Casamenteiro.`) : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="p-4 pb-3 border-b border-border">
          <SheetTitle className="text-base flex items-start gap-2">
            <span className="flex-1 min-w-0 truncate">{item.company_name}</span>
            <Badge variant="outline" className={`text-[10px] shrink-0 ${statusTone}`}>
              {STATUS_LABEL[item.kanban_status] || item.kanban_status}
            </Badge>
          </SheetTitle>
          {item.category_name && (
            <p className="text-xs text-muted-foreground capitalize">{item.category_name}</p>
          )}
          <div className="flex flex-wrap gap-3 text-xs pt-1">
            <span className="text-muted-foreground">Plano <b className="text-foreground">{fmt(item.valor_plano)}</b></span>
            {item.valor_cotado > 0 && <span className="text-amber-600">Cotado <b>{fmt(item.valor_cotado)}</b></span>}
            {item.valor_contratado > 0 && <span className="text-emerald-600">Fechado <b>{fmt(item.valor_contratado)}</b></span>}
          </div>
        </SheetHeader>

        <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-4 mt-3 grid grid-cols-3">
            <TabsTrigger value="dados">Dados</TabsTrigger>
            <TabsTrigger value="conversa">Conversa</TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="dados" className="flex-1 overflow-y-auto p-4 space-y-3">
            {item.supplier_id && (
              <Button variant="outline" size="sm" asChild className="w-full">
                <Link to={`/fornecedor/${item.supplier_id}`}>
                  <ExternalLink className="h-4 w-4 mr-2" /> Ver perfil completo
                </Link>
              </Button>
            )}
            <Card className="p-3 space-y-2 text-sm">
              {meta?.phone && (
                <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-muted-foreground" /> {meta.phone}</div>
              )}
              {(meta?.whatsapp || meta?.phone) && waLink && (
                <a href={waLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-emerald-700 hover:underline">
                  <MessageCircle className="h-3.5 w-3.5" /> Abrir WhatsApp
                </a>
              )}
              {meta?.website && (
                <a href={meta.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline">
                  <Globe className="h-3.5 w-3.5" /> Site
                </a>
              )}
              {item.is_external && item.external_phone && (
                <div className="text-xs text-muted-foreground">Fornecedor externo · {item.external_phone}</div>
              )}
              {!meta && !item.is_external && (
                <p className="text-xs text-muted-foreground">Sem dados de contato cadastrados.</p>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="conversa" className="flex-1 overflow-hidden flex flex-col p-0">
            {quoteId ? (
              <div className="flex-1 min-h-0 flex flex-col">
                <QuoteConversation
                  quoteId={quoteId}
                  currentUserId={currentUserId}
                  isSupplier={false}
                  coupleId={coupleId}
                  supplierId={item.supplier_id}
                  onContracted={() => { onChange(); onOpenChange(false); }}
                />
              </div>
            ) : (
              <div className="p-6 text-center text-sm text-muted-foreground space-y-3">
                <p>Nenhum pedido de orçamento aberto com este fornecedor ainda.</p>
                {item.supplier_id && (
                  <Button asChild size="sm">
                    <Link to={`/fornecedor/${item.supplier_id}`}>
                      <Send className="h-4 w-4 mr-2" /> Pedir orçamento
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="historico" className="flex-1 overflow-y-auto p-4 space-y-2">
            {events.length === 0 && (
              <p className="text-xs text-muted-foreground">Nenhum evento registrado.</p>
            )}
            {events.map((ev) => (
              <div key={ev.id} className="flex gap-3 text-xs">
                <div className="w-1.5 rounded-full bg-primary/60 shrink-0" />
                <div className="flex-1">
                  <p className="font-medium">{EVENT_LABEL[ev.type] || ev.type}</p>
                  {ev.type === "status_change" && (
                    <p className="text-muted-foreground">
                      {STATUS_LABEL[ev.from_status || ""] || ev.from_status || "—"} → {STATUS_LABEL[ev.to_status || ""] || ev.to_status}
                    </p>
                  )}
                  {ev.type === "contract" && ev.payload?.value && (
                    <p className="text-muted-foreground">Valor: {fmt(Number(ev.payload.value))}</p>
                  )}
                  <p className="text-muted-foreground">
                    {new Date(ev.created_at).toLocaleString("pt-BR")}
                  </p>
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>

        <Separator />
        <div className="p-3 grid grid-cols-2 gap-2">
          {item.kanban_status !== "contratado" && (
            <Button size="sm" onClick={() => onOpenContract(item)}>
              <CheckCircle2 className="h-4 w-4 mr-1" /> Marcar contratado
            </Button>
          )}
          {item.kanban_status !== "contratado" && (
            <Button size="sm" variant="outline" onClick={() => onOpenNegotiate(item)}>
              <DollarSign className="h-4 w-4 mr-1" /> Registrar valor
            </Button>
          )}
          {item.kanban_status === "contratado" && (
            <Button size="sm" variant="outline" onClick={() => onRegisterPayment(item)}>
              <DollarSign className="h-4 w-4 mr-1" /> Registrar pagamento
            </Button>
          )}
          <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => onDiscard(item)}>
            <Trash2 className="h-4 w-4 mr-1" /> Descartar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}