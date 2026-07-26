import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Star } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  applicationId: string;
  supplierId: string;
  staffId: string;
  supplierName?: string;
  onSaved?: () => void;
}

export default function ReviewSupplierDialog({ open, onOpenChange, applicationId, supplierId, staffId, supplierName, onSaved }: Props) {
  const { toast } = useToast();
  const [estrelas, setEstrelas] = useState(5);
  const [comentario, setComentario] = useState("");
  const [loading, setLoading] = useState(false);

  const salvar = async () => {
    setLoading(true);
    const { error } = await (supabase.from("staff_reviews" as any) as any).insert({
      application_id: applicationId,
      avaliado_id: supplierId,
      avaliador_id: staffId,
      autor_tipo: "profissional",
      estrelas,
      comentario: comentario || null,
    });
    setLoading(false);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Avaliação enviada. Obrigado!" });
    onOpenChange(false);
    setComentario(""); setEstrelas(5);
    onSaved?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Avaliar {supplierName || "fornecedor"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="flex justify-center gap-1">
            {[1,2,3,4,5].map((n) => (
              <button key={n} type="button" onClick={() => setEstrelas(n)} aria-label={`${n} estrelas`}>
                <Star className={`h-8 w-8 ${n <= estrelas ? "fill-primary text-primary" : "text-muted-foreground"}`} />
              </button>
            ))}
          </div>
          <Textarea rows={4} placeholder="Como foi trabalhar com este fornecedor? (opcional)" value={comentario} onChange={(e) => setComentario(e.target.value)} />
          <Button className="w-full" onClick={salvar} disabled={loading}>{loading ? "Enviando..." : "Enviar avaliação"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}