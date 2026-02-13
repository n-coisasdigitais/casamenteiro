import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import UserAvatar from "@/components/UserAvatar";
import { Camera, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AvatarUploadProps {
  avatarUrl: string | null;
  fullName: string | null;
  onUploaded: (url: string) => void;
}

export default function AvatarUpload({ avatarUrl, fullName, onUploaded }: AvatarUploadProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Formato inválido", description: "Envie uma imagem (JPG, PNG, etc).", variant: "destructive" });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "Máximo de 2MB.", variant: "destructive" });
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      toast({ title: "Erro ao enviar foto", description: uploadError.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;

    await supabase.from("profiles").update({ avatar_url: urlWithCacheBust }).eq("user_id", user.id);
    onUploaded(urlWithCacheBust);
    toast({ title: "Foto atualizada!" });
    setUploading(false);
  };

  return (
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
        onChange={handleUpload}
        disabled={uploading}
      />
    </div>
  );
}
