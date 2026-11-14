import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Link2, Loader2, QrCode, Share2 } from "lucide-react";
import { linkFornecedor } from "@/lib/linkFornecedor";
import { publicUrl } from "@/lib/appUrl";
import { gerarSelo, urlComUtm, type DadosSelo, type FormatoSelo } from "@/lib/seloCasamenteiro";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";

/**
 * Painel do fornecedor: selo "Estou no Casamenteiro" com QR code para o perfil.
 * Story (1080×1920) para Instagram/WhatsApp e quadrado (1080×1080) para imprimir ou pôr no site.
 * Só aparece para fornecedor aprovado (o perfil precisa estar público).
 */
export default function SeloCasamenteiroCard({ supplierId }: { supplierId: string }) {
  const { toast } = useToast();
  const [dados, setDados] = useState<DadosSelo | null>(null);
  const [aprovado, setAprovado] = useState(false);
  const [formato, setFormato] = useState<FormatoSelo>("story");
  const [imagem, setImagem] = useState<{ blob: Blob; url: string } | null>(null);
  const [gerando, setGerando] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase.from("suppliers") as any)
        .select("id, slug, company_name, city, state, status, profile_photo_url, categories(name), supplier_photos(photo_url, is_principal)")
        .eq("id", supplierId)
        .maybeSingle();
      if (!data) return;
      setAprovado(data.status === "approved");
      const fotos = data.supplier_photos || [];
      setDados({
        nome: data.company_name || "Meu negócio",
        categoria: data.categories?.name ?? null,
        cidade: [data.city, data.state].filter(Boolean).join(", ") || null,
        fotoUrl: fotos.find((p: any) => p.is_principal)?.photo_url || data.profile_photo_url || fotos[0]?.photo_url || null,
        url: publicUrl(linkFornecedor(data)),
      });
    })();
  }, [supplierId]);

  useEffect(() => {
    if (!dados || !aprovado) return;
    let vivo = true;
    setGerando(true);
    gerarSelo(dados, formato).then((blob) => {
      if (!vivo) return;
      setGerando(false);
      setImagem((ant) => {
        if (ant) URL.revokeObjectURL(ant.url);
        return blob ? { blob, url: URL.createObjectURL(blob) } : null;
      });
    });
    return () => { vivo = false; };
  }, [dados, aprovado, formato]);

  if (!dados || !aprovado) return null;

  const nomeArquivo = `selo-casamenteiro-${formato}.png`;

  const baixar = () => {
    if (!imagem) return;
    const a = document.createElement("a");
    a.href = imagem.url;
    a.download = nomeArquivo;
    a.click();
    trackEvent("selo_baixado", { formato });
  };

  const compartilhar = async () => {
    if (!imagem) return;
    const arquivo = new File([imagem.blob], nomeArquivo, { type: "image/png" });
    try {
      if (navigator.canShare?.({ files: [arquivo] })) {
        await navigator.share({ files: [arquivo], text: `Agora estou no Casamenteiro! ${urlComUtm(dados.url, formato)}` });
        trackEvent("selo_compartilhado", { formato });
        return;
      }
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
    }
    baixar();
  };

  const copiarLink = async () => {
    try {
      await navigator.clipboard.writeText(urlComUtm(dados.url, "quadrado"));
      toast({ title: "Link copiado!", description: "Use na bio do Instagram ou no seu site." });
    } catch {
      toast({ title: "Não foi possível copiar", variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <QrCode className="h-5 w-5 text-primary" aria-hidden="true" /> Selo "Estou no Casamenteiro"
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Poste no story ou imprima no seu balcão. O QR code leva o casal direto para o seu perfil, onde ele pede orçamento.
        </p>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-[180px_1fr] sm:items-start">
        <div
          className={cn(
            "relative mx-auto w-[180px] overflow-hidden rounded-xl border bg-muted",
            formato === "story" ? "aspect-[9/16]" : "aspect-square",
          )}
        >
          {imagem && <img src={imagem.url} alt="Prévia do selo" className="h-full w-full object-cover" />}
          {gerando && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/60">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="space-y-3">
          <div className="inline-flex rounded-full border p-1" role="radiogroup" aria-label="Formato do selo">
            {(["story", "quadrado"] as const).map((f) => (
              <button
                key={f}
                type="button"
                role="radio"
                aria-checked={formato === f}
                onClick={() => setFormato(f)}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm font-medium transition min-h-[36px]",
                  formato === f ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                )}
              >
                {f === "story" ? "Story" : "Para imprimir"}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={compartilhar} disabled={!imagem} className="rounded-full">
              <Share2 className="h-4 w-4 mr-2" /> Compartilhar
            </Button>
            <Button type="button" variant="outline" onClick={baixar} disabled={!imagem} className="rounded-full">
              <Download className="h-4 w-4 mr-2" /> Baixar
            </Button>
            <Button type="button" variant="ghost" onClick={copiarLink} className="rounded-full">
              <Link2 className="h-4 w-4 mr-2" /> Copiar link para a bio
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Dica: fixe o story nos destaques do Instagram. Quem chega pelo selo aparece nas suas métricas como visita ao perfil.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}