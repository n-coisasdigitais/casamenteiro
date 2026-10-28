import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Music } from "lucide-react";

/** Pede ao fornecedor que marque seus tipos de atração (subcategorias) quando ainda não marcou. */
export function AvisoTipoAtracao({ supplierId, categoryId, onIr }: { supplierId: string; categoryId?: string | null; onIr: () => void }) {
  const [mostrar, setMostrar] = useState(false);
  useEffect(() => {
    if (!categoryId) return;
    let vivo = true;
    (async () => {
      const { data: campo } = await (supabase.from("campos_categoria") as any)
        .select("id").eq("category_id", categoryId).eq("chave", "tipo_atracao").eq("ativo", true).maybeSingle();
      if (!campo) return;
      const { data: resp } = await (supabase.from("fornecedor_campos") as any)
        .select("valor").eq("supplier_id", supplierId).eq("campo_id", campo.id).maybeSingle();
      if (vivo) setMostrar(!(Array.isArray(resp?.valor) && resp.valor.length > 0));
    })();
    return () => { vivo = false; };
  }, [supplierId, categoryId]);
  if (!mostrar) return null;
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 sm:flex-row sm:items-center">
      <Music className="h-5 w-5 flex-none text-primary" />
      <div className="flex-1 text-sm">
        <p className="font-semibold text-foreground">Marque que tipo de atração você oferece</p>
        <p className="text-muted-foreground">Banda, DJ, voz e violão, cordas… Os casais filtram por isso na busca.</p>
      </div>
      <Button size="sm" className="rounded-full" onClick={onIr}>Marcar agora</Button>
    </div>
  );
}
