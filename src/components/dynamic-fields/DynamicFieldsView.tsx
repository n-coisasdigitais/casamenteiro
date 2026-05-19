import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Check, X as XIcon } from "lucide-react";

type Props = {
  supplierId: string;
  categoryId: string | null;
};

type Item = {
  id: string;
  chave: string;
  label: string;
  tipo: string;
  ordem: number;
  valor: any;
};

/**
 * Renderiza os campos dinâmicos preenchidos pelo fornecedor (apenas onde
 * mostrar_no_perfil = true). Pronto para o perfil público.
 */
export default function DynamicFieldsView({ supplierId, categoryId }: Props) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!categoryId) {
        setItems([]);
        setLoading(false);
        return;
      }
      const { data: cps } = await (supabase.from("campos_categoria") as any)
        .select("id, chave, label, tipo, ordem, mostrar_no_perfil, ativo")
        .eq("category_id", categoryId)
        .eq("ativo", true)
        .eq("mostrar_no_perfil", true)
        .order("ordem");
      const { data: resps } = await (supabase.from("fornecedor_campos") as any)
        .select("campo_id, valor")
        .eq("supplier_id", supplierId);
      if (!alive) return;
      const respMap = new Map<string, any>(
        (resps || []).map((r: any) => [r.campo_id, r.valor])
      );
      const merged = (cps || [])
        .map((c: any) => ({ ...c, valor: respMap.get(c.id) }))
        .filter((it: any) => !isEmpty(it.valor))
        // descrição já é renderizada no perfil; evita duplicação
        .filter((it: any) => it.chave !== "descricao");
      setItems(merged);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [supplierId, categoryId]);

  if (loading || items.length === 0) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {items.map((it) => (
        <div key={it.id} className="text-sm">
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
            {it.label}
          </p>
          <div>{renderValor(it)}</div>
        </div>
      ))}
    </div>
  );
}

function isEmpty(v: any) {
  return (
    v === null ||
    v === undefined ||
    v === "" ||
    (Array.isArray(v) && v.length === 0) ||
    (typeof v === "object" && !Array.isArray(v) && Object.keys(v).length === 0)
  );
}

function renderValor(it: Item) {
  const v = it.valor;
  switch (it.tipo) {
    case "booleano":
    case "checkbox":
      return v ? (
        <span className="inline-flex items-center gap-1 text-emerald-700">
          <Check className="h-4 w-4" /> Sim
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <XIcon className="h-4 w-4" /> Não
        </span>
      );
    case "lista":
      return (
        <div className="flex flex-wrap gap-1">
          {(v as string[]).map((s, i) => (
            <Badge key={i} variant="secondary" className="text-xs">
              {s}
            </Badge>
          ))}
        </div>
      );
    case "faixa":
      return (
        <span>
          {v?.min ?? "?"} – {v?.max ?? "?"}
        </span>
      );
    case "numero":
      return <span>{Number(v).toLocaleString("pt-BR")}</span>;
    case "textarea":
      return (
        <span className="whitespace-pre-line text-muted-foreground">{v}</span>
      );
    default:
      return <span>{String(v)}</span>;
  }
}