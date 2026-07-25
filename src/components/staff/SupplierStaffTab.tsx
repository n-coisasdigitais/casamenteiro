import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import PublishJobDialog from "./PublishJobDialog";
import PaymentDisclaimer from "./PaymentDisclaimer";
import { appStatusLabel, jobStatusLabel, buildJobWhatsAppLink, fetchStaffContact, maskPhone } from "@/lib/staff";

export default function SupplierStaffTab({ supplierId, companyName }: { supplierId: string; companyName?: string }) {
  const { toast } = useToast();
  const [jobs, setJobs] = useState<any[]>([]);
  const [apps, setApps] = useState<Record<string, any[]>>({});
  const [staffs, setStaffs] = useState<any[]>([]);

  const load = async () => {
    const { data: js } = await (supabase.from("staff_jobs" as any) as any)
      .select("*").eq("supplier_id", supplierId).order("data", { ascending: false });
    setJobs(js || []);
    if (js && js.length) {
      const ids = js.map((j: any) => j.id);
      const { data: apl } = await (supabase.from("staff_applications" as any) as any)
        .select("*, staff:staff_profiles(id, nome, cidade, funcoes, rating, review_count, foto_url)")
        .in("job_id", ids)
        .order("created_at", { ascending: false });
      const grouped: Record<string, any[]> = {};
      (apl || []).forEach((a: any) => {
        (grouped[a.job_id] = grouped[a.job_id] || []).push(a);
      });
      setApps(grouped);
    }
    const { data: sp } = await (supabase.from("staff_profiles" as any) as any)
      .select("id, nome, cidade, funcoes, rating, review_count, is_public")
      .eq("is_public", true).limit(30);
    setStaffs(sp || []);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [supplierId]);

  const convidar = async (jobId: string, staffId: string) => {
    const { error } = await (supabase.from("staff_applications" as any) as any).insert({
      job_id: jobId, staff_id: staffId, origem: "convite", status: "convidado",
    });
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Convite enviado!" });
    load();
  };

  const responder = async (appId: string, status: "aceito" | "recusado" | "concluido" | "no_show") => {
    const { error } = await (supabase.from("staff_applications" as any) as any)
      .update({ status, respondido_em: new Date().toISOString() }).eq("id", appId);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    load();
  };

  const abrirWhats = async (job: any, app: any) => {
    try {
      const contact = await fetchStaffContact(job.id, app.staff.id);
      const url = buildJobWhatsAppLink(contact.telefone || "", {
        funcao: job.funcao, data: job.data,
        horaInicio: job.hora_inicio, horaFim: job.hora_fim,
        local: job.local, valor: job.valor_turno, empresa: companyName,
      });
      if (url) window.open(url, "_blank");
    } catch (e: any) {
      toast({ title: "Contato liberado após aceite", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold">Equipe e vagas</h2>
          <p className="text-sm text-muted-foreground">Convide profissionais ou publique vagas abertas.</p>
        </div>
        <PublishJobDialog supplierId={supplierId} onCreated={load} />
      </div>
      <PaymentDisclaimer />

      <Tabs defaultValue="vagas">
        <TabsList>
          <TabsTrigger value="vagas">Minhas vagas</TabsTrigger>
          <TabsTrigger value="buscar">Buscar profissionais</TabsTrigger>
        </TabsList>

        <TabsContent value="vagas" className="space-y-3">
          {jobs.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma vaga publicada ainda.</p>}
          {jobs.map((j) => (
            <Card key={j.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex justify-between items-center flex-wrap gap-2">
                  <span>{j.funcao} • {new Date(j.data + "T00:00:00").toLocaleDateString("pt-BR")}</span>
                  <Badge variant="secondary">{jobStatusLabel(j.status)}</Badge>
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {j.cidade || j.local} • R$ {Number(j.valor_turno || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </CardHeader>
              <CardContent className="space-y-2">
                {(apps[j.id] || []).length === 0 && (
                  <p className="text-xs text-muted-foreground">Sem candidatos/convidados ainda.</p>
                )}
                {(apps[j.id] || []).map((a) => (
                  <div key={a.id} className="flex items-center justify-between border rounded-md p-2 flex-wrap gap-2">
                    <div className="text-sm">
                      <p className="font-medium">{a.staff?.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.staff?.cidade} • {a.staff?.rating ? `${a.staff.rating}★ (${a.staff.review_count})` : "sem avaliações"}
                      </p>
                      <p className="text-xs text-muted-foreground">{maskPhone(null)} — liberado após aceite</p>
                    </div>
                    <div className="flex gap-2 items-center">
                      <Badge variant="outline">{appStatusLabel(a.status)}</Badge>
                      {a.status === "candidato" && (
                        <>
                          <Button size="sm" onClick={() => responder(a.id, "aceito")}>Aceitar</Button>
                          <Button size="sm" variant="outline" onClick={() => responder(a.id, "recusado")}>Recusar</Button>
                        </>
                      )}
                      {a.status === "aceito" && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => abrirWhats(j, a)}>WhatsApp</Button>
                          <Button size="sm" onClick={() => responder(a.id, "concluido")}>Concluir</Button>
                          <Button size="sm" variant="ghost" onClick={() => responder(a.id, "no_show")}>Não veio</Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="buscar" className="space-y-3">
          {jobs.length === 0 && (
            <p className="text-sm text-muted-foreground">Publique uma vaga primeiro para convidar profissionais.</p>
          )}
          {staffs.map((s) => (
            <Card key={s.id}>
              <CardContent className="p-4 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="font-medium">{s.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.cidade} • {(s.funcoes || []).join(", ")}
                  </p>
                  {s.rating && <p className="text-xs">{s.rating}★ ({s.review_count})</p>}
                </div>
                {jobs.filter((j) => j.status === "aberta").length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {jobs.filter((j) => j.status === "aberta").slice(0, 3).map((j) => (
                      <Button key={j.id} size="sm" variant="outline" onClick={() => convidar(j.id, s.id)}>
                        Convidar p/ {j.funcao}
                      </Button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}