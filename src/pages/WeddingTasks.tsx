import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, Printer } from "lucide-react";
import DashboardHeader from "@/components/DashboardHeader";
import DashboardNav from "@/components/DashboardNav";
import TaskItem from "@/components/TaskItem";
import AddTaskDialog from "@/components/AddTaskDialog";

type Task = {
  id: string;
  title: string;
  category: string;
  priority: string;
  due_period: string | null;
  is_completed: boolean;
  sort_order: number;
};

const periodOrder = [
  "10-12 meses",
  "7-9 meses",
  "4-6 meses",
  "2-3 meses",
  "ultimo-mes",
  "ultima-semana",
  "dia-do-casamento",
];

const periodLabels: Record<string, string> = {
  "10-12 meses": "De 10 a 12 meses",
  "7-9 meses": "De 7 a 9 meses",
  "4-6 meses": "De 4 a 6 meses",
  "2-3 meses": "De 2 a 3 meses",
  "ultimo-mes": "Último mês",
  "ultima-semana": "Última semana",
  "dia-do-casamento": "Dia do casamento",
};

export default function WeddingTasks() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [filterState, setFilterState] = useState<"all" | "pending" | "completed">("all");
  const [filterPeriod, setFilterPeriod] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("couples").select("id, onboarding_completed").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (!data || !data.onboarding_completed) { navigate("/onboarding"); return; }
      setCoupleId(data.id);
      loadTasks(data.id);
    });
  }, [user]);

  const loadTasks = async (cId: string) => {
    const { data } = await supabase
      .from("wedding_tasks")
      .select("id, title, category, priority, due_period, is_completed, sort_order")
      .eq("couple_id", cId)
      .order("sort_order", { ascending: true });
    setTasks(data || []);
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
      if (filterPeriod && t.due_period !== filterPeriod) return false;
      if (filterCategory && t.category !== filterCategory) return false;
      return true;
    });
  }, [tasks, filterState, filterPeriod, filterCategory]);

  const grouped = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const t of filtered) {
      const key = t.due_period || "geral";
      if (!map[key]) map[key] = [];
      map[key].push(t);
    }
    return periodOrder
      .filter((p) => map[p])
      .map((p) => ({ period: p, tasks: map[p] }));
  }, [filtered]);

  const total = tasks.length;
  const completed = tasks.filter((t) => t.is_completed).length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const categories = useMemo(() => {
    const set = new Set(tasks.map((t) => t.category));
    return Array.from(set).sort();
  }, [tasks]);

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
            <p className="text-muted-foreground mt-1">
              Você completou {completed} de {total} tarefas ({pct}%)
            </p>
            <Progress value={pct} className="mt-2 h-2 w-64" />
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
                {periodOrder.map((p) => (
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
            {grouped.length === 0 && (
              <p className="text-muted-foreground text-center py-12">Nenhuma tarefa encontrada.</p>
            )}
            {grouped.map(({ period, tasks: periodTasks }) => (
              <Card key={period}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-semibold text-lg">{periodLabels[period] || period}</h2>
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
                        onToggle={toggleTask}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
