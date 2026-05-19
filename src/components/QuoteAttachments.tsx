import { useState } from "react";
import { Paperclip, X, FileText, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

export const ATTACHMENT_MAX_SIZE = 10 * 1024 * 1024; // 10MB
export const ATTACHMENT_ACCEPT = "image/*,application/pdf";
const ALLOWED_PREFIXES = ["image/", "application/pdf"];

function isAllowed(file: File) {
  return ALLOWED_PREFIXES.some((p) => file.type.startsWith(p));
}

function isImage(url: string) {
  return /\.(jpe?g|png|gif|webp|avif)(\?.*)?$/i.test(url);
}

type PickerProps = {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
  maxFiles?: number;
};

/** Botão + lista de chips de arquivos prontos para upload, com validação. */
export function AttachmentPicker({
  files,
  onChange,
  disabled,
  maxFiles = 5,
}: PickerProps) {
  const { toast } = useToast();

  const handleFiles = (list: FileList | null) => {
    if (!list) return;
    const incoming = Array.from(list);
    const valid: File[] = [];
    for (const f of incoming) {
      if (!isAllowed(f)) {
        toast({
          title: "Tipo não permitido",
          description: `${f.name}: aceitamos imagens (JPG, PNG, WebP) e PDF.`,
          variant: "destructive",
        });
        continue;
      }
      if (f.size > ATTACHMENT_MAX_SIZE) {
        toast({
          title: "Arquivo muito grande",
          description: `${f.name}: máximo 10MB por arquivo.`,
          variant: "destructive",
        });
        continue;
      }
      valid.push(f);
    }
    const next = [...files, ...valid].slice(0, maxFiles);
    if (files.length + valid.length > maxFiles) {
      toast({
        title: `Máximo de ${maxFiles} arquivos`,
        description: "Remova algum para adicionar mais.",
      });
    }
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <label
        className={`inline-flex items-center gap-2 text-xs px-3 py-2 rounded-md border border-input cursor-pointer hover:bg-accent transition-colors ${
          disabled ? "opacity-50 pointer-events-none" : ""
        }`}
      >
        <Paperclip className="h-3.5 w-3.5" />
        Anexar (imagem ou PDF, até 10MB)
        <input
          type="file"
          className="hidden"
          multiple
          accept={ATTACHMENT_ACCEPT}
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </label>
      {files.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {files.map((f, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 bg-secondary text-secondary-foreground rounded-full px-2.5 py-1 text-xs"
            >
              {f.type.startsWith("image/") ? (
                <ImageIcon className="h-3 w-3" />
              ) : (
                <FileText className="h-3 w-3" />
              )}
              <span className="max-w-[160px] truncate">{f.name}</span>
              <button
                type="button"
                onClick={() =>
                  onChange(files.filter((_, idx) => idx !== i))
                }
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

type ListProps = {
  urls: string[];
  variant?: "light" | "dark";
};

/** Renderiza anexos enviados: imagens viram thumbnail com lightbox, PDFs viram link. */
export function AttachmentList({ urls, variant = "light" }: ListProps) {
  const [preview, setPreview] = useState<string | null>(null);
  if (!urls || urls.length === 0) return null;

  const linkClass =
    variant === "dark"
      ? "text-primary-foreground/90 underline"
      : "text-primary underline";

  return (
    <>
      <div className="flex flex-wrap gap-2 mt-2">
        {urls.map((url) => {
          if (isImage(url)) {
            return (
              <button
                key={url}
                type="button"
                onClick={() => setPreview(url)}
                className="block h-16 w-16 rounded-md overflow-hidden border border-border"
              >
                <img
                  src={url}
                  alt="Anexo"
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </button>
            );
          }
          return (
            <a
              key={url}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-1 text-xs ${linkClass}`}
            >
              <FileText className="h-3 w-3" /> Ver PDF
            </a>
          );
        })}
      </div>
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-3xl p-2">
          {preview && (
            <img
              src={preview}
              alt="Anexo ampliado"
              className="w-full h-auto rounded"
            />
          )}
          {preview && (
            <div className="flex justify-end mt-2">
              <Button asChild variant="outline" size="sm">
                <a href={preview} target="_blank" rel="noopener noreferrer">
                  Abrir em nova aba
                </a>
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}