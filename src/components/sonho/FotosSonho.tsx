import { useEffect, useRef, useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type Foto = { id: string; url: string; origem: "upload" | "quiz"; storage_path: string | null; credito: string | null };

const MAX_FOTOS = 30;
const BUCKET = "sonho-fotos";

/** Reduz para no máximo 1600 px e JPEG 85%, para subir rápido no 4G. */
export async function comprimirImagem(file: File, max = 1600): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error("Não foi possível ler a imagem."));
      i.src = url;
    });
    const escala = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * escala);
    c.height = Math.round(img.height * escala);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return await new Promise((res, rej) =>
      c.toBlob((b) => (b ? res(b) : rej(new Error("Falha ao comprimir."))), "image/jpeg", 0.85),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function urlsAssinadas(paths: string[]): Promise<Record<string, string>> {
  if (!paths.length) return {};
  const { data } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 60 * 60);
  const mapa: Record<string, string> = {};
  (data || []).forEach((d: any) => {
    if (d.signedUrl && d.path) mapa[d.path] = d.signedUrl;
  });
  return mapa;
}

/** Busca as fotos do mural: as do quiz (públicas) e as que a pessoa subiu (privadas, link temporário). */
export async function carregarFotosSonho(userId: string): Promise<Foto[]> {
  const { data } = await (supabase.from("sonho_fotos" as any) as any)
    .select("id, origem, storage_path, quiz_opcoes(foto_url, credito_nome)")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  const linhas = (data || []) as any[];
  const assinadas = await urlsAssinadas(linhas.filter((l) => l.storage_path).map((l) => l.storage_path));
  return linhas
    .map((l) => ({
      id: l.id,
      origem: l.origem,
      storage_path: l.storage_path,
      url: l.storage_path ? assinadas[l.storage_path] : l.quiz_opcoes?.foto_url,
      credito: l.quiz_opcoes?.credito_nome || null,
    }))
    .filter((f) => !!f.url);
}

export default function FotosSonho({ userId, onFotos }: { userId: string; onFotos?: (urls: string[]) => void }) {
  const { toast } = useToast();
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const recarregar = async () => {
    const f = await carregarFotosSonho(userId);
    setFotos(f);
    onFotos?.(f.map((x) => x.url));
    setCarregando(false);
  };

  useEffect(() => {
    recarregar(); /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [userId]);

  const enviar = async (files: FileList | null) => {
    if (!files?.length) return;
    const lista = Array.from(files).slice(0, MAX_FOTOS - fotos.length);
    if (!lista.length)
      return toast({ title: `Seu mural já tem ${MAX_FOTOS} fotos`, description: "Apague alguma para subir outra." });
    setEnviando(true);
    try {
      for (const file of lista) {
        if (!file.type.startsWith("image/")) continue;
        const blob = await comprimirImagem(file);
        const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
        const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: "image/jpeg" });
        if (error) throw error;
        const { error: e2 } = await (supabase.from("sonho_fotos" as any) as any).insert({
          user_id: userId,
          origem: "upload",
          storage_path: path,
        });
        if (e2) throw e2;
      }
      await recarregar();
    } catch (e: any) {
      toast({ title: "Não foi possível subir a foto", description: e?.message, variant: "destructive" });
    } finally {
      setEnviando(false);
    }
  };

  const apagar = async (f: Foto) => {
    setFotos((x) => x.filter((y) => y.id !== f.id));
    await (supabase.from("sonho_fotos" as any) as any).delete().eq("id", f.id);
    if (f.storage_path) await supabase.storage.from(BUCKET).remove([f.storage_path]);
    recarregar();
  };

  return (
    <section className="flex flex-col gap-2.5" aria-labelledby="titulo-inspiracoes">
      <div className="flex items-baseline justify-between">
        <h2 id="titulo-inspiracoes" className="text-base font-semibold">
          Minhas inspirações
        </h2>
        <span className="text-xs" style={{ color: "#6E625A" }}>
          Só você vê
        </span>
      </div>
      {carregando ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin" style={{ color: "#6E625A" }} />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {fotos.map((f) => (
            <div key={f.id} className="relative h-[104px] overflow-hidden rounded-xl" style={{ background: "#E3CDB8" }}>
              <img src={f.url} alt="" loading="lazy" className="h-full w-full object-cover" />
              <button
                type="button"
                aria-label="Apagar foto"
                onClick={() => apagar(f)}
                className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          {fotos.length < MAX_FOTOS && (
            <button
              type="button"
              onClick={() => input.current?.click()}
              disabled={enviando}
              className="flex h-[104px] flex-col items-center justify-center gap-1 rounded-xl border-[1.5px] border-dashed text-xs"
              style={{ borderColor: "#CDBFB3", color: "#6E625A" }}
            >
              {enviando ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
              {enviando ? "Enviando…" : "Subir foto"}
            </button>
          )}
        </div>
      )}
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => {
          const f = e.target.files;
          enviar(f);
          e.target.value = "";
        }}
      />
    </section>
  );
}
