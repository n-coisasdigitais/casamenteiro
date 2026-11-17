import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eye, ExternalLink, Monitor, Smartphone } from "lucide-react";

/** Botão "Ver prévia" que abre a página real (mesmo site) num quadro, em modo celular ou computador. */
export default function PreviaPagina({ url, rotulo = "Ver prévia", titulo, descricao }: {
  url: string | null; rotulo?: string; titulo: string; descricao?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [modo, setModo] = useState<"celular" | "computador">("celular");
  if (!url) return null;
  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setAberto(true)}>
        <Eye className="mr-2 h-4 w-4" />{rotulo}
      </Button>
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="flex h-[92vh] max-w-5xl flex-col gap-3 p-4">
          <DialogHeader>
            <DialogTitle>{titulo}</DialogTitle>
            {descricao && <DialogDescription>{descricao}</DialogDescription>}
          </DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" variant={modo === "celular" ? "default" : "outline"} onClick={() => setModo("celular")}>
              <Smartphone className="mr-1.5 h-4 w-4" />Celular
            </Button>
            <Button type="button" size="sm" variant={modo === "computador" ? "default" : "outline"} onClick={() => setModo("computador")}>
              <Monitor className="mr-1.5 h-4 w-4" />Computador
            </Button>
            <a href={url} target="_blank" rel="noopener noreferrer" className="ml-auto inline-flex items-center text-sm text-primary underline">
              <ExternalLink className="mr-1 h-4 w-4" />Abrir em nova aba
            </a>
          </div>
          <div className="flex min-h-0 flex-1 justify-center overflow-auto rounded-lg bg-muted p-2">
            <iframe
              key={modo}
              src={url}
              title={titulo}
              className="h-full rounded-md border bg-background"
              style={{ width: modo === "celular" ? 390 : "100%", maxWidth: "100%" }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
