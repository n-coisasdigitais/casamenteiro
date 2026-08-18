import { useMemo, useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, Check, ArrowLeft, ArrowRight, Download, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatPhoneBR, onlyDigits } from "@/lib/phone";
import { traduzirErro } from "@/lib/errorMessages";

type Group = { id: string; name: string };
type Field = "ignore" | "name" | "phone" | "email" | "group" | "type" | "rsvp" | "table" | "notes";
type Step = "upload" | "map" | "preview" | "importing" | "result";
type DupMode = "ignore" | "update";

const FIELD_LABELS: Record<Field, string> = {
  ignore: "Ignorar",
  name: "Nome",
  phone: "Telefone / WhatsApp",
  email: "E-mail",
  group: "Grupo / Família",
  type: "Tipo (adulto/criança/bebê)",
  rsvp: "Confirmação (RSVP)",
  table: "Mesa",
  notes: "Observação",
};

function norm(s: string): string {
  return (s || "").toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function guessField(header: string): Field {
  const h = norm(header);
  if (!h) return "ignore";
  if (/(^|\b)(nome|convidado|name|nome completo|guest)($|\b)/.test(h)) return "name";
  if (/(telefone|celular|whatsapp|phone|fone|contato)/.test(h)) return "phone";
  if (/(e[- ]?mail|email)/.test(h)) return "email";
  if (/(grupo|familia|lado|categoria)/.test(h)) return "group";
  if (/(tipo|faixa|adulto|crianca)/.test(h)) return "type";
  if (/(confirm|rsvp|status|presenca)/.test(h)) return "rsvp";
  if (/(mesa|table)/.test(h)) return "table";
  if (/(obs|nota|coment|remark)/.test(h)) return "notes";
  return "ignore";
}

function detectType(value: string): "adult" | "child" | "baby" {
  const v = norm(value);
  if (!v) return "adult";
  if (/(bebe|baby|infant)/.test(v)) return "baby";
  if (/(crianca|child|kid|menor)/.test(v)) return "child";
  return "adult";
}

function detectRsvp(value: string): "confirmed" | "declined" | "pending" {
  const v = norm(value);
  if (!v) return "pending";
  if (/(sim|confirm|yes|^y$|^1$|presente|vai)/.test(v)) return "confirmed";
  if (/(nao|decl|no|^n$|^0$|ausente|nao vai)/.test(v)) return "declined";
  return "pending";
}

function normName(s: string): string {
  return norm(s).replace(/\s+/g, " ");
}

type FileRow = Record<string, string>;
type MappedRow = {
  name: string;
  phone: string;
  phoneDigits: string;
  email: string;
  group_name: string;
  guest_type: "adult" | "child" | "baby";
  rsvp_status: "confirmed" | "declined" | "pending";
  table_number: number | null;
  notes: string;
  warnings: string[];
  raw: FileRow;
};

type ResultRow = { raw: FileRow; status: "imported" | "updated" | "skipped" | "error"; reason?: string };

function parseCsv(file: File): Promise<{ headers: string[]; rows: FileRow[] }> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const rows = (res.data as any[]).map((r) => {
          const o: FileRow = {};
          Object.keys(r).forEach((k) => { o[k] = String(r[k] ?? "").trim(); });
          return o;
        });
        resolve({ headers: (res.meta.fields as string[]) || Object.keys(rows[0] || {}), rows });
      },
      error: reject,
    });
  });
}

async function parseXlsx(file: File): Promise<{ headers: string[]; rows: FileRow[] }> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json<any>(sheet, { defval: "", raw: false });
  const headers = json.length ? Object.keys(json[0]) : [];
  const rows: FileRow[] = json.map((r) => {
    const o: FileRow = {};
    headers.forEach((h) => { o[h] = String(r[h] ?? "").trim(); });
    return o;
  });
  return { headers, rows };
}

function rowsToCsv(rows: FileRow[], extraKey?: string): string {
  if (!rows.length) return "";
  const headers = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  if (extraKey && !headers.includes(extraKey)) headers.push(extraKey);
  return Papa.unparse({ fields: headers, data: rows.map((r) => headers.map((h) => r[h] ?? "")) });
}

