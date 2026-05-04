import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tag, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type PromoDate = {
  id: string;
  promo_date: string;
  discount_pct: number;
  note: string | null;
};

export default function PromoDatesManager({ supplierId }: { supplierId: string }) {
  const { toast } = useToast();
  const [dates, setDates] = useState<PromoDate[]>([]);
  const [date, setDate] = useState("");
  const [pct, setPct] = useState(15);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await (supabase
      .from("supplier_promo_dates" as any)
      .select("id, promo_date, discount_pct, note")
      .eq("supplier_id", supplierId)
      .order("promo_date") as any);
    setDates((data || []) as PromoDate[]);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplierId]);

  const add = async () => {
    if (!date || pct <= 0 || pct > 90) {
      toast({ title: "Dados inválidos", description: "Informe data e desconto entre 1 e 90%.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await (supabase.from("supplier_promo_dates" as any) as any).insert({
      supplier_id: supplierId,
      promo_date: date,
      discount_pct: pct,
      note: note || null,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    setDate("");
    setPct(15);
    setNote("");
    load();
    toast({ title: "Data ociosa adicionada!" });
  };

  const remove = async (id: string) => {
    const { error } = await (supabase.from("supplier_promo_dates" as any) as any).delete().eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    load();
  };

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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <div className="md:col-span-1">
            <Label className="text-xs">Data</Label>
            <Input type="date" value={date} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} />
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