/**
 * Converte um `due_period` textual (ex.: "10-12 meses", "ultima-semana")
 * em uma data real a partir da data do casamento.
 * Usamos o limite "mais distante" do intervalo como prazo (mais conservador).
 */

const subtractMonths = (date: Date, months: number) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() - months);
  return d;
};
const subtractDays = (date: Date, days: number) => {
  const d = new Date(date);
  d.setDate(d.getDate() - days);
  return d;
};

export function periodToDueDate(weddingDate: Date | string, period: string | null | undefined): Date | null {
  if (!period) return null;
  const wd = typeof weddingDate === "string" ? new Date(weddingDate) : weddingDate;
  if (isNaN(wd.getTime())) return null;

  switch (period) {
    case "10-12 meses": return subtractMonths(wd, 10);
    case "7-9 meses":   return subtractMonths(wd, 7);
    case "4-6 meses":   return subtractMonths(wd, 4);
    case "2-3 meses":   return subtractMonths(wd, 2);
    case "ultimo-mes":  return subtractDays(wd, 25);
    case "ultima-semana": return subtractDays(wd, 7);
    case "dia-do-casamento": return wd;
    default: return null;
  }
}

export function formatDueDate(d: Date | null): string {
  if (!d) return "";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * Status temporal: atrasada, próxima (<=30 dias), no prazo, sem data.
 */
export function dueStatus(
  d: Date | null,
  isCompleted: boolean,
  opts?: { createdAt?: Date | string | null; seededAsBacklog?: boolean }
): "completed" | "overdue" | "soon" | "ok" | "none" | "backlog" {
  if (isCompleted) return "completed";
  if (opts?.seededAsBacklog) return "backlog";
  if (!d) return "none";
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) {
    // só é "atrasada" se venceu DEPOIS que o casal já usava a plataforma
    const created = opts?.createdAt
      ? (typeof opts.createdAt === "string" ? new Date(opts.createdAt) : opts.createdAt)
      : null;
    if (created && d.getTime() <= created.getTime()) return "backlog";
    return "overdue";
  }
  if (diffDays <= 30) return "soon";
  return "ok";
}