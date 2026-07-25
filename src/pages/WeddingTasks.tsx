import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, Printer, ChevronDown, ChevronRight, Sparkles } from "lucide-react";
import DashboardHeader from "@/components/DashboardHeader";
import DashboardNav from "@/components/DashboardNav";
import TaskItem from "@/components/TaskItem";
import AddTaskDialog from "@/components/AddTaskDialog";
import { useToast } from "@/hooks/use-toast";

type Task = {
  id: string;
  title: string;
  category: string;
  priority: string;
  due_period: string | null;
  due_date: string | null;
  is_completed: boolean;
  sort_order: number;
  created_at?: string | null;
  seeded_as_backlog?: boolean;
  is_custom?: boolean;
  action_label?: string | null;
  action_url?: string | null;
  supplier_id?: string | null;
  supplier_name?: string | null;
};

const BACKLOG_KEY = "comece-aqui";
const periodOrder = [
  "10-12 meses",
  "7-9 meses",
  "4-6 meses",
  "2-3 meses",
  "ultimo-mes",
  "ultima-semana",
  "dia-do-casamento",
];
const allBuckets = [BACKLOG_KEY, ...periodOrder];

const periodLabels: Record<string, string> = {
  [BACKLOG_KEY]: "Comece por aqui",
  "10-12 meses": "De 10 a 12 meses",
  "7-9 meses": "De 7 a 9 meses",
  "4-6 meses": "De 4 a 6 meses",
  "2-3 meses": "De 2 a 3 meses",
  "ultimo-mes": "Último mês",
  "ultima-semana": "Última semana",
  "dia-do-casamento": "Dia do casamento",
};

const priorityRank: Record<string, number> = { essential: 0, recommended: 1, optional: 2 };

