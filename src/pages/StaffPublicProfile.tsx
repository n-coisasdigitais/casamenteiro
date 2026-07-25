import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin } from "lucide-react";
import SEO from "@/components/SEO";

export default function StaffPublicProfile() {
  const { slug } = useParams();
  const [staff, setStaff] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data } = await (supabase.from("staff_profiles" as any) as any)
        .select("id, nome, foto_url, funcoes, cidade, estado, bio, rating, review_count, eventos_concluidos, is_public")
        .eq("slug", slug).eq("is_public", true).maybeSingle();
      setStaff(data);
      if (data?.id) {
        const { data: rv } = await (supabase.from("staff_reviews" as any) as any)
          .select("*").eq("avaliado_id", data.id).eq("autor_tipo", "fornecedor")
          .order("created_at", { ascending: false }).limit(20);
        setReviews(rv || []);
      }
    })();
  }, [slug]);

  if (!staff) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Perfil não encontrado.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-10">
      <SEO title={`${staff.nome} — Profissional de eventos`} description={staff.bio?.slice(0, 150) || ""} />
      <div className="container mx-auto max-w-3xl px-4 space-y-4">
        <Card>
          <CardContent className="p-6 flex gap-4 items-start flex-wrap">
            {staff.foto_url && <img src={staff.foto_url} alt={staff.nome} className="h-24 w-24 rounded-full object-cover" />}
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{staff.nome}</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" /> {staff.cidade}{staff.estado ? ` - ${staff.estado}` : ""}
              </div>
              {staff.rating && (
                <div className="flex items-center gap-1 mt-1 text-sm">
                  <Star className="h-4 w-4 fill-primary text-primary" />
                  {staff.rating} • {staff.review_count} avaliações • {staff.eventos_concluidos} eventos
                </div>
              )}
              <div className="flex flex-wrap gap-1 mt-3">
                {(staff.funcoes || []).map((f: string) => <Badge key={f} variant="secondary">{f}</Badge>)}
              </div>
            </div>
          </CardContent>
        </Card>

        {staff.bio && (
          <Card><CardContent className="p-6"><p className="text-sm whitespace-pre-line">{staff.bio}</p></CardContent></Card>
        )}

        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold mb-3">Avaliações</h2>
            {reviews.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ainda sem avaliações.</p>
            ) : (
              <ul className="space-y-3">
                {reviews.map((r) => (
                  <li key={r.id} className="border-b last:border-b-0 pb-3 last:pb-0">
                    <div className="flex items-center gap-1 mb-1">
                      {Array.from({ length: r.estrelas }).map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                      ))}
                    </div>
                    {r.comentario && <p className="text-sm">{r.comentario}</p>}
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(r.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}