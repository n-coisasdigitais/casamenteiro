import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star } from "lucide-react";

type Review = {
  id: string;
  estrelas: number;
  comentario: string | null;
  created_at: string;
  autor_tipo: string;
};

/** Avaliações que os profissionais (freelas) deixaram para este fornecedor. */
export default function StaffReviewsReceived({ supplierId }: { supplierId: string }) {
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase.from("staff_reviews" as any) as any)
        .select("id, estrelas, comentario, created_at, autor_tipo")
        .eq("avaliado_id", supplierId)
        .order("created_at", { ascending: false });
      setReviews((data || []) as Review[]);
    })();
  }, [supplierId]);

  const media = reviews.length
    ? reviews.reduce((s, r) => s + (r.estrelas || 0), 0) / reviews.length
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          Avaliações de profissionais
          {reviews.length > 0 && (
            <span className="text-sm font-normal text-muted-foreground">
              {media.toFixed(1)} ★ · {reviews.length} avaliação{reviews.length > 1 ? "ões" : ""}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {reviews.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Você ainda não recebeu avaliações de profissionais contratados em vagas.
          </p>
        ) : (
          reviews.map((r) => (
            <div key={r.id} className="border-b border-border pb-3 last:border-0 last:pb-0">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    className={`h-3.5 w-3.5 ${n <= r.estrelas ? "fill-primary text-primary" : "text-muted-foreground"}`}
                  />
                ))}
                <span className="ml-2 text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString("pt-BR")}
                </span>
              </div>
              {r.comentario && <p className="text-sm mt-1">{r.comentario}</p>}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}