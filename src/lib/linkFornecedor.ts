/** Endereço público do fornecedor: usa o nome (slug) quando disponível, senão o código. */
export function linkFornecedor(f: { slug?: string | null; id?: string | null; supplier_id?: string | null } | null | undefined): string {
  if (!f) return "/buscar";
  const ident = f.slug || f.id || f.supplier_id;
  return ident ? `/fornecedor/${ident}` : "/buscar";
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const ehUuid = (v: string) => UUID_RE.test(v);
