import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tag, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFeatureFlag } from "@/contexts/FeatureFlagsContext";
import { calcularOferta } from "@/lib/corretagem";
import { formatBRL } from "@/lib/platformPricing";
import { antecedenciaDoFornecedor } from "@/lib/reservasConfig";
import { traduzirErro } from "@/lib/errorMessages";

type PromoDate = {
  id: string;
  promo_date: string;
  discount_pct: number;
  note: string | null;
  piso_fornecedor?: number | null;
  markup_pct?: number | null;
  valor_ofertado?: number | null;
};

export default function PromoDatesManager({ supplierId, categoriaSlug }: { supplierId: string; categoriaSlug?: string | null }) {
  const { toast } = useToast();
  const corretagemOn = useFeatureFlag("corretagem_datas_ociosas", false);
  const [dates, setDates] = useState<PromoDate[]>([]);
  const [date, setDate] = useState("");
  const [pct, setPct] = useState(15);
  const [note, setNote] = useState("");
  const [piso, setPiso] = useState<string>("");
  const [markup, setMarkup] = useState<string>("");
  const [previewOferta, setPreviewOferta] = useState<{ valor: number; comissao: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [antecedencia, setAntecedencia] = useState<number>(15);
  const [salvandoAntecedencia, setSalvandoAntecedencia] = useState(false);

  const load = async () => {
    const { data } = await (supabase
      .from("supplier_promo_dates" as any)
      .select("id, promo_date, discount_pct, note, piso_fornecedor, markup_pct, valor_ofertado")
      .eq("supplier_id", supplierId)
      .order("promo_date") as any);
    setDates((data || []) as PromoDate[]);
  };

  useEffect(() => {
    load();
    antecedenciaDoFornecedor(supplierId).then(setAntecedencia);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplierId]);

  useEffect(() => {
    if (!corretagemOn) { setPreviewOferta(null); return; }
    const p = Number(piso);
    if (!p || p <= 0) { setPreviewOferta(null); return; }
    const m = markup ? Number(markup) : null;
    calcularOferta({ piso: p, markupPct: m, categoriaSlug }).then(o => {
      setPreviewOferta({ valor: o.valorOfertado, comissao: o.comissao });
    });
  }, [piso, markup, categoriaSlug, corretagemOn]);

  const add = async () => {
    if (!date || pct <= 0 || pct > 90) {
      toast({ title: "Dados inválidos", description: "Informe data e desconto entre 1 e 90%.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const pisoNum = corretagemOn && piso ? Number(piso) : null;
    const markupNum = corretagemOn && markup ? Number(markup) : null;
    const valorOfertado = pisoNum ? (previewOferta?.valor ?? null) : null;
    const { error } = await (supabase.from("supplier_promo_dates" as any) as any).insert({
      supplier_id: supplierId,
      promo_date: date,
      discount_pct: pct,
      note: note || null,
      piso_fornecedor: pisoNum,
      markup_pct: markupNum,
      valor_ofertado: valorOfertado,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Erro", description: traduzirErro(error), variant: "destructive" });
      return;
    }
    setDate("");
    setPct(15);
    setNote("");
    setPiso("");
    setMarkup("");
    setPreviewOferta(null);
    load();
    toast({ title: "Data ociosa adicionada!" });
  };

  const remove = async (id: string) => {
    const { error } = await (supabase.from("supplier_promo_dates" as any) as any).delete().eq("id", id);
    if (error) {
      toast({ title: "Erro", description: traduzirErro(error), variant: "destructive" });
      return;
    }
    load();
  };

  const salvarAntecedencia = async () => {
    const n = Number(antecedencia);
    if (!Number.isFinite(n) || n < 0 || n > 365) {
      toast({ title: "Valor inválido", description: "Informe entre 0 e 365 dias.", variant: "destructive" });
      return;
    }
    setSalvandoAntecedencia(true);
    const { error } = await (supabase.from("suppliers" as any) as any)
      .update({ reserva_antecedencia_min_dias: n }).eq("id", supplierId);
    setSalvandoAntecedencia(false);
    if (error) { toast({ title: "Erro", description: traduzirErro(error), variant: "destructive" }); return; }
    toast({ title: "Antecedência mínima atualizada" });
  };

  const minDataInput = new Date(Date.now() + antecedencia * 86400000).toISOString().slice(0, 10);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="font-serif text-lg flex items-center gap-2">
          <Tag className="w-4 h-4 text-primary" />
          Datas ociosas com desconto
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Marque dias em que você tem agenda livre e topa um desconto. Eles aparecem com destaque pra noivos no simulador.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border p-3 bg-muted/30">
          <Label className="text-xs">Antecedência mínima para reserva (dias)</Label>
          <div className="flex gap-2 items-center mt-1">
            <Input
              type="number" min={0} max={365} className="w-28"
              value={antecedencia}
              onChange={(e) => setAntecedencia(parseInt(e.target.value || "0", 10))}
            />
            <Button size="sm" variant="outline" onClick={salvarAntecedencia} disabled={salvandoAntecedencia}>
              Salvar
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            Casais só conseguem reservar datas com pelo menos esse prazo. Padrão: 15 dias.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <div className="md:col-span-1">
            <Label className="text-xs">Data</Label>
            <Input type="date" value={date} min={minDataInput} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="md:col-span-1">
            <Label className="text-xs">Desconto (%)</Label>
            <Input type="number" min={1} max={90} value={pct} onChange={(e) => setPct(parseInt(e.target.value || "0", 10))} />
          </div>
          <div className="md:col-span-1">
            <Label className="text-xs">Observação (opcional)</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex: domingo" />
          </div>
          <div className="md:col-span-1 flex items-end">
            <Button onClick={add} disabled={saving} className="w-full">
              Adicionar
            </Button>
          </div>
        </div>

        {corretagemOn && (
          <div className="rounded-md border p-3 bg-muted/30 space-y-2">
            <p className="text-xs font-semibold">Corretagem (opcional) — visível só para você</p>
            <p className="text-[11px] text-muted-foreground">
              Piso é o mínimo que você aceita receber. O casal só vê o valor ofertado (piso + markup).
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">Piso (R$)</Label>
                <Input type="number" min={0} value={piso} onChange={(e) => setPiso(e.target.value)} placeholder="Ex: 8000" />
              </div>
              <div>
                <Label className="text-xs">Markup (%) opcional</Label>
                <Input type="number" min={0} value={markup} onChange={(e) => setMarkup(e.target.value)} placeholder="Padrão da plataforma" />
              </div>
              <div className="text-xs flex flex-col justify-end">
                {previewOferta ? (
                  <div className="p-2 rounded bg-background border">
                    Casal verá: <strong>{formatBRL(previewOferta.valor)}</strong><br />
                    Você recebe: <strong>{formatBRL(Number(piso))}</strong> · Plataforma: {formatBRL(previewOferta.comissao)}
                  </div>
                ) : (
                  <span className="text-muted-foreground italic">Informe o piso para calcular a oferta.</span>
                )}
              </div>
            </div>
          </div>
        )}

        {dates.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma data promo cadastrada.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {dates.map((d) => (
              <Badge
                key={d.id}
                variant="outline"
                className="px-3 py-2 text-sm border-primary/40 flex items-center gap-2"
              >
                <span>{new Date(d.promo_date + "T00:00:00").toLocaleDateString("pt-BR")}</span>
                <span className="font-bold text-primary">-{d.discount_pct}%</span>
                {corretagemOn && d.valor_ofertado != null && (
                  <span className="text-emerald-700 text-xs">· Oferta {formatBRL(Number(d.valor_ofertado))}</span>
                )}
                {d.note && <span className="text-muted-foreground text-xs">· {d.note}</span>}
                <button
                  onClick={() => remove(d.id)}
                  className="ml-1 text-muted-foreground hover:text-destructive"
                  aria-label="Remover"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}