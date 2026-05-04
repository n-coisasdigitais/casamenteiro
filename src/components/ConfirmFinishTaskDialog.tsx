import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

type Props = {
  coupleId: string | null;
  supplierId: string | null;
  categoryName: string | null;
  trigger: number; // change this number to open the dialog
  onDone?: () => void;
};

type Task = { id: string; title: string };

/**
 * Após contratar um fornecedor, busca tarefas abertas "Contratar [categoria]"
 * e pergunta ao casal antes de concluí-las (vinculando o fornecedor).
 */
export default function ConfirmFinishTaskDialog({ coupleId, supplierId, categoryName, trigger, onDone }: Props) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    if (!trigger || !coupleId || !categoryName) return;
    (async () => {
      const { data } = await supabase
        .from("wedding_tasks")
        .select("id, title")
        .eq("couple_id", coupleId)
        .eq("is_completed", false)
        .ilike("title", `%contratar%${categoryName.toLowerCase()}%`);
      if (data && data.length) {
        setTasks(data as Task[]);
        setOpen(true);
      } else {
        onDone?.();
      }
    })();
    // eslint-disable-next-line
  }, [trigger]);

  const confirm = async () => {
    const ids = tasks.map((t) => t.id);
    await (supabase.from("wedding_tasks") as any)
      .update({ is_completed: true, completed_at: new Date().toISOString(), supplier_id: supplierId })
      .in("id", ids);
    toast({ title: "Tarefa concluída", description: tasks.map((t) => t.title).join(", ") });
    setOpen(false);
    onDone?.();
  };

  const skip = () => {
    setOpen(false);
    onDone?.();
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Podemos finalizar essa tarefa?</AlertDialogTitle>
          <AlertDialogDescription>
            Você marcou um fornecedor como contratado. Encontramos {tasks.length === 1 ? "esta tarefa aberta" : "estas tarefas abertas"} relacionada{tasks.length === 1 ? "" : "s"}:
            <ul className="list-disc pl-5 mt-2 space-y-0.5 text-foreground">
              {tasks.map((t) => <li key={t.id}>{t.title}</li>)}
            </ul>
            Deseja marcar como concluída e vincular ao fornecedor contratado?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={skip}>Manter aberta</AlertDialogCancel>
          <AlertDialogAction onClick={confirm}>Sim, finalizar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
