import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Printer, Loader2 } from "lucide-react";
import { gerarPdfConvidados, PdfGuest, PdfGroup, TipoEvento } from "@/lib/guestListPdf";
import { useToast } from "@/hooks/use-toast";

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
};

export default function GuestListPdfDialog({ guests, groups, dadosCasal, tipoEvento = "casamento" }: Props) {
  const [open, setOpen] = useState(false);
  const [alfabetico, setAlfabetico] = useState(true);
  const [porMesa, setPorMesa] = useState(true);
  const [agrupar, setAgrupar] = useState<"letra" | "grupo">("letra");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gerar PDF da lista de convidados</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
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
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>Cancelar</Button>
          <Button onClick={gerar} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Gerar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}