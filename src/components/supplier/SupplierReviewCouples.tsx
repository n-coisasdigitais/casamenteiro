import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Star, Heart } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

export default function SupplierReviewCouples({ supplierId }: { supplierId: string }) {
  const { user } = useAuth();
  const [casais, setCasais] = useState<any[]>([]);
  const [enviadas, setEnviadas] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [casalAtual, setCasalAtual] = useState<any>(null);
  const [rating, setRating] = useState(5);
  const [texto, setTexto] = useState("");
  const [publico, setPublico] = useState(true);

  const carregar = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase
      .from("couple_suppliers")
      .select("couple_id,couples(id,partner_name,wedding_date,wedding_city,profiles(full_name)),couple_public_profiles:couple_id(slug,nome_casal,foto_perfil_url)")
      .eq("supplier_id", supplierId)
      .eq("kanban_status", "contratado");
    const past = (data || []).filter((x: any) => x.couples?.wedding_date && x.couples.wedding_date < today);
    const { data: jaAvaliadas } = await supabase
      .from("reviews").select("alvo_couple_id").eq("supplier_id", supplierId).eq("autor_tipo", "supplier");
    const set = new Set((jaAvaliadas || []).map((r: any) => r.alvo_couple_id));
    setCasais(past.filter((x: any) => !set.has(x.couple_id)));
    const { data: minhas } = await supabase
      .from("reviews").select("*,couple_public_profiles:alvo_couple_id(slug,nome_casal)")
      .eq("supplier_id", supplierId).eq("autor_tipo", "supplier")
      .order("created_at", { ascending: false });
    setEnviadas(minhas || []);
  };

  useEffect(() => { carregar(); }, [supplierId]);

  const abrir = (item: any) => {
    setCasalAtual(item); setRating(5); setTexto(""); setPublico(true); setModalOpen(true);
  };

  const enviar = async () => {
    if (!casalAtual || !user) return;
    if (texto.trim().length < 30) { toast.error("Escreva pelo menos 30 caracteres"); return; }
    const { error } = await supabase.from("reviews").insert({
      supplier_id: supplierId, alvo_couple_id: casalAtual.couple_id, user_id: user.id,
      rating, comment: texto.trim(),
      autor_tipo: "supplier", alvo_tipo: "couple", publico, aprovado: true,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Avaliação enviada!");
    setModalOpen(false);
    await carregar();
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="font-medium mb-3">Avalie casais que você atendeu</h3>
        {casais.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum casal pendente de avaliação no momento.</p>
        ) : (
          <div className="space-y-2">
            {casais.map((c: any) => (
              <div key={c.couple_id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Heart className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{c.couple_public_profiles?.nome_casal || `${c.couples?.profiles?.full_name || ""} & ${c.couples?.partner_name || ""}`.trim() || "Casal"}</p>
                    <p className="text-xs text-muted-foreground">{c.couples?.wedding_city} · {c.couples?.wedding_date}</p>
                  </div>
                </div>
                <Button size="sm" onClick={() => abrir(c)}>Avaliar</Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h3 className="font-medium mb-3">Avaliações que você enviou</h3>
        {enviadas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma avaliação enviada ainda.</p>
        ) : (
          <div className="space-y-2">
            {enviadas.map((a: any) => (
              <div key={a.id} className="p-3 border border-border rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  {a.couple_public_profiles?.slug ? (
                    <Link to={`/casais/${a.couple_public_profiles.slug}`} className="font-medium text-primary hover:underline">
                      {a.couple_public_profiles.nome_casal}
                    </Link>
                  ) : (
                    <span className="font-medium">Casal</span>
                  )}
                  <div className="flex">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-3 w-3 ${i < a.rating ? "fill-primary text-primary" : "text-muted"}`} />
                    ))}
                  </div>
                </div>
                {a.comment && <p className="text-sm">{a.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Avaliar casal</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nota</Label>
              <div className="flex gap-1 mt-1">
                {[1,2,3,4,5].map((n) => (
                  <button key={n} onClick={() => setRating(n)} className="p-1">
                    <Star className={`h-7 w-7 ${n <= rating ? "fill-primary text-primary" : "text-muted"}`} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Como foi a experiência com o casal? (mín. 30 caracteres)</Label>
              <Textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={5} />
              <p className="text-xs text-muted-foreground mt-1">{texto.length}/30</p>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="rev-pub">Tornar pública</Label>
              <Switch id="rev-pub" checked={publico} onCheckedChange={setPublico} />
            </div>
            <Button onClick={enviar} className="w-full">Enviar avaliação</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}