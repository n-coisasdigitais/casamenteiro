import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useFeatureFlag } from "@/contexts/FeatureFlagsContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Star } from "lucide-react";
import { toast } from "sonner";

type Review = {
  id: string;
  autor_nome: string | null;
  rating: number;
  comentario: string | null;
  created_at: string;
};

export default function PlatformReviews() {
  const enabled = useFeatureFlag("avaliacoes_plataforma", false);
  const { user, profile } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comentario, setComentario] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    (async () => {
      const { data } = await (supabase.from("platform_reviews" as any)
        .select("id, autor_nome, rating, comentario, created_at")
        .eq("aprovado", true)
        .order("destaque", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(6) as any);
      setReviews((data as Review[]) ?? []);
    })();
  }, [enabled]);

  if (!enabled) return null;

  const podeAvaliar = !!user && profile?.account_type === "couple";

  const enviar = async () => {
    if (!user) return;
    setSalvando(true);
    const { data: couple } = await supabase
      .from("couples").select("id").eq("user_id", user.id).maybeSingle();
    const { error } = await (supabase.from("platform_reviews" as any).insert({
      user_id: user.id,
      couple_id: couple?.id ?? null,
      autor_nome: profile?.full_name ?? null,
      rating,
      comentario: comentario.trim() || null,
    }) as any);
    setSalvando(false);
    if (error) { toast.error("Não foi possível enviar sua avaliação"); return; }
    toast.success("Obrigado! Sua avaliação será publicada após revisão.");
    setComentario("");
    setOpen(false);
  };

  if (reviews.length === 0 && !podeAvaliar) return null;

  const media = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <section className="py-16" style={{ background: "hsl(var(--color-bg))" }}>
      <div className="container px-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="font-serif text-3xl">O que os casais dizem</h2>
            {media && (
              <p className="text-sm text-muted-foreground mt-1">
                Nota média {media} · {reviews.length} avaliações
              </p>
            )}
          </div>
          {podeAvaliar && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">Avaliar o Casamenteiro</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Como foi sua experiência?</DialogTitle></DialogHeader>
                <div className="flex gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <button key={i} type="button" onClick={() => setRating(i + 1)} aria-label={`${i + 1} estrelas`}>
                      <Star className={`h-7 w-7 ${i < rating ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                    </button>
                  ))}
                </div>
                <Textarea
                  placeholder="Conte o que mais te ajudou no planejamento…"
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  maxLength={600}
                  rows={4}
                />
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                  <Button onClick={enviar} disabled={salvando}>{salvando ? "Enviando…" : "Enviar avaliação"}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {reviews.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ainda não temos depoimentos publicados.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reviews.map((r) => (
              <Card key={r.id} className="p-5">
                <div className="flex mb-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-4 w-4 ${i < r.rating ? "fill-primary text-primary" : "text-muted"}`} />
                  ))}
                </div>
                {r.comentario && <p className="text-sm text-foreground/80 leading-relaxed">{r.comentario}</p>}
                <p className="text-xs text-muted-foreground mt-3">{r.autor_nome || "Casal Casamenteiro"}</p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
