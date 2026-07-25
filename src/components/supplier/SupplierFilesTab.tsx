import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Trash2, Download, FileText, Image as ImageIcon, Upload, Layers, Paperclip, Lock } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Tipo = "galeria" | "planta_baixa" | "anexo" | "documento";
type Attachment = {
  id: string;
  supplier_id: string;
  tipo: Tipo;
  titulo: string | null;
  descricao: string | null;
  storage_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
};

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED_MIMES = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
const BUCKET = "supplier-files";

interface Props {
  supplierId: string;
  isEspaco: boolean;
}

export default function SupplierFilesTab({ supplierId, isEspaco }: Props) {
  const { toast } = useToast();
  const [items, setItems] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTipo, setActiveTipo] = useState<Tipo>(isEspaco ? "planta_baixa" : "anexo");
  const [deleteTarget, setDeleteTarget] = useState<Attachment | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("supplier_attachments")
      .select("*")
      .eq("supplier_id", supplierId)
      .order("ordem", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Erro ao carregar arquivos", description: error.message, variant: "destructive" });
    }
    setItems((data as Attachment[]) || []);
    setLoading(false);
  }, [supplierId, toast]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    await supabase.storage.from(BUCKET).remove([target.storage_path]);
    const { error } = await (supabase as any).from("supplier_attachments").delete().eq("id", target.id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Arquivo removido" });
    load();
  };

  const tabs: { value: Tipo; label: string; icon: React.ReactNode; visible: boolean }[] = [
    { value: "planta_baixa", label: "Planta baixa", icon: <Layers className="h-4 w-4" />, visible: isEspaco },
    { value: "anexo", label: "Anexos", icon: <Paperclip className="h-4 w-4" />, visible: true },
    { value: "documento", label: "Documentos internos", icon: <Lock className="h-4 w-4" />, visible: true },
  ].filter(t => t.visible);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Arquivos</h2>
        <p className="text-sm text-muted-foreground">
          Organize sua galeria, planta baixa, materiais de apoio e documentos internos.
        </p>
      </div>

      <Tabs value={activeTipo} onValueChange={(v) => setActiveTipo(v as Tipo)}>
        <TabsList className="flex-wrap">
          {tabs.map(t => (
            <TabsTrigger key={t.value} value={t.value} className="flex items-center gap-1.5">
              {t.icon}
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map(t => (
          <TabsContent key={t.value} value={t.value} className="mt-4 space-y-4">
            <TipoPanel
              tipo={t.value}
              supplierId={supplierId}
              items={items.filter(i => i.tipo === t.value)}
              onChange={load}
              onAskDelete={setDeleteTarget}
              loading={loading}
            />
          </TabsContent>
        ))}
      </Tabs>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir arquivo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O arquivo será removido do seu perfil.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TipoPanel({
  tipo, supplierId, items, onChange, onAskDelete, loading,
}: {
  tipo: Tipo;
  supplierId: string;
  items: Attachment[];
  onChange: () => void;
  onAskDelete: (a: Attachment) => void;
  loading: boolean;
}) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  const requiresTitle = tipo === "anexo";

  useEffect(() => {
    let cancel = false;
    (async () => {
      const map: Record<string, string> = {};
      for (const it of items) {
        const { data } = await supabase.storage.from(BUCKET).createSignedUrl(it.storage_path, 3600);
        if (data?.signedUrl) map[it.id] = data.signedUrl;
      }
      if (!cancel) setSignedUrls(map);
    })();
    return () => { cancel = true; };
  }, [items]);

  const upload = async (file: File) => {
    if (!ACCEPTED_MIMES.includes(file.type)) {
      toast({ title: "Formato não suportado", description: "Envie imagens (JPG/PNG/WEBP/GIF) ou PDF.", variant: "destructive" });
      return;
    }
    if (file.size > MAX_BYTES) {
      toast({ title: "Arquivo muito grande", description: "Tamanho máximo: 10 MB.", variant: "destructive" });
      return;
    }
    if (requiresTitle && !titulo.trim()) {
      toast({ title: "Título obrigatório", description: "Informe o título antes de enviar o anexo.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const safeName = `${crypto.randomUUID()}.${ext}`;
      const path = `${supplierId}/${tipo}/${safeName}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
        contentType: file.type, upsert: false,
      });
      if (upErr) throw upErr;

      const { data: userData } = await supabase.auth.getUser();
      const { error: insErr } = await (supabase as any).from("supplier_attachments").insert({
        supplier_id: supplierId,
        tipo,
        titulo: titulo.trim() || null,
        descricao: descricao.trim() || null,
        storage_path: path,
        file_name: file.name,
        mime_type: file.type,
        size_bytes: file.size,
        created_by: userData.user?.id ?? null,
      });
      if (insErr) {
        await supabase.storage.from(BUCKET).remove([path]);
        throw insErr;
      }
      setTitulo("");
      setDescricao("");
      toast({ title: "Arquivo enviado" });
      onChange();
    } catch (e: any) {
      toast({ title: "Falha no envio", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) await upload(f);
  };

  const helperText = tipo === "planta_baixa"
    ? "A planta baixa ajuda bandas, buffets e cerimonialistas a planejar tomadas, palco, circulação e disposição de mesas."
    : tipo === "anexo"
      ? "Adicione materiais que ajudam o casal a decidir: cardápio, portfólio, tabela de preços, apresentação, etc."
      : "Guarde aqui contratos-modelo, notas e arquivos internos. Estes documentos não aparecem no perfil público.";

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          <p className="text-sm text-muted-foreground">{helperText}</p>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label htmlFor={`titulo-${tipo}`}>
                Título {requiresTitle && <span className="text-destructive">*</span>}
              </Label>
              <Input
                id={`titulo-${tipo}`}
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder={tipo === "anexo" ? "Ex.: Cardápio 2026" : "Ex.: Planta salão principal"}
                maxLength={120}
              />
            </div>
            <div>
              <Label htmlFor={`desc-${tipo}`}>Descrição / legenda</Label>
              <Input
                id={`desc-${tipo}`}
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Opcional"
                maxLength={240}
              />
            </div>
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${dragOver ? "border-primary bg-primary/5" : "border-border"}`}
          >
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm mb-2">Arraste um arquivo aqui ou</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? "Enviando..." : "Selecionar arquivo"}
            </Button>
            <input
              ref={inputRef}
              type="file"
              hidden
              accept={ACCEPTED_MIMES.join(",")}
              onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
            />
            <p className="text-xs text-muted-foreground mt-2">Imagens ou PDF · até 10 MB</p>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhum arquivo enviado ainda.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((it) => (
            <Card key={it.id}>
              <CardContent className="p-3 flex gap-3">
                <div className="w-20 h-20 rounded bg-muted flex items-center justify-center overflow-hidden shrink-0">
                  {it.mime_type?.startsWith("image/") && signedUrls[it.id] ? (
                    <img src={signedUrls[it.id]} alt={it.titulo || it.file_name} className="w-full h-full object-cover" />
                  ) : it.mime_type === "application/pdf" ? (
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{it.titulo || it.file_name}</p>
                      {it.descricao && <p className="text-xs text-muted-foreground line-clamp-2">{it.descricao}</p>}
                      <p className="text-xs text-muted-foreground mt-1">
                        {(it.size_bytes ? (it.size_bytes / 1024 / 1024).toFixed(2) : "?")} MB
                      </p>
                    </div>
                    {tipo === "documento" && <Badge variant="secondary" className="text-xs">Privado</Badge>}
                  </div>
                  <div className="flex gap-1 mt-2">
                    {signedUrls[it.id] && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={signedUrls[it.id]} target="_blank" rel="noreferrer">
                          <Download className="h-3.5 w-3.5 mr-1" /> Abrir
                        </a>
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => onAskDelete(it)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}