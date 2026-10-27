import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { traduzirErro } from "@/lib/errorMessages";
import { AJUSTES, buscarPendencias, labelAjuste, mensagemCadastroIncompleto, type Pendencia } from "@/lib/pendencias";

type Pedido = { motivo: string | null; itens: string[] | null; created_at: string };

/**
 * Painel do fornecedor quando a equipe pediu ajustes (status "rejected").
 * Itens ligados ao mínimo do cadastro são marcados sozinhos quando ele corrige.
 */
export function AjustesPedidosBanner({
  supplierId,
  onIrPara,
  onReenviado,
  chave,
}: {
  supplierId: string;
  onIrPara: (aba: string) => void;
  onReenviado: () => void;
  /** muda quando o fornecedor edita algo (fotos, perfil), para reconferir o que falta */
  chave?: string;
}) {
  const { toast } = useToast();
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [pend, setPend] = useState<Pendencia[] | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data }, p] = await Promise.all([
        (supabase.from("fornecedor_aprovacoes") as any)
          .select("motivo, itens, created_at")
          .eq("supplier_id", supplierId)
          .eq("acao", "rejected")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        buscarPendencias(supplierId),
      ]);
      setPedido(data || null);
      setPend(p);
    })();
  }, [supplierId, chave]);

  const itens = pedido?.itens || [];
  const feito = (codigo: string) => {
    const a = AJUSTES.find((x) => x.codigo === codigo);
    return !!a?.pendencia && !!pend && !pend.includes(a.pendencia);
  };
  const faltaMinimo = (pend || []).length > 0;
  const restantes = itens.filter((c) => !feito(c)).length;

  const reenviar = async () => {
    setEnviando(true);
    const { error } = await supabase.from("suppliers").update({ status: "pending" }).eq("id", supplierId);
    if (error) {
      setEnviando(false);
      toast({ title: "Ainda não dá para reenviar", description: mensagemCadastroIncompleto(error) || traduzirErro(error), variant: "destructive" });
      return;
    }
    await supabase.from("fornecedor_aprovacoes").insert({ supplier_id: supplierId, acao: "resubmitted" });
    setEnviando(false);
    toast({ title: "Reenviado para análise", description: "Avisamos você em até 24 h." });
    onReenviado();
  };

  return (
    <div className="mb-6 rounded-2xl border border-amber-300/70 bg-amber-50/60 p-4 text-sm">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">Ajustes pedidos</span>
        {pedido && <span className="text-xs text-muted-foreground">{new Date(pedido.created_at).toLocaleDateString("pt-BR")} · equipe Casamenteiro</span>}
      </div>
      <p className="mb-2 text-[15px] font-semibold">
        {itens.length
          ? restantes > 0
            ? `Faltam ${restantes} ${restantes === 1 ? "ajuste" : "ajustes"} para seu perfil ir ao ar`
            : "Pronto! Confira e reenvie para análise"
          : "Seu perfil precisa de ajustes antes de ir ao ar"}
      </p>
      {itens.length > 0 && (
        <ul className="mb-3 divide-y divide-amber-200/70 rounded-xl border border-amber-200/70 bg-white">
          {itens.map((c) => {
            const ok = feito(c);
            const aba = AJUSTES.find((a) => a.codigo === c)?.aba;
            return (
              <li key={c} className="flex items-center gap-3 px-3 py-2.5">
                <span
                  className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-bold ${
                    ok ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {ok ? <Check className="h-3 w-3" /> : "!"}
                </span>
                <span className={`flex-1 ${ok ? "text-muted-foreground line-through" : ""}`}>{labelAjuste(c)}</span>
                {!ok && aba && (
                  <button type="button" onClick={() => onIrPara(aba)} className="text-xs font-semibold text-primary hover:underline">
                    Resolver
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {pedido?.motivo && (
        <p className="mb-3 rounded-xl border border-border bg-white px-3 py-2.5 text-muted-foreground">“{pedido.motivo}”</p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <p className="flex-1 text-xs text-muted-foreground">
          {faltaMinimo
            ? "O reenvio libera quando foto de perfil, 4 fotos do trabalho, contato, descrição e perguntas obrigatórias estiverem completos."
            : "Quando terminar os ajustes, reenvie. Respondemos em até 24 h."}
        </p>
        <Button size="sm" onClick={reenviar} disabled={enviando || faltaMinimo}>
          {enviando ? "Reenviando..." : "Reenviar para análise"}
        </Button>
      </div>
    </div>
  );
}

/** Painel do fornecedor quando o cadastro foi recusado definitivamente. */
export function CadastroRecusadoBanner({ supplierId }: { supplierId: string }) {
  const [motivo, setMotivo] = useState<string | null>(null);
  useEffect(() => {
    (supabase.from("fornecedor_aprovacoes") as any)
      .select("motivo")
      .eq("supplier_id", supplierId)
      .eq("acao", "blocked")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }: any) => setMotivo(data?.motivo || null));
  }, [supplierId]);
  return (
    <div className="mb-6 rounded-2xl border border-red-200 bg-red-50/60 p-4 text-sm">
      <span className="mb-2 inline-block rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-800">Cadastro recusado</span>
      <p className="mb-1 text-[15px] font-semibold">Não foi possível aprovar seu cadastro</p>
      {motivo && <p className="mb-1">Motivo: {motivo}</p>}
      <p className="text-muted-foreground">Se achar que foi um engano, fale com a gente pelo suporte.</p>
    </div>
  );
}
