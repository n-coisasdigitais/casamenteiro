import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import DynamicFieldInput, { Campo } from "./DynamicFieldInput";

type Props = {
  supplierId: string;
  categoryId: string | null;
};

/**
 * Editor reutilizável dos campos dinâmicos do fornecedor.
 * Carrega campos ativos da categoria + respostas salvas em fornecedor_campos.
 */
export default function DynamicFieldsForm({ supplierId, categoryId }: Props) {
  const { toast } = useToast();
  const [campos, setCampos] = useState<Campo[]>([]);
  const [respostas, setRespostas] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!categoryId) {
        setCampos([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data: cps } = await (supabase.from("campos_categoria") as any)
        .select("*")
        .eq("category_id", categoryId)
        .eq("ativo", true)
        .order("ordem");
      const { data: resps } = await (supabase.from("fornecedor_campos") as any)
        .select("campo_id, valor")
        .eq("supplier_id", supplierId);
      if (!alive) return;
      setCampos((cps || []) as Campo[]);
      const map: Record<string, any> = {};
      (resps || []).forEach((r: any) => {
        map[r.campo_id] = r.valor;
      });
      setRespostas(map);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [supplierId, categoryId]);

  const save = async () => {
    // valida obrigatórios
    for (const c of campos) {
      if (!c.obrigatorio) continue;
      const v = respostas[c.id];
      const vazio =
        v === undefined ||
        v === null ||
        v === "" ||
        (Array.isArray(v) && v.length === 0) ||
        (c.tipo === "faixa" && !v?.min);
      if (vazio) {
        toast({
          title: "Campo obrigatório",
          description: `Preencha "${c.label}".`,
          variant: "destructive",
        });
        return;
      }
    }
    setSaving(true);
    const rows = campos
      .filter(
        (c) => respostas[c.id] !== undefined && respostas[c.id] !== ""
      )
      .map((c) => ({
        supplier_id: supplierId,
        campo_id: c.id,
        valor: respostas[c.id],
      }));
    const { error } = await (supabase.from("fornecedor_campos") as any).upsert(
      rows,
      { onConflict: "supplier_id,campo_id" }
    );
    setSaving(false);
    if (error) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Detalhes atualizados!" });
    }
  };

  if (!categoryId) {
    return (
      <p className="text-sm text-muted-foreground">
        Selecione uma categoria na aba "Meu Perfil" para configurar os detalhes
        específicos.
      </p>
    );
  }
  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (campos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhum campo configurado para esta categoria.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {campos.map((c) => (
        <div key={c.id}>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <Label>
              {c.label}
              {c.obrigatorio && <span className="text-destructive ml-1">*</span>}
            </Label>
            {(c as any).mostrar_no_perfil === false ? (
              <Badge variant="secondary" className="text-[10px] gap-1 px-1.5 py-0">
                <EyeOff className="h-3 w-3" /> Interno
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0">
                <Eye className="h-3 w-3" /> Visível no perfil
              </Badge>
            )}
          </div>
          {c.ajuda && (
            <p className="text-xs text-muted-foreground mb-2">{c.ajuda}</p>
          )}
          <DynamicFieldInput
            campo={c}
            value={respostas[c.id]}
            onChange={(v) => setRespostas((r) => ({ ...r, [c.id]: v }))}
          />
        </div>
      ))}
      <Button onClick={save} disabled={saving} className="w-full">
        {saving ? "Salvando..." : "Salvar detalhes"}
      </Button>
    </div>
  );
}