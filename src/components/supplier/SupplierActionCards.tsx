import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, Eye, MessageSquareWarning } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type Props = {
  supplierId: string;
  supplierUserId: string;
  onGoToQuotes: (filter?: "aguardando" | "sem_retorno") => void;
};

function hoursSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
}

function fmtWait(hours: number) {
  if (hours < 1) return "há minutos";
  if (hours < 48) return `há ${hours}h`;
  return `há ${Math.floor(hours / 24)}d`;
}

export default function SupplierActionCards({ supplierId, supplierUserId, onGoToQuotes }: Props) {
  const [views30, setViews30] = useState(0);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [proposals, setProposals] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    if (!supplierId) return;
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    (async () => {
      const [{ count: v }, { data: qs }] = await Promise.all([
        supabase.from("supplier_profile_views").select("id", { count: "exact", head: true })
          .eq("supplier_id", supplierId).gte("viewed_at", since),
        supabase.from("quotes").select("id, created_at, kanban_status, couple_id, user_id")
          .eq("supplier_id", supplierId)
          .not("kanban_status", "in", "(fechado,recusado)")
          .order("created_at", { ascending: true }),
      ]);
      setViews30(v || 0);
      const list = qs || [];
      setQuotes(list);
      if (list.length) {
        const ids = list.map((q: any) => q.id);
        const [{ data: pr }, { data: msg }] = await Promise.all([
          supabase.from("quote_proposals").select("id, quote_id, sender_id, created_at")
            .in("quote_id", ids).order("created_at", { ascending: false }),
          supabase.from("quote_messages").select("id, quote_id, sender_id, created_at")
            .in("quote_id", ids).order("created_at", { ascending: false }),
        ]);
        setProposals(pr || []);
        setMessages(msg || []);
      } else {
        setProposals([]);
        setMessages([]);
      }
    })();
  }, [supplierId]);

  const { awaiting, oldestAwaitH, stalled } = useMemo(() => {
    // "Aguardando resposta": nenhum proposal e nenhuma mensagem do fornecedor
    const supplierActivity = new Set([
      ...proposals.filter((p) => p.sender_id === supplierUserId).map((p) => p.quote_id),
      ...messages.filter((m) => m.sender_id === supplierUserId).map((m) => m.quote_id),
    ]);
    const awaitingList = quotes.filter((q) => !supplierActivity.has(q.id));
    const oldest = awaitingList[0]?.created_at ? hoursSince(awaitingList[0].created_at) : 0;

    // "Sem retorno do casal": última atividade foi do fornecedor há >=3 dias
    const lastByQuote = new Map<string, { at: string; from: string }>();
    [...proposals, ...messages].forEach((e: any) => {
      const cur = lastByQuote.get(e.quote_id);
      if (!cur || new Date(e.created_at) > new Date(cur.at)) {
        lastByQuote.set(e.quote_id, { at: e.created_at, from: e.sender_id });
      }
    });
    const stalledList = quotes.filter((q) => {
      const last = lastByQuote.get(q.id);
      if (!last || last.from !== supplierUserId) return false;
      return hoursSince(last.at) >= 72;
    });

    return { awaiting: awaitingList, oldestAwaitH: oldest, stalled: stalledList };
  }, [quotes, proposals, messages, supplierUserId]);

  const overdue = oldestAwaitH >= 24 && awaiting.length > 0;

  const cards = [
    {
      key: "views",
      label: "Visitas no perfil (30d)",
      value: views30,
      hint: "últimos 30 dias",
      icon: Eye,
      color: "text-sky-700 bg-sky-100",
      onClick: undefined,
      alert: false,
    },
    {
      key: "awaiting",
      label: "Leads aguardando resposta",
      value: awaiting.length,
      hint: awaiting.length ? `mais antigo ${fmtWait(oldestAwaitH)}` : "nenhum em aberto",
      icon: Clock,
      color: overdue ? "text-destructive bg-destructive/10" : "text-amber-700 bg-amber-100",
      onClick: () => onGoToQuotes("aguardando"),
      alert: overdue,
    },
    {
      key: "stalled",
      label: "Propostas sem retorno",
      value: stalled.length,
      hint: stalled.length ? "casal não respondeu há 3+ dias" : "tudo em dia",
      icon: MessageSquareWarning,
      color: "text-violet-700 bg-violet-100",
      onClick: () => onGoToQuotes("sem_retorno"),
      alert: false,
    },
  ];

  return (
    <div className="space-y-3">
      {overdue && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="p-4 flex items-start gap-3 flex-wrap">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm">
                <strong>Você tem {awaiting.length} pedido{awaiting.length > 1 ? "s" : ""} aguardando resposta</strong> — responder rápido aumenta suas chances de fechar.
              </p>
            </div>
            <Button size="sm" onClick={() => onGoToQuotes("aguardando")}>Responder agora</Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {cards.map((c) => {
          const Icon = c.icon;
          const clickable = !!c.onClick;
          return (
            <Card
              key={c.key}
              onClick={c.onClick}
              className={cn(
                "transition",
                clickable && "cursor-pointer hover:shadow-md",
                c.alert && "border-destructive/50"
              )}
            >
              <CardContent className="p-4">
                <div className={cn("inline-flex items-center justify-center h-9 w-9 rounded-full mb-2", c.color)}>
                  <Icon className="h-4 w-4" />
                </div>
                <p className={cn("text-2xl font-bold leading-none", c.alert && "text-destructive")}>{c.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{c.label}</p>
                <p className={cn("text-[11px] mt-0.5", c.alert ? "text-destructive font-medium" : "text-muted-foreground")}>
                  {c.hint}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}