import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { traduzirErro } from "@/lib/errorMessages";
import { comprimirImagem, FOTO_GALERIA, FOTO_PERFIL, LOGO, type OpcoesCompressao } from "@/lib/comprimirImagem";

/**
 * Admin › Otimizar fotos
 * Comprime, no navegador do admin, as fotos que os fornecedores já publicaram (bucket supplier-photos)
 * e regrava cada uma no MESMO caminho. Os links não mudam: nada no banco precisa ser atualizado.
 * Pode rodar várias vezes: quem já está leve é pulado.
 */

type Arquivo = { nome: string; bytes: number; tipo: string | null };
type Resultado = { nome: string; antes: number; depois: number; erro?: string };

const BUCKET = "supplier-photos";
const BACKUP = "backup-originais/";

const kb = (b: number) =>
  b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1).replace(".", ",")} MB` : `${Math.round(b / 1024)} KB`;

/** Qual preset usar e a partir de que tamanho vale a pena comprimir. */
function regra(a: Arquivo): { opcoes: OpcoesCompressao; limite: number } {
  const base = a.nome.split("/").pop() || "";
  // JPEG continua JPEG; o resto vira WebP (mantém transparência de PNG)
  const formato = a.tipo === "image/jpeg" ? "image/jpeg" : "image/webp";
  if (a.nome.startsWith("logos/")) return { opcoes: { ...LOGO, formato, minBytes: 0 }, limite: 150 * 1024 };
  if (base.startsWith("profile-")) return { opcoes: { ...FOTO_PERFIL, formato, minBytes: 0 }, limite: 250 * 1024 };
  return { opcoes: { ...FOTO_GALERIA, formato, minBytes: 0 }, limite: 500 * 1024 };
}

const ehImagem = (a: Arquivo) => !!a.tipo && /^image\/(jpeg|png|webp)$/.test(a.tipo);

export default function AdminOtimizarFotos() {
  const { toast } = useToast();
  const [arquivos, setArquivos] = useState<Arquivo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [rodando, setRodando] = useState(false);
  const [feitos, setFeitos] = useState(0);
  const [alvoTotal, setAlvoTotal] = useState(0);
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [backup, setBackup] = useState(true);
  const parar = useRef(false);

  const carregar = async () => {
    setCarregando(true);
    const { data, error } = await (supabase.rpc as any)("admin_fotos_fornecedores");
    if (error) toast({ title: "Erro ao listar fotos", description: traduzirErro(error), variant: "destructive" });
    setArquivos(((data || []) as any[]).map((r) => ({ nome: r.nome, bytes: Number(r.bytes) || 0, tipo: r.tipo })));
    setCarregando(false);
  };

  useEffect(() => {
    carregar();
  }, []);

  const pesados = arquivos.filter((a) => ehImagem(a) && a.bytes > regra(a).limite);
  const totalBytes = arquivos.reduce((s, a) => s + a.bytes, 0);
  const pesadosBytes = pesados.reduce((s, a) => s + a.bytes, 0);

  const otimizarUm = async (a: Arquivo): Promise<Resultado> => {
    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(a.nome);
    const resp = await fetch(`${pub.publicUrl}?t=${Date.now()}`, { cache: "no-store" });
    if (!resp.ok) throw new Error(`download falhou (${resp.status})`);
    const original = await resp.blob();
    const img = await comprimirImagem(original, regra(a).opcoes);
    // só regrava se ganhar pelo menos 15%
    if (!img.comprimiu || img.blob.size > original.size * 0.85)
      return { nome: a.nome, antes: original.size, depois: original.size };

    if (backup) {
      const { error: eb } = await supabase.storage
        .from(BUCKET)
        .upload(`${BACKUP}${a.nome}`, original, { contentType: original.type || a.tipo || undefined, upsert: true });
      if (eb) throw new Error(`backup: ${traduzirErro(eb)}`);
    }
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(a.nome, img.blob, { contentType: img.tipo, upsert: true, cacheControl: "3600" });
    if (error) throw new Error(traduzirErro(error));
    return { nome: a.nome, antes: original.size, depois: img.blob.size };
  };

  const rodar = async (limite?: number) => {
    const fila = limite ? pesados.slice(0, limite) : pesados;
    if (!fila.length) return;
    parar.current = false;
    setRodando(true);
    setFeitos(0);
    setAlvoTotal(fila.length);
    setResultados([]);
    let i = 0;
    // 2 em paralelo: rápido o bastante sem travar o navegador
    const trabalhador = async () => {
      while (i < fila.length && !parar.current) {
        const a = fila[i++];
        let r: Resultado;
        try {
          r = await otimizarUm(a);
        } catch (e: any) {
          r = { nome: a.nome, antes: a.bytes, depois: a.bytes, erro: e?.message || "erro" };
        }
        setResultados((l) => [r, ...l]);
        setFeitos((n) => n + 1);
      }
    };
    await Promise.all([trabalhador(), trabalhador()]);
    setRodando(false);
    toast({ title: parar.current ? "Otimização interrompida" : "Otimização concluída" });
    carregar();
  };

  const economizado = resultados.reduce((s, r) => s + (r.antes - r.depois), 0);
  const erros = resultados.filter((r) => r.erro);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Otimizar fotos dos fornecedores</h1>
        <p className="text-sm text-muted-foreground">
          Comprime as fotos já publicadas e regrava no mesmo endereço. Os links continuam os mesmos. Pode rodar mais de
          uma vez: quem já está leve é pulado.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Arquivos no bucket</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {carregando ? "…" : arquivos.length}
            <span className="ml-2 text-sm font-normal text-muted-foreground">{kb(totalBytes)}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Precisam otimizar</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {carregando ? "…" : pesados.length}
            <span className="ml-2 text-sm font-normal text-muted-foreground">{kb(pesadosBytes)}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Economizado nesta rodada</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{kb(economizado)}</CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <label className="flex cursor-pointer items-start gap-3">
            <Checkbox
              checked={backup}
              onCheckedChange={(v) => setBackup(v === true)}
              disabled={rodando}
              className="mt-0.5"
            />
            <span className="text-sm">
              Guardar cópia do original em <code>backup-originais/</code>
              <span className="block text-xs text-muted-foreground">
                Recomendado na primeira vez. Depois de conferir que está tudo certo, apague essa pasta no Supabase ›
                Storage › supplier-photos para liberar espaço.
              </span>
            </span>
          </label>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => rodar(5)} disabled={rodando || carregando || !pesados.length}>
              Testar com 5 fotos
            </Button>
            <Button onClick={() => rodar()} disabled={rodando || carregando || !pesados.length}>
              Otimizar todas ({pesados.length})
            </Button>
            {rodando && (
              <Button variant="destructive" onClick={() => (parar.current = true)}>
                Parar
              </Button>
            )}
          </div>

          {(rodando || resultados.length > 0) && (
            <div className="space-y-1">
              <Progress value={alvoTotal ? (feitos / alvoTotal) * 100 : 0} />
              <p className="text-xs text-muted-foreground">
                {feitos} de {alvoTotal}
                {erros.length ? ` · ${erros.length} com erro` : ""}
                {rodando ? " · não feche esta aba" : ""}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {resultados.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Resultado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-[420px] space-y-1 overflow-auto text-sm">
              {resultados.map((r) => (
                <div key={r.nome} className="flex items-center justify-between gap-3 border-b py-1.5 last:border-0">
                  <a
                    href={supabase.storage.from(BUCKET).getPublicUrl(r.nome).data.publicUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate text-primary hover:underline"
                  >
                    {r.nome}
                  </a>
                  <span className={`flex-none ${r.erro ? "text-destructive" : "text-muted-foreground"}`}>
                    {r.erro ? r.erro : r.depois < r.antes ? `${kb(r.antes)} → ${kb(r.depois)}` : "já estava leve"}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
