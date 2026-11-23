import { traduzirErro } from "@/lib/errorMessages";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Check, Clock, FileText, Send, ShieldCheck, Trash2, Upload } from "lucide-react";
import ArquivoViewerDialog, { type ArquivoView } from "@/components/staff/ArquivoViewerDialog";
import { podeEnviarVerificacao, requisitosVerificacao } from "@/lib/staffVerificacao";

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
  return (
    {
      nao_enviado: "Não verificado",
      em_analise: "Verificação em análise",
      verificado: "Profissional verificado",
      rejeitado: "Verificação recusada",
    }[s || "nao_enviado"] || "Não verificado"
  );
}

export default function StaffDocumentsTab({ staff, onChanged }: { staff: any; onChanged?: () => void }) {
  const { toast } = useToast();
  const [docs, setDocs] = useState<any[]>([]);
  const [tipo, setTipo] = useState("identidade");
  const [uploading, setUploading] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [ver, setVer] = useState<ArquivoView | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const status: string = staff?.verificacao_status || "nao_enviado";
  const podeMexer = status === "nao_enviado" || status === "rejeitado";
  const requisitos = requisitosVerificacao(staff, docs);
  const faltam = requisitos.filter((r) => !r.ok);
  const pronto = podeEnviarVerificacao(staff, docs);

  const load = async () => {
    const { data } = await (supabase.from("staff_documents" as any) as any)
      .select("*")
      .eq("staff_id", staff.id)
      .order("created_at", { ascending: false });
    setDocs(data || []);
  };

  useEffect(() => {
    if (staff?.id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staff?.id]);

  const enviarArquivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !staff?.user_id) return;
    if (file.size > 5 * 1024 * 1024) {
      return toast({ title: "Arquivo muito grande", description: "Máximo de 5MB.", variant: "destructive" });
    }
    setUploading(true);
    const ext = (file.name.split(".").pop() || "bin").toLowerCase();
    const path = `${staff.user_id}/${tipo}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("staff-docs").upload(path, file);
    if (upErr) {
      setUploading(false);
      return toast({ title: "Erro ao enviar", description: traduzirErro(upErr), variant: "destructive" });
    }
    const { error } = await (supabase.from("staff_documents" as any) as any).insert({
      staff_id: staff.id,
      tipo,
      file_path: path,
      file_name: file.name,
    });
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
    if (error) return toast({ title: "Erro", description: traduzirErro(error), variant: "destructive" });
    // Enviar o arquivo NÃO manda mais para análise. O profissional envia quando tudo estiver completo.
    toast({
      title: "Documento adicionado",
      description:
        status === "em_analise" || status === "verificado"
          ? "A equipe vai ver junto com o seu perfil."
          : "Quando o perfil estiver completo, toque em “Enviar para verificação”.",
    });
    load();
    onChanged?.();
  };

  const remover = async (d: any) => {
    await supabase.storage.from("staff-docs").remove([d.file_path]);
    await (supabase.from("staff_documents" as any) as any).delete().eq("id", d.id);
    toast({ title: "Documento removido" });
    load();
  };

  const enviarParaVerificacao = async () => {
    if (!pronto) return;
    setEnviando(true);
    const { error } = await (supabase.from("staff_profiles" as any) as any)
      .update({ verificacao_status: "em_analise" })
      .eq("id", staff.id);
    setEnviando(false);
    if (error)
      return toast({ title: "Não foi possível enviar", description: traduzirErro(error), variant: "destructive" });
    toast({ title: "Enviado para verificação", description: "Nossa equipe analisa em até 2 dias úteis." });
    onChanged?.();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-4 w-4" /> Verificação do perfil
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* situação */}
        {status === "verificado" ? (
          <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            <b>Perfil verificado.</b> O selo aparece para os fornecedores.
          </p>
        ) : status === "em_analise" ? (
          <p className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <Clock className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              <b>Em análise.</b> Enviado
              {staff.verificacao_enviada_em
                ? ` em ${new Date(staff.verificacao_enviada_em).toLocaleDateString("pt-BR")}`
                : ""}
              . Avisamos você assim que a equipe decidir.
            </span>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Complete os itens abaixo e envie para receber o selo de profissional verificado. Os documentos são privados
            e vistos apenas pela nossa equipe.
          </p>
        )}

        {status === "rejeitado" && staff.verificacao_obs && (
          <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <b>O que precisa ajustar:</b> {staff.verificacao_obs}
          </p>
        )}

        {/* dados mínimos */}
        {podeMexer && (
          <div className="rounded-md border p-3">
            <p className="mb-2 text-sm font-semibold">
              Para enviar ({requisitos.length - faltam.length} de {requisitos.length})
            </p>
            <ul className="space-y-1.5 text-sm">
              {requisitos.map((r) => (
                <li key={r.key} className="flex items-center gap-2">
                  <span
                    className={`grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border ${
                      r.ok ? "border-emerald-600 bg-emerald-600 text-white" : "border-neutral-300"
                    }`}
                  >
                    {r.ok && <Check className="h-3 w-3" />}
                  </span>
                  {r.ok ? (
                    <span className="text-muted-foreground">{r.label}</span>
                  ) : r.onde === "perfil" ? (
                    <Link to="/profissional/onboarding" className="font-semibold underline-offset-2 hover:underline">
                      {r.label}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className="text-left font-semibold underline-offset-2 hover:underline"
                      onClick={() => {
                        setTipo("identidade");
                        inputRef.current?.click();
                      }}
                    >
                      {r.label}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* envio de arquivos */}
        <div className="flex flex-wrap items-center gap-2">
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIPOS_DOC.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept="image/*,application/pdf"
            onChange={enviarArquivo}
          />
          <Button size="sm" variant="outline" disabled={uploading} onClick={() => inputRef.current?.click()}>
            <Upload className="mr-1 h-4 w-4" /> {uploading ? "Enviando..." : "Adicionar documento"}
          </Button>
        </div>

        {docs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum documento adicionado ainda.</p>
        ) : (
          <ul className="space-y-2">
            {docs.map((d) => {
              const label = TIPOS_DOC.find((t) => t.value === d.tipo)?.label || d.tipo;
              return (
                <li key={d.id} className="flex items-center justify-between gap-2 rounded-md border p-2">
                  <button
                    type="button"
                    onClick={() => setVer({ titulo: label, file_path: d.file_path, file_name: d.file_name })}
                    className="flex min-w-0 items-center gap-2 text-left text-sm hover:underline"
                  >
                    <FileText className="h-4 w-4 shrink-0" />
                    <span>{label}</span>
                    <span className="max-w-40 truncate text-muted-foreground">{d.file_name}</span>
                  </button>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        d.status === "aprovado" ? "default" : d.status === "rejeitado" ? "destructive" : "secondary"
                      }
                    >
                      {docStatusLabel(d.status)}
                    </Badge>
                    {(podeMexer || d.status === "rejeitado") && (
                      <Button size="sm" variant="ghost" aria-label="Remover documento" onClick={() => remover(d)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {podeMexer && (
          <div className="flex flex-col gap-1.5 border-t pt-3">
            <Button disabled={!pronto || enviando} onClick={enviarParaVerificacao} className="self-start">
              <Send className="mr-1 h-4 w-4" />
              {enviando
                ? "Enviando..."
                : status === "rejeitado"
                  ? "Reenviar para verificação"
                  : "Enviar para verificação"}
            </Button>
            {!pronto && (
              <p className="text-xs text-muted-foreground">
                Falta{faltam.length > 1 ? "m" : ""} {faltam.length} {faltam.length > 1 ? "itens" : "item"} para liberar
                o envio.
              </p>
            )}
          </div>
        )}
      </CardContent>

      <ArquivoViewerDialog arquivo={ver} onClose={() => setVer(null)} />
    </Card>
  );
}
