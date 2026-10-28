import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import LogoFornecedor from "./LogoFornecedor";
import { enviarLogo, validarLogo } from "@/lib/logoUpload";

/** Escolha da logo com prévia antes de salvar e opção de trocar. */
export default function LogoUploader({
  userId, supplierId, nome, atual, onSalvo,
}: { userId: string; supplierId: string; nome?: string; atual?: string | null; onSalvo?: (url: string) => void }) {
  const { toast } = useToast();
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [previa, setPrevia] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const escolher = (f?: File) => {
    if (!f) return;
    const erro = validarLogo(f);
    if (erro) { toast({ title: "Arquivo inválido", description: erro, variant: "destructive" }); return; }
    setArquivo(f);
    setPrevia(URL.createObjectURL(f));
  };

  const salvar = async () => {
    if (!arquivo) return;
    setSalvando(true);
    try {
      const url = await enviarLogo(userId, supplierId, arquivo);
      onSalvo?.(url);
      setArquivo(null); setPrevia(null);
      toast({ title: "Logo salva!" });
    } catch (e: any) {
      toast({ title: "Não foi possível salvar a logo", description: e?.message, variant: "destructive" });
    } finally { setSalvando(false); }
  };

  return (
    <div>
      <Label>Logo da empresa (opcional)</Label>
      <div className="mt-2 flex flex-wrap items-center gap-4">
        <LogoFornecedor url={previa || atual} nome={nome} className="h-20 w-20" />
        <label className="cursor-pointer inline-flex items-center justify-center h-10 px-4 rounded-full border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground transition">
          {atual || previa ? "Trocar logo" : "Escolher logo"}
          <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden"
            onChange={(e) => { escolher(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
        {arquivo && (
          <>
            <Button type="button" onClick={salvar} disabled={salvando} className="rounded-full">
              {salvando ? "Salvando..." : "Salvar logo"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => { setArquivo(null); setPrevia(null); }}>Cancelar</Button>
          </>
        )}
      </div>
      <p className="text-xs text-muted-foreground mt-1">PNG, JPG, WEBP ou SVG, até 2 MB.</p>
    </div>
  );
}
