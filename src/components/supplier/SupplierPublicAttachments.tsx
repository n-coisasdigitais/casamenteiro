import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, Layers, Paperclip } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

type Attachment = {
  id: string;
  tipo: "galeria" | "planta_baixa" | "anexo" | "documento";
  titulo: string | null;
  descricao: string | null;
  storage_path: string;
  file_name: string;
  mime_type: string | null;
};

const BUCKET = "supplier-files";

export default function SupplierPublicAttachments({
  supplierId, showFloorPlan,
}: { supplierId: string; showFloorPlan: boolean }) {
  const [items, setItems] = useState<Attachment[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<{ url: string; item: Attachment } | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("supplier_attachments")
        .select("*")
        .eq("supplier_id", supplierId)
        .in("tipo", ["planta_baixa", "anexo"])
        .order("ordem", { ascending: true })
        .order("created_at", { ascending: false });
      const list = (data as Attachment[]) || [];
      setItems(list);
      const map: Record<string, string> = {};
      for (const it of list) {
        const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(it.storage_path, 3600);
        if (signed?.signedUrl) map[it.id] = signed.signedUrl;
      }
      setUrls(map);
    })();
  }, [supplierId]);

  const plantas = showFloorPlan ? items.filter(i => i.tipo === "planta_baixa") : [];
  const anexos = items.filter(i => i.tipo === "anexo");

  if (plantas.length === 0 && anexos.length === 0) return null;

  return (
    <>
      {plantas.length > 0 && (
        <div className="mb-8">
          <h2 className="font-bold text-lg mb-2 flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            Planta baixa do espaço
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Ajuda bandas, buffets e cerimonialistas a planejar tomadas, palco, circulação e disposição de mesas.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {plantas.map(it => (
              <AttachmentCard key={it.id} item={it} url={urls[it.id]} onPreview={setPreview} />
            ))}
          </div>
        </div>
      )}

      {anexos.length > 0 && (
        <div className="mb-8">
          <h2 className="font-bold text-lg mb-2 flex items-center gap-2">
            <Paperclip className="h-5 w-5 text-primary" />
            Materiais e anexos
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {anexos.map(it => (
              <AttachmentCard key={it.id} item={it} url={urls[it.id]} onPreview={setPreview} />
            ))}
          </div>
        </div>
      )}

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{preview?.item.titulo || preview?.item.file_name}</DialogTitle>
          </DialogHeader>
          {preview && (
            preview.item.mime_type === "application/pdf" ? (
              <iframe src={preview.url} className="w-full h-[70vh]" title={preview.item.file_name} />
            ) : (
              <img src={preview.url} alt={preview.item.titulo || ""} className="max-h-[70vh] mx-auto" />
            )
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function AttachmentCard({
  item, url, onPreview,
}: { item: Attachment; url?: string; onPreview: (p: { url: string; item: Attachment }) => void }) {
  const isImage = item.mime_type?.startsWith("image/");
  const isPdf = item.mime_type === "application/pdf";

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <button
          type="button"
          onClick={() => url && onPreview({ url, item })}
          className="w-full aspect-video bg-muted flex items-center justify-center overflow-hidden hover:opacity-90 transition"
        >
          {isImage && url ? (
            <img src={url} alt={item.titulo || item.file_name} className="w-full h-full object-cover" />
          ) : (
            <FileText className="h-12 w-12 text-muted-foreground" />
          )}
        </button>
        <div className="p-3">
          <p className="text-sm font-semibold">{item.titulo || item.file_name}</p>
          {item.descricao && <p className="text-xs text-muted-foreground mt-1">{item.descricao}</p>}
          <div className="flex gap-2 mt-2">
            {url && (
              <>
                <Button size="sm" variant="outline" onClick={() => onPreview({ url, item })}>
                  {isPdf ? "Visualizar PDF" : "Ampliar"}
                </Button>
                <Button size="sm" variant="ghost" asChild>
                  <a href={url} download={item.file_name} target="_blank" rel="noreferrer">
                    <Download className="h-3.5 w-3.5 mr-1" /> Baixar
                  </a>
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}