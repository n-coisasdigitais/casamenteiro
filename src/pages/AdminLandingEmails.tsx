import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Download, Loader2, Mail, Trash2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Lead = {
  id: string;
  email: string;
  status: "novo" | "contatado" | "convertido" | "descartado";
  origem: string;
  notes: string | null;
  created_at: string;
};

const STATUS_LABEL: Record<Lead["status"], string> = {
  novo: "Novo",
  contatado: "Contatado",
  convertido: "Convertido",
  descartado: "Descartado",
};

const STATUS_VARIANT: Record<Lead["status"], "default" | "secondary" | "destructive" | "outline"> = {
  novo: "default",
  contatado: "secondary",
  convertido: "outline",
  descartado: "destructive",
};

export default function AdminLandingEmails() {
  const { toast } = useToast();
  const [rows, setRows] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | Lead["status"]>("all");
  const [search, setSearch] = useState("");
  const [toDelete, setToDelete] = useState<Lead | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase
      .from("fornecedor_landing_emails" as any)
      .select("id,email,status,origem,notes,created_at")
      .order("created_at", { ascending: false }) as any);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    setRows((data || []) as Lead[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id: string, status: Lead["status"]) => {
    setRows((p) => p.map((r) => (r.id === id ? { ...r, status } : r)));
    const { error } = await (supabase.from("fornecedor_landing_emails" as any) as any)
      .update({ status }).eq("id", id);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); load(); }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    const { error } = await (supabase.from("fornecedor_landing_emails" as any) as any)
      .delete().eq("id", toDelete.id);
    setToDelete(null);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "E-mail removido" });
    load();
  };

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (filter !== "all" && r.status !== filter) return false;
      if (search && !r.email.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [rows, filter, search]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length, novo: 0, contatado: 0, convertido: 0, descartado: 0 };
    rows.forEach((r) => { c[r.status] = (c[r.status] || 0) + 1; });
    return c;
  }, [rows]);

  const exportCsv = () => {
    const header = "email,status,origem,created_at\n";
    const body = filtered
      .map((r) => [r.email, r.status, r.origem, r.created_at].map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `emails-fornecedor-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="px-4 md:px-8 py-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Mail className="h-5 w-5" /> E-mails capturados</h1>
          <p className="text-sm text-muted-foreground">Captados pelo CTA da página /fornecedor.</p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCsv} disabled={!filtered.length}>
          <Download className="h-4 w-4 mr-1" /> Exportar CSV
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 items-center mb-4">
        {(["all", "novo", "contatado", "convertido", "descartado"] as const).map((f) => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>
            {f === "all" ? "Todos" : STATUS_LABEL[f]}
            <Badge variant="secondary" className="ml-2">{counts[f] ?? 0}</Badge>
          </Button>
        ))}
        <Input
          placeholder="Buscar por e-mail…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs ml-auto"
        />
      </div>

      {loading ? (
        <div className="py-16 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Nenhum e-mail encontrado.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-3 flex items-center gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium truncate">{r.email}</span>
                    <Badge variant={STATUS_VARIANT[r.status]} className="text-xs">{STATUS_LABEL[r.status]}</Badge>
                    <span className="text-xs text-muted-foreground">{r.origem}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(r.created_at).toLocaleString("pt-BR")}
                  </p>
                </div>
                <Select value={r.status} onValueChange={(v) => updateStatus(r.id, v as Lead["status"])}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(STATUS_LABEL) as Lead["status"][]).map((s) => (
                      <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="icon" onClick={() => setToDelete(r)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!toDelete} onOpenChange={(v) => !v && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover este e-mail?</AlertDialogTitle>
            <AlertDialogDescription>
              "{toDelete?.email}" será excluído permanentemente da base.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}