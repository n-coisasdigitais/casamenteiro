import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, X, DollarSign, Percent, Handshake } from "lucide-react";

type Proposal = {
  id: string;
  quote_id: string;
  sender_id: string;
  kind: string;
  amount: number | null;
  description: string | null;
  status: string;
  created_at: string;
};

type Props = {
  quoteId: string;
  currentUserId: string;
  isSupplier: boolean;
  coupleId?: string | null;
  supplierId?: string | null;
  onContracted?: () => void;
};

export default function QuoteProposalPanel({ quoteId, currentUserId, isSupplier, coupleId, supplierId, onContracted }: Props) {
  const { toast } = useToast();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [kind, setKind] = useState<"proposal" | "discount_request" | "counter">(isSupplier ? "proposal" : "discount_request");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await (supabase.from("quote_proposals" as any).select("*").eq("quote_id", quoteId).order("created_at", { ascending: true }) as any);
    setProposals(data || []);
  };

  useEffect(() => { load(); }, [quoteId]);

  const send = async () => {
    if (!amount || isNaN(Number(amount))) {
      toast({ title: "Informe um valor válido", variant: "destructive" });
      return;
    }
    setBusy(true);
    const { error } = await (supabase.from("quote_proposals" as any) as any).insert({
      quote_id: quoteId,
      sender_id: currentUserId,
      kind,
      amount: Number(amount),
      description: desc.trim() || null,
    });
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else {
      setAmount(""); setDesc("");
      toast({ title: kind === "discount_request" ? "Pedido de desconto enviado" : "Proposta enviada" });
      load();
    }
    setBusy(false);
  };

  const respond = async (p: Proposal, status: "accepted" | "rejected") => {
    setBusy(true);
    await (supabase.from("quote_proposals" as any) as any).update({ status }).eq("id", p.id);
    toast({ title: status === "accepted" ? "Proposta aceita" : "Proposta recusada" });
    load();
    setBusy(false);
  };

  const marcarContratado = async (finalAmount: number) => {
    if (!coupleId || !supplierId) {
      toast({ title: "Vincule a um fornecedor para contratar", variant: "destructive" });
      return;
    }
    setBusy(true);
    // upsert couple_suppliers
    const { data: existing } = await supabase
      .from("couple_suppliers")
      .select("id")
      .eq("couple_id", coupleId)
      .eq("supplier_id", supplierId)
      .maybeSingle();
    if (existing) {
      await (supabase.from("couple_suppliers") as any).update({
        status: "contracted",
        final_value: finalAmount,
        contract_value: finalAmount,
        contracted_at: new Date().toISOString(),
      }).eq("id", existing.id);
    } else {
      await (supabase.from("couple_suppliers") as any).insert({
        couple_id: coupleId,
        supplier_id: supplierId,
        status: "contracted",
        final_value: finalAmount,
        contract_value: finalAmount,
        contracted_at: new Date().toISOString(),
      });
    }
    await (supabase.from("quotes") as any).update({ status: "accepted" }).eq("id", quoteId);
    toast({ title: "Marcado como contratado!", description: "Aparece agora em Meus Fornecedores." });
    onContracted?.();
    setBusy(false);
  };

  const lastAccepted = [...proposals].reverse().find((p) => p.status === "accepted" && p.amount);

  return (
    <div className="border-t border-border p-4 space-y-3 bg-muted/30">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold flex items-center gap-1.5">
          <Handshake className="w-4 h-4" /> Propostas e negociação
        </h4>
        {lastAccepted && (
          <Button size="sm" onClick={() => marcarContratado(Number(lastAccepted.amount))} disabled={busy}>
            <CheckCircle2 className="w-4 h-4 mr-1" />
            Marcar contratado
          </Button>
        )}
      </div>

      {proposals.length > 0 && (
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {proposals.map((p) => {
            const mine = p.sender_id === currentUserId;
            const labelKind =
              p.kind === "proposal" ? "Proposta" :
              p.kind === "discount_request" ? "Pedido de desconto" :
              p.kind === "counter" ? "Contraproposta" : p.kind;
            return (
              <div key={p.id} className={`text-xs rounded-md border p-2 ${mine ? "bg-primary/5 border-primary/20" : "bg-background"}`}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <Badge variant="outline" className="text-[10px]">{labelKind}</Badge>
                  <span className="font-semibold text-sm">R$ {Number(p.amount || 0).toLocaleString("pt-BR")}</span>
                </div>
                {p.description && <p className="text-muted-foreground">{p.description}</p>}
                <div className="flex items-center justify-between mt-1.5">
                  <Badge variant={p.status === "accepted" ? "default" : p.status === "rejected" ? "destructive" : "secondary"} className="text-[10px]">
                    {p.status === "accepted" ? "aceita" : p.status === "rejected" ? "recusada" : "pendente"}
                  </Badge>
                  {!mine && p.status === "pending" && (
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]" onClick={() => respond(p, "accepted")}>Aceitar</Button>
                      <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={() => respond(p, "rejected")}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="space-y-2">
        <div className="flex gap-2 flex-wrap">
          {isSupplier ? (
            <>
              <Button size="sm" variant={kind === "proposal" ? "default" : "outline"} onClick={() => setKind("proposal")}>
                <DollarSign className="w-3 h-3 mr-1" /> Enviar proposta
              </Button>
              <Button size="sm" variant={kind === "counter" ? "default" : "outline"} onClick={() => setKind("counter")}>
                Contraproposta
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant={kind === "discount_request" ? "default" : "outline"} onClick={() => setKind("discount_request")}>
                <Percent className="w-3 h-3 mr-1" /> Pedir desconto
              </Button>
              <Button size="sm" variant={kind === "counter" ? "default" : "outline"} onClick={() => setKind("counter")}>
                Contraproposta
              </Button>
            </>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-1">
            <Label className="text-[10px]">Valor (R$)</Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-8 text-sm" />
          </div>
          <div className="col-span-2">
            <Label className="text-[10px]">Observação</Label>
            <Textarea rows={1} value={desc} onChange={(e) => setDesc(e.target.value)} className="text-sm min-h-[32px] py-1" />
          </div>
        </div>
        <Button size="sm" className="w-full" onClick={send} disabled={busy}>Enviar</Button>
      </div>
    </div>
  );
}