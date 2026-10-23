import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Upload } from "lucide-react";
import FocoImagemEditor, { type EspacoImagem } from "@/components/destaques/FocoImagemEditor";
import { useToast } from "@/hooks/use-toast";
import { formatBRL } from "@/lib/platformPricing";
import {
  ESPACOS_HOME,
  criarCompraDestaque,
  enviarImagemDestaque,
  vagasDestaque,
  type PacoteDestaque,
} from "@/lib/monetizacao";

const PROPORCAO: Record<string, string> = {
  home_hero: "16 / 9",
  home_story: "9 / 16",
  home_form: "4 / 1",
  home_categoria: "1 / 1",
};

const STATUS_IMAGEM: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  pendente: { label: "Imagem em análise", variant: "secondary" },
  aprovada: { label: "Imagem aprovada", variant: "default" },
  recusada: { label: "Imagem recusada", variant: "destructive" },
};

type Compra = {
  id: string;
  escopo: string;
  dias: number;
  valor: number;
  status: string;
  fim: string | null;
  imagem_url: string | null;
  imagem_status: string | null;
  imagem_motivo_recusa: string | null;
  legenda: string | null;
};

/**
 * Painel do fornecedor: compra dos 4 destaques da Home (Hero, Stories,
 * Formulário, Categorias), com envio de imagem, legenda e vagas disponíveis.
 */
