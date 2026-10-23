import { TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useFeatureFlags } from "@/contexts/FeatureFlagsContext";
import { PAINEL_ICONES, type FaqItem, type PainelItem, type SupplierLandingConfig } from "@/lib/supplierLandingConfig";

type Props = {
  cfg: SupplierLandingConfig;
  setCfg: React.Dispatch<React.SetStateAction<SupplierLandingConfig>>;
};

const ICONE_LABEL: Record<string, string> = {
  inbox: "Caixa de entrada",
  message: "Mensagem",
  kanban: "Kanban",
  calendar: "Agenda",
  "calendar-heart": "Agenda com coração",
  users: "Pessoas",
  star: "Estrela",
  wallet: "Carteira",
  sparkles: "Brilho",
  "bar-chart": "Gráfico",
  refresh: "Sincronizar",
  shield: "Escudo",
};

const VARS = "Variáveis: {taxa_reserva} {carencia_dias} {teste_dias} {aprovacao_horas} — trocadas pelos valores das tabelas.";

function mover<T>(lista: T[], i: number, d: -1 | 1): T[] {
  const j = i + d;
  if (j < 0 || j >= lista.length) return lista;
  const n = [...lista];
  [n[i], n[j]] = [n[j], n[i]];
  return n;
}

/** Abas das seções novas da página /fornecedor (pedido certo, painel, planos, dúvidas). */
export default function LandingFornecedorV2Abas({ cfg, setCfg }: Props) {
  const flags = useFeatureFlags();
  const set = <K extends "lead" | "painel" | "planos" | "faq">(k: K, patch: Partial<SupplierLandingConfig[K]>) =>
    setCfg((c) => ({ ...c, [k]: { ...c[k], ...patch } }));

  const setItem = (i: number, patch: Partial<PainelItem>) =>
    set("painel", { items: cfg.painel.items.map((it, k) => (k === i ? { ...it, ...patch } : it)) });
  const setFaq = (i: number, patch: Partial<FaqItem>) =>
    set("faq", { items: cfg.faq.items.map((it, k) => (k === i ? { ...it, ...patch } : it)) });

  return (
    <>
      {/* PEDIDO CERTO */}
      <TabsContent value="lead" className="mt-6">
        <Card className="max-w-2xl space-y-4 p-6">
          <div><Label>Eyebrow</Label><Input value={cfg.lead.eyebrow} onChange={(e) => set("lead", { eyebrow: e.target.value })} /></div>
          <div className="grid gap-3 md:grid-cols-2">
            <div><Label>Título — parte normal</Label><Input value={cfg.lead.title_pre} onChange={(e) => set("lead", { title_pre: e.target.value })} /></div>
            <div><Label>Título — palavra em itálico</Label><Input value={cfg.lead.title_em} onChange={(e) => set("lead", { title_em: e.target.value })} /></div>
          </div>
          <div><Label>Subtítulo</Label><Textarea value={cfg.lead.subtitle} onChange={(e) => set("lead", { subtitle: e.target.value })} /></div>
          <div className="grid gap-3 md:grid-cols-2">
            <div><Label>Card cinza — título</Label><Input value={cfg.lead.comum_titulo} onChange={(e) => set("lead", { comum_titulo: e.target.value })} /></div>
            <div><Label>Card cinza — fala do cliente</Label><Input value={cfg.lead.comum_fala} onChange={(e) => set("lead", { comum_fala: e.target.value })} /></div>
          </div>
          <div><Label>Card cinza — itens (um por linha)</Label><Textarea rows={3} value={cfg.lead.comum_itens.join("\n")} onChange={(e) => set("lead", { comum_itens: e.target.value.split("\n").filter(Boolean) })} /></div>
          <div><Label>Card escuro — título</Label><Input value={cfg.lead.nosso_titulo} onChange={(e) => set("lead", { nosso_titulo: e.target.value })} /></div>
          <div><Label>Card escuro — itens (um por linha)</Label><Textarea rows={3} value={cfg.lead.nosso_itens.join("\n")} onChange={(e) => set("lead", { nosso_itens: e.target.value.split("\n").filter(Boolean) })} /></div>
        </Card>
      </TabsContent>

      {/* PAINEL */}
      <TabsContent value="painel" className="mt-6 space-y-4">
        <Card className="max-w-2xl space-y-4 p-6">
          <div><Label>Eyebrow</Label><Input value={cfg.painel.eyebrow} onChange={(e) => set("painel", { eyebrow: e.target.value })} /></div>
          <div><Label>Título</Label><Input value={cfg.painel.title} onChange={(e) => set("painel", { title: e.target.value })} /></div>
          <div><Label>Subtítulo</Label><Textarea value={cfg.painel.subtitle} onChange={(e) => set("painel", { subtitle: e.target.value })} /></div>
          <p className="text-xs text-muted-foreground">
            Cada funcionalidade pode ser ligada a uma feature flag. Ligada: aparece normal. Desligada: aparece com o selo “Em breve” (ou some, se em
            Configurações a opção “Em breve” estiver desligada).
          </p>
        </Card>
        {cfg.painel.items.map((it, i) => (
          <Card key={it.id} className="space-y-3 p-4">
            <div className="grid gap-3 md:grid-cols-[180px,1fr,1fr]">
              <div>
                <Label className="text-xs">Ícone</Label>
                <select value={it.icone} onChange={(e) => setItem(i, { icone: e.target.value as PainelItem["icone"] })} className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm">
                  {PAINEL_ICONES.map((ic) => (
                    <option key={ic} value={ic}>{ICONE_LABEL[ic] ?? ic}</option>
                  ))}
                </select>
              </div>
              <div><Label className="text-xs">Título</Label><Input value={it.titulo} onChange={(e) => setItem(i, { titulo: e.target.value })} /></div>
              <div>
                <Label className="text-xs">Feature flag</Label>
                <select value={it.flag ?? ""} onChange={(e) => setItem(i, { flag: e.target.value || undefined })} className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm">
                  <option value="">Sempre aparece</option>
                  {Object.keys(flags).sort().map((k) => (
                    <option key={k} value={k}>{k}{flags[k] ? " (ligada)" : " (desligada)"}</option>
                  ))}
                </select>
              </div>
            </div>
            <div><Label className="text-xs">Texto</Label><Textarea rows={2} value={it.texto} onChange={(e) => setItem(i, { texto: e.target.value })} /></div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Label className="text-xs">Cor</Label>
                <select value={it.tom ?? "escuro"} onChange={(e) => setItem(i, { tom: e.target.value as PainelItem["tom"] })} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
                  <option value="escuro">Escuro</option>
                  <option value="pessego">Pêssego</option>
                  <option value="salvia">Sálvia</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-xs"><Switch checked={!!it.largo} onCheckedChange={(v) => setItem(i, { largo: v })} /> Bloco largo</label>
              <span className="ml-auto flex gap-1">
                <Button size="icon" variant="ghost" aria-label="Subir" onClick={() => set("painel", { items: mover(cfg.painel.items, i, -1) })}><ArrowUp className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" aria-label="Descer" onClick={() => set("painel", { items: mover(cfg.painel.items, i, 1) })}><ArrowDown className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" aria-label="Remover" onClick={() => set("painel", { items: cfg.painel.items.filter((_, k) => k !== i) })}><Trash2 className="h-4 w-4" /></Button>
              </span>
            </div>
          </Card>
        ))}
        <Button variant="outline" onClick={() => set("painel", { items: [...cfg.painel.items, { id: `p${Date.now()}`, icone: "sparkles", titulo: "Nova funcionalidade", texto: "" }] })}>
          <Plus className="mr-1 h-4 w-4" /> Adicionar funcionalidade
        </Button>
      </TabsContent>

      {/* PLANOS (textos; valores vêm das tabelas) */}
      <TabsContent value="planos" className="mt-6">
        <Card className="max-w-2xl space-y-4 p-6">
          <p className="text-xs text-muted-foreground">
            Os valores dos planos, dos destaques e da reserva vêm das tabelas (Admin › Preços e Planos). Aqui ficam só os textos. {VARS}
          </p>
          <div><Label>Eyebrow</Label><Input value={cfg.planos.eyebrow} onChange={(e) => set("planos", { eyebrow: e.target.value })} /></div>
          <div className="grid gap-3 md:grid-cols-2">
            <div><Label>Título — parte normal</Label><Input value={cfg.planos.title_pre} onChange={(e) => set("planos", { title_pre: e.target.value })} /></div>
            <div><Label>Título — palavra em itálico</Label><Input value={cfg.planos.title_em} onChange={(e) => set("planos", { title_em: e.target.value })} /></div>
          </div>
          <div><Label>Subtítulo</Label><Textarea value={cfg.planos.subtitle} onChange={(e) => set("planos", { subtitle: e.target.value })} /></div>
          <div><Label>Reserva de data ociosa — título</Label><Input value={cfg.planos.reserva_titulo} onChange={(e) => set("planos", { reserva_titulo: e.target.value })} /></div>
          <div><Label>Reserva de data ociosa — texto</Label><Textarea rows={3} value={cfg.planos.reserva_texto} onChange={(e) => set("planos", { reserva_texto: e.target.value })} /></div>
          <div><Label>Destaques da Home — título</Label><Input value={cfg.planos.destaques_titulo} onChange={(e) => set("planos", { destaques_titulo: e.target.value })} /></div>
          <div><Label>Destaques da Home — texto</Label><Textarea rows={3} value={cfg.planos.destaques_texto} onChange={(e) => set("planos", { destaques_texto: e.target.value })} /></div>
        </Card>
      </TabsContent>

      {/* DÚVIDAS */}
      <TabsContent value="faq" className="mt-6 space-y-4">
        <Card className="max-w-2xl space-y-3 p-6">
          <div><Label>Título da seção</Label><Input value={cfg.faq.title} onChange={(e) => set("faq", { title: e.target.value })} /></div>
          <p className="text-xs text-muted-foreground">{VARS}</p>
        </Card>
        {cfg.faq.items.map((f, i) => (
          <Card key={f.id} className="space-y-3 p-4">
            <div><Label className="text-xs">Pergunta</Label><Input value={f.q} onChange={(e) => setFaq(i, { q: e.target.value })} /></div>
            <div><Label className="text-xs">Resposta</Label><Textarea rows={3} value={f.a} onChange={(e) => setFaq(i, { a: e.target.value })} /></div>
            <div className="flex justify-end gap-1">
              <Button size="icon" variant="ghost" aria-label="Subir" onClick={() => set("faq", { items: mover(cfg.faq.items, i, -1) })}><ArrowUp className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" aria-label="Descer" onClick={() => set("faq", { items: mover(cfg.faq.items, i, 1) })}><ArrowDown className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" aria-label="Remover" onClick={() => set("faq", { items: cfg.faq.items.filter((_, k) => k !== i) })}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </Card>
        ))}
        <Button variant="outline" onClick={() => set("faq", { items: [...cfg.faq.items, { id: `f${Date.now()}`, q: "Nova pergunta", a: "" }] })}>
          <Plus className="mr-1 h-4 w-4" /> Adicionar pergunta
        </Button>
      </TabsContent>
    </>
  );
}
