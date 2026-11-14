import { useEffect, useState } from "react";
import { Loader2, Plus, Save, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { TEXTOS_PADRAO, type TextosQuiz } from "@/lib/quiz";

type Opcao = {
  id: string;
  pergunta_id: string;
  ordem: number;
  rotulo: string;
  foto_url: string | null;
  credito_nome: string | null;
  credito_url: string | null;
  supplier_id: string | null;
  peso_intimista: number;
  peso_elegante: number;
  peso_grandioso: number;
  ativo: boolean;
};
type Pergunta = {
  id: string;
  ordem: number;
  titulo: string;
  subtitulo: string | null;
  ativo: boolean;
  opcoes: Opcao[];
};
type Lugar = {
  chave: string;
  nome: string;
  cidade: string | null;
  uf: string | null;
  total: number;
  querem_trazer: number;
  supplier_id: string | null;
};

const tbl = (t: string) => supabase.from(t as any) as any;

function CartaoOpcao({ o, onSalvo }: { o: Opcao; onSalvo: () => void }) {
  const { toast } = useToast();
  const [v, setV] = useState(o);
  const [salvando, setSalvando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const mudou = JSON.stringify(v) !== JSON.stringify(o);
  const set = (k: keyof Opcao, val: any) => setV((x) => ({ ...x, [k]: val }));

  const salvar = async () => {
    setSalvando(true);
    const { id, pergunta_id, ...campos } = v;
    const { error } = await tbl("quiz_opcoes")
      .update({
        ...campos,
        foto_url: campos.foto_url?.trim() || null,
        credito_nome: campos.credito_nome?.trim() || null,
        credito_url: campos.credito_url?.trim() || null,
        supplier_id: campos.supplier_id?.trim() || null,
      })
      .eq("id", id);
    setSalvando(false);
    if (error) return toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    toast({ title: "Opção salva" });
    onSalvo();
  };

  const enviarFoto = async (file?: File) => {
    if (!file) return;
    setEnviando(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${o.pergunta_id}/${o.id}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("quiz-fotos").upload(path, file, { contentType: file.type });
    setEnviando(false);
    if (error) return toast({ title: "Erro no envio", description: error.message, variant: "destructive" });
    set("foto_url", supabase.storage.from("quiz-fotos").getPublicUrl(path).data.publicUrl);
  };

  return (
    <div className="grid gap-3 rounded-lg border p-3 md:grid-cols-[120px_1fr]">
      <div className="relative h-[120px] w-[120px] overflow-hidden rounded-md bg-muted">
        {v.foto_url ? (
          <img src={v.foto_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full items-center justify-center p-2 text-center text-xs text-muted-foreground">
            Sem foto: a opção não aparece
          </span>
        )}
      </div>
      <div className="grid gap-2">
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <Input value={v.rotulo} onChange={(e) => set("rotulo", e.target.value)} aria-label="Rótulo" />
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={v.ativo} onCheckedChange={(c) => set("ativo", c)} /> Ativa
          </label>
        </div>
        <div className="flex gap-2">
          <Input
            value={v.foto_url || ""}
            onChange={(e) => set("foto_url", e.target.value)}
            placeholder="URL da foto (Unsplash: botão direito › Copiar endereço da imagem)"
          />
          <Button asChild variant="outline" size="icon" aria-label="Enviar foto">
            <label className="cursor-pointer">
              {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => enviarFoto(e.target.files?.[0])}
              />
            </label>
          </Button>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Input
            value={v.credito_nome || ""}
            onChange={(e) => set("credito_nome", e.target.value)}
            placeholder="Crédito (ex.: Unsplash · Ana M. ou nome do fornecedor)"
          />
          <Input
            value={v.credito_url || ""}
            onChange={(e) => set("credito_url", e.target.value)}
            placeholder="Link do crédito"
          />
        </div>
        <div className="grid gap-2 sm:grid-cols-[1fr_repeat(3,90px)]">
          <Input
            value={v.supplier_id || ""}
            onChange={(e) => set("supplier_id", e.target.value)}
            placeholder="ID do fornecedor (se a foto for dele)"
          />
          {(["peso_intimista", "peso_elegante", "peso_grandioso"] as const).map((k) => (
            <div key={k}>
              <Label className="text-[11px] text-muted-foreground">{k.replace("peso_", "")}</Label>
              <Input type="number" min={0} max={5} value={v[k]} onChange={(e) => set(k, Number(e.target.value) || 0)} />
            </div>
          ))}
        </div>
        <div>
          <Button size="sm" onClick={salvar} disabled={!mudou || salvando}>
            {salvando ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />} Salvar
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function AdminQuiz() {
  const { toast } = useToast();
  const [carregando, setCarregando] = useState(true);
  const [perguntas, setPerguntas] = useState<Pergunta[]>([]);
  const [resumo, setResumo] = useState<any>(null);
  const [textos, setTextos] = useState({ titulos: "", adesivos: "", bloqueadas: "" });
  const [lugares, setLugares] = useState<Lugar[]>([]);
  const [renomear, setRenomear] = useState<Record<string, string>>({});
  const [listaMatch, setListaMatch] = useState<{ cidade: string; uf: string | null; total: number }[]>([]);

  const carregar = async () => {
    const [{ data: ps }, { data: os }, { data: r }, { data: t }] = await Promise.all([
      tbl("quiz_perguntas").select("*").order("ordem"),
      tbl("quiz_opcoes").select("*").order("ordem"),
      (supabase.rpc as any)("admin_quiz_resumo"),
      tbl("system_settings").select("value").eq("key", "quiz_textos").maybeSingle(),
    ]);
    setPerguntas((ps || []).map((p: any) => ({ ...p, opcoes: (os || []).filter((o: any) => o.pergunta_id === p.id) })));
    setResumo(r);
    const v: TextosQuiz = t?.value || TEXTOS_PADRAO;
    setTextos({
      titulos: (v.titulos || []).join("\n"),
      adesivos: (v.adesivos || []).map((a) => `${a.texto} | ${a.mensagem}`).join("\n"),
      bloqueadas: (v.palavras_bloqueadas || []).join(", "),
    });
    const { data: l } = await (supabase.rpc as any)("admin_ranking_lugares");
    setLugares(l || []);
    const { data: lm } = await (supabase.rpc as any)("admin_lista_match");
    setListaMatch(lm || []);
    setCarregando(false);
  };
  useEffect(() => {
    carregar();
  }, []);

  const salvarPergunta = async (p: Pergunta, campos: Partial<Pergunta>) => {
    const { error } = await tbl("quiz_perguntas").update(campos).eq("id", p.id);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    setPerguntas((x) => x.map((y) => (y.id === p.id ? { ...y, ...campos } : y)));
  };

  const novaOpcao = async (p: Pergunta) => {
    const { error } = await tbl("quiz_opcoes").insert({
      pergunta_id: p.id,
      ordem: p.opcoes.length + 1,
      rotulo: "Nova opção",
    });
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    carregar();
  };

  const novaPergunta = async () => {
    const { error } = await tbl("quiz_perguntas").insert({
      ordem: perguntas.length + 1,
      titulo: "Nova pergunta",
      ativo: false,
    });
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    carregar();
  };

  const salvarTextos = async () => {
    const titulos = textos.titulos
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const adesivos = textos.adesivos
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((l) => {
        const [texto, ...resto] = l.split("|");
        return { texto: texto.trim(), mensagem: resto.join("|").trim() || texto.trim() };
      });
    const palavras_bloqueadas = textos.bloqueadas
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (!titulos.length) return toast({ title: "Coloque pelo menos um título", variant: "destructive" });
    const { error } = await tbl("system_settings").upsert({
      key: "quiz_textos",
      value: { titulos, adesivos, palavras_bloqueadas },
      updated_at: new Date().toISOString(),
    });
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Textos salvos" });
  };

  const unificar = async (l: Lugar) => {
    const nome = (renomear[l.chave] || "").trim();
    if (nome.length < 2) return;
    const { data, error } = await (supabase.rpc as any)("admin_unificar_lugar", {
      _chave: l.chave,
      _nome: nome,
      _supplier_id: null,
    });
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: `${data} marcações atualizadas` });
    setRenomear((x) => ({ ...x, [l.chave]: "" }));
    carregar();
  };

  if (carregando)
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );

  const completas = perguntas.filter(
    (p) => p.ativo && p.opcoes.filter((o) => o.ativo && o.foto_url).length >= 2,
  ).length;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Quiz "Um dia vou casar"</h1>
        <p className="text-sm text-muted-foreground">
          Página pública:{" "}
          <a href="/quiz" target="_blank" rel="noreferrer" className="underline">
            /quiz
          </a>
          . {completas} de {perguntas.length} perguntas prontas (precisam de 2 ou mais opções com foto).
        </p>
      </div>

      {resumo && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
          {[
            ["Quizzes feitos", resumo.resultados],
            ["Com conta", resumo.com_conta],
            ["Compartilharam", resumo.compartilharam],
            ["Vieram por link", resumo.por_indicacao],
            ["Perfis de sonhos", resumo.perfis_genericos],
            ["Lista do Match", resumo.lista_match],
          ].map(([r, n]) => (
            <div key={r as string} className="rounded-lg bg-muted/60 p-3">
              <p className="text-xs text-muted-foreground">{r}</p>
              <p className="text-2xl font-semibold">{n ?? 0}</p>
            </div>
          ))}
        </div>
      )}

      <Tabs defaultValue="perguntas">
        <TabsList className="flex-wrap">
          <TabsTrigger value="perguntas">Perguntas e fotos</TabsTrigger>
          <TabsTrigger value="textos">Títulos e adesivos</TabsTrigger>
          <TabsTrigger value="lugares">Lugares sonhados</TabsTrigger>
          <TabsTrigger value="match">Lista do Match</TabsTrigger>
        </TabsList>

        <TabsContent value="perguntas" className="space-y-6">
          {perguntas.map((p) => (
            <div key={p.id} className="space-y-3 rounded-xl border p-4">
              <div className="flex flex-wrap items-center gap-3">
                <Input
                  className="w-16"
                  type="number"
                  value={p.ordem}
                  onChange={(e) => salvarPergunta(p, { ordem: Number(e.target.value) || 0 })}
                  aria-label="Ordem"
                />
                <Input
                  className="min-w-[220px] flex-1"
                  defaultValue={p.titulo}
                  onBlur={(e) => e.target.value !== p.titulo && salvarPergunta(p, { titulo: e.target.value })}
                  aria-label="Pergunta"
                />
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={p.ativo} onCheckedChange={(c) => salvarPergunta(p, { ativo: c })} /> Ativa
                </label>
                <Badge variant="secondary">{p.opcoes.filter((o) => o.ativo && o.foto_url).length} com foto</Badge>
              </div>
              {p.opcoes.map((o) => (
                <CartaoOpcao key={o.id} o={o} onSalvo={carregar} />
              ))}
              <Button variant="outline" size="sm" onClick={() => novaOpcao(p)}>
                <Plus className="mr-1 h-4 w-4" /> Opção
              </Button>
            </div>
          ))}
          <Button variant="outline" onClick={novaPergunta}>
            <Plus className="mr-1 h-4 w-4" /> Pergunta
          </Button>
          <p className="text-xs text-muted-foreground">
            Pesos: quanto cada opção puxa para intimista, elegante ou grandioso (0 a 5). Fotos do Unsplash: dê o crédito
            como "Unsplash · Nome do fotógrafo" e cole o link do perfil dele.
          </p>
        </TabsContent>

        <TabsContent value="textos" className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="t-titulos">Títulos (um por linha)</Label>
            <Textarea
              id="t-titulos"
              rows={7}
              value={textos.titulos}
              onChange={(e) => setTextos((x) => ({ ...x, titulos: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="t-adesivos">Adesivos (um por linha: texto | fala do Cupido no formato mensagem)</Label>
            <Textarea
              id="t-adesivos"
              rows={6}
              value={textos.adesivos}
              onChange={(e) => setTextos((x) => ({ ...x, adesivos: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="t-bloq">Palavras bloqueadas no texto livre (separadas por vírgula)</Label>
            <Textarea
              id="t-bloq"
              rows={3}
              value={textos.bloqueadas}
              onChange={(e) => setTextos((x) => ({ ...x, bloqueadas: e.target.value }))}
            />
          </div>
          <Button onClick={salvarTextos}>
            <Save className="mr-1 h-4 w-4" /> Salvar textos
          </Button>
          <p className="text-xs text-muted-foreground">
            Sem gênero: prefira "par" e "quem me espera no altar". Troque as frases que param de render
            compartilhamento.
          </p>
        </TabsContent>

        <TabsContent value="lugares" className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Lugares onde as pessoas sonham casar. Use para convidar o espaço: "{lugares[0]?.querem_trazer ?? 12} pessoas
            querem casar no seu espaço". Nunca mostramos quem marcou.
          </p>
          {lugares.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Ainda não há lugares marcados.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="p-2">Lugar</th>
                    <th className="p-2">Cidade</th>
                    <th className="p-2">Marcaram</th>
                    <th className="p-2">Querem trazer</th>
                    <th className="p-2">Juntar com outro nome</th>
                  </tr>
                </thead>
                <tbody>
                  {lugares.map((l) => (
                    <tr key={l.chave} className="border-t">
                      <td className="p-2 font-medium">
                        {l.nome}{" "}
                        {l.supplier_id && (
                          <Badge variant="secondary" className="ml-1">
                            já cadastrado
                          </Badge>
                        )}
                      </td>
                      <td className="p-2">{[l.cidade, l.uf].filter(Boolean).join(", ") || "—"}</td>
                      <td className="p-2">{l.total}</td>
                      <td className="p-2">{l.querem_trazer}</td>
                      <td className="p-2">
                        <div className="flex gap-1.5">
                          <Input
                            className="h-8 min-w-[160px]"
                            placeholder="Nome certo"
                            value={renomear[l.chave] || ""}
                            onChange={(e) => setRenomear((x) => ({ ...x, [l.chave]: e.target.value }))}
                          />
                          <Button size="sm" variant="outline" onClick={() => unificar(l)}>
                            Aplicar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Para juntar "recanto flores" com "Recanto das Flores", escreva o nome certo na linha errada e aplique: as
            duas viram uma só.
          </p>
        </TabsContent>
        <TabsContent value="match" className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Quem entrou na lista de espera do Casamenteiro Match (18+, com consentimento). É o termômetro para decidir
            se o Match vale ser construído e em qual cidade começar.
          </p>
          {listaMatch.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Ninguém na lista ainda.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="p-2">Cidade</th>
                    <th className="p-2">UF</th>
                    <th className="p-2">Na lista</th>
                  </tr>
                </thead>
                <tbody>
                  {listaMatch.map((c) => (
                    <tr key={`${c.cidade}-${c.uf}`} className="border-t">
                      <td className="p-2">{c.cidade}</td>
                      <td className="p-2">{c.uf || "—"}</td>
                      <td className="p-2 font-medium">{c.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
