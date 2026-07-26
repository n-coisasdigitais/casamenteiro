import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sparkles, CalendarClock } from "lucide-react";
import { useFeatureFlag } from "@/contexts/FeatureFlagsContext";
import RequestReservationDialog from "./RequestReservationDialog";
import { formatarData } from "@/lib/reservas";
import { formatBRL } from "@/lib/platformPricing";

type PromoRow = {
  id: string;
  date: string;
  discount_pct: number | null;
  estimated_value?: number | null;
  piso_fornecedor?: number | null;
  markup_pct?: number | null;
  valor_ofertado?: number | null;
};

export default function PromoDatesInline({ supplierId, supplierName, priceMin }: {
  supplierId: string; supplierName: string; priceMin?: number | null;
}) {
  const enabled = useFeatureFlag("reserva_datas_ociosas", false);
  const idleFlag = useFeatureFlag("datas_ociosas", true);
  const corretagemOn = useFeatureFlag("corretagem_datas_ociosas", false);
  const [rows, setRows] = useState<PromoRow[]>([]);
  const [selected, setSelected] = useState<PromoRow | null>(null);

  useEffect(() => {
    if (!supplierId || !idleFlag) return;
    (async () => {
      const { data } = await (supabase.from("supplier_promo_dates" as any)
        .select("id, promo_date, discount_pct, piso_fornecedor, markup_pct, valor_ofertado")
        .eq("supplier_id", supplierId)
        .gte("promo_date", new Date().toISOString().slice(0, 10))
        .order("promo_date", { ascending: true })
        .limit(6) as any);
      const mapped = (data as any[] | null)?.map((r) => ({ ...r, date: r.promo_date })) ?? [];
      setRows(mapped as PromoRow[]);
    })();
  }, [supplierId, idleFlag]);

  if (!idleFlag || rows.length === 0) return null;

  const calcularValorComDesconto = (p: PromoRow) => {
    if (!priceMin || !p.discount_pct) return null;
    return Math.round(priceMin * (1 - p.discount_pct / 100));
  };

  return (
    <div className="border rounded-lg p-4 space-y-3 mb-4">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Sparkles className="h-4 w-4 text-primary" />
        Datas com desconto
      </div>
      <p className="text-xs text-muted-foreground">
        A data só é garantida após a confirmação do fornecedor. Você não paga nada para solicitar.
      </p>
      <div className="space-y-2">
        {rows.map(p => {
          const valor = calcularValorComDesconto(p);
          return (
            <div key={p.id} className="flex items-center justify-between gap-2 text-sm border-t pt-2">
              <div>
                <div className="font-medium">{formatarData(p.date)}</div>
                <div className="text-xs text-muted-foreground">
                  {p.discount_pct ? `${p.discount_pct}% off` : "Data promocional"}
                  {corretagemOn && p.valor_ofertado != null
                    ? ` · ${formatBRL(Number(p.valor_ofertado))}`
                    : valor ? ` · a partir de ${formatBRL(valor)}` : ""}
                </div>
              </div>
              {(enabled || (corretagemOn && p.valor_ofertado != null)) ? (
                <Button size="sm" variant="outline" onClick={() => setSelected(p)}>
                  <CalendarClock className="h-3 w-3 mr-1" /> Solicitar
                </Button>
              ) : null}
            </div>
          );
        })}
      </div>

      {selected && (
        <RequestReservationDialog
          open={!!selected}
          onOpenChange={(o) => !o && setSelected(null)}
          supplierId={supplierId}
          supplierName={supplierName}
          promoDate={selected.date}
          discountPct={selected.discount_pct}
          estimatedValue={calcularValorComDesconto(selected)}
          pisoFornecedor={selected.piso_fornecedor ?? null}
          markupPct={selected.markup_pct ?? null}
          valorOfertado={selected.valor_ofertado ?? null}
        />
      )}
    </div>
  );
}