export default function ImportGuestsDialog({
  coupleId, groups, onImported,
}: {
  coupleId: string;
  groups: Group[];
  onImported: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("upload");
  const [text, setText] = useState("");
  const [defaultGroupId, setDefaultGroupId] = useState<string>("none");
  const [dupMode, setDupMode] = useState<DupMode>("ignore");

  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<FileRow[]>([]);
  const [mapping, setMapping] = useState<Record<string, Field>>({});

  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ResultRow[]>([]);
  const { toast } = useToast();

  const reset = () => {
    setStep("upload"); setText(""); setHeaders([]); setRows([]); setMapping({});
    setDefaultGroupId("none"); setDupMode("ignore"); setProgress(0); setResults([]);
  };

  const loadParsed = (headers: string[], rows: FileRow[]) => {
    if (!rows.length) {
      toast({ title: "Arquivo vazio", variant: "destructive" });
      return;
    }
    const map: Record<string, Field> = {};
    headers.forEach((h) => { map[h] = guessField(h); });
    setHeaders(headers); setRows(rows); setMapping(map); setStep("map");
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const isXlsx = /\.(xlsx|xls)$/i.test(file.name);
      const parsed = isXlsx ? await parseXlsx(file) : await parseCsv(file);
      loadParsed(parsed.headers.filter(Boolean), parsed.rows);
    } catch (err: any) {
      toast({ title: "Erro ao ler arquivo", description: traduzirErro(err) || String(err), variant: "destructive" });
    } finally {
      e.target.value = "";
    }
  };

  const loadFromText = () => {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (!lines.length) { toast({ title: "Cole pelo menos um nome", variant: "destructive" }); return; }
    const heads = ["nome", "email", "telefone", "grupo"];
    const rows: FileRow[] = lines.map((line) => {
      const parts = line.split(/[,;\t]/).map((p) => p.trim());
      const o: FileRow = { nome: parts[0] || "", email: "", telefone: "", grupo: "" };
      for (let i = 1; i < parts.length; i++) {
        const p = parts[i]; if (!p) continue;
        if (p.includes("@")) o.email = p;
        else if (onlyDigits(p).length >= 8) o.telefone = p;
        else o.grupo = p;
      }
      return o;
    });
    loadParsed(heads, rows);
  };

  const nameMapped = useMemo(() => Object.values(mapping).includes("name"), [mapping]);

  const mappedRows: MappedRow[] = useMemo(() => {
    if (step === "upload") return [];
    const byField: Partial<Record<Field, string>> = {};
    Object.entries(mapping).forEach(([col, field]) => {
      if (field !== "ignore" && !byField[field]) byField[field] = col;
    });
    return rows.map((r) => {
      const warnings: string[] = [];
      const name = (byField.name ? r[byField.name!] : "").toString().replace(/\s+/g, " ").trim();
      const phoneRaw = byField.phone ? r[byField.phone!] : "";
      const phoneDigits = onlyDigits(phoneRaw);
      const phone = phoneRaw ? (formatPhoneBR(phoneRaw) || phoneRaw) : "";
      if (phoneRaw && phoneDigits.length < 8) warnings.push("Telefone parece inválido");
      const email = byField.email ? r[byField.email!].trim() : "";
      if (email && !/^\S+@\S+\.\S+$/.test(email)) warnings.push("E-mail inválido");
      const typeRaw = byField.type ? r[byField.type!] : "";
      const guest_type = detectType(typeRaw);
      if (typeRaw && guest_type === "adult" && !/adult|adulto/.test(norm(typeRaw))) warnings.push("Tipo não reconhecido, assumindo adulto");
      const rsvp_status = byField.rsvp ? detectRsvp(r[byField.rsvp!]) : "pending";
      const tableRaw = byField.table ? r[byField.table!] : "";
      const table_number = tableRaw ? (parseInt(onlyDigits(tableRaw), 10) || null) : null;
      return {
        name, phone, phoneDigits, email,
        group_name: (byField.group ? r[byField.group!] : "").trim(),
        guest_type, rsvp_status, table_number,
        notes: (byField.notes ? r[byField.notes!] : "").trim(),
        warnings, raw: r,
      };
    });
  }, [rows, mapping, step]);

  const warningCount = mappedRows.filter((r) => r.warnings.length > 0).length;

  const runImport = async () => {
    setStep("importing"); setProgress(0);
    const fallbackGroup = defaultGroupId !== "none" ? defaultGroupId : null;

    // 1. Resolver grupos (criar ausentes em batch)
    const groupMap = new Map<string, string>();
    groups.forEach((g) => groupMap.set(norm(g.name), g.id));
    const needed = Array.from(new Set(
      mappedRows.map((r) => r.group_name).filter((n) => n && !groupMap.has(norm(n)))
    ));
    for (const gname of needed) {
      const { data } = await supabase.from("guest_groups").insert({ couple_id: coupleId, name: gname }).select("id, name").maybeSingle();
      if (data) groupMap.set(norm(data.name), data.id);
    }

    // 2. Carregar existentes para detecção de duplicados
    const { data: existing } = await supabase.from("wedding_guests").select("id, name, phone").eq("couple_id", coupleId);
    const dupMap = new Map<string, string>(); // key -> id
    (existing || []).forEach((g) => {
      const key = `${normName(g.name || "")}|${onlyDigits(g.phone || "")}`;
      dupMap.set(key, g.id);
    });

    // 3. Processar em lotes
    const out: ResultRow[] = [];
    const total = mappedRows.length;
    for (let i = 0; i < total; i++) {
      const r = mappedRows[i];
      if (!r.name) { out.push({ raw: r.raw, status: "error", reason: "Nome vazio" }); }
      else {
        const key = `${normName(r.name)}|${r.phoneDigits}`;
        const existingId = dupMap.get(key);
        const payload = {
          couple_id: coupleId,
          name: r.name,
          email: r.email || null,
          phone: r.phone || null,
          guest_type: r.guest_type,
          rsvp_status: r.rsvp_status,
          table_number: r.table_number,
          notes: r.notes || null,
          group_id: r.group_name ? (groupMap.get(norm(r.group_name)) || fallbackGroup) : fallbackGroup,
        };
        if (existingId) {
          if (dupMode === "ignore") {
            out.push({ raw: r.raw, status: "skipped", reason: `Já existe: ${r.name}` });
          } else {
            const { error } = await supabase.from("wedding_guests").update(payload).eq("id", existingId);
            out.push({ raw: r.raw, status: error ? "error" : "updated", reason: error?.message });
          }
        } else {
          const { data, error } = await supabase.from("wedding_guests").insert(payload).select("id").maybeSingle();
          if (error) out.push({ raw: r.raw, status: "error", reason: error.message });
          else {
            out.push({ raw: r.raw, status: "imported" });
            if (data?.id) dupMap.set(key, data.id);
          }
        }
      }
      if ((i + 1) % 5 === 0 || i === total - 1) setProgress(Math.round(((i + 1) / total) * 100));
    }
    setResults(out); setStep("result"); onImported();
  };

  const downloadErrors = () => {
    const errs = results.filter((r) => r.status === "error").map((r) => ({ ...r.raw, erro: r.reason || "" }));
    if (!errs.length) return;
    const csv = rowsToCsv(errs, "erro");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "linhas-com-erro.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const counts = useMemo(() => ({
    imported: results.filter((r) => r.status === "imported").length,
    updated: results.filter((r) => r.status === "updated").length,
    skipped: results.filter((r) => r.status === "skipped").length,
    error: results.filter((r) => r.status === "error").length,
  }), [results]);

  const setFieldFor = (col: string, val: Field) => {
    setMapping((m) => {
      const next = { ...m };
      // se val é único (name/phone/email/etc), remove de outros
      if (val !== "ignore") {
        Object.keys(next).forEach((k) => { if (k !== col && next[k] === val) next[k] = "ignore"; });
      }
      next[col] = val;
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="h-4 w-4 mr-2" /> Importar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === "upload" && "Importar convidados"}
            {step === "map" && "Mapear colunas"}
            {step === "preview" && "Conferir e importar"}
            {step === "importing" && "Importando..."}
            {step === "result" && "Importação concluída"}
          </DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-5">
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
              Exporte sua lista do <strong>iCasei</strong> ou <strong>Casar.com</strong> em CSV ou Excel e envie aqui.
              Aceitamos também planilhas do Google Sheets e Excel.
            </div>
            <div>
              <Label className="mb-2 block">Arquivo (CSV, XLSX ou XLS)</Label>
              <label className="flex items-center justify-center gap-2 p-6 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm">Selecionar arquivo</span>
                <input type="file" accept=".csv,.xlsx,.xls,text/csv" className="hidden" onChange={handleFile} />
              </label>
            </div>
            <div className="border-t border-border pt-5">
              <Label className="mb-2 block">Ou colar lista</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Um convidado por linha: <code>Nome, email, telefone, grupo</code>
              </p>
              <Textarea rows={5} value={text} onChange={(e) => setText(e.target.value)}
                placeholder={"Maria Silva, maria@email.com, 11999999999, Família da noiva\nJoão Santos, , 11988888888"} />
              <Button variant="outline" size="sm" className="mt-2" onClick={loadFromText}>Continuar com lista colada</Button>
            </div>
          </div>
        )}

        {step === "map" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Confira para qual campo cada coluna do arquivo corresponde. Adivinhamos automaticamente; corrija se necessário.
            </p>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-2">Coluna do arquivo</th>
                    <th className="text-left p-2">Exemplo (1ª linha)</th>
                    <th className="text-left p-2 w-56">Mapear para</th>
                  </tr>
                </thead>
                <tbody>
                  {headers.map((h) => (
                    <tr key={h} className="border-t">
                      <td className="p-2 font-medium">{h}</td>
                      <td className="p-2 text-muted-foreground truncate max-w-xs">{rows[0]?.[h] || "—"}</td>
                      <td className="p-2">
                        <Select value={mapping[h] || "ignore"} onValueChange={(v) => setFieldFor(h, v as Field)}>
                          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {(Object.keys(FIELD_LABELS) as Field[]).map((f) => (
                              <SelectItem key={f} value={f}>{FIELD_LABELS[f]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!nameMapped && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 mt-0.5" />
                <span>É obrigatório mapear uma coluna para <strong>Nome</strong>.</span>
              </div>
            )}
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span><strong>{mappedRows.length}</strong> linhas no total{warningCount > 0 && <span className="text-amber-600"> · {warningCount} com aviso</span>}</span>
              <div className="w-56">
                <Select value={defaultGroupId} onValueChange={setDefaultGroupId}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Grupo padrão" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem grupo padrão</SelectItem>
                    {groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="mb-2 block text-sm">Quando o convidado já existir (mesmo nome + telefone):</Label>
              <RadioGroup value={dupMode} onValueChange={(v) => setDupMode(v as DupMode)} className="flex gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <RadioGroupItem value="ignore" /> Ignorar duplicados
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <RadioGroupItem value="update" /> Atualizar dados existentes
                </label>
              </RadioGroup>
            </div>

            <div className="border rounded-lg overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-2">Nome</th>
                    <th className="text-left p-2">Telefone</th>
                    <th className="text-left p-2">E-mail</th>
                    <th className="text-left p-2">Tipo</th>
                    <th className="text-left p-2">Grupo</th>
                    <th className="text-left p-2">RSVP</th>
                    <th className="text-left p-2">Mesa</th>
                  </tr>
                </thead>
                <tbody>
                  {mappedRows.slice(0, 10).map((r, i) => (
                    <tr key={i} className={`border-t ${r.warnings.length ? "bg-amber-50" : ""}`}>
                      <td className="p-2">{r.name || <span className="text-destructive">(vazio)</span>}</td>
                      <td className="p-2">{r.phone || "—"}</td>
                      <td className="p-2">{r.email || "—"}</td>
                      <td className="p-2">{r.guest_type === "adult" ? "Adulto" : r.guest_type === "child" ? "Criança" : "Bebê"}</td>
                      <td className="p-2">{r.group_name || "—"}</td>
                      <td className="p-2">{r.rsvp_status === "confirmed" ? "Confirmado" : r.rsvp_status === "declined" ? "Recusado" : "Pendente"}</td>
                      <td className="p-2">{r.table_number ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {mappedRows.length > 10 && (
                <p className="text-xs text-center text-muted-foreground p-2">
                  Prévia das 10 primeiras linhas · {mappedRows.length - 10} restantes serão processadas na importação
                </p>
              )}
            </div>
          </div>
        )}

        {step === "importing" && (
          <div className="py-8 space-y-3">
            <p className="text-sm text-center text-muted-foreground">Importando convidados...</p>
            <Progress value={progress} />
            <p className="text-xs text-center text-muted-foreground">{progress}%</p>
          </div>
        )}

        {step === "result" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Importados</p>
                <p className="text-2xl font-semibold text-emerald-600">{counts.imported}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Atualizados</p>
                <p className="text-2xl font-semibold text-blue-600">{counts.updated}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Ignorados</p>
                <p className="text-2xl font-semibold text-slate-600">{counts.skipped}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Com erro</p>
                <p className="text-2xl font-semibold text-destructive">{counts.error}</p>
              </div>
            </div>

            {counts.error > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Linhas com erro</p>
                  <Button variant="outline" size="sm" onClick={downloadErrors}>
                    <Download className="h-4 w-4 mr-2" /> Baixar CSV
                  </Button>
                </div>
                <div className="max-h-48 overflow-y-auto border rounded-lg">
                  <table className="w-full text-xs">
                    <thead className="bg-muted sticky top-0">
                      <tr><th className="text-left p-2">Nome</th><th className="text-left p-2">Motivo</th></tr>
                    </thead>
                    <tbody>
                      {results.filter((r) => r.status === "error").slice(0, 50).map((r, i) => (
                        <tr key={i} className="border-t">
                          <td className="p-2">{r.raw.nome || r.raw.name || r.raw.Nome || "—"}</td>
                          <td className="p-2 text-destructive">{r.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {counts.skipped > 0 && (
              <div className="text-xs text-muted-foreground">
                {counts.skipped} convidado(s) já existiam no seu casamento e foram ignorados.
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          {step === "upload" && (
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          )}
          {step === "map" && (
            <>
              <Button variant="ghost" onClick={() => setStep("upload")}><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Button>
              <Button onClick={() => setStep("preview")} disabled={!nameMapped}>
                Avançar <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </>
          )}
          {step === "preview" && (
            <>
              <Button variant="ghost" onClick={() => setStep("map")}><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Button>
              <Button onClick={runImport} disabled={mappedRows.length === 0}>
                <Check className="h-4 w-4 mr-2" /> Importar {mappedRows.length}
              </Button>
            </>
          )}
          {step === "result" && (
            <Button onClick={() => { setOpen(false); reset(); }}>Concluir</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}