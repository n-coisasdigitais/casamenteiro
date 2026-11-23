import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Download, ExternalLink, Loader2 } from "lucide-react";
import { ehImagem, ehPdf } from "@/lib/staffVerificacao";

/**
 * Abre documento ou foto num modal, sem sair da página.
 * - `arquivo.file_path`: caminho no bucket privado staff-docs (gera link assinado de 5 min)
 * - `arquivo.url`: link público (ex.: foto de perfil)
 */
export type ArquivoView = {
  titulo: string;
  subtitulo?: string;
  file_path?: string | null;
  url?: string | null;
  file_name?: string | null;
};

export default function ArquivoViewerDialog({
  arquivo,
  onClose,
  rodape,
}: {
  arquivo: ArquivoView | null;
  onClose: () => void;
  /** botões extras (ex.: Aprovar / Recusar documento) */
  rodape?: React.ReactNode;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    setUrl(null);
    setErro(false);
    if (!arquivo) return;
    if (arquivo.url) return setUrl(arquivo.url);
    if (!arquivo.file_path) return setErro(true);
    let vivo = true;
    supabase.storage
      .from("staff-docs")
      .createSignedUrl(arquivo.file_path, 300)
      .then(({ data, error }) => {
        if (!vivo) return;
        if (error || !data) setErro(true);
        else setUrl(data.signedUrl);
      });
    return () => {
      vivo = false;
    };
  }, [arquivo]);

  const ref = arquivo?.file_path || arquivo?.file_name || arquivo?.url || "";
  const imagem = !!arquivo?.url || ehImagem(ref);
  const pdf = !imagem && ehPdf(ref);

  return (
    <Dialog open={!!arquivo} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[92vh] w-[calc(100vw-24px)] max-w-3xl flex-col gap-3 p-4 sm:p-5">
        <div className="pr-8">
          <DialogTitle className="text-base">{arquivo?.titulo}</DialogTitle>
          <DialogDescription className="text-xs">{arquivo?.subtitulo || arquivo?.file_name || ""}</DialogDescription>
        </div>

        <div className="grid min-h-[240px] flex-1 place-items-center overflow-auto rounded-lg bg-neutral-100">
          {erro ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Não foi possível abrir o arquivo.</p>
          ) : !url ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : imagem ? (
            <img src={url} alt={arquivo?.titulo || ""} className="max-h-[70vh] w-auto max-w-full object-contain" />
          ) : pdf ? (
            <iframe src={url} title={arquivo?.titulo || "Documento"} className="h-[70vh] w-full rounded-lg bg-white" />
          ) : (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Este tipo de arquivo não tem pré-visualização. Use “Baixar”.
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-3 text-xs font-semibold">
            {url && (
              <>
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Nova aba
                </a>
                <a
                  href={url}
                  download={arquivo?.file_name || true}
                  className="inline-flex items-center gap-1 hover:underline"
                >
                  <Download className="h-3.5 w-3.5" /> Baixar
                </a>
              </>
            )}
          </div>
          {rodape && <div className="flex flex-wrap gap-2">{rodape}</div>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
