import { useState } from "react";
import Papa from "papaparse";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type Group = { id: string; name: string };

type ParsedRow = {
  name: string;
  email?: string;
  phone?: string;
  guest_type: "adult" | "child" | "baby";
  group_name?: string;
};

function detectType(value: string): "adult" | "child" | "baby" {
  const v = (value || "").toLowerCase().trim();
  if (["bebê", "bebe", "baby"].includes(v)) return "baby";
  if (["criança", "crianca", "child", "kid"].includes(v)) return "child";
  return "adult";
}

function parseRows(rows: any[]): ParsedRow[] {
  return rows
    .map((r): ParsedRow | null => {
      const obj: Record<string, string> = {};
      Object.keys(r).forEach((k) => {
        obj[k.toLowerCase().trim()] = String(r[k] ?? "").trim();
      });
      const name = obj["nome"] || obj["name"] || obj["convidado"];
      if (!name) return null;
      return {
        name,
        email: obj["email"] || obj["e-mail"] || undefined,
        phone: obj["telefone"] || obj["whatsapp"] || obj["phone"] || obj["celular"] || undefined,
        guest_type: detectType(obj["tipo"] || obj["categoria"] || obj["type"] || ""),
        group_name: obj["grupo"] || obj["group"] || obj["familia"] || obj["família"] || undefined,
      };
    })
    .filter((r): r is ParsedRow => !!r);
}

function parseTextLines(text: string): ParsedRow[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      // formato: Nome [, email] [, telefone] [, grupo]
      const parts = line.split(/[,;\t]/).map((p) => p.trim());
      const name = parts[0];
      let email: string | undefined;
      let phone: string | undefined;
      let group: string | undefined;
      for (let i = 1; i < parts.length; i++) {
        const p = parts[i];
        if (!p) continue;
        if (p.includes("@")) email = p;
        else if (/\d/.test(p) && p.replace(/\D/g, "").length >= 8) phone = p;
        else group = p;
      }
      return { name, email, phone, group_name: group, guest_type: "adult" as const };
    })
    .filter((r) => !!r.name);
}

export default function ImportGuestsDialog({
  coupleId, groups, onImported,
}: {
  coupleId: string;
  groups: Group[];
  onImported: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [defaultGroupId, setDefaultGroupId] = useState<string>("none");
  const [preview, setPreview] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const { toast } = useToast();

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const rows = parseRows(res.data as any[]);
        if (rows.length === 0) {
          toast({ title: "CSV vazio ou sem coluna 'nome'", variant: "destructive" });
          return;
        }
        setPreview(rows);
      },
      error: (err) => toast({ title: "Erro ao ler CSV", description: err.message, variant: "destructive" }),
    });
  };

  const previewFromText = () => {
    const rows = parseTextLines(text);
    if (rows.length === 0) {
      toast({ title: "Cole pelo menos um nome", variant: "destructive" });
      return;
    }
    setPreview(rows);
  };

  const doImport = async () => {
    if (preview.length === 0) return;
    setImporting(true);

    // Resolver grupos por nome (criar se não existirem)
    const groupMap = new Map<string, string>();
    groups.forEach((g) => groupMap.set(g.name.toLowerCase(), g.id));
    const newGroupNames = Array.from(new Set(
      preview.map((r) => r.group_name?.trim()).filter((n): n is string => !!n && !groupMap.has(n.toLowerCase()))
    ));
    for (const gname of newGroupNames) {
      const { data } = await supabase.from("guest_groups").insert({ couple_id: coupleId, name: gname }).select("id, name").maybeSingle();
      if (data) groupMap.set(data.name.toLowerCase(), data.id);
    }

    const fallbackGroup = defaultGroupId !== "none" ? defaultGroupId : null;
    const payload = preview.map((r) => ({
      couple_id: coupleId,
      name: r.name,
      email: r.email || null,
      phone: r.phone || null,
      guest_type: r.guest_type,
      group_id: r.group_name ? (groupMap.get(r.group_name.toLowerCase()) || fallbackGroup) : fallbackGroup,
    }));

    const { error } = await supabase.from("wedding_guests").insert(payload);
    setImporting(false);
    if (error) {
      toast({ title: "Erro ao importar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `${payload.length} convidado(s) importado(s)!` });
    setText("");
    setPreview([]);
    setOpen(false);
    onImported();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setPreview([]); setText(""); } }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="h-4 w-4 mr-2" /> Importar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar convidados em massa</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div>
            <Label className="mb-2 block">Opção 1 — Arquivo CSV / Excel</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Colunas aceitas: <code>nome</code>, <code>email</code>, <code>telefone</code>, <code>tipo</code> (adulto/criança/bebê), <code>grupo</code>.
            </p>
            <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm">Selecionar arquivo .csv</span>
              <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
            </label>
          </div>

          <div className="border-t border-border pt-5">
            <Label className="mb-2 block">Opção 2 — Colar lista</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Um convidado por linha. Pode separar com vírgula: <code>Nome, email, telefone, grupo</code>
            </p>
            <Textarea
              rows={6}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={"Maria Silva, maria@email.com, 11999999999, Família da noiva\nJoão Santos, , 11988888888"}
            />
            <Button variant="outline" size="sm" className="mt-2" onClick={previewFromText}>
              Visualizar
            </Button>
          </div>

          {preview.length > 0 && (
            <div className="border-t border-border pt-5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Pré-visualização ({preview.length})</p>
                <div className="w-48">
                  <Select value={defaultGroupId} onValueChange={setDefaultGroupId}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Grupo padrão" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem grupo</SelectItem>
                      {groups.map((g) => (
                        <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto border rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="text-left p-2">Nome</th>
                      <th className="text-left p-2">Contato</th>
                      <th className="text-left p-2">Tipo</th>
                      <th className="text-left p-2">Grupo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 50).map((r, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2">{r.name}</td>
                        <td className="p-2 text-muted-foreground">{r.email || r.phone || "—"}</td>
                        <td className="p-2 capitalize">{r.guest_type === "adult" ? "Adulto" : r.guest_type === "child" ? "Criança" : "Bebê"}</td>
                        <td className="p-2">{r.group_name || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {preview.length > 50 && (
                  <p className="text-xs text-center text-muted-foreground p-2">+ {preview.length - 50} mais…</p>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={doImport} disabled={preview.length === 0 || importing}>
            <Check className="h-4 w-4 mr-2" />
            {importing ? "Importando..." : `Importar ${preview.length || ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}