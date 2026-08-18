import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import UserAvatar from "@/components/UserAvatar";
import { Camera, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { traduzirErro } from "@/lib/errorMessages";

interface Props {
  fotoUrl: string | null;
  nome: string | null;
  onUploaded: (url: string) => void;
}

export default function StaffPhotoUpload({ fotoUrl, nome, onUploaded }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Formato inválido", description: "Envie uma imagem (JPG, PNG).", variant: "destructive" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "Máximo de 2MB.", variant: "destructive" });
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/profissional.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) {
      toast({ title: "Erro ao enviar foto", description: traduzirErro(error), variant: "destructive" });
      setUploading(false);
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = `${publicUrl}?t=${Date.now()}`;
    onUploaded(url);
    toast({ title: "Foto atualizada!" });
    setUploading(false);
  };

  return (
    <div className="flex items-center gap-4">
      <div className="relative group cursor-pointer" onClick={() => inputRef.current?.click()}>
        <UserAvatar fullName={nome} avatarUrl={fotoUrl} className="h-20 w-20 text-2xl" fallbackClassName="text-xl" />
        <div className="absolute inset-0 rounded-full bg-foreground/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          {uploading ? <Loader2 className="h-5 w-5 text-background animate-spin" /> : <Camera className="h-5 w-5 text-background" />}
        </div>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
      </div>
      <div className="text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Foto de perfil</p>
        <p>Clique na imagem para enviar. JPG ou PNG, até 2MB.</p>
      </div>
    </div>
  );
}