export type CoupleSupplierTag =
  | "contratado"
  | "negociando"
  | "em_orcamento"
  | "no_plano"
  | "favorito"
  | "descartado";

export const TAG_LABEL: Record<CoupleSupplierTag, string> = {
  contratado: "Contratado",
  negociando: "Negociando",
  em_orcamento: "Em orçamento",
  no_plano: "No plano",
  favorito: "Favorito",
  descartado: "Descartado",
};

export const TAG_CLASS: Record<CoupleSupplierTag, string> = {
  contratado:
    "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300",
  negociando:
    "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300",
  em_orcamento:
    "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300",
  no_plano: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/60 dark:text-slate-300",
  favorito:
    "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300",
  descartado:
    "bg-muted text-muted-foreground border-border",
};

export const KANBAN_TO_TAG: Record<string, CoupleSupplierTag> = {
  contratado: "contratado",
  negociando: "negociando",
  em_orcamento: "em_orcamento",
  nao_iniciado: "no_plano",
  fora_da_plataforma: "no_plano",
  descartado: "descartado",
};

export function tagsForSupplier(opts: {
  kanbanStatus?: string | null;
  hasQuote?: boolean;
  isFavorite?: boolean;
}): CoupleSupplierTag[] {
  const tags: CoupleSupplierTag[] = [];
  const primary = opts.kanbanStatus ? KANBAN_TO_TAG[opts.kanbanStatus] : null;
  if (primary && primary !== "no_plano") {
    tags.push(primary);
  } else if (opts.kanbanStatus === "nao_iniciado" && opts.hasQuote) {
    tags.push("em_orcamento");
  } else if (primary === "no_plano") {
    tags.push("no_plano");
  } else if (opts.hasQuote) {
    tags.push("em_orcamento");
  }
  if (opts.isFavorite) tags.push("favorito");
  return tags;
}