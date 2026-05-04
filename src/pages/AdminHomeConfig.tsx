import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Heart, Trash2, Plus, ArrowUp, ArrowDown, ExternalLink } from "lucide-react";

type Frase = { id: string; grupo: string; texto: string; ordem: number; ativo: boolean };
type Bloco = { id: string; foto_url: string; frase: string; subtexto: string | null; ordem: number; ativo: boolean; supplier_id: string | null };

export default function AdminHomeConfig() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [frases, setFrases] = useState<Frase[]>([]);
  const [blocos, setBlocos] = useState<Bloco[]>([]);
  const [grupoAtual, setGrupoAtual] = useState("intro");
  const [novoGrupo, setNovoGrupo] = useState("");
  const [novaFrase, setNovaFrase] = useState("");
  const [novoBloco, setNovoBloco] = useState({ foto_url: "", frase: "", subtexto: "" });

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login"); return; }
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }).then(({ data }) => {
      if (!data) { navigate("/"); return; }
      setIsAdmin(true);
      load();
    });
  }, [user, authLoading, navigate]);

  const load = async () => {
    const f = await (supabase.from("frases_home" as any).select("*").order("grupo").order("ordem") as any);
    const b = await (supabase.from("secoes_home" as any).select("*").order("ordem") as any);
    setFrases((f.data as any) || []);
    setBlocos((b.data as any) || []);
  };

  const grupos = Array.from(new Set(frases.map(f => f.grupo)));
  const frasesGrupo = frases.filter(f => f.grupo === grupoAtual).sort((a, b) => a.ordem - b.ordem);

  const addFrase = async () => {
    if (!novaFrase.trim()) return;
    const ordem = frasesGrupo.length + 1;
    await (supabase.from("frases_home" as any) as any).insert({ grupo: grupoAtual, texto: novaFrase, ordem });
    setNovaFrase("");
    load();
  };

  const updateFrase = async (id: string, patch: Partial<Frase>) => {
    await (supabase.from("frases_home" as any) as any).update(patch).eq("id", id);
    load();
  };

  const delFrase = async (id: string) => {
    if (!confirm("Excluir frase?")) return;
    await (supabase.from("frases_home" as any) as any).delete().eq("id", id);
    load();
  };

  const criarGrupo = async () => {
    if (!novoGrupo.trim()) return;
    setGrupoAtual(novoGrupo.trim());
    setNovoGrupo("");
    toast({ title: "Grupo criado", description: "Adicione frases ao novo grupo." });
  };

  const moveFrase = async (id: string, dir: -1 | 1) => {
    const list = [...frasesGrupo];
    const idx = list.findIndex(f => f.id === id);
    const swap = idx + dir;
    if (swap < 0 || swap >= list.length) return;
    await Promise.all([
      (supabase.from("frases_home" as any) as any).update({ ordem: list[swap].ordem }).eq("id", list[idx].id),
      (supabase.from("frases_home" as any) as any).update({ ordem: list[idx].ordem }).eq("id", list[swap].id),
    ]);
    load();
  };

  // Blocos
  const addBloco = async () => {
    if (!novoBloco.foto_url || !novoBloco.frase) return;
    const ordem = blocos.length + 1;
    await (supabase.from("secoes_home" as any) as any).insert({ ...novoBloco, ordem });
    setNovoBloco({ foto_url: "", frase: "", subtexto: "" });
    load();
  };
  const updBloco = async (id: string, patch: Partial<Bloco>) => {
    await (supabase.from("secoes_home" as any) as any).update(patch).eq("id", id);
    load();
  };
  const delBloco = async (id: string) => {
    if (!confirm("Excluir bloco?")) return;
    await (supabase.from("secoes_home" as any) as any).delete().eq("id", id);
    load();
  };
  const moveBloco = async (id: string, dir: -1 | 1) => {
    const list = [...blocos].sort((a, b) => a.ordem - b.ordem);
    const idx = list.findIndex(b => b.id === id);
    const swap = idx + dir;
    if (swap < 0 || swap >= list.length) return;
    await Promise.all([
      (supabase.from("secoes_home" as any) as any).update({ ordem: list[swap].ordem }).eq("id", list[idx].id),
      (supabase.from("secoes_home" as any) as any).update({ ordem: list[idx].ordem }).eq("id", list[swap].id),
    ]);
    load();
  };

  if (isAdmin === null) return <div className="min-h-screen flex items-center justify-center">Verificando...</div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b sticky top-0 z-40">
        <div className="container flex items-center justify-between h-16">
          <Link to="/admin" className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary fill-primary" />
            <span className="font-bold">Admin · Home</span>
          </Link>
          <Button variant="outline" size="sm" asChild>
            <a href="/?preview=1" target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3 w-3 mr-1" />Ver como ficará</a>
          </Button>
        </div>
      </header>
      <main className="container py-8">
        <Tabs defaultValue="frases">
          <TabsList>
            <TabsTrigger value="frases">Frases</TabsTrigger>
            <TabsTrigger value="blocos">Blocos da Home</TabsTrigger>
          </TabsList>

          <TabsContent value="frases" className="mt-6 space-y-4">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm text-muted-foreground">Grupo:</span>
              {grupos.map(g => (
                <Button key={g} size="sm" variant={g === grupoAtual ? "default" : "outline"} onClick={() => setGrupoAtual(g)}>{g}</Button>
              ))}
              <div className="flex gap-2 ml-auto">
                <Input placeholder="novo grupo" value={novoGrupo} onChange={e => setNovoGrupo(e.target.value)} className="w-40 h-9" />
                <Button size="sm" onClick={criarGrupo}><Plus className="h-3 w-3 mr-1" />Criar</Button>
              </div>
            </div>

            <div className="border rounded-lg divide-y">
              {frasesGrupo.map((f, i) => (
                <div key={f.id} className="p-3 flex items-center gap-2">
                  <div className="flex flex-col">
                    <button onClick={() => moveFrase(f.id, -1)} disabled={i === 0} className="disabled:opacity-30"><ArrowUp className="h-3 w-3" /></button>
                    <button onClick={() => moveFrase(f.id, 1)} disabled={i === frasesGrupo.length - 1} className="disabled:opacity-30"><ArrowDown className="h-3 w-3" /></button>
                  </div>
                  <Input defaultValue={f.texto} onBlur={e => e.target.value !== f.texto && updateFrase(f.id, { texto: e.target.value })} className="flex-1" />
                  <Switch checked={f.ativo} onCheckedChange={v => updateFrase(f.id, { ativo: v })} />
                  <Button size="icon" variant="ghost" onClick={() => delFrase(f.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              ))}
              <div className="p-3 flex gap-2">
                <Input placeholder="Nova frase" value={novaFrase} onChange={e => setNovaFrase(e.target.value)} />
                <Button onClick={addFrase}><Plus className="h-4 w-4 mr-1" />Adicionar</Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="blocos" className="mt-6 space-y-4">
            <div className="border rounded-lg divide-y">
              {[...blocos].sort((a, b) => a.ordem - b.ordem).map((b, i, arr) => (
                <div key={b.id} className="p-3 flex gap-3 items-start">
                  <div className="flex flex-col pt-2">
                    <button onClick={() => moveBloco(b.id, -1)} disabled={i === 0} className="disabled:opacity-30"><ArrowUp className="h-3 w-3" /></button>
                    <button onClick={() => moveBloco(b.id, 1)} disabled={i === arr.length - 1} className="disabled:opacity-30"><ArrowDown className="h-3 w-3" /></button>
                  </div>
                  <img src={b.foto_url} alt="" className="w-20 h-20 object-cover rounded" />
                  <div className="flex-1 space-y-2">
                    <Input defaultValue={b.frase} onBlur={e => e.target.value !== b.frase && updBloco(b.id, { frase: e.target.value })} placeholder="Frase" />
                    <Input defaultValue={b.subtexto || ""} onBlur={e => e.target.value !== (b.subtexto || "") && updBloco(b.id, { subtexto: e.target.value })} placeholder="Subtexto" />
                    <Input defaultValue={b.foto_url} onBlur={e => e.target.value !== b.foto_url && updBloco(b.id, { foto_url: e.target.value })} placeholder="URL da foto" className="text-xs" />
                  </div>
                  <div className="flex flex-col items-center gap-2 pt-2">
                    <Switch checked={b.ativo} onCheckedChange={v => updBloco(b.id, { ativo: v })} />
                    <Button size="icon" variant="ghost" onClick={() => delBloco(b.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="border rounded-lg p-4 space-y-2">
              <h3 className="font-medium">Adicionar bloco</h3>
              <Input placeholder="URL da foto" value={novoBloco.foto_url} onChange={e => setNovoBloco({ ...novoBloco, foto_url: e.target.value })} />
              <Input placeholder="Frase" value={novoBloco.frase} onChange={e => setNovoBloco({ ...novoBloco, frase: e.target.value })} />
              <Textarea placeholder="Subtexto (opcional)" value={novoBloco.subtexto} onChange={e => setNovoBloco({ ...novoBloco, subtexto: e.target.value })} />
              <Button onClick={addBloco}><Plus className="h-4 w-4 mr-1" />Adicionar bloco</Button>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}