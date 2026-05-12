import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, MousePointerClick, CalendarRange, Repeat } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";

type Props = {
  supplierId: string;
};

type Mode = "single" | "range" | "weekday";
const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function fmt(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function AvailabilityCalendar({ supplierId }: Props) {
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<Mode>("single");
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [rangeEnd, setRangeEnd] = useState<string | null>(null);
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  useEffect(() => {
    loadBlockedDates();
  }, [supplierId]);

  const loadBlockedDates = async () => {
    const { data } = await supabase
      .from("supplier_blocked_dates")
      .select("blocked_date")
      .eq("supplier_id", supplierId);
    setBlockedDates((data || []).map(d => d.blocked_date));
  };

  const toggleSingleDate = async (dateStr: string) => {
    setLoading(true);
    if (blockedDates.includes(dateStr)) {
      const { error } = await supabase
        .from("supplier_blocked_dates")
        .delete()
        .eq("supplier_id", supplierId)
        .eq("blocked_date", dateStr);
      if (error) {
        toast({ title: "Erro", description: error.message, variant: "destructive" });
      } else {
        setBlockedDates(prev => prev.filter(d => d !== dateStr));
      }
    } else {
      const { error } = await supabase
        .from("supplier_blocked_dates")
        .insert({ supplier_id: supplierId, blocked_date: dateStr });
      if (error) {
        toast({ title: "Erro", description: error.message, variant: "destructive" });
      } else {
        setBlockedDates(prev => [...prev, dateStr]);
      }
    }
    setLoading(false);
  };

  const handleDayClick = (dateStr: string) => {
    if (mode === "single") return toggleSingleDate(dateStr);
    if (mode === "range") {
      if (!rangeStart || (rangeStart && rangeEnd)) {
        setRangeStart(dateStr);
        setRangeEnd(null);
      } else {
        if (dateStr < rangeStart) {
          setRangeEnd(rangeStart);
          setRangeStart(dateStr);
        } else {
          setRangeEnd(dateStr);
        }
      }
    }
  };

  const enumerateRange = (startStr: string, endStr: string): string[] => {
    const out: string[] = [];
    const start = new Date(startStr + "T00:00:00");
    const end = new Date(endStr + "T00:00:00");
    const cur = new Date(start);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    while (cur <= end) {
      if (cur >= today) out.push(fmt(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return out;
  };

  const applyRange = async (block: boolean) => {
    if (!rangeStart || !rangeEnd) {
      toast({ title: "Selecione início e fim", variant: "destructive" });
      return;
    }
    setLoading(true);
    const dates = enumerateRange(rangeStart, rangeEnd);
    if (block) {
      const toInsert = dates
        .filter(d => !blockedDates.includes(d))
        .map(d => ({ supplier_id: supplierId, blocked_date: d }));
      if (toInsert.length) {
        const { error } = await supabase.from("supplier_blocked_dates").insert(toInsert);
        if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
      }
    } else {
      const { error } = await supabase
        .from("supplier_blocked_dates")
        .delete()
        .eq("supplier_id", supplierId)
        .in("blocked_date", dates);
      if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
    await loadBlockedDates();
    setRangeStart(null);
    setRangeEnd(null);
    setLoading(false);
    toast({ title: block ? "Período bloqueado" : "Período liberado", description: `${dates.length} data(s) afetada(s).` });
  };

  const applyWeekdayInMonth = async (block: boolean) => {
    if (selectedWeekdays.length === 0) {
      toast({ title: "Selecione ao menos um dia da semana", variant: "destructive" });
      return;
    }
    setLoading(true);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = daysInMonth;
    const targets: string[] = [];
    for (let d = 1; d <= days; d++) {
      const date = new Date(year, month, d);
      if (date < today) continue;
      if (selectedWeekdays.includes(date.getDay())) targets.push(fmt(date));
    }
    if (block) {
      const toInsert = targets
        .filter(d => !blockedDates.includes(d))
        .map(d => ({ supplier_id: supplierId, blocked_date: d }));
      if (toInsert.length) {
        const { error } = await supabase.from("supplier_blocked_dates").insert(toInsert);
        if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
      }
    } else {
      const { error } = await supabase
        .from("supplier_blocked_dates")
        .delete()
        .eq("supplier_id", supplierId)
        .in("blocked_date", targets);
      if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
    await loadBlockedDates();
    setLoading(false);
    toast({ title: block ? "Dias bloqueados" : "Dias liberados", description: `${targets.length} data(s) neste mês.` });
  };

  const toggleWeekday = (idx: number) => {
    setSelectedWeekdays(prev => prev.includes(idx) ? prev.filter(d => d !== idx) : [...prev, idx]);
  };

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const monthName = currentDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="font-serif text-lg">Disponibilidade</CardTitle>
          <Badge variant="secondary" className="text-xs">
            {blockedDates.length} data(s) bloqueada(s)
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">Bloqueie datas que você não atende. Datas em vermelho estão indisponíveis.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mode tabs */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-muted rounded-lg text-xs">
          <button
            onClick={() => { setMode("single"); setRangeStart(null); setRangeEnd(null); }}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-md transition-colors ${mode === "single" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"}`}
          >
            <MousePointerClick className="h-3.5 w-3.5" /> Dia
          </button>
          <button
            onClick={() => setMode("range")}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-md transition-colors ${mode === "range" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"}`}
          >
            <CalendarRange className="h-3.5 w-3.5" /> Período
          </button>
          <button
            onClick={() => setMode("weekday")}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-md transition-colors ${mode === "weekday" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"}`}
          >
            <Repeat className="h-3.5 w-3.5" /> Semana
          </button>
        </div>

        {mode === "range" && (
          <div className="rounded-lg border border-border p-3 space-y-2 bg-muted/30">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {!rangeStart && "Clique no dia inicial"}
                {rangeStart && !rangeEnd && `Início: ${new Date(rangeStart + "T00:00:00").toLocaleDateString("pt-BR")} → clique no fim`}
                {rangeStart && rangeEnd && `${new Date(rangeStart + "T00:00:00").toLocaleDateString("pt-BR")} → ${new Date(rangeEnd + "T00:00:00").toLocaleDateString("pt-BR")}`}
              </span>
              {(rangeStart || rangeEnd) && (
                <button onClick={() => { setRangeStart(null); setRangeEnd(null); }} className="text-xs text-muted-foreground hover:text-foreground underline">Limpar</button>
              )}
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="flex-1" disabled={!rangeStart || !rangeEnd || loading} onClick={() => applyRange(true)}>Bloquear período</Button>
              <Button size="sm" variant="outline" className="flex-1" disabled={!rangeStart || !rangeEnd || loading} onClick={() => applyRange(false)}>Liberar período</Button>
            </div>
          </div>
        )}

        {mode === "weekday" && (
          <div className="rounded-lg border border-border p-3 space-y-2 bg-muted/30">
            <Label className="text-xs">Dias da semana (aplica neste mês)</Label>
            <div className="grid grid-cols-7 gap-1">
              {WEEKDAY_LABELS.map((d, i) => (
                <button
                  key={d}
                  onClick={() => toggleWeekday(i)}
                  className={`py-2 rounded-md text-xs font-medium transition-colors ${selectedWeekdays.includes(i) ? "bg-primary text-primary-foreground" : "bg-background border border-border text-muted-foreground"}`}
                >
                  {d}
                </button>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <Button size="sm" className="flex-1" disabled={selectedWeekdays.length === 0 || loading} onClick={() => applyWeekdayInMonth(true)}>Bloquear no mês</Button>
              <Button size="sm" variant="outline" className="flex-1" disabled={selectedWeekdays.length === 0 || loading} onClick={() => applyWeekdayInMonth(false)}>Liberar no mês</Button>
            </div>
          </div>
        )}

        {/* Month nav */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={prevMonth} className="h-8 w-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium capitalize">{monthName}</span>
          <Button variant="ghost" size="icon" onClick={nextMonth} className="h-8 w-8">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div>
          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAY_LABELS.map(d => (
              <div key={d} className="text-center text-xs text-muted-foreground font-medium py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const date = new Date(year, month, day);
              const dateStr = fmt(date);
              const isPast = date < today;
              const isBlocked = blockedDates.includes(dateStr);
              const isToday = date.getTime() === today.getTime();
              const inRange = mode === "range" && rangeStart && (
                rangeEnd
                  ? (dateStr >= rangeStart && dateStr <= rangeEnd)
                  : dateStr === rangeStart
              );
              const isWeekdayHL = mode === "weekday" && selectedWeekdays.includes(date.getDay()) && !isPast;
              const clickable = !isPast && !loading && (mode === "single" || mode === "range");

              return (
                <button
                  key={day}
                  disabled={!clickable && mode !== "weekday"}
                  onClick={() => clickable && handleDayClick(dateStr)}
                  className={`
                    h-9 rounded-md text-sm font-medium transition-colors relative
                    ${isPast ? "text-muted-foreground/40 cursor-not-allowed" : clickable ? "hover:bg-accent cursor-pointer" : "cursor-default"}
                    ${isBlocked ? "bg-destructive text-destructive-foreground hover:bg-destructive/80" : ""}
                    ${inRange && !isBlocked ? "bg-primary/20 text-foreground" : ""}
                    ${isWeekdayHL && !isBlocked ? "ring-2 ring-primary ring-inset" : ""}
                    ${isToday && !isBlocked && !inRange ? "ring-1 ring-primary" : ""}
                  `}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
