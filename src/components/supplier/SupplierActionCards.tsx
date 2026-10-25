import { useEffect, useMemo, useState } from "react";
import { CalendarRange, CheckCircle2, MessageSquare, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  supplierId: string;
  supplierUserId: string;
  onGoToQuotes: (filter?: "aguardando" | "sem_retorno") => void;
  /** reservas de data ociosa aguardando o fornecedor (vem do painel) */
  reservasPendentes?: number;
  onGoToReservas?: () => void;
  /** avisa o painel quantas prioridades existem (para a saudação) */
  onTotal?: (n: number) => void;
};

function hoursSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
}

function fmtWait(hours: number) {
  if (hours < 1) return "há minutos";
  if (hours < 48) return `há ${hours} h`;
  return `há ${Math.floor(hours / 24)} dias`;
}

type Tarefa = {
  key: string;
  icone: any;
  tom: "hot" | "warm" | "cool";
  titulo: string;
  selo: string;
  texto: string;
  acao: string;
  principal?: boolean;
  onClick: () => void;
};

const TONS = {
  hot: { bg: "var(--pv-rose-soft)", fg: "var(--pv-err)" },
  warm: { bg: "var(--pv-amber-soft)", fg: "var(--pv-warn)" },
  cool: { bg: "var(--pv-sage-soft)", fg: "var(--pv-ok)" },
};

/** "Prioridades de hoje": o que o fornecedor deve fazer agora, em ordem de urgência. */
export default function SupplierActionCards({ supplierId, supplierUserId, onGoToQuotes, reservasPendentes = 0, onGoToReservas, onTotal }: Props) {
  const [quotes, setQuotes] = useState<any[]>([]);
  const [proposals, setProposals] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!supplierId) return;
    (async () => {
      const { data: qs } = await supabase
        .from("quotes")
        .select("id, created_at, kanban_status, couple_id, user_id")
        .eq("supplier_id", supplierId)
        .not("kanban_status", "in", "(fechado,recusado)")
        .order("created_at", { ascending: true });
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
      setCarregando(false);
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

  const tarefas: Tarefa[] = [];
  if (awaiting.length)
    tarefas.push({
      key: "awaiting",
      icone: MessageSquare,
      tom: oldestAwaitH >= 24 ? "hot" : "warm",
      titulo: `Responder ${awaiting.length} pedido${awaiting.length > 1 ? "s" : ""} de orçamento`,
      selo: `o mais antigo ${fmtWait(oldestAwaitH)}`,
      texto: "Responder rápido aumenta suas chances de fechar.",
      acao: "Responder",
      principal: true,
      onClick: () => onGoToQuotes("aguardando"),
    });
  if (reservasPendentes > 0 && onGoToReservas)
    tarefas.push({
      key: "reservas",
      icone: CalendarRange,
      tom: "warm",
      titulo: `Responder ${reservasPendentes} reserva${reservasPendentes > 1 ? "s" : ""} de data ociosa`,
      selo: "aguardando você",
      texto: "O casal escolheu uma data que você ofereceu com desconto.",
      acao: "Ver reservas",
      onClick: onGoToReservas,
    });
  if (stalled.length)
    tarefas.push({
      key: "stalled",
      icone: Send,
      tom: "cool",
      titulo: `${stalled.length} proposta${stalled.length > 1 ? "s" : ""} sem retorno do casal`,
      selo: "3+ dias",
      texto: "Vale mandar uma mensagem para retomar a conversa.",
      acao: "Ver",
      onClick: () => onGoToQuotes("sem_retorno"),
    });

  useEffect(() => {
    if (!carregando) onTotal?.(tarefas.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carregando, tarefas.length]);

  return (
    <section className="pv-panel pv-enter flex min-w-0 flex-col gap-3 p-5" aria-labelledby="pv-prior">
      <div className="flex items-center justify-between gap-3">
        <h2 id="pv-prior" className="m-0 text-base font-bold" style={{ color: "var(--pv-ink)" }}>Prioridades de hoje</h2>
        {!carregando && (
          <span className="pv-num text-[13px]" style={{ color: "var(--pv-muted)" }}>
            {tarefas.length ? `${tarefas.length} pendente${tarefas.length > 1 ? "s" : ""}` : "tudo em dia"}
          </span>
        )}
      </div>

      {carregando ? (
        <div className="flex flex-col gap-3">
          {[0, 1].map((i) => <div key={i} className="pv-skel h-14" />)}
        </div>
      ) : tarefas.length === 0 ? (
        <p className="m-0 flex items-center gap-2.5 py-3 text-[15px]" style={{ color: "var(--pv-body)" }}>
          <CheckCircle2 className="h-5 w-5 shrink-0" style={{ color: "var(--pv-ok)" }} aria-hidden="true" />
          Nada pendente por hoje. Aproveite para completar o perfil ou liberar datas com desconto.
        </p>
      ) : (
        <ul className="m-0 flex list-none flex-col p-0">
          {tarefas.map((t, i) => {
            const Icon = t.icone;
            const tom = TONS[t.tom];
            return (
              <li key={t.key} className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3.5 gap-y-2 py-3 sm:grid-cols-[auto_minmax(0,1fr)_auto]" style={{ borderTop: i ? "1px solid var(--pv-line)" : undefined }}>
                <span className="grid h-[38px] w-[38px] place-items-center rounded-xl" style={{ background: tom.bg, color: tom.fg }}>
                  <Icon className="h-[19px] w-[19px]" strokeWidth={1.8} aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <b className="text-[15px] font-semibold" style={{ color: "var(--pv-ink)" }}>{t.titulo}</b>
                  <span className="pv-num ml-1.5 inline-block rounded-full px-2 py-0.5 align-[1px] text-xs font-bold" style={{ background: tom.bg, color: tom.fg }}>{t.selo}</span>
                  <span className="mt-0.5 block text-[13px]" style={{ color: "var(--pv-muted)" }}>{t.texto}</span>
                </span>
                <button
                  type="button"
                  onClick={t.onClick}
                  className="col-start-2 inline-flex h-9 items-center justify-self-start whitespace-nowrap rounded-full px-4 text-sm font-semibold transition hover:brightness-110 active:scale-[.97] sm:col-start-auto sm:justify-self-end"
                  style={t.principal ? { background: "var(--pv-ink)", color: "#fff" } : { background: "#fff", color: "var(--pv-ink)", border: "1px solid #d9c9b8" }}
                >
                  {t.acao}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
