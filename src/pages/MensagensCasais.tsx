import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import DashboardHeader from "@/components/DashboardHeader";
import DashboardNav from "@/components/DashboardNav";
import SEO from "@/components/SEO";
import { toast } from "sonner";

type Thread = {
  outro_couple_id: string;
  nome_casal: string | null;
  slug: string | null;
  ultima: string;
  created_at: string;
  nao_lidas: number;
};

type Message = {
  id: string;
  remetente_couple_id: string;
  destinatario_couple_id: string;
  texto: string;
  created_at: string;
  lida: boolean;
};

export default function MensagensCasais() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [myCoupleId, setMyCoupleId] = useState<string | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [active, setActive] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login"); return; }
    (async () => {
      const { data: couple } = await supabase
        .from("couples").select("id").eq("user_id", user.id).maybeSingle();
      if (!couple) { setLoading(false); return; }
      setMyCoupleId(couple.id);
      await loadThreads(couple.id);
      setLoading(false);
    })();
  }, [user, authLoading, navigate]);

  const loadThreads = async (coupleId: string) => {
    const { data } = await supabase
      .from("couple_messages")
      .select("id, remetente_couple_id, destinatario_couple_id, texto, created_at, lida")
      .or(`remetente_couple_id.eq.${coupleId},destinatario_couple_id.eq.${coupleId}`)
      .order("created_at", { ascending: false });

    const map = new Map<string, Thread>();
    for (const m of data ?? []) {
      const outro = m.remetente_couple_id === coupleId ? m.destinatario_couple_id : m.remetente_couple_id;
      if (!map.has(outro)) {
        map.set(outro, { outro_couple_id: outro, nome_casal: null, slug: null, ultima: m.texto, created_at: m.created_at, nao_lidas: 0 });
      }
      if (!m.lida && m.destinatario_couple_id === coupleId) {
        map.get(outro)!.nao_lidas++;
      }
    }
    const ids = Array.from(map.keys());
    if (ids.length) {
      const { data: profs } = await supabase
        .from("couple_public_profiles")
        .select("couple_id, nome_casal, slug")
        .in("couple_id", ids);
      profs?.forEach((p) => {
        const t = map.get(p.couple_id);
        if (t) { t.nome_casal = p.nome_casal; t.slug = p.slug; }
      });
    }
    setThreads(Array.from(map.values()));
  };

  const openThread = async (t: Thread) => {
    if (!myCoupleId) return;
    setActive(t);
    const { data } = await supabase
      .from("couple_messages")
      .select("*")
      .or(`and(remetente_couple_id.eq.${myCoupleId},destinatario_couple_id.eq.${t.outro_couple_id}),and(remetente_couple_id.eq.${t.outro_couple_id},destinatario_couple_id.eq.${myCoupleId})`)
      .order("created_at", { ascending: true });
    setMessages(data ?? []);
    // Marca como lidas
    await supabase.from("couple_messages")
      .update({ lida: true, lida_em: new Date().toISOString() })
      .eq("destinatario_couple_id", myCoupleId)
      .eq("remetente_couple_id", t.outro_couple_id)
      .eq("lida", false);
    await loadThreads(myCoupleId);
  };

  const send = async () => {
    if (!text.trim() || !active || !myCoupleId) return;
    const { error } = await supabase.from("couple_messages").insert({
      remetente_couple_id: myCoupleId,
      destinatario_couple_id: active.outro_couple_id,
      texto: text.trim(),
    });
    if (error) { toast.error("Não foi possível enviar"); return; }
    setText("");
    await openThread(active);
  };

  return (
    <>
      <SEO title="Mensagens — Casamenteiro" noIndex />
      <DashboardHeader />
      <DashboardNav />
      <main className="container mx-auto py-8 px-4 max-w-5xl">
        <h1 className="text-3xl font-serif mb-6">Mensagens</h1>
        {loading ? <Skeleton className="h-96 w-full" /> : (
          <div className="grid md:grid-cols-3 gap-4 min-h-[500px]">
            <Card className="p-2 md:col-span-1 overflow-hidden">
              {threads.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">Nenhuma conversa ainda.</p>
              ) : (
                <ul className="divide-y">
                  {threads.map((t) => (
                    <li key={t.outro_couple_id}>
                      <button onClick={() => openThread(t)} className={`w-full text-left p-3 hover:bg-muted/50 ${active?.outro_couple_id === t.outro_couple_id ? "bg-muted" : ""}`}>
                        <div className="flex justify-between items-center">
                          <span className="font-medium truncate">{t.nome_casal ?? "Casal"}</span>
                          {t.nao_lidas > 0 && <span className="text-xs bg-primary text-primary-foreground rounded-full px-2">{t.nao_lidas}</span>}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">{t.ultima}</div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card className="md:col-span-2 flex flex-col">
              {!active ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground p-8">
                  Selecione uma conversa
                </div>
              ) : (
                <>
                  <div className="p-4 border-b font-medium">{active.nome_casal ?? "Casal"}</div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-2 max-h-[500px]">
                    {messages.map((m) => {
                      const mine = m.remetente_couple_id === myCoupleId;
                      return (
                        <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                            {m.texto}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="p-3 border-t flex gap-2">
                    <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Escreva..." rows={2} className="resize-none" />
                    <Button onClick={send}>Enviar</Button>
                  </div>
                </>
              )}
            </Card>
          </div>
        )}
      </main>
    </>
  );
}