import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function LeadNoteDialog({
  open,
  onOpenChange,
  quoteId,
  supplierId,
  authorId,
  existing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  quoteId: string;
  supplierId: string;
  authorId: string;
  existing?: any;
  onSaved?: () => void;
}) {
  const { toast } = useToast();
  const [note, setNote] = useState("");
  const [remindAt, setRemindAt] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNote(existing?.note || "");
    setRemindAt(existing?.remind_at ? new Date(existing.remind_at).toISOString().slice(0, 16) : "");
  }, [open, existing]);

  const save = async () => {
    setLoading(true);
    const payload: any = {
      quote_id: quoteId,
      supplier_id: supplierId,
      author_id: authorId,
      note,
      remind_at: remindAt ? new Date(remindAt).toISOString() : null,
    };
    const q = existing?.id
      ? supabase.from("lead_notes" as any).update(payload).eq("id", existing.id)
      : supabase.from("lead_notes" as any).insert(payload);
    const { error } = await q;
    setLoading(false);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Nota salva" });
    onOpenChange(false);
    onSaved?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Anotação interna</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nota (só você vê)</Label>
            <Textarea rows={5} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex.: cliente pediu para retomar após visita ao espaço." />
          </div>
          <div>
            <Label>Lembrete (opcional)</Label>
            <Input type="datetime-local" value={remindAt} onChange={(e) => setRemindAt(e.target.value)} />
            <p className="text-xs text-muted-foreground mt-1">Você receberá uma notificação nesta data.</p>
          </div>
          <Button onClick={save} disabled={loading} className="w-full">
            {loading ? "Salvando..." : "Salvar nota"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}