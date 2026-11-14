import { traduzirErro } from "@/lib/errorMessages";
import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import UserAvatar from "@/components/UserAvatar";
import AjustarFotoDialog from "@/components/shared/AjustarFotoDialog";
import { Camera, Crop, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AvatarUploadProps {
  avatarUrl: string | null;
  fullName: string | null;
  onUploaded: (url: string) => void;
}

const MAX_MB = 15; // a foto é recortada e comprimida antes de subir

export default function AvatarUpload({ avatarUrl, fullName, onUploaded }: AvatarUploadProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [fotoParaAjustar, setFotoParaAjustar] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const escolher = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Formato inválido", description: "Envie uma imagem (JPG, PNG, etc).", variant: "destructive" });
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: `Máximo de ${MAX_MB} MB.`, variant: "destructive" });
      return;
    }
    setFotoParaAjustar(URL.createObjectURL(file));
  };

  const fechar = () => {
    if (fotoParaAjustar?.startsWith("blob:")) URL.revokeObjectURL(fotoParaAjustar);
    setFotoParaAjustar(null);
  };

  const salvar = async (blob: Blob) => {
    if (!user) return;
    setUploading(true);
    const path = `${user.id}/avatar.jpg`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, blob, { upsert: true, contentType: "image/jpeg" });

    if (uploadError) {
      toast({ title: "Erro ao enviar foto", description: traduzirErro(uploadError), variant: "destructive" });
      setUploading(false);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(path);
    const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;

    await supabase.from("profiles").update({ avatar_url: urlWithCacheBust }).eq("user_id", user.id);
    onUploaded(urlWithCacheBust);
    toast({ title: "Foto atualizada!" });
    setUploading(false);
    fechar();
  };

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative group cursor-pointer" onClick={() => inputRef.current?.click()}>
        <UserAvatar
          fullName={fullName}
          avatarUrl={avatarUrl}
          className="h-20 w-20 text-2xl"
          fallbackClassName="text-xl"
        />
        <div className="absolute inset-0 rounded-full bg-foreground/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          {uploading ? (
            <Loader2 className="h-5 w-5 text-white animate-spin" />
          ) : (
            <Camera className="h-5 w-5 text-white" />
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={escolher}
          disabled={uploading}
        />
      </div>
      {avatarUrl && (
        <button
          type="button"
          onClick={() => setFotoParaAjustar(avatarUrl)}
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <Crop className="h-3 w-3" /> Ajustar foto
        </button>
      )}
      <AjustarFotoDialog
        src={fotoParaAjustar}
        formato="redondo"
        titulo="Ajustar foto de perfil"
        salvando={uploading}
        onCancelar={fechar}
        onConfirmar={salvar}
      />
    </div>
  );
}
