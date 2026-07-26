import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Printer, Loader2, Eye, Download } from "lucide-react";
import { gerarPdfConvidados, PdfGuest, PdfGroup, TipoEvento } from "@/lib/guestListPdf";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type Props = {
  guests: PdfGuest[];
  groups: PdfGroup[];
  dadosCasal: {
    nomeCasal: string;
    fotoCapaUrl?: string | null;
    dataEvento?: string | null;
    horario?: string | null;
    localCerimonia?: string | null;
    localRecepcao?: string | null;
    contatoCerimonial?: string | null;
    ultimaAtualizacao?: string | null;
    impressoPor?: string | null;
  };
  tipoEvento?: TipoEvento;
  coupleId?: string;
};

export default function GuestListPdfDialog({ guests, groups, dadosCasal, tipoEvento = "casamento", coupleId }: Props) {
  const [open, setOpen] = useState(false);
  const [alfabetico, setAlfabetico] = useState(true);
  const [porMesa, setPorMesa] = useState(true);
  const [agrupar, setAgrupar] = useState<"letra" | "grupo">("letra");
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (!open || !coupleId) return;
    supabase.from("guest_list_pdf_log" as any)
      .select("*").eq("couple_id", coupleId).order("created_at", { ascending: false }).limit(50)
      .then(({ data }) => setHistory((data as any[]) || []));
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(null); };
  }, [open, coupleId]);

  const gerarBlob = async () => {
    if (!alfabetico && !porMesa) {
      toast({ title: "Selecione ao menos um relatório", variant: "destructive" });
      return null;
    }
    const blob = (await gerarPdfConvidados({
      tipoEvento,
      relatorios: { alfabetico, porMesa },
      agruparAlfabeticoPor: agrupar,
      dados: { ...dadosCasal, guests, groups },
      returnBlob: true,
    })) as Blob | undefined;
    return blob;
  };

  const preview = async () => {
    setLoading(true);
    try {
      const blob = await gerarBlob();
      if (!blob) return;
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(blob));
    } catch (e: any) {
      toast({ title: "Erro na pré-visualização", description: e?.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  const gerar = async () => {
    if (!alfabetico && !porMesa) {
      toast({ title: "Selecione ao menos um relatório", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await gerarPdfConvidados({
        tipoEvento,
        relatorios: { alfabetico, porMesa },
        agruparAlfabeticoPor: agrupar,
        dados: { ...dadosCasal, guests, groups },
      });
      if (coupleId && user) {
        const tipo = alfabetico && porMesa ? "ambos" : alfabetico ? "alfabetico" : "por_mesa";
        await supabase.from("guest_list_pdf_log" as any).insert({
          couple_id: coupleId, user_id: user.id, tipo,
        });
      }
      setOpen(false);
    } catch (e: any) {
      toast({ title: "Erro ao gerar PDF", description: e?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" title="Gerar PDF da lista">
          <Printer className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Gerar PDF da lista de convidados</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="config">
          <TabsList className="grid grid-cols-3 mb-3">
            <TabsTrigger value="config">Configurar</TabsTrigger>
            <TabsTrigger value="preview">Pré-visualizar</TabsTrigger>
            <TabsTrigger value="hist">Histórico ({history.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="config" className="space-y-4 py-2">
          <div>
            <p className="text-sm font-medium mb-2">Quais relatórios gerar?</p>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={alfabetico} onCheckedChange={(v) => setAlfabetico(!!v)} />
                <span className="text-sm">Relatório alfabético</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={porMesa} onCheckedChange={(v) => setPorMesa(!!v)} />
                <span className="text-sm">Relatório por mesa</span>
              </label>
            </div>
          </div>
          {alfabetico && (
            <div>
              <p className="text-sm font-medium mb-2">Agrupamento do alfabético</p>
              <RadioGroup value={agrupar} onValueChange={(v) => setAgrupar(v as any)}>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="letra" id="pdf-agr-letra" />
                  <Label htmlFor="pdf-agr-letra" className="text-sm cursor-pointer">Por letra inicial</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="grupo" id="pdf-agr-grupo" />
                  <Label htmlFor="pdf-agr-grupo" className="text-sm cursor-pointer">Por grupo / família</Label>
                </div>
              </RadioGroup>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            O PDF é otimizado para impressão em preto e branco, com marcadores de presença por convidado e capa com foto do casal.
          </p>
          </TabsContent>
          <TabsContent value="preview" className="space-y-3">
            <Button variant="outline" size="sm" onClick={preview} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eye className="mr-2 h-4 w-4" />}
              Gerar pré-visualização
            </Button>
            {previewUrl ? (
              <iframe src={previewUrl} className="w-full h-[60vh] border rounded" title="Pré-visualização" />
            ) : (
              <p className="text-sm text-muted-foreground italic">Clique em "Gerar pré-visualização" para ver o PDF antes de baixar.</p>
            )}
          </TabsContent>
          <TabsContent value="hist" className="space-y-2 max-h-72 overflow-auto">
            {history.length === 0 && <p className="text-sm text-muted-foreground italic">Nenhum PDF gerado ainda.</p>}
            {history.map((h) => (
              <div key={h.id} className="text-xs border-l-2 border-primary/40 pl-2 py-1">
                <p className="font-medium capitalize">Tipo: {h.tipo.replace("_", " ")}</p>
                <p className="text-muted-foreground">{new Date(h.created_at).toLocaleString("pt-BR")}</p>
              </div>
            ))}
          </TabsContent>
        </Tabs>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>Cancelar</Button>
          <Button onClick={gerar} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Download className="mr-2 h-4 w-4" /> Baixar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}