import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { FUNCOES_STAFF } from "@/lib/staff";

export default function PublishJobDialog({ supplierId, onCreated }: { supplierId: string; onCreated?: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [funcao, setFuncao] = useState("");
  const [data, setData] = useState("");
  const [horaIni, setHoraIni] = useState("");
  const [horaFim, setHoraFim] = useState("");
  const [local, setLocal] = useState("");
  const [cidade, setCidade] = useState("");
  const [valor, setValor] = useState<number | "">("");
  const [descricao, setDescricao] = useState("");
  const [pub, setPub] = useState(true);

  const salvar = async () => {
    if (!user) return;
    if (!funcao || !data || !valor) return toast({ title: "Preencha função, data e valor", variant: "destructive" });
    setLoading(true);
    const { error } = await (supabase.from("staff_jobs" as any) as any).insert({
      supplier_id: supplierId,
      funcao, data,
      hora_inicio: horaIni || null, hora_fim: horaFim || null,
      local: local || null, cidade: cidade || null,
      valor_turno: Number(valor), observacoes: descricao || null,
      is_public: pub, status: "aberta",
      criado_por_user_id: user.id,
    });
    setLoading(false);
    if (error) {
      const msg = error.message || "";
      const friendly = /column "?([a-z_]+)"? .* does not exist/i.test(msg)
        ? `Campo "${msg.match(/column "?([a-z_]+)"?/i)?.[1]}" não existe no banco. Contate o suporte.`
        : /violates row-level security/i.test(msg)
        ? "Sem permissão para publicar. Verifique se seu cadastro está aprovado."
        : msg;
      return toast({ title: "Erro ao publicar vaga", description: friendly, variant: "destructive" });
    }
    toast({ title: "Vaga publicada!" });
    setOpen(false);
    setFuncao(""); setData(""); setHoraIni(""); setHoraFim(""); setLocal(""); setCidade(""); setValor(""); setDescricao("");
    onCreated?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button>Publicar vaga</Button></DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Nova vaga</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Função</Label>
            <Select value={funcao} onValueChange={setFuncao}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{FUNCOES_STAFF.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div><Label>Data</Label><Input type="date" value={data} onChange={e => setData(e.target.value)} /></div>
            <div><Label>Início</Label><Input type="time" value={horaIni} onChange={e => setHoraIni(e.target.value)} /></div>
            <div><Label>Fim</Label><Input type="time" value={horaFim} onChange={e => setHoraFim(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Cidade</Label><Input value={cidade} onChange={e => setCidade(e.target.value)} /></div>
            <div><Label>Local</Label><Input value={local} onChange={e => setLocal(e.target.value)} placeholder="Ex.: Salão Aurora" /></div>
          </div>
          <div><Label>Valor do turno (R$)</Label><Input type="number" value={valor} onChange={e => setValor(e.target.value === "" ? "" : Number(e.target.value))} /></div>
          <div><Label>Descrição</Label><Textarea rows={3} value={descricao} onChange={e => setDescricao(e.target.value)} /></div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={pub} onChange={e => setPub(e.target.checked)} />
            Publicar no marketplace aberto (além dos convites diretos)
          </label>
          <Button className="w-full" onClick={salvar} disabled={loading}>
            {loading ? "Publicando..." : "Publicar vaga"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}