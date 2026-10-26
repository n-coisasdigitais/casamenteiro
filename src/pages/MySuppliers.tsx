import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Check, ChevronRight } from "lucide-react";
import DashboardHeader from "@/components/DashboardHeader";
import DashboardNav from "@/components/DashboardNav";
import { TAG_LABEL, tagsForSupplier, CoupleSupplierTag } from "@/lib/coupleSupplierStatus";

type Category = { id: string; name: string; slug: string; icon: string | null; active?: boolean | null };
type SupplierLite = {
  id: string;
  company_name: string;
  profile_photo_url: string | null;
  category_id: string | null;
};
type CoupleSupplier = {
  id: string;
  supplier_id: string;
  category_id: string | null;
  status: string;
  kanban_status: string | null;
  supplier?: SupplierLite;
};
type Favorite = { id: string; supplier_id: string; supplier?: SupplierLite; category_id?: string | null };
type QuoteLite = { id: string; supplier_id: string };

export default function MySuppliers() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [coupleSuppliers, setCoupleSuppliers] = useState<CoupleSupplier[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [quotes, setQuotes] = useState<QuoteLite[]>([]);
  const [filter, setFilter] = useState<"all" | "falta" | "saved" | "andamento" | "contracted" | "descartado">("all");
  const [needed, setNeeded] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    supabase.from("couples").select("id, onboarding_completed, needed_services").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (!data || !data.onboarding_completed) { navigate("/onboarding"); return; }
      setNeeded(((data as any).needed_services || []) as string[]);
      loadData(data.id);
    });
  }, [user]);

  const loadData = async (cId: string) => {
    const [catRes, csRes, favRes, qRes] = await Promise.all([
      supabase.from("categories").select("*").order("name"),
      supabase.from("couple_suppliers").select("id, supplier_id, category_id, status, kanban_status").eq("couple_id", cId),
      supabase.from("couple_favorites").select("id, supplier_id").eq("couple_id", cId),
      supabase.from("quotes").select("id, supplier_id").eq("couple_id", cId),
    ]);
    setCategories(catRes.data || []);
    const list = (csRes.data || []) as any[];
    const favList = (favRes.data || []) as Favorite[];
    const ids = Array.from(new Set([
      ...list.map((s: any) => s.supplier_id),
      ...favList.map((f) => f.supplier_id),
    ].filter(Boolean)));
    let supMap = new Map<string, SupplierLite>();
    if (ids.length) {
      const { data: sups } = await supabase.from("suppliers").select("id, company_name, profile_photo_url, category_id").in("id", ids);
      supMap = new Map((sups || []).map((s: any) => [s.id, s as SupplierLite]));
    }
    setCoupleSuppliers(list.map((s: any) => ({
      ...s,
      supplier: supMap.get(s.supplier_id),
      category_id: s.category_id || supMap.get(s.supplier_id)?.category_id || null,
    })));
    setFavorites(favList.map((f) => ({
      ...f,
      supplier: supMap.get(f.supplier_id),
      category_id: supMap.get(f.supplier_id)?.category_id || null,
    })));
    setQuotes((qRes.data || []) as QuoteLite[]);
  };


  const supplierIdsWithQuote = useMemo(
    () => new Set(quotes.map((q) => q.supplier_id).filter(Boolean)),
    [quotes],
  );
  const favoriteSupplierIds = useMemo(
    () => new Set(favorites.map((f) => f.supplier_id)),
    [favorites],
  );

  type Row = {
    key: string;
    supplier: SupplierLite;
    coupleSupplier?: CoupleSupplier;
    isFavorite: boolean;
    tags: CoupleSupplierTag[];
  };

  const rowsByCategory = useMemo(() => {
    const map = new Map<string, Row[]>();
    const push = (catId: string, row: Row) => {
      if (!map.has(catId)) map.set(catId, []);
      map.get(catId)!.push(row);
    };
    const seen = new Set<string>();
    for (const cs of coupleSuppliers) {
      if (!cs.supplier) continue;
      const catId = cs.category_id || cs.supplier.category_id;
      if (!catId) continue;
      const key = `${catId}:${cs.supplier.id}`;
      seen.add(key);
      const tags = tagsForSupplier({
        kanbanStatus: cs.kanban_status,
        hasQuote: supplierIdsWithQuote.has(cs.supplier.id),
        isFavorite: favoriteSupplierIds.has(cs.supplier.id),
      });
      push(catId, { key, supplier: cs.supplier, coupleSupplier: cs, isFavorite: favoriteSupplierIds.has(cs.supplier.id), tags });
    }
    for (const fav of favorites) {
      const sup = fav.supplier;
      if (!sup) continue;
      const catId = fav.category_id || sup.category_id;
      if (!catId) continue;
      const key = `${catId}:${sup.id}`;
      if (seen.has(key)) continue;
      const tags = tagsForSupplier({
        kanbanStatus: null,
        hasQuote: supplierIdsWithQuote.has(sup.id),
        isFavorite: true,
      });
      push(catId, { key, supplier: sup, isFavorite: true, tags });
    }
    return map;
  }, [coupleSuppliers, favorites, supplierIdsWithQuote, favoriteSupplierIds]);

  /** categorias que importam para o casal: as que já têm fornecedor ou que ele marcou como necessárias */
  const relevantes = useMemo(
    () => categories.filter((c) => rowsByCategory.has(c.id) || (needed.includes(c.id) && c.active !== false)),
    [categories, rowsByCategory, needed],
  );
  const outras = categories.filter((c) => c.active !== false && !relevantes.includes(c));

  const temTag = (catId: string, tags: CoupleSupplierTag[]) => (rowsByCategory.get(catId) || []).some((r) => r.tags.some((t) => tags.includes(t)));
  const contratadaCat = (catId: string) => temTag(catId, ["contratado"]);
  const contagem = {
    all: relevantes.length,
    falta: relevantes.filter((c) => !contratadaCat(c.id)).length,
    andamento: relevantes.filter((c) => !contratadaCat(c.id) && temTag(c.id, ["em_orcamento", "negociando"])).length,
    contracted: relevantes.filter((c) => contratadaCat(c.id)).length,
    saved: relevantes.filter((c) => temTag(c.id, ["favorito"])).length,
    descartado: relevantes.filter((c) => temTag(c.id, ["descartado"])).length,
  };

  const filteredCategories = relevantes
    .filter((cat) => {
      if (filter === "all") return true;
      if (filter === "falta") return !contratadaCat(cat.id);
      if (filter === "contracted") return contratadaCat(cat.id);
      if (filter === "andamento") return !contratadaCat(cat.id) && temTag(cat.id, ["em_orcamento", "negociando"]);
      if (filter === "descartado") return temTag(cat.id, ["descartado"]);
      if (filter === "saved") return temTag(cat.id, ["favorito"]);
      return true;
    })
    .sort((a, b) => Number(contratadaCat(b.id)) - Number(contratadaCat(a.id)));

  const toggleExpanded = (catId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  };

  const filtros: { key: typeof filter; label: string }[] = [
    { key: "all", label: "Todos" },
    { key: "falta", label: "Faltando" },
    { key: "andamento", label: "Em andamento" },
    { key: "contracted", label: "Contratados" },
    { key: "saved", label: "Guardados" },
    { key: "descartado", label: "Descartados" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <DashboardNav />
      <main className="ca-pagina ca-enter">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0" style={{ flex: "1 1 220px" }}>
            <h1 className="ca-titulo">Fornecedores</h1>
            <p className="ca-sub ca-num">
              {contagem.contracted} de {contagem.all} {contagem.all === 1 ? "categoria contratada" : "categorias contratadas"}
            </p>
          </div>
          <div className="flex gap-2">
            <Link to="/orcamento" className="ca-btn sec">
              Ver orçamento
            </Link>
            <Link to="/buscar" className="ca-btn pri">
              Buscar fornecedor
            </Link>
          </div>
        </div>

        <div className="ca-chips" role="group" aria-label="Filtrar categorias">
          {filtros
            .filter((f) => f.key === "all" || contagem[f.key] > 0)
            .map((f) => (
              <button key={f.key} type="button" className="ca-chip" aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>
                {f.label}
                <b className="ca-num">{contagem[f.key]}</b>
              </button>
            ))}
        </div>

        {filteredCategories.length === 0 ? (
          <p className="m-0 rounded-2xl border border-dashed p-8 text-center text-sm" style={{ borderColor: "var(--ca-line-strong)", color: "var(--ca-body)" }}>
            {relevantes.length === 0 ? "Vocês ainda não guardaram nenhum fornecedor. Comecem pela busca." : "Nenhuma categoria neste filtro."}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCategories.map((cat) => {
              const rows = rowsByCategory.get(cat.id) || [];
              const contratada = contratadaCat(cat.id);
              const andamento = rows.filter((r) => r.tags.includes("em_orcamento") || r.tags.includes("negociando")).length;
              const isExpanded = expanded.has(cat.id);
              const visible = isExpanded ? rows : rows.slice(0, 3);
              const hidden = Math.max(0, rows.length - visible.length);
              const subtitulo = contratada
                ? "contratado"
                : rows.length === 0
                  ? "nenhum ainda"
                  : `${rows.length} ${rows.length === 1 ? "fornecedor" : "fornecedores"}`;
              return (
                <article key={cat.id} className={`ca-card ${rows.length === 0 ? "ca-fcat todo" : ""}`} style={{ padding: 14, gap: 10 }}>
                  <header className="flex items-center gap-2.5">
                    <span className="ca-ic" aria-hidden="true">
                      {cat.icon || "📦"}
                    </span>
                    <span className="min-w-0 flex-1">
                      <b className="block truncate text-[15px]">{cat.name}</b>
                      <small className="text-[12.5px]" style={{ color: "var(--ca-muted)" }}>
                        {subtitulo}
                      </small>
                    </span>
                    {contratada ? (
                      <span className="ca-st ok inline-flex items-center gap-1">
                        <Check className="h-3.5 w-3.5" aria-hidden="true" /> feito
                      </span>
                    ) : andamento > 0 ? (
                      <span className="ca-st wait">{andamento} em andamento</span>
                    ) : (
                      <span className="ca-st off">falta</span>
                    )}
                  </header>

                  {rows.length === 0 ? (
                    <p className="m-0 text-[13.5px]" style={{ color: "var(--ca-body)" }}>
                      Ainda não guardaram nenhum fornecedor de {cat.name.toLowerCase()}.
                    </p>
                  ) : (
                    <ul className="m-0 flex list-none flex-col p-0">
                      {visible.map((row) => (
                        <li key={row.key} className="ca-row">
                          <Link to={`/fornecedor/${row.supplier.id}`} className="group flex items-center gap-2 py-2 text-sm">
                            <span className="min-w-0 flex-1 truncate">{row.supplier.company_name}</span>
                            {row.tags.slice(0, 2).map((t) => (
                              <span key={t} className={`ca-tag ${t}`}>
                                {TAG_LABEL[t]}
                              </span>
                            ))}
                            <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-40 transition group-hover:opacity-100" aria-hidden="true" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                  {(hidden > 0 || (isExpanded && rows.length > 3)) && (
                    <button type="button" className="self-start text-xs font-bold" style={{ color: "var(--ca-clay)" }} onClick={() => toggleExpanded(cat.id)}>
                      {hidden > 0 ? `Ver mais ${hidden}` : "Ocultar"}
                    </button>
                  )}

                  <div className="mt-auto flex flex-wrap items-center gap-3 pt-1">
                    {rows.length === 0 ? (
                      <Link to={`/categoria/${cat.slug}`} className="ca-btn pri sm w-full">
                        Buscar {cat.name.toLowerCase()}
                      </Link>
                    ) : (
                      <>
                        {andamento >= 2 && !contratada && (
                          <Link to="/orcamento" className="ca-btn sec sm">
                            Comparar
                          </Link>
                        )}
                        <Link to={`/categoria/${cat.slug}`} className="text-sm font-bold" style={{ color: "var(--ca-clay)" }}>
                          Buscar mais
                        </Link>
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {outras.length > 0 && filter === "all" && (
          <details className="ca-ex">
            <summary>
              Outras categorias
              <span className="ml-auto mr-2.5 text-[13px] font-medium" style={{ color: "var(--ca-muted)" }}>
                {outras.length}
              </span>
            </summary>
            <div className="flex flex-wrap gap-2 pb-4">
              {outras.map((c) => (
                <Link key={c.id} to={`/categoria/${c.slug}`} className="ca-pill">
                  {c.icon ? `${c.icon} ` : ""}
                  {c.name}
                </Link>
              ))}
            </div>
          </details>
        )}
      </main>
    </div>
  );
}
