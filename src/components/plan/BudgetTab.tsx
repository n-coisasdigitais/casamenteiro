import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle } from "lucide-react";
import { PlanSupplier } from "./PlanKanban";
import { buildWhatsAppLink } from "@/lib/phone";

const fmt = (n: number) => `R$ ${n.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;

export default function BudgetTab({
  coupleId, items, planoTotal, onChange, contextoMensagem, quotes,
}: {
  coupleId: string;
  items: PlanSupplier[];
  planoTotal: number;
  onChange: () => void;
  contextoMensagem: { nomeCasal: string; data: string; cidade: string; convidados: number };
  quotes?: any[];
}) {
  const { toast } = useToast();
  const [whatsapps, setWhatsapps] = useState<Record<string, string>>({});
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());

  // Busca WhatsApp dos fornecedores
  useEffect(() => {
    const ids = items.map((i) => i.supplier_id);
    if (ids.length === 0) return;
    supabase.from("suppliers").select("id, whatsapp, phone").in("id", ids).then(({ data }) => {
      const map: Record<string, string> = {};
      (data || []).forEach((s: any) => { map[s.id] = (s.whatsapp || s.phone || ""); });
      setWhatsapps(map);
    });
  }, [items]);

  // Comparativo por categoria
  const porCategoria = useMemo(() => {
    const map = new Map<string, { name: string; plano: number; real: number; status: string }>();
    for (const it of items) {
      const key = it.category_slug || "outros";
      const real = it.kanban_status === "contratado" ? it.valor_contratado : it.valor_cotado;
      const cur = map.get(key) || { name: it.category_name || key, plano: 0, real: 0, status: it.kanban_status };
      cur.plano += it.valor_plano || 0;
      cur.real += real || 0;
      // status mais avançado vence
      const ordem = ["nao_iniciado", "em_orcamento", "negociando", "descartado", "contratado"];
      if (ordem.indexOf(it.kanban_status) > ordem.indexOf(cur.status)) cur.status = it.kanban_status;
      map.set(key, cur);
    }
    return Array.from(map.values());
  }, [items]);

  const projecao = useMemo(() => {
    const contratado = items.filter((i) => i.kanban_status === "contratado")
      .reduce((s, i) => s + (i.valor_contratado || 0), 0);
    const cotado = items.filter((i) => ["em_orcamento", "negociando"].includes(i.kanban_status))
      .reduce((s, i) => s + (i.valor_cotado || i.valor_plano || 0), 0);
    const naoIniciado = items.filter((i) => i.kanban_status === "nao_iniciado")
      .reduce((s, i) => s + (i.valor_plano || 0), 0);
    return { contratado, cotado, naoIniciado, total: contratado + cotado + naoIniciado };
  }, [items]);

  const elegiveis = items.filter((i) => ["nao_iniciado", "em_orcamento"].includes(i.kanban_status));
  const allSelected = elegiveis.length > 0 && elegiveis.every((i) => selecionados.has(i.id));

  const toggle = (id: string) => {
    setSelecionados((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const selecionarTodos = () => {
    if (allSelected) setSelecionados(new Set());
    else setSelecionados(new Set(elegiveis.map((i) => i.id)));
  };

  const mensagemPara = (item: PlanSupplier) => {
    const c = contextoMensagem;
    return `Olá! Somos ${c.nomeCasal || "um casal"}. Estamos planejando nosso casamento para ${c.data || "em breve"} em ${c.cidade || "nossa cidade"}, com ${c.convidados || "alguns"} convidados. Nosso orçamento disponível para ${item.category_name || "este serviço"} é de ${fmt(item.valor_plano)}. Poderia nos enviar uma proposta?`;
  };

  const enviarSelecionados = async () => {
    const escolhidos = elegiveis.filter((i) => selecionados.has(i.id));
    if (escolhidos.length === 0) {
      toast({ title: "Selecione ao menos um fornecedor", variant: "destructive" });
      return;
    }
    let abertos = 0;
    for (const item of escolhidos) {
      const wpp = whatsapps[item.supplier_id];
      const link = buildWhatsAppLink(wpp || "", mensagemPara(item));
      if (!link) continue;
      window.open(link, "_blank");
      abertos++;
      await new Promise((r) => setTimeout(r, 350));
    }
    // marca como em_orcamento
    const ids = escolhidos.map((i) => i.id);
    await (supabase.from("couple_suppliers") as any)
      .update({ kanban_status: "em_orcamento" }).in("id", ids).eq("kanban_status", "nao_iniciado");
    toast({ title: `${abertos} conversas abertas`, description: "Status atualizado para 'em orçamento'." });
    setSelecionados(new Set());
    onChange();
  };

  return (
    <div className="space-y-6">
      {/* Orçamentos solicitados (status inicial) */}
      {quotes && quotes.length > 0 && (
        <Card className="p-5">
          <h3 className="font-semibold mb-3">Orçamentos solicitados</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Pedidos enviados aos fornecedores. Quando uma proposta for aceita, o item entra no plano automaticamente.
          </p>
          <div className="space-y-1.5">
            {quotes.map((q: any) => {
              const noPlano = items.some((i) => i.supplier_id === q.supplier_id);
              return (
                <div key={q.id} className="flex items-center gap-3 py-2 border-b border-border/60 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{q.suppliers?.company_name || "Fornecedor"}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {q.suppliers?.categories?.name || "—"} · {new Date(q.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <Badge variant={noPlano ? "default" : "secondary"} className="text-[10px]">
                    {noPlano ? "no plano" : "em orçamento"}
                  </Badge>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="font-semibold mb-4">Plano vs realidade por categoria</h3>
          {porCategoria.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma categoria no plano ainda.</p>
          ) : (
            <div className="space-y-3">
              {porCategoria.map((c) => {
                const dot =
                  c.status === "contratado" ? "bg-emerald-500" :
                  c.status === "negociando" ? "bg-blue-500" :
                  c.status === "em_orcamento" ? "bg-amber-500" :
                  c.status === "descartado" ? "bg-rose-500" : "bg-muted-foreground/40";
                const dif = c.real - c.plano;
                return (
                  <div key={c.name} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
                      <span className="text-sm truncate capitalize">{c.name}</span>
                    </div>
                    <div className="text-right text-sm">
                      {c.real > 0 ? (
                        <>
                          <span className="font-medium">{fmt(c.real)}</span>
                          {dif !== 0 && (
                            <span className={`ml-2 text-xs ${dif > 0 ? "text-destructive" : "text-emerald-600"}`}>
                              {dif > 0 ? "+" : ""}{fmt(dif)}
                            </span>
                          )}
                        </>
                      ) : <span className="text-muted-foreground">—</span>}
                      <p className="text-[11px] text-muted-foreground">plano: {fmt(c.plano)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold mb-4">Projeção total</h3>
          <div className="space-y-2 text-sm">
            <Row label="Plano original" value={fmt(planoTotal)} />
            <Row label="Contratado" value={fmt(projecao.contratado)} className="text-emerald-600" />
            <Row label="Cotado / negociando" value={fmt(projecao.cotado)} className="text-amber-600" />
            <Row label="Não iniciado" value={fmt(projecao.naoIniciado)} className="text-muted-foreground" />
            <div className="border-t border-border pt-2 mt-2">
              <Row
                label={<span className="font-semibold">Projeção total</span>}
                value={
                  <span className={projecao.total > planoTotal && planoTotal > 0 ? "text-destructive font-bold" : "text-emerald-600 font-bold"}>
                    {fmt(projecao.total)}
                    {planoTotal > 0 && (
                      <span className="ml-2 text-xs font-normal">
                        ({projecao.total > planoTotal ? "+" : ""}{fmt(projecao.total - planoTotal)})
                      </span>
                    )}
                  </span>
                }
              />
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h3 className="font-semibold">Enviar orçamento para fornecedores</h3>
            <p className="text-sm text-muted-foreground">Geramos a mensagem com seus dados; você só revisa no WhatsApp.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={selecionarTodos}>
              {allSelected ? "Limpar seleção" : "Selecionar todos"}
            </Button>
            <Button size="sm" onClick={enviarSelecionados} disabled={selecionados.size === 0}>
              Enviar para {selecionados.size}
            </Button>
          </div>
        </div>

        {elegiveis.length > 0 && (
          <div className="rounded-md bg-muted/40 p-3 mb-3">
            <Label className="text-xs">Preview da mensagem</Label>
            <Textarea
              readOnly
              rows={4}
              className="mt-1 text-xs bg-background"
              value={mensagemPara(elegiveis[0])}
            />
          </div>
        )}

        {elegiveis.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todos os fornecedores já estão em negociação ou contratados.</p>
        ) : (
          <div className="space-y-1.5">
            {elegiveis.map((item) => {
              const wpp = whatsapps[item.supplier_id];
              return (
                <div key={item.id} className="flex items-center gap-3 py-2 border-b border-border/60 last:border-0">
                  <Checkbox
                    checked={selecionados.has(item.id)}
                    onCheckedChange={() => toggle(item.id)}
                    disabled={!wpp}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.company_name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{item.category_name || item.category_slug}</p>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    {item.kanban_status === "em_orcamento" ? "em orçamento" : "não iniciado"}
                  </Badge>
                  {buildWhatsAppLink(wpp || "", mensagemPara(item)) ? (
                    <Button asChild size="sm" variant="outline">
                      <a
                        href={buildWhatsAppLink(wpp || "", mensagemPara(item))!}
                        target="_blank" rel="noreferrer"
                      >
                        <MessageCircle className="h-3.5 w-3.5 mr-1" /> WhatsApp
                      </a>
                    </Button>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">WhatsApp inválido</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

function Row({ label, value, className }: { label: React.ReactNode; value: React.ReactNode; className?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={className}>{value}</span>
    </div>
  );
}