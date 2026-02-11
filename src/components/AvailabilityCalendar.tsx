import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Props = {
  supplierId: string;
};

export default function AvailabilityCalendar({ supplierId }: Props) {
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

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

  const toggleDate = async (dateStr: string) => {
    setLoading(true);
    if (blockedDates.includes(dateStr)) {
      // Unblock
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
      // Block
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

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const monthName = currentDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="font-serif text-lg">Disponibilidade</CardTitle>
          <Badge variant="secondary" className="text-xs">
            {blockedDates.length} data(s) bloqueada(s)
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">Clique nas datas para bloquear/desbloquear. Datas em vermelho estão indisponíveis.</p>
      </CardHeader>
      <CardContent>
        {/* Month nav */}
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="icon" onClick={prevMonth} className="h-8 w-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium capitalize">{monthName}</span>
          <Button variant="ghost" size="icon" onClick={nextMonth} className="h-8 w-8">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Week headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {weekDays.map(d => (
            <div key={d} className="text-center text-xs text-muted-foreground font-medium py-1">{d}</div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells for first week offset */}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const date = new Date(year, month, day);
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const isPast = date < today;
            const isBlocked = blockedDates.includes(dateStr);
            const isToday = date.getTime() === today.getTime();

            return (
              <button
                key={day}
                disabled={isPast || loading}
                onClick={() => toggleDate(dateStr)}
                className={`
                  h-9 rounded-md text-sm font-medium transition-colors
                  ${isPast ? "text-muted-foreground/40 cursor-not-allowed" : "hover:bg-accent cursor-pointer"}
                  ${isBlocked ? "bg-destructive text-destructive-foreground hover:bg-destructive/80" : ""}
                  ${isToday && !isBlocked ? "ring-1 ring-primary" : ""}
                `}
              >
                {day}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
