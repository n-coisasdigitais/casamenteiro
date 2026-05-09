import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Camera, Loader2, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface Props {
  album: string[];
  onChange: (urls: string[]) => void;
  max?: number;
}

/** Upload de até `max` fotos para o álbum do convite. */
export default function AlbumUpload({ album, onChange, max = 10 }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !user) return;
    if (album.length + files.length > max) {
      toast({ title: `Máximo de ${max} fotos`, variant: "destructive" });
      return;
    }
    setUploading(true);
    const newUrls: string[] = [];
    for (const file of files) {
      if (!file.type.startsWith("image/")) continue;
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: `${file.name} muito grande (máx 5MB)`, variant: "destructive" });
        continue;
      }
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/album-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("couple-photos").upload(path, file, { upsert: false });
      if (error) {
        toast({ title: "Erro ao enviar", description: error.message, variant: "destructive" });
        continue;
      }
      const { data: { publicUrl } } = supabase.storage.from("couple-photos").getPublicUrl(path);
      newUrls.push(publicUrl);
    }
    onChange([...album, ...newUrls]);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleRemove = (index: number) => {
    onChange(album.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {album.map((url, i) => (
          <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-muted group">
            <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => handleRemove(i)}
              className="absolute top-1 right-1 bg-foreground/70 text-background rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
              aria-label="Remover"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        {album.length < max && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="aspect-square rounded-lg border-2 border-dashed border-border bg-muted/30 hover:bg-muted flex flex-col items-center justify-center text-muted-foreground transition"
          >
            {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
            <span className="text-xs mt-1">Adicionar</span>
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleUpload}
        disabled={uploading}
      />
      <p className="text-xs text-muted-foreground">
        {album.length} / {max} fotos. As fotos aparecerão como uma galeria no convite.
      </p>
    </div>
  );
}