import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Camera, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface Props {
  url: string | null;
  onUploaded: (url: string) => void;
  fileName: string; // e.g. "header" or "invite"
  label?: string;
  aspect?: string; // tailwind aspect class, e.g. "aspect-[16/9]"
}

export default function CouplePhotoUpload({ url, onUploaded, fileName, label = "Foto", aspect = "aspect-[16/9]" }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Formato inválido", description: "Envie uma imagem.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "Máximo de 5MB.", variant: "destructive" });
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/${fileName}.${ext}`;
    const { error } = await supabase.storage.from("couple-photos").upload(path, file, { upsert: true });
    if (error) {
      toast({ title: "Erro ao enviar", description: error.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from("couple-photos").getPublicUrl(path);
    const finalUrl = `${publicUrl}?t=${Date.now()}`;
    onUploaded(finalUrl);
    toast({ title: "Foto atualizada!" });
    setUploading(false);
  };

  return (
    <div className="space-y-2">
      <div
        className={`relative w-full ${aspect} rounded-lg overflow-hidden bg-muted border border-dashed border-border cursor-pointer group`}
        onClick={() => inputRef.current?.click()}
      >
        {url ? (
          <img src={url} alt={label} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
            <Camera className="h-8 w-8 mb-2" />
            <p className="text-sm">Clique para enviar</p>
          </div>
        )}
        <div className="absolute inset-0 bg-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          {uploading ? (
            <Loader2 className="h-6 w-6 text-white animate-spin" />
          ) : (
            <Upload className="h-6 w-6 text-white" />
          )}
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
      {url && (
        <Button variant="ghost" size="sm" type="button" onClick={() => inputRef.current?.click()}>
          Trocar foto
        </Button>
      )}
    </div>
  );
}