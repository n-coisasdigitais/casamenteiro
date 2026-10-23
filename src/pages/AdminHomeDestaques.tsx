import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import FocoImagemEditor, { FORMATOS, type EspacoImagem } from "@/components/destaques/FocoImagemEditor";
import { useToast } from "@/hooks/use-toast";
import { ArrowDown, ArrowUp, Check, Crop, Loader2, Trash2, Upload, X } from "lucide-react";
import { ESPACOS_HOME } from "@/lib/monetizacao";
import { traduzirErro } from "@/lib/errorMessages";

type Escopo = "home_hero" | "home_story" | "home_form" | "home_categoria";

type Bloco = {
  id: string;
  foto_url: string;
  frase: string | null;
  subtexto: string | null;
  ordem: number;
  ativo: boolean;
  escopo: string | null;
  categoria_id: string | null;
  foco_desktop?: string | null;
  foco_mobile?: string | null;
};

type Enquadrando = {
  tabela: "secoes_home" | "featured_purchases";
  id: string;
  imagem: string;
  espaco: EspacoImagem;
  focoDesktop: string;
  focoMobile: string;
};

type Compra = {
  id: string;
  escopo: string;
  status: string;
  dias: number;
  valor: number;
  imagem_url: string | null;
  imagem_status: string;
  legenda: string | null;
  created_at: string;
  escopo_categoria_id: string | null;
  foco_desktop?: string | null;
  foco_mobile?: string | null;
  suppliers?: { company_name: string } | null;
};

const ESPACOS: { id: Escopo; nome: string; ajuda: string; texto: boolean }[] = [
  { id: "home_hero", nome: "Hero", ajuda: "Fotos da abertura. Com várias, elas se revezam a cada 6 s quando não há patrocinador.", texto: false },
  { id: "home_story", nome: "Stories", ajuda: "Os 4 stories da narrativa. Título e texto aparecem no story. O 2º e o 3º podem ser trocados por patrocinadores.", texto: true },
  { id: "home_form", nome: "Formulário", ajuda: "Foto panorâmica acima do simulador.", texto: false },
  { id: "home_categoria", nome: "Categorias", ajuda: "Foto padrão de cada categoria na Home. Sem foto, o bloco aparece colorido.", texto: false },
];

/**
 * Admin › Home — destaques: imagens padrão de cada espaço, aprovação das
 * imagens pagas e o que está no ar agora (com vagas, impressões e cliques).
 */