export default function WeddingTasks() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [filterState, setFilterState] = useState<"all" | "pending" | "completed">("all");
  const [filterPeriod, setFilterPeriod] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [showAllPhases, setShowAllPhases] = useState(false);
  const [expanding, setExpanding] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("couples").select("id, onboarding_completed").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (!data || !data.onboarding_completed) { navigate("/onboarding"); return; }
      setCoupleId(data.id);
      loadTasks(data.id);
    });
  }, [user]);

  const loadTasks = async (cId: string) => {
    const { data } = await (supabase
      .from("wedding_tasks") as any)
      .select("id, title, category, priority, due_period, due_date, is_completed, sort_order, supplier_id, created_at, seeded_as_backlog, is_custom, action_label, action_url")
      .eq("couple_id", cId)
      .order("sort_order", { ascending: true });
    const list = (data || []) as Task[];
    const supIds = Array.from(new Set(list.map((t) => t.supplier_id).filter(Boolean))) as string[];
    let supMap = new Map<string, string>();
    if (supIds.length) {
      const { data: sups } = await supabase.from("suppliers").select("id, company_name").in("id", supIds);
      supMap = new Map((sups || []).map((s: any) => [s.id, s.company_name]));
    }
    setTasks(list.map((t) => ({ ...t, supplier_name: t.supplier_id ? supMap.get(t.supplier_id) || null : null })));
  };

  const toggleTask = async (id: string, completed: boolean) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, is_completed: completed } : t)));
    await supabase
      .from("wedding_tasks")
      .update({ is_completed: completed, completed_at: completed ? new Date().toISOString() : null })
      .eq("id", id);
  };

  const addTask = async (task: { title: string; category: string; priority: string; due_period: string }) => {
    if (!coupleId) return;
    const maxOrder = tasks.length > 0 ? Math.max(...tasks.map((t) => t.sort_order)) + 1 : 100;
    const { data } = await supabase
      .from("wedding_tasks")
      .insert({ couple_id: coupleId, ...task, is_custom: true, sort_order: maxOrder })
      .select()
      .single();
    if (data) setTasks((prev) => [...prev, data]);
  };

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (filterState === "pending" && t.is_completed) return false;
      if (filterState === "completed" && !t.is_completed) return false;
      if (filterPeriod) {
        if (filterPeriod === BACKLOG_KEY) {
          if (!t.seeded_as_backlog) return false;
        } else if (t.seeded_as_backlog || t.due_period !== filterPeriod) {
          return false;
        }
      }
      if (filterCategory && t.category !== filterCategory) return false;
      return true;
    });
  }, [tasks, filterState, filterPeriod, filterCategory]);

  const grouped = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const t of filtered) {
      const key = t.seeded_as_backlog ? BACKLOG_KEY : (t.due_period || "geral");
      if (!map[key]) map[key] = [];
      map[key].push(t);
    }
    // ordenação especial do backlog: por prioridade
    if (map[BACKLOG_KEY]) {
      map[BACKLOG_KEY].sort((a, b) => (priorityRank[a.priority] ?? 3) - (priorityRank[b.priority] ?? 3));
    }
    return allBuckets
      .filter((p) => map[p])
      .map((p) => ({ period: p, tasks: map[p] }));
  }, [filtered]);

  // Fase atual = primeira faixa (não-backlog) com tarefa pendente
  const faseAtual = useMemo(() => {
    for (const p of periodOrder) {
      const bucket = tasks.filter((t) => !t.seeded_as_backlog && t.due_period === p);
      if (bucket.some((t) => !t.is_completed)) return p;
    }
    return null;
  }, [tasks]);

  const faseSeguinte = useMemo(() => {
    if (!faseAtual) return null;
    const idx = periodOrder.indexOf(faseAtual);
    return periodOrder[idx + 1] ?? null;
  }, [faseAtual]);

  const bucketsVisiveis = useMemo(() => {
    if (showAllPhases || filterPeriod) return grouped;
    const foco = new Set([BACKLOG_KEY, faseAtual, faseSeguinte].filter(Boolean) as string[]);
    return grouped.filter((g) => foco.has(g.period));
  }, [grouped, showAllPhases, filterPeriod, faseAtual, faseSeguinte]);

  const faseAtualStats = useMemo(() => {
    if (!faseAtual) return null;
    const bucket = tasks.filter((t) => !t.seeded_as_backlog && t.due_period === faseAtual);
    return { done: bucket.filter((t) => t.is_completed).length, total: bucket.length, label: periodLabels[faseAtual] };
  }, [tasks, faseAtual]);

  const total = tasks.length;
  const completed = tasks.filter((t) => t.is_completed).length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const categories = useMemo(() => {
    const set = new Set(tasks.map((t) => t.category));
    return Array.from(set).sort();
  }, [tasks]);

  const marcadorExpandir = useMemo(
    () => tasks.find((t) => t.is_custom && t.action_url === "/tarefas?expandir=1"),
    [tasks]
  );

  const expandirTarefas = async () => {
    if (!coupleId || expanding) return;
    setExpanding(true);
    const { data, error } = await (supabase.rpc as any)("expandir_tarefas_detalhadas", { _couple_id: coupleId });
    setExpanding(false);
    if (error) {
      toast({ title: "Erro ao expandir", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Tarefas detalhadas adicionadas", description: `${data ?? 0} tarefas incluídas no seu plano.` });
    await loadTasks(coupleId);
  };

  // Auto-expandir via ?expandir=1
  useEffect(() => {
    if (searchParams.get("expandir") === "1" && coupleId && marcadorExpandir) {
      expandirTarefas();
      searchParams.delete("expandir");
      setSearchParams(searchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coupleId, marcadorExpandir]);

  const handleExport = () => {
    const csv = ["Tarefa,Categoria,Período,Status"]
      .concat(tasks.map((t) => `"${t.title}","${t.category}","${t.due_period || ""}","${t.is_completed ? "Concluída" : "Pendente"}"`))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tarefas-casamento.csv";
    a.click();
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <DashboardNav />
      <main className="container px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold">Agenda de Tarefas</h1>
            {faseAtualStats ? (
              <>
                <p className="text-base mt-1">
                  Nesta fase: <strong>{faseAtualStats.done}/{faseAtualStats.total} concluídas</strong>
                  <span className="text-muted-foreground"> — {faseAtualStats.label}</span>
                </p>
                <Progress
                  value={faseAtualStats.total > 0 ? Math.round((faseAtualStats.done / faseAtualStats.total) * 100) : 0}
                  className="mt-2 h-2 w-64"
                />
                <p className="text-xs text-muted-foreground mt-1">Total geral: {completed}/{total} ({pct}%)</p>
              </>
            ) : (
              <>
                <p className="text-muted-foreground mt-1">Você completou {completed} de {total} tarefas ({pct}%)</p>
                <Progress value={pct} className="mt-2 h-2 w-64" />
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <AddTaskDialog onAdd={addTask} />
            <Button variant="outline" size="icon" onClick={handleExport} title="Baixar CSV">
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => window.print()} title="Imprimir">
              <Printer className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {marcadorExpandir && (
          <Card className="mb-6 border-primary/40 bg-primary/5">
            <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Seu plano está enxuto porque faltam poucos meses</p>
                  <p className="text-xs text-muted-foreground">Semeamos só o essencial. Quando quiser mais detalhes, expanda com todas as tarefas complementares.</p>
                </div>
              </div>
              <Button size="sm" onClick={expandirTarefas} disabled={expanding}>
                {expanding ? "Adicionando..." : "Adicionar tarefas detalhadas"}
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-[240px_1fr] gap-6">
          {/* Filters */}
          <aside className="space-y-6">
            <Card>
              <CardContent className="p-4 space-y-3">
                <h3 className="text-sm font-semibold">Estado</h3>
                {(["all", "pending", "completed"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilterState(s)}
                    className={`block w-full text-left text-sm px-3 py-1.5 rounded ${filterState === s ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                  >
                    {s === "all" ? "Todas" : s === "pending" ? "Pendentes" : "Concluídas"}
                  </button>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 space-y-3">
                <h3 className="text-sm font-semibold">Período</h3>
                <button
                  onClick={() => setFilterPeriod(null)}
                  className={`block w-full text-left text-sm px-3 py-1.5 rounded ${!filterPeriod ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                >
                  Todos
                </button>
                {allBuckets.map((p) => (
                  <button
                    key={p}
                    onClick={() => setFilterPeriod(p)}
                    className={`block w-full text-left text-sm px-3 py-1.5 rounded ${filterPeriod === p ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                  >
                    {periodLabels[p]}
                  </button>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 space-y-3">
                <h3 className="text-sm font-semibold">Categoria</h3>
                <button
                  onClick={() => setFilterCategory(null)}
                  className={`block w-full text-left text-sm px-3 py-1.5 rounded ${!filterCategory ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                >
                  Todas
                </button>
                {categories.map((c) => (
                  <button
                    key={c}
                    onClick={() => setFilterCategory(c)}
                    className={`block w-full text-left text-sm px-3 py-1.5 rounded capitalize ${filterCategory === c ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                  >
                    {c}
                  </button>
                ))}
              </CardContent>
            </Card>
          </aside>

          {/* Task list */}
          <div className="space-y-6">
            {bucketsVisiveis.length === 0 && (
              <p className="text-muted-foreground text-center py-12">Nenhuma tarefa encontrada.</p>
            )}
            {bucketsVisiveis.map(({ period, tasks: periodTasks }) => (
              <Card key={period}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-semibold text-lg flex items-center gap-2">
                      {period === BACKLOG_KEY && <Sparkles className="h-4 w-4 text-primary" />}
                      {periodLabels[period] || period}
                    </h2>
                    <Badge variant="secondary" className="text-xs">
                      {periodTasks.filter((t) => t.is_completed).length}/{periodTasks.length}
                    </Badge>
                  </div>
                  <div className="divide-y divide-border">
                    {periodTasks.map((t) => (
                      <TaskItem
                        key={t.id}
                        id={t.id}
                        title={t.title}
                        category={t.category}
                        priority={t.priority}
                        isCompleted={t.is_completed}
                        actionLabel={t.action_label ?? null}
                        actionUrl={t.action_url ?? null}
                        supplierId={t.supplier_id || null}
                        supplierName={t.supplier_name || null}
                        dueDate={t.due_date}
                        createdAt={t.created_at ?? null}
                        seededAsBacklog={!!t.seeded_as_backlog}
                        onToggle={toggleTask}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
            {!filterPeriod && grouped.length > bucketsVisiveis.length && (
              <div className="text-center">
                <Button variant="outline" onClick={() => setShowAllPhases((v) => !v)}>
                  {showAllPhases ? (
                    <><ChevronDown className="h-4 w-4 mr-1" /> Recolher fases futuras</>
                  ) : (
                    <><ChevronRight className="h-4 w-4 mr-1" /> Ver todas as fases ({grouped.length - bucketsVisiveis.length} recolhidas)</>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
