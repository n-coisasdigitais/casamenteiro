import { traduzirErro } from "@/lib/errorMessages";
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import UserAvatar from "@/components/UserAvatar";
import AjustarFotoDialog from "@/components/shared/AjustarFotoDialog";
import { Camera, Crop, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  fotoUrl: string | null;
  nome: string | null;
  onUploaded: (url: string) => void;
}

const MAX_MB = 15; // a foto é recortada e comprimida antes de subir

export default function StaffPhotoUpload({ fotoUrl, nome, onUploaded }: Props) {
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
      toast({ title: "Formato inválido", description: "Envie uma imagem (JPG, PNG).", variant: "destructive" });
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
    const path = `${user.id}/profissional.jpg`;
    const { error } = await supabase.storage
      .from("avatars")
      .upload(path, blob, { upsert: true, contentType: "image/jpeg" });
    if (error) {
      toast({ title: "Erro ao enviar foto", description: traduzirErro(error), variant: "destructive" });
      setUploading(false);
      return;
    }
    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = `${publicUrl}?t=${Date.now()}`;
    onUploaded(url);
    toast({ title: "Foto atualizada!" });
    setUploading(false);
    fechar();
  };

  return (
    <div className="flex items-center gap-4">
      <div className="relative group cursor-pointer" onClick={() => inputRef.current?.click()}>
        <UserAvatar fullName={nome} avatarUrl={fotoUrl} className="h-20 w-20 text-2xl" fallbackClassName="text-xl" />
        <div className="absolute inset-0 rounded-full bg-foreground/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          {uploading ? (
            <Loader2 className="h-5 w-5 text-background animate-spin" />
          ) : (
            <Camera className="h-5 w-5 text-background" />
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
      <div className="text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Foto de perfil</p>
        <p>Clique na imagem para enviar. Depois é só enquadrar.</p>
        {fotoUrl && (
          <button
            type="button"
            onClick={() => setFotoParaAjustar(fotoUrl)}
            className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <Crop className="h-3 w-3" /> Ajustar foto atual
          </button>
        )}
      </div>
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
