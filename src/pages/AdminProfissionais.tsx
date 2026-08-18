import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import SEO from "@/components/SEO";
import { FileText, ShieldCheck, Search } from "lucide-react";
import { TIPOS_DOC, verificacaoLabel } from "@/components/staff/StaffDocumentsTab";
import { traduzirErro } from "@/lib/errorMessages";

export default function AdminProfissionais() {
  const { toast } = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [docs, setDocs] = useState<Record<string, any[]>>({});
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("todos");
  const [obs, setObs] = useState<Record<string, string>>({});

  const load = async () => {
    const { data } = await (supabase.from("staff_profiles" as any) as any)
      .select("*").order("created_at", { ascending: false });
    setRows(data || []);
    const { data: dd } = await (supabase.from("staff_documents" as any) as any)
      .select("*").order("created_at", { ascending: false });
    const map: Record<string, any[]> = {};
    (dd || []).forEach((d: any) => { (map[d.staff_id] ||= []).push(d); });
    setDocs(map);
  };

  useEffect(() => { load(); }, []);

  const abrir = async (d: any) => {
    const { data, error } = await supabase.storage.from("staff-docs").createSignedUrl(d.file_path, 60);
    if (error || !data) return toast({ title: "Erro ao abrir arquivo", variant: "destructive" });
    window.open(data.signedUrl, "_blank");
  };

  const decidirDoc = async (d: any, novo: "aprovado" | "rejeitado") => {
    await (supabase.from("staff_documents" as any) as any).update({ status: novo }).eq("id", d.id);
    load();
  };

  const decidirPerfil = async (s: any, novo: "verificado" | "rejeitado") => {
    const { error } = await (supabase.from("staff_profiles" as any) as any).update({
      verificacao_status: novo,
      verificado_em: novo === "verificado" ? new Date().toISOString() : null,
      verificacao_obs: obs[s.id] || null,
    }).eq("id", s.id);
    if (error) return toast({ title: "Erro", description: traduzirErro(error), variant: "destructive" });
    toast({ title: novo === "verificado" ? "Profissional verificado" : "Verificação recusada" });
    load();
  };

  const filtradas = rows.filter((r) => {
    const okBusca = !busca ||
      (r.nome || "").toLowerCase().includes(busca.toLowerCase()) ||
      (r.cidade || "").toLowerCase().includes(busca.toLowerCase());
    const okStatus = status === "todos" || (r.verificacao_status || "nao_enviado") === status;
    return okBusca && okStatus;
  });

  return (
    <div className="space-y-4">
      <SEO title="Profissionais — Admin" noIndex />
      <h1 className="text-2xl font-bold">Profissionais</h1>

      <div className="flex flex-wrap gap-2">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-2 top-3 text-muted-foreground" />
          <Input className="pl-8 w-64" placeholder="Buscar por nome ou cidade" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="nao_enviado">Não verificado</SelectItem>
            <SelectItem value="em_analise">Em análise</SelectItem>
            <SelectItem value="verificado">Verificado</SelectItem>
            <SelectItem value="rejeitado">Recusado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtradas.length === 0 && <p className="text-sm text-muted-foreground">Nenhum profissional encontrado.</p>}

      {filtradas.map((s) => (
        <Card key={s.id}>
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium flex items-center gap-2">
                  {s.nome}
                  {s.verificacao_status === "verificado" && <ShieldCheck className="h-4 w-4 text-primary" />}
                </p>
                <p className="text-sm text-muted-foreground">
                  {s.cidade}{s.estado ? ` - ${s.estado}` : ""} • {(s.funcoes || []).length} funções •{" "}
                  {s.rating ? `${s.rating}★ (${s.review_count})` : "sem avaliações"}
                </p>
              </div>
              <Badge variant={s.verificacao_status === "verificado" ? "default" : s.verificacao_status === "rejeitado" ? "destructive" : "secondary"}>
                {verificacaoLabel(s.verificacao_status)}
              </Badge>
            </div>

            <div className="space-y-1">
              {(docs[s.id] || []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem documentos enviados.</p>
              ) : (
                (docs[s.id] || []).map((d) => (
                  <div key={d.id} className="flex flex-wrap items-center gap-2 justify-between text-sm border rounded-md p-2">
                    <button onClick={() => abrir(d)} className="flex items-center gap-2 hover:underline">
                      <FileText className="h-4 w-4" />
                      {TIPOS_DOC.find((t) => t.value === d.tipo)?.label || d.tipo}
                      <span className="text-muted-foreground">{d.file_name}</span>
                    </button>
                    <div className="flex gap-2 items-center">
                      <Badge variant={d.status === "aprovado" ? "default" : d.status === "rejeitado" ? "destructive" : "secondary"}>
                        {d.status === "aprovado" ? "Aprovado" : d.status === "rejeitado" ? "Rejeitado" : "Em análise"}
                      </Badge>
                      <Button size="sm" variant="outline" onClick={() => decidirDoc(d, "aprovado")}>Aprovar</Button>
                      <Button size="sm" variant="ghost" onClick={() => decidirDoc(d, "rejeitado")}>Rejeitar</Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              <Input
                placeholder="Observação para o profissional (opcional)"
                className="max-w-md"
                value={obs[s.id] ?? s.verificacao_obs ?? ""}
                onChange={(e) => setObs((p) => ({ ...p, [s.id]: e.target.value }))}
              />
              <Button size="sm" onClick={() => decidirPerfil(s, "verificado")}>Verificar perfil</Button>
              <Button size="sm" variant="outline" onClick={() => decidirPerfil(s, "rejeitado")}>Recusar</Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
