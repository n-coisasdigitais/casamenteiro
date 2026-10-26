import { traduzirErro } from "@/lib/errorMessages";
import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Download, Printer, MoreHorizontal, Sparkles } from "lucide-react";
import { dueStatus } from "@/lib/taskDueDate";
import DashboardHeader from "@/components/DashboardHeader";
import DashboardNav from "@/components/DashboardNav";
import TaskItem from "@/components/TaskItem";
import AddTaskDialog from "@/components/AddTaskDialog";
import { useToast } from "@/hooks/use-toast";
import { gerarTarefasPdf } from "@/lib/tasksPdf";

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
  const [casalInfo, setCasalInfo] = useState<{ nome: string; data: string | null }>({ nome: "Nosso casamento", data: null });
  const [filterState, setFilterState] = useState<"all" | "pending" | "completed">("pending");
  const [filterPeriod, setFilterPeriod] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [expanding, setExpanding] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("couples").select("id, onboarding_completed, partner_name, wedding_date").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (!data || !data.onboarding_completed) { navigate("/onboarding"); return; }
      setCoupleId(data.id);
      setCasalInfo({
        nome: [user.user_metadata?.full_name, (data as any).partner_name].filter(Boolean).join(" & ") || "Nosso casamento",
        data: (data as any).wedding_date || null,
      });
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

  const atrasada = (t: Task) =>
    dueStatus(t.due_date ? new Date(t.due_date) : null, t.is_completed, { createdAt: t.created_at ?? null, seededAsBacklog: !!t.seeded_as_backlog }) === "overdue";
  // atrasadas aparecem num bloco próprio no topo (só quando não há filtro de fase)
  const mostrarAtrasadas = !filterPeriod && filterState !== "completed";
  const atrasadas = useMemo(() => (mostrarAtrasadas ? filtered.filter(atrasada) : []), [filtered, mostrarAtrasadas]);

  const grouped = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const t of filtered) {
      if (mostrarAtrasadas && atrasada(t)) continue;
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
  }, [filtered, mostrarAtrasadas]);

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
      toast({ title: "Erro ao expandir", description: traduzirErro(error), variant: "destructive" });
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

  const handlePdf = () => {
    if (tasks.length === 0) {
      toast({ title: "Nenhuma tarefa para exportar", variant: "destructive" });
      return;
    }
    gerarTarefasPdf({
      nomeCasal: casalInfo.nome,
      dataEvento: casalInfo.data,
      tasks: tasks.map((t) => ({
        title: t.title,
        category: t.category,
        due_period: t.seeded_as_backlog ? BACKLOG_KEY : t.due_period,
        due_date: t.due_date,
        is_completed: t.is_completed,
        supplier_name: t.supplier_name,
      })),
      periodOrder: allBuckets,
      periodLabels,
    });
  };

  const contagemEstado = {
    pending: tasks.filter((t) => !t.is_completed).length,
    all: tasks.length,
    completed: completed,
  };
  const abertaPorPadrao = (period: string) =>
    !!filterPeriod || period === BACKLOG_KEY || period === faseAtual || period === faseSeguinte;

  const renderTask = (t: Task) => (
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
  );

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <DashboardNav />
      <main className="ca-pagina ca-enter">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0" style={{ flex: "1 1 220px" }}>
            <h1 className="ca-titulo">Tarefas</h1>
            <p className="ca-sub ca-num">
              {completed} de {total} feitas
              {faseAtualStats && (
                <>
                  {" "}
                  · fase atual: <b style={{ color: "var(--ca-ink)" }}>{faseAtualStats.label.replace(/^De /, "")}</b> ({faseAtualStats.done}/{faseAtualStats.total})
                </>
              )}
            </p>
            <div className="ca-bar mt-2" style={{ maxWidth: 320, height: 8 }}>
              <i style={{ width: `${pct}%` }} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <AddTaskDialog onAdd={addTask} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-11 w-11 rounded-full" aria-label="Baixar tarefas">
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handlePdf}>
                  <Printer className="mr-2 h-4 w-4" /> Baixar PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExport}>
                  <Download className="mr-2 h-4 w-4" /> Baixar planilha (CSV)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {marcadorExpandir && (
          <div className="ca-card flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-5 w-5 shrink-0" style={{ color: "var(--ca-clay)" }} />
              <div>
                <p className="m-0 text-sm font-semibold">Seu plano está enxuto porque faltam poucos meses</p>
                <p className="m-0 text-xs" style={{ color: "var(--ca-body)" }}>
                  Semeamos só o essencial. Quando quiser mais detalhes, expanda com todas as tarefas complementares.
                </p>
              </div>
            </div>
            <button type="button" className="ca-btn pri sm" onClick={expandirTarefas} disabled={expanding}>
              {expanding ? "Adicionando..." : "Adicionar tarefas detalhadas"}
            </button>
          </div>
        )}

        <div className="ca-chips" role="group" aria-label="Filtrar tarefas">
          {(["pending", "all", "completed"] as const).map((st) => (
            <button key={st} type="button" className="ca-chip" aria-pressed={filterState === st} onClick={() => setFilterState(st)}>
              {st === "pending" ? "Pendentes" : st === "all" ? "Todas" : "Feitas"}
              <b className="ca-num">{contagemEstado[st]}</b>
            </button>
          ))}
          <select
            className="ca-chip"
            value={filterPeriod || ""}
            onChange={(e) => setFilterPeriod(e.target.value || null)}
            aria-label="Fase"
            style={filterPeriod ? { background: "var(--ca-ink)", color: "#fff", borderColor: "var(--ca-ink)" } : undefined}
          >
            <option value="">Todas as fases</option>
            {allBuckets.map((p) => (
              <option key={p} value={p}>
                {periodLabels[p]}
              </option>
            ))}
          </select>
          <select
            className="ca-chip"
            value={filterCategory || ""}
            onChange={(e) => setFilterCategory(e.target.value || null)}
            aria-label="Categoria"
            style={filterCategory ? { background: "var(--ca-ink)", color: "#fff", borderColor: "var(--ca-ink)" } : undefined}
          >
            <option value="">Todas as categorias</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {atrasadas.length > 0 && (
          <section className="ca-grupo atrasadas ca-card" style={{ padding: "4px 16px 8px", gap: 0 }} aria-label="Tarefas atrasadas">
            <h2 className="m-0 flex min-h-[48px] items-center gap-2 text-[15px] font-bold" style={{ color: "var(--ca-err)" }}>
              Atrasadas
              <span className="ca-num text-[12.5px] font-semibold" style={{ color: "var(--ca-muted)" }}>
                {atrasadas.length}
              </span>
            </h2>
            <div>{atrasadas.map(renderTask)}</div>
          </section>
        )}

        {grouped.length === 0 && atrasadas.length === 0 && (
          <p className="m-0 rounded-2xl border border-dashed p-8 text-center text-sm" style={{ borderColor: "var(--ca-line-strong)", color: "var(--ca-body)" }}>
            {filterState === "pending" ? "Nenhuma tarefa pendente. 🎉" : "Nenhuma tarefa encontrada."}
          </p>
        )}

        {grouped.map(({ period, tasks: periodTasks }) => (
          <details key={`${period}-${filterPeriod || ""}`} className="ca-grupo" open={abertaPorPadrao(period)}>
            <summary>
              {period === BACKLOG_KEY && <Sparkles className="h-4 w-4" style={{ color: "var(--ca-clay)" }} aria-hidden="true" />}
              <h2 className="m-0 text-[15px] font-bold">{periodLabels[period] || period}</h2>
              <span className="ca-num text-[12.5px] font-semibold" style={{ color: "var(--ca-muted)" }}>
                {periodTasks.filter((t) => t.is_completed).length} de {periodTasks.length}
              </span>
              {period === faseAtual && (
                <span className="ca-st wait" style={{ marginLeft: 4 }}>
                  fase atual
                </span>
              )}
            </summary>
            <div>{periodTasks.map(renderTask)}</div>
          </details>
        ))}
      </main>
    </div>
  );
}
