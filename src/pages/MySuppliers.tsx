import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Search, Plus, CheckCircle, Store, ChevronRight } from "lucide-react";
import DashboardHeader from "@/components/DashboardHeader";
import DashboardNav from "@/components/DashboardNav";
import { TAG_CLASS, TAG_LABEL, tagsForSupplier, CoupleSupplierTag } from "@/lib/coupleSupplierStatus";

type Category = { id: string; name: string; slug: string; icon: string | null };
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
  const [filter, setFilter] = useState<"all" | "saved" | "contracted">("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    supabase.from("couples").select("id, onboarding_completed").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (!data || !data.onboarding_completed) { navigate("/onboarding"); return; }
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

  const contracted = coupleSuppliers.filter((s) => s.status === "contracted" || s.kanban_status === "contratado");
  const totalCategories = categories.length;

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

  const savedCategoriesCount = useMemo(() => {
    const s = new Set<string>();
    for (const [catId, rows] of rowsByCategory) {
      const hasSaved = rows.some((r) => r.isFavorite || (r.coupleSupplier && r.coupleSupplier.kanban_status !== "contratado"));
      if (hasSaved) s.add(catId);
    }
    return s.size;
  }, [rowsByCategory]);

  const filteredCategories = categories.filter((cat) => {
    const rows = rowsByCategory.get(cat.id) || [];
    if (filter === "all") return true;
    if (filter === "contracted") return rows.some((r) => r.tags.includes("contratado"));
    if (filter === "saved") return rows.some((r) => r.isFavorite || (r.tags.length > 0 && !r.tags.includes("contratado")));
    return rows.length > 0;
  });

  const toggleExpanded = (catId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId); else next.add(catId);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <DashboardNav />
      <main className="container px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold">Meus Fornecedores</h1>
            <p className="text-muted-foreground mt-1">
              {contracted.length} de {totalCategories} contratados
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/orcamento">Ver orçamento</Link>
            </Button>
            <Button asChild>
              <Link to="/buscar">
                <Plus className="mr-2 h-4 w-4" />
                Buscar fornecedor
              </Link>
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>
            <Store className="mr-2 h-4 w-4" /> Todos ({totalCategories})
          </Button>
          <Button variant={filter === "saved" ? "default" : "outline"} size="sm" onClick={() => setFilter("saved")}>
            <Heart className="mr-2 h-4 w-4" /> Guardados ({savedCategoriesCount})
          </Button>
          <Button variant={filter === "contracted" ? "default" : "outline"} size="sm" onClick={() => setFilter("contracted")}>
            <CheckCircle className="mr-2 h-4 w-4" /> Contratados ({contracted.length})
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCategories.map((cat) => {
            const rows = rowsByCategory.get(cat.id) || [];
            const hasContracted = rows.some((r) => r.tags.includes("contratado"));
            const isExpanded = expanded.has(cat.id);
            const visible = isExpanded ? rows : rows.slice(0, 3);
            const hidden = Math.max(0, rows.length - visible.length);
            return (
              <Card key={cat.id} className="relative overflow-hidden hover:shadow-md transition-shadow">
                {hasContracted && (
                  <div className="absolute top-3 right-3">
                    <CheckCircle className="h-5 w-5 text-primary fill-primary/20" />
                  </div>
                )}
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center text-xl shrink-0">
                      {cat.icon || "📦"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-sm truncate">{cat.name}</h3>
                      <p className="text-[11px] text-muted-foreground">
                        {rows.length === 0
                          ? "Nenhum fornecedor ainda"
                          : `${rows.length} fornecedor${rows.length > 1 ? "es" : ""}`}
                      </p>
                    </div>
                  </div>

                  {visible.length > 0 && (
                    <ul className="space-y-1">
                      {visible.map((row) => (
                        <li key={row.key}>
                          <Link
                            to={`/fornecedor/${row.supplier.id}`}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/60 transition-colors group"
                          >
                            <span className="text-xs font-medium truncate flex-1">{row.supplier.company_name}</span>
                            <div className="flex items-center gap-1 shrink-0">
                              {row.tags.slice(0, 2).map((t) => (
                                <Badge key={t} variant="outline" className={`text-[10px] px-1.5 py-0 h-4 border ${TAG_CLASS[t]}`}>
                                  {TAG_LABEL[t]}
                                </Badge>
                              ))}
                              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition" />
                            </div>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}

                  {hidden > 0 && (
                    <button
                      type="button"
                      className="text-xs text-primary hover:underline w-full text-left px-2"
                      onClick={() => toggleExpanded(cat.id)}
                    >
                      Ver mais {hidden}
                    </button>
                  )}
                  {isExpanded && rows.length > 3 && (
                    <button
                      type="button"
                      className="text-xs text-muted-foreground hover:underline w-full text-left px-2"
                      onClick={() => toggleExpanded(cat.id)}
                    >
                      Ocultar
                    </button>
                  )}

                  <Button variant="outline" size="sm" className="w-full" asChild>
                    <Link to={`/buscar?categoria=${cat.slug}`}>
                      <Search className="mr-2 h-3 w-3" />
                      {rows.length > 0 ? "Buscar mais" : "Pesquisar"}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredCategories.length === 0 && (
          <p className="text-center text-muted-foreground py-12">Nenhum fornecedor encontrado neste filtro.</p>
        )}
      </main>
    </div>
  );
}