export default function DestaquesHomeFornecedor({
  supplierId,
  userId,
  categoriaId,
  pacotes,
}: {
  supplierId: string;
  userId: string;
  categoriaId: string | null;
  pacotes: PacoteDestaque[];
}) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [vagas, setVagas] = useState<Record<string, number | null>>({});
  const [compras, setCompras] = useState<Compra[]>([]);
  const [escolhido, setEscolhido] = useState<PacoteDestaque | null>(null);
  const [trocando, setTrocando] = useState<Compra | null>(null);
  const [imagem, setImagem] = useState<string | null>(null);
  const [legenda, setLegenda] = useState("");
  const [foco, setFoco] = useState({ focoDesktop: "50% 50%", focoMobile: "50% 50%" });
  const [enviando, setEnviando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const porEspaco = useMemo(() => {
    const g: Record<string, PacoteDestaque[]> = {};
    pacotes.forEach((p) => {
      const e = p.escopo === "home" ? "home_hero" : p.escopo;
      if (e && e in ESPACOS_HOME) (g[e] ??= []).push(p);
    });
    return g;
  }, [pacotes]);

  const carregar = async () => {
    const entries = await Promise.all(
      Object.keys(porEspaco).map(async (e) => [e, await vagasDestaque(e, e === "home_categoria" ? categoriaId : null)] as const),
    );
    setVagas(Object.fromEntries(entries));
    const { data } = await (supabase.from("featured_purchases" as any) as any)
      .select("id, escopo, dias, valor, status, fim, imagem_url, imagem_status, imagem_motivo_recusa, legenda, foco_desktop, foco_mobile")
      .eq("supplier_id", supplierId)
      .in("escopo", ["home", ...Object.keys(ESPACOS_HOME)])
      .order("created_at", { ascending: false })
      .limit(10);
    setCompras((data as Compra[]) ?? []);
  };

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplierId, categoriaId, porEspaco]);

  const abrir = (p: PacoteDestaque) => {
    setEscolhido(p);
    setTrocando(null);
    setImagem(null);
    setLegenda("");
    setFoco({ focoDesktop: "50% 50%", focoMobile: "50% 50%" });
  };

  const abrirTroca = (c: Compra) => {
    setTrocando(c);
    setEscolhido(null);
    setImagem(c.imagem_url);
    setLegenda(c.legenda ?? "");
    setFoco({ focoDesktop: (c as any).foco_desktop || "50% 50%", focoMobile: (c as any).foco_mobile || "50% 50%" });
  };

  const onArquivo = async (file?: File) => {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast({ title: "Imagem muito grande", description: "Envie uma imagem de até 8 MB.", variant: "destructive" });
      return;
    }
    setEnviando(true);
    const { url, erro } = await enviarImagemDestaque(userId, file);
    setEnviando(false);
    if (!url) {
      toast({ title: "Não foi possível enviar a imagem", description: erro, variant: "destructive" });
      return;
    }
    setImagem(url);
  };

  const confirmarCompra = async () => {
    if (!escolhido || !imagem) return;
    setSalvando(true);
    const escopo = escolhido.escopo === "home" ? "home_hero" : escolhido.escopo!;
    const { id, erro } = await criarCompraDestaque({
      supplierId,
      dias: escolhido.dias,
      valor: escolhido.valor,
      escopo,
      packageId: escolhido.id,
      exclusivo: !!escolhido.exclusivo,
      imagemUrl: imagem,
      legenda: legenda.trim() || null,
      categoriaId: escopo === "home_categoria" ? categoriaId : null,
    });
    setSalvando(false);
    if (!id) {
      toast({ title: "Não foi possível reservar a vaga", description: erro, variant: "destructive" });
      carregar();
      return;
    }
    await (supabase.from("featured_purchases" as any) as any)
      .update({ foco_desktop: foco.focoDesktop, foco_mobile: foco.focoMobile })
      .eq("id", id);
    navigate(`/pagamento?tipo=destaque&ref=${id}`);
  };

  const salvarTroca = async () => {
    if (!trocando || !imagem) return;
    setSalvando(true);
    const { error } = await (supabase.from("featured_purchases" as any) as any)
      .update({ imagem_url: imagem, legenda: legenda.trim() || null, foco_desktop: foco.focoDesktop, foco_mobile: foco.focoMobile })
      .eq("id", trocando.id);
    setSalvando(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Imagem enviada para análise" });
    setTrocando(null);
    carregar();
  };

  const espacos = Object.keys(porEspaco);
  if (!espacos.length) return null;
  const aberto = escolhido || trocando;
  const escopoDialog = escolhido ? (escolhido.escopo === "home" ? "home_hero" : escolhido.escopo!) : trocando?.escopo === "home" ? "home_hero" : trocando?.escopo;
  const formato = escolhido?.formato_imagem;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Destaques na Home</h2>
        <p className="text-sm text-muted-foreground">
          Sua foto em lugares de destaque da página inicial, com o selo “Patrocinado” e link para o seu perfil. As vagas são
          limitadas e se revezam a cada 6 segundos. Toda imagem passa por aprovação antes de ir ao ar.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {espacos.map((e) => {
          const info = ESPACOS_HOME[e];
          const livres = vagas[e];
          const semCategoria = e === "home_categoria" && !categoriaId;
          return (
            <Card key={e}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-base">{info.nome}</CardTitle>
                  {livres !== undefined && livres !== null && (
                    <Badge variant={livres > 0 ? "secondary" : "destructive"}>{livres > 0 ? `${livres} vaga${livres > 1 ? "s" : ""} livre${livres > 1 ? "s" : ""}` : "Esgotado"}</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{info.descricao}</p>
              </CardHeader>
              <CardContent className="space-y-2">
                {semCategoria && <p className="text-xs text-destructive">Defina a categoria do seu perfil para comprar este destaque.</p>}
                {porEspaco[e].map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-3 border-t pt-2 first:border-0 first:pt-0">
                    <span className="text-sm">
                      {p.dias} dias{p.exclusivo ? " · exclusivo" : ""} · <strong>{formatBRL(p.valor)}</strong>
                    </span>
                    <Button size="sm" variant="outline" disabled={semCategoria || livres === 0} onClick={() => abrir(p)}>
                      Comprar
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {compras.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Meus destaques na Home</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {compras.map((c) => {
              const st = STATUS_IMAGEM[c.imagem_status ?? "pendente"];
              const nome = ESPACOS_HOME[c.escopo === "home" ? "home_hero" : c.escopo]?.nome ?? c.escopo;
              return (
                <div key={c.id} className="flex flex-wrap items-center gap-3 border-t pt-3 first:border-0 first:pt-0">
                  {c.imagem_url && <img src={c.imagem_url} alt="" className="h-12 w-12 rounded object-cover" />}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.dias} dias · {formatBRL(Number(c.valor))}
                      {c.fim ? ` · até ${new Date(c.fim).toLocaleDateString("pt-BR")}` : ""}
                    </p>
                    {c.imagem_status === "recusada" && c.imagem_motivo_recusa && (
                      <p className="text-xs text-destructive">Motivo: {c.imagem_motivo_recusa}</p>
                    )}
                  </div>
                  {st && <Badge variant={st.variant}>{st.label}</Badge>}
                  {c.imagem_status !== "aprovada" && (
                    <Button size="sm" variant="outline" onClick={() => abrirTroca(c)}>
                      Trocar imagem
                    </Button>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Dialog open={!!aberto} onOpenChange={(v) => !v && (setEscolhido(null), setTrocando(null))}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{escopoDialog ? ESPACOS_HOME[escopoDialog]?.nome : "Destaque"}</DialogTitle>
            <DialogDescription>
              {escolhido
                ? `${escolhido.dias} dias${escolhido.exclusivo ? " exclusivos" : ""} por ${formatBRL(escolhido.valor)}. Envie a imagem; o destaque vai ao ar após o pagamento e a aprovação da imagem.`
                : "Envie uma nova imagem. Ela volta para análise antes de aparecer."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-xs">Imagem {formato ? `(ideal ${formato.replace("x", " × ")} px)` : ""}</Label>
              <label
                className="mt-1 flex cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-dashed bg-muted/40 text-sm text-muted-foreground"
                style={{ aspectRatio: PROPORCAO[escopoDialog ?? "home_hero"] ?? "16 / 9", maxHeight: 320, marginInline: "auto" }}
              >
                {enviando ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : imagem ? (
                  <img src={imagem} alt="Prévia do destaque" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex items-center gap-2">
                    <Upload className="h-4 w-4" /> Escolher imagem (JPG ou PNG, até 8 MB)
                  </span>
                )}
                <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => onArquivo(e.target.files?.[0])} />
              </label>
              <p className="mt-1 text-xs text-muted-foreground">Use foto real do seu trabalho, sem textos grandes ou logos sobre a imagem.</p>
            </div>
            {imagem && escopoDialog && (
              <FocoImagemEditor
                imagem={imagem}
                espaco={escopoDialog as EspacoImagem}
                focoDesktop={foco.focoDesktop}
                focoMobile={foco.focoMobile}
                onChange={setFoco}
              />
            )}
            <div>
              <Label className="text-xs" htmlFor="legenda-destaque">Legenda (opcional)</Label>
              <Input id="legenda-destaque" maxLength={60} value={legenda} onChange={(e) => setLegenda(e.target.value)} placeholder="Ex.: Casamento no jardim, mai/2026" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => (setEscolhido(null), setTrocando(null))}>
              Cancelar
            </Button>
            {escolhido ? (
              <Button onClick={confirmarCompra} disabled={!imagem || salvando || enviando}>
                {salvando ? "Reservando vaga..." : "Ir para o pagamento"}
              </Button>
            ) : (
              <Button onClick={salvarTroca} disabled={!imagem || salvando || enviando}>
                {salvando ? "Salvando..." : "Enviar para análise"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