export default function AdminHomeDestaques() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [blocos, setBlocos] = useState<Bloco[]>([]);
  const [categorias, setCategorias] = useState<{ id: string; name: string }[]>([]);
  const [pendentes, setPendentes] = useState<Compra[]>([]);
  const [noAr, setNoAr] = useState<any[]>([]);
  const [vagas, setVagas] = useState<Record<string, number>>({});
  const [metricas, setMetricas] = useState<Record<string, { imp: number; cli: number }>>({});
  const [enviando, setEnviando] = useState<string | null>(null);
  const [novo, setNovo] = useState<Record<Escopo, { foto_url: string; frase: string; subtexto: string; categoria_id: string }>>({
    home_hero: { foto_url: "", frase: "", subtexto: "", categoria_id: "" },
    home_story: { foto_url: "", frase: "", subtexto: "", categoria_id: "" },
    home_form: { foto_url: "", frase: "", subtexto: "", categoria_id: "" },
    home_categoria: { foto_url: "", frase: "", subtexto: "", categoria_id: "" },
  });
  const [motivo, setMotivo] = useState<Record<string, string>>({});
  const [enquadrando, setEnquadrando] = useState<Enquadrando | null>(null);

  const salvarEnquadramento = async () => {
    if (!enquadrando) return;
    const { error } = await (supabase.from(enquadrando.tabela as any) as any)
      .update({ foco_desktop: enquadrando.focoDesktop, foco_mobile: enquadrando.focoMobile })
      .eq("id", enquadrando.id);
    if (error) return toast({ title: "Erro ao salvar enquadramento", description: traduzirErro(error), variant: "destructive" });
    toast({ title: "Enquadramento salvo" });
    setEnquadrando(null);
    carregar();
  };

  const carregar = async () => {
    const [b, c, p, ar] = await Promise.all([
      (supabase.from("secoes_home" as any) as any).select("id, foto_url, frase, subtexto, ordem, ativo, escopo, categoria_id, foco_desktop, foco_mobile").order("ordem"),
      supabase.from("categories").select("id, name").eq("active", true).order("name"),
      (supabase.from("featured_purchases" as any) as any)
        .select("id, escopo, status, dias, valor, imagem_url, imagem_status, legenda, created_at, escopo_categoria_id, foco_desktop, foco_mobile, suppliers(company_name)")
        .in("escopo", ["home", "home_hero", "home_story", "home_form", "home_categoria"])
        .eq("imagem_status", "pendente")
        .in("status", ["pendente", "ativo", "pago"])
        .order("created_at", { ascending: true }),
      (supabase.rpc as any)("home_destaques_ativos"),
    ]);
    setBlocos(((b.data as Bloco[]) ?? []).filter((x) => x.escopo !== "explore"));
    setCategorias((c.data as any[]) ?? []);
    setPendentes((p.data as Compra[]) ?? []);
    const ativos = (ar.data as any[]) ?? [];
    setNoAr(ativos);

    const vs = await Promise.all(
      ESPACOS.filter((e) => e.id !== "home_categoria").map(async (e) => {
        const { data } = await (supabase.rpc as any)("vagas_destaque_disponiveis", { p_escopo: e.id, p_categoria: null });
        return [e.id, Number(data ?? 0)] as const;
      }),
    );
    setVagas(Object.fromEntries(vs));

    const desde = new Date(Date.now() - 30 * 86400000).toISOString();
    const ms = await Promise.all(
      ativos.map(async (a) => {
        const base = () => (supabase.from("featured_events" as any) as any).select("id", { count: "exact", head: true }).eq("purchase_id", a.id).gte("created_at", desde);
        const [imp, cli] = await Promise.all([base().eq("tipo", "impressao"), base().eq("tipo", "clique")]);
        return [a.id, { imp: imp.count ?? 0, cli: cli.count ?? 0 }] as const;
      }),
    );
    setMetricas(Object.fromEntries(ms));
  };

  useEffect(() => {
    if (isAdmin) carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const upload = async (file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("home-photos").upload(path, file, { upsert: false, contentType: file.type });
    if (error) {
      toast({ title: "Erro no upload", description: traduzirErro(error), variant: "destructive" });
      return null;
    }
    return supabase.storage.from("home-photos").getPublicUrl(path).data.publicUrl;
  };

  // linhas antigas (escopo 'home' ou vazio): ordem 0 = hero, demais = stories
  const doEspaco = (e: Escopo) =>
    blocos.filter((b) => {
      if (b.escopo === e) return true;
      const legado = !b.escopo || b.escopo === "home";
      if (!legado) return false;
      return e === "home_hero" ? b.ordem === 0 : e === "home_story" ? b.ordem !== 0 : false;
    });

  const adicionar = async (e: Escopo) => {
    const n = novo[e];
    if (!n.foto_url) return toast({ title: "Envie uma foto", variant: "destructive" });
    if (e === "home_categoria" && !n.categoria_id) return toast({ title: "Escolha a categoria", variant: "destructive" });
    const ordem = Math.max(0, ...doEspaco(e).map((b) => b.ordem)) + 1;
    const { error } = await (supabase.from("secoes_home" as any) as any).insert({
      foto_url: n.foto_url,
      frase: n.frase || ESPACOS.find((x) => x.id === e)!.nome,
      subtexto: n.subtexto || null,
      escopo: e,
      categoria_id: e === "home_categoria" ? n.categoria_id : null,
      ordem,
      ativo: true,
    });
    if (error) return toast({ title: "Erro", description: traduzirErro(error), variant: "destructive" });
    setNovo((s) => ({ ...s, [e]: { foto_url: "", frase: "", subtexto: "", categoria_id: "" } }));
    carregar();
  };

  const atualizar = async (id: string, patch: Partial<Bloco>) => {
    await (supabase.from("secoes_home" as any) as any).update(patch).eq("id", id);
    carregar();
  };

  const mover = async (lista: Bloco[], i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= lista.length) return;
    await Promise.all([
      (supabase.from("secoes_home" as any) as any).update({ ordem: lista[j].ordem }).eq("id", lista[i].id),
      (supabase.from("secoes_home" as any) as any).update({ ordem: lista[i].ordem }).eq("id", lista[j].id),
    ]);
    carregar();
  };

  const excluir = async (id: string) => {
    if (!confirm("Excluir esta imagem padrão?")) return;
    await (supabase.from("secoes_home" as any) as any).delete().eq("id", id);
    carregar();
  };

  const decidir = async (c: Compra, aprovar: boolean) => {
    if (!aprovar && !motivo[c.id]?.trim()) return toast({ title: "Escreva o motivo da recusa", variant: "destructive" });
    const { error } = await (supabase.from("featured_purchases" as any) as any)
      .update(aprovar ? { imagem_status: "aprovada", imagem_motivo_recusa: null } : { imagem_status: "recusada", imagem_motivo_recusa: motivo[c.id].trim() })
      .eq("id", c.id);
    if (error) return toast({ title: "Erro", description: traduzirErro(error), variant: "destructive" });
    toast({ title: aprovar ? "Imagem aprovada" : "Imagem recusada" });
    carregar();
  };

  const nomeEspaco = (e: string) => ESPACOS_HOME[e === "home" ? "home_hero" : e]?.nome ?? e;
  const nomeCategoria = (id: string | null) => categorias.find((c) => c.id === id)?.name ?? "—";

  if (!isAdmin) return null;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Home — destaques e imagens</h1>
        <p className="text-sm text-muted-foreground">
          Imagens padrão de cada espaço (aparecem quando ninguém está pagando), aprovação das imagens enviadas pelos fornecedores e o que está no ar.
        </p>
      </div>

      <Tabs defaultValue="padrao">
        <TabsList>
          <TabsTrigger value="padrao">Imagens padrão</TabsTrigger>
          <TabsTrigger value="aprovacao">
            Aprovação {pendentes.length > 0 && <Badge className="ml-2">{pendentes.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="noar">No ar agora</TabsTrigger>
        </TabsList>

        {/* ---------- Imagens padrão ---------- */}
        <TabsContent value="padrao" className="space-y-6 pt-4">
          {ESPACOS.map((e) => {
            const lista = doEspaco(e.id).sort((a, b) => a.ordem - b.ordem);
            const n = novo[e.id];
            return (
              <Card key={e.id}>
                <CardHeader>
                  <CardTitle className="text-base">{e.nome}</CardTitle>
                  <p className="text-sm text-muted-foreground">{e.ajuda}</p>
                  <p className="text-xs text-muted-foreground">
                    Tamanho sugerido: <strong>{FORMATOS[e.id].sugerido}</strong> (mínimo {FORMATOS[e.id].minimo}). Depois de subir, use{" "}
                    <Crop className="inline h-3 w-3" /> para ajustar o corte no desktop e no celular.
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {lista.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma imagem cadastrada. A Home usa a imagem embutida.</p>}
                  {lista.map((b, i) => (
                    <div key={b.id} className="flex flex-wrap items-center gap-3 border-t pt-3 first:border-0 first:pt-0">
                      <img src={b.foto_url} alt="" className="h-16 w-24 rounded object-cover" />
                      <div className="min-w-[200px] flex-1 space-y-1">
                        {e.texto && (
                          <>
                            <Input defaultValue={b.frase ?? ""} placeholder="Título do story" onBlur={(ev) => ev.target.value !== (b.frase ?? "") && atualizar(b.id, { frase: ev.target.value })} />
                            <Textarea rows={2} defaultValue={b.subtexto ?? ""} placeholder="Texto do story" onBlur={(ev) => ev.target.value !== (b.subtexto ?? "") && atualizar(b.id, { subtexto: ev.target.value })} />
                          </>
                        )}
                        {e.id === "home_categoria" && <p className="text-sm font-medium">{nomeCategoria(b.categoria_id)}</p>}
                        {(!b.escopo || b.escopo === "home") && (
                          <p className="text-xs text-muted-foreground">
                            Cadastro antigo.{" "}
                            <button type="button" className="underline" onClick={() => atualizar(b.id, { escopo: e.id })}>
                              Converter para {e.nome}
                            </button>
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={b.ativo} onCheckedChange={(v) => atualizar(b.id, { ativo: v })} aria-label="Ativo" />
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Ajustar enquadramento"
                          title="Ajustar enquadramento (desktop e celular)"
                          onClick={() =>
                            setEnquadrando({
                              tabela: "secoes_home",
                              id: b.id,
                              imagem: b.foto_url,
                              espaco: e.id,
                              focoDesktop: b.foco_desktop || "50% 50%",
                              focoMobile: b.foco_mobile || b.foco_desktop || "50% 50%",
                            })
                          }
                        >
                          <Crop className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => mover(lista, i, -1)} aria-label="Subir">
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => mover(lista, i, 1)} aria-label="Descer">
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <label className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md hover:bg-muted" aria-label="Trocar foto">
                          {enviando === b.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                          <input
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            onChange={async (ev) => {
                              const f = ev.target.files?.[0];
                              if (!f) return;
                              setEnviando(b.id);
                              const url = await upload(f);
                              setEnviando(null);
                              if (url) atualizar(b.id, { foto_url: url });
                            }}
                          />
                        </label>
                        <Button size="icon" variant="ghost" onClick={() => excluir(b.id)} aria-label="Excluir">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  <div className="grid gap-2 rounded-lg border border-dashed p-3 md:grid-cols-[auto,1fr,auto] md:items-center">
                    <label className="inline-flex h-16 w-24 cursor-pointer items-center justify-center overflow-hidden rounded bg-muted text-xs text-muted-foreground">
                      {enviando === `novo-${e.id}` ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : n.foto_url ? (
                        <img src={n.foto_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="flex items-center gap-1">
                          <Upload className="h-3.5 w-3.5" /> Foto
                        </span>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={async (ev) => {
                          const f = ev.target.files?.[0];
                          if (!f) return;
                          setEnviando(`novo-${e.id}`);
                          const url = await upload(f);
                          setEnviando(null);
                          if (url) setNovo((s) => ({ ...s, [e.id]: { ...s[e.id], foto_url: url } }));
                        }}
                      />
                    </label>
                    <div className="grid gap-2">
                      {e.texto && (
                        <>
                          <Input value={n.frase} placeholder="Título do story" onChange={(ev) => setNovo((s) => ({ ...s, [e.id]: { ...s[e.id], frase: ev.target.value } }))} />
                          <Input value={n.subtexto} placeholder="Texto do story" onChange={(ev) => setNovo((s) => ({ ...s, [e.id]: { ...s[e.id], subtexto: ev.target.value } }))} />
                        </>
                      )}
                      {e.id === "home_categoria" && (
                        <select
                          value={n.categoria_id}
                          onChange={(ev) => setNovo((s) => ({ ...s, [e.id]: { ...s[e.id], categoria_id: ev.target.value } }))}
                          className="h-10 rounded-md border border-input bg-background px-2 text-sm"
                        >
                          <option value="">Escolha a categoria</option>
                          {categorias.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      )}
                      {!e.texto && e.id !== "home_categoria" && <Input value={n.frase} placeholder="Descrição da foto (acessibilidade)" onChange={(ev) => setNovo((s) => ({ ...s, [e.id]: { ...s[e.id], frase: ev.target.value } }))} />}
                    </div>
                    <Button onClick={() => adicionar(e.id)}>Adicionar</Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* ---------- Aprovação ---------- */}
        <TabsContent value="aprovacao" className="space-y-3 pt-4">
          {pendentes.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma imagem aguardando aprovação.</p>}
          {pendentes.map((c) => (
            <Card key={c.id}>
              <CardContent className="grid gap-4 p-4 md:grid-cols-[240px,1fr]">
                {c.imagem_url ? (
                  <a href={c.imagem_url} target="_blank" rel="noopener noreferrer">
                    <img src={c.imagem_url} alt="" className="max-h-60 w-full rounded object-cover" />
                  </a>
                ) : (
                  <div className="flex h-32 items-center justify-center rounded bg-muted text-sm text-muted-foreground">Sem imagem</div>
                )}
                <div className="space-y-2 text-sm">
                  <p className="font-semibold">{c.suppliers?.company_name ?? "Fornecedor"}</p>
                  <p>
                    {nomeEspaco(c.escopo)} · {c.dias} dias · {Number(c.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    {c.escopo === "home_categoria" ? ` · ${nomeCategoria(c.escopo_categoria_id)}` : ""}
                  </p>
                  <p className="text-muted-foreground">
                    Pagamento: <Badge variant="secondary">{c.status}</Badge> · enviado em {new Date(c.created_at).toLocaleDateString("pt-BR")}
                  </p>
                  {c.legenda && <p>Legenda: “{c.legenda}”</p>}
                  <Input placeholder="Motivo da recusa (o fornecedor vê esta mensagem)" value={motivo[c.id] ?? ""} onChange={(e) => setMotivo((m) => ({ ...m, [c.id]: e.target.value }))} />
                  <div className="flex gap-2">
                    {c.imagem_url && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setEnquadrando({
                            tabela: "featured_purchases",
                            id: c.id,
                            imagem: c.imagem_url!,
                            espaco: (c.escopo === "home" ? "home_hero" : c.escopo) as EspacoImagem,
                            focoDesktop: c.foco_desktop || "50% 50%",
                            focoMobile: c.foco_mobile || c.foco_desktop || "50% 50%",
                          })
                        }
                      >
                        <Crop className="mr-1 h-4 w-4" /> Enquadrar
                      </Button>
                    )}
                    <Button size="sm" onClick={() => decidir(c, true)}>
                      <Check className="mr-1 h-4 w-4" /> Aprovar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => decidir(c, false)}>
                      <X className="mr-1 h-4 w-4" /> Recusar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* ---------- No ar agora ---------- */}
        <TabsContent value="noar" className="space-y-4 pt-4">
          <div className="grid gap-3 md:grid-cols-3">
            {ESPACOS.filter((e) => e.id !== "home_categoria").map((e) => (
              <Card key={e.id}>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">{e.nome}</p>
                  <p className="text-2xl font-semibold">{vagas[e.id] ?? "—"} vagas livres</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40 text-left">
                  <tr>
                    <th className="p-3">Fornecedor</th>
                    <th className="p-3">Espaço</th>
                    <th className="p-3">Categoria</th>
                    <th className="p-3 text-right">Impressões (30d)</th>
                    <th className="p-3 text-right">Cliques (30d)</th>
                    <th className="p-3 text-right">CTR</th>
                  </tr>
                </thead>
                <tbody>
                  {noAr.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-4 text-muted-foreground">
                        Nenhum destaque pago no ar. A Home está usando as imagens padrão.
                      </td>
                    </tr>
                  )}
                  {noAr.map((a) => {
                    const m = metricas[a.id] ?? { imp: 0, cli: 0 };
                    return (
                      <tr key={a.id} className="border-b last:border-0">
                        <td className="p-3">{a.supplier_nome}</td>
                        <td className="p-3">{nomeEspaco(a.escopo)}</td>
                        <td className="p-3">{a.categoria_nome ?? "—"}</td>
                        <td className="p-3 text-right">{m.imp.toLocaleString("pt-BR")}</td>
                        <td className="p-3 text-right">{m.cli.toLocaleString("pt-BR")}</td>
                        <td className="p-3 text-right">{m.imp ? `${((m.cli / m.imp) * 100).toFixed(1)}%` : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!enquadrando} onOpenChange={(v) => !v && setEnquadrando(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Enquadramento — {enquadrando ? FORMATOS[enquadrando.espaco].nome : ""}</DialogTitle>
          </DialogHeader>
          {enquadrando && (
            <FocoImagemEditor
              imagem={enquadrando.imagem}
              espaco={enquadrando.espaco}
              focoDesktop={enquadrando.focoDesktop}
              focoMobile={enquadrando.focoMobile}
              onChange={(v) => setEnquadrando((s) => (s ? { ...s, ...v } : s))}
            />
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEnquadrando(null)}>
              Cancelar
            </Button>
            <Button onClick={salvarEnquadramento}>Salvar enquadramento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
