import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { FileText, Upload, Trash2, ShieldCheck } from "lucide-react";

export const TIPOS_DOC = [
  { value: "identidade", label: "RG ou CNH" },
  { value: "cpf", label: "CPF" },
  { value: "comprovante_residencia", label: "Comprovante de residência" },
  { value: "certificado", label: "Certificado / curso" },
  { value: "outro", label: "Outro" },
];

export function docStatusLabel(s: string) {
  return { pendente: "Em análise", aprovado: "Aprovado", rejeitado: "Rejeitado" }[s] || s;
}

export function verificacaoLabel(s?: string | null) {
  return {
    nao_enviado: "Não verificado",
    em_analise: "Verificação em análise",
    verificado: "Profissional verificado",
    rejeitado: "Verificação recusada",
  }[s || "nao_enviado"] || "Não verificado";
}

export default function StaffDocumentsTab({
  staff,
  onChanged,
}: {
  staff: any;
  onChanged?: () => void;
}) {
  const { toast } = useToast();
  const [docs, setDocs] = useState<any[]>([]);
  const [tipo, setTipo] = useState("identidade");
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const { data } = await (supabase.from("staff_documents" as any) as any)
      .select("*").eq("staff_id", staff.id).order("created_at", { ascending: false });
    setDocs(data || []);
  };

  useEffect(() => { if (staff?.id) load(); /* eslint-disable-next-line */ }, [staff?.id]);

  const enviar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !staff?.user_id) return;
    if (file.size > 5 * 1024 * 1024) {
      return toast({ title: "Arquivo muito grande", description: "Máximo de 5MB.", variant: "destructive" });
    }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${staff.user_id}/${tipo}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("staff-docs").upload(path, file);
    if (upErr) {
      setUploading(false);
      return toast({ title: "Erro ao enviar", description: upErr.message, variant: "destructive" });
    }
    const { error } = await (supabase.from("staff_documents" as any) as any).insert({
      staff_id: staff.id, tipo, file_path: path, file_name: file.name,
    });
    if (!error) {
      await (supabase.from("staff_profiles" as any) as any)
        .update({ verificacao_status: "em_analise" }).eq("id", staff.id);
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Documento enviado", description: "Nossa equipe vai analisar em breve." });
    load();
    onChanged?.();
  };

  const abrir = async (d: any) => {
    const { data, error } = await supabase.storage.from("staff-docs").createSignedUrl(d.file_path, 60);
    if (error || !data) return toast({ title: "Erro ao abrir arquivo", variant: "destructive" });
    window.open(data.signedUrl, "_blank");
  };

  const remover = async (d: any) => {
    await supabase.storage.from("staff-docs").remove([d.file_path]);
    await (supabase.from("staff_documents" as any) as any).delete().eq("id", d.id);
    toast({ title: "Documento removido" });
    load();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" /> Verificação de documentos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Envie seus documentos para receber o selo de profissional verificado. Eles são privados e vistos apenas pela nossa equipe.
        </p>
        {staff.verificacao_obs && (
          <p className="text-sm text-destructive">Observação da equipe: {staff.verificacao_obs}</p>
        )}
        <div className="flex flex-wrap gap-2 items-center">
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TIPOS_DOC.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <input ref={inputRef} type="file" className="hidden" accept="image/*,application/pdf" onChange={enviar} />
          <Button size="sm" disabled={uploading} onClick={() => inputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-1" /> {uploading ? "Enviando..." : "Enviar documento"}
          </Button>
        </div>

        {docs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum documento enviado ainda.</p>
        ) : (
          <ul className="space-y-2">
            {docs.map((d) => (
              <li key={d.id} className="flex items-center gap-2 justify-between border rounded-md p-2">
                <button onClick={() => abrir(d)} className="flex items-center gap-2 text-sm text-left hover:underline">
                  <FileText className="h-4 w-4 shrink-0" />
                  <span>{TIPOS_DOC.find((t) => t.value === d.tipo)?.label || d.tipo}</span>
                  <span className="text-muted-foreground truncate max-w-40">{d.file_name}</span>
                </button>
                <div className="flex items-center gap-2">
                  <Badge variant={d.status === "aprovado" ? "default" : d.status === "rejeitado" ? "destructive" : "secondary"}>
                    {docStatusLabel(d.status)}
                  </Badge>
                  <Button size="sm" variant="ghost" onClick={() => remover(d)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
