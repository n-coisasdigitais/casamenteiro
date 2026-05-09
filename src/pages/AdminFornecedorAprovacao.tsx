import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, MapPin, ExternalLink, Phone, Instagram } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminFornecedorAprovacao() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [campos, setCampos] = useState<any[]>([]);
  const [respostas, setRespostas] = useState<any[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [historico, setHistorico] = useState<any[]>([]);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [motivo, setMotivo] = useState("");

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("suppliers")
      .select("*, categories(name)")
      .order("created_at", { ascending: false });
    setSuppliers(data || []);
    setLoading(false);
  };

  const openSupplier = async (sup: any) => {
    setSelected(sup);
    const [{ data: cs }, { data: rs }, { data: ph }, { data: hi }] = await Promise.all([
      supabase.from("campos_categoria").select("*").eq("category_id", sup.category_id).order("ordem"),
      supabase.from("fornecedor_campos").select("*").eq("supplier_id", sup.id),
      supabase.from("supplier_photos").select("*").eq("supplier_id", sup.id).order("display_order"),
      supabase.from("fornecedor_aprovacoes").select("*").eq("supplier_id", sup.id).order("created_at", { ascending: false }),
    ]);
    setCampos(cs || []); setRespostas(rs || []); setPhotos(ph || []); setHistorico(hi || []);
  };

  const decide = async (status: "approved" | "rejected", motivoTxt?: string) => {
    if (!selected) return;
    const { error } = await supabase.from("suppliers").update({ status }).eq("id", selected.id);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    await supabase.from("fornecedor_aprovacoes").insert({
      supplier_id: selected.id, admin_id: user?.id, acao: status, motivo: motivoTxt || null,
    });
    await supabase.from("notifications").insert({
      user_id: selected.user_id,
      type: status === "approved" ? "supplier_approved" : "supplier_rejected",
      title: status === "approved" ? "Seu perfil foi aprovado!" : "Seu perfil precisa de ajustes",
      body: status === "approved" ? "Você já está visível para os casais." : (motivoTxt || "Confira o painel para mais detalhes."),
      link: "/fornecedor/painel",
    });
    toast({ title: status === "approved" ? "Aprovado!" : "Rejeitado." });
    setSelected(null); setRejectOpen(false); setMotivo(""); load();
  };

  const filtered = filter === "all" ? suppliers : suppliers.filter(s => s.status === filter);

  const renderValor = (campo: any, valor: any) => {
    if (valor === null || valor === undefined) return <span className="text-muted-foreground italic">vazio</span>;
    if (typeof valor === "boolean") return valor ? "Sim" : "Não";
    if (Array.isArray(valor)) return valor.join(", ");
    if (typeof valor === "object") return JSON.stringify(valor);
    return String(valor);
  };

  return (
    <div className="px-4 md:px-8 py-6">
      <h1 className="text-2xl font-bold mb-6">Aprovação de fornecedores</h1>

      <div className="flex gap-2 mb-6 overflow-x-auto">
        {(["pending","approved","rejected","all"] as const).map(f => (
          <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)}>
            {f === "pending" ? "Pendentes" : f === "approved" ? "Aprovados" : f === "rejected" ? "Rejeitados" : "Todos"}
            {f !== "all" && <Badge variant="secondary" className="ml-2">{suppliers.filter(s => s.status === f).length}</Badge>}
          </Button>
        ))}
      </div>

      {loading ? <p>Carregando...</p> : filtered.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">Nenhum fornecedor.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map(sup => (
            <Card key={sup.id} className="cursor-pointer hover:shadow-md transition" onClick={() => openSupplier(sup)}>
              <CardContent className="p-4 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold">{sup.company_name}</h3>
                    <Badge variant={sup.status === "approved" ? "default" : sup.status === "rejected" ? "destructive" : "secondary"}>
                      {sup.status === "pending" ? "Pendente" : sup.status === "approved" ? "Aprovado" : "Rejeitado"}
                    </Badge>
                    {sup.categories && <span className="text-sm text-primary">{sup.categories.name}</span>}
                  </div>
                  {(sup.city || sup.state) && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" />{[sup.city, sup.state].filter(Boolean).join(", ")}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={v => !v && setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  {selected.company_name}
                  <Badge variant={selected.status === "approved" ? "default" : selected.status === "rejected" ? "destructive" : "secondary"}>
                    {selected.status}
                  </Badge>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <Card><CardContent className="p-4 space-y-2 text-sm">
                  <p><strong>Categoria:</strong> {selected.categories?.name || "—"}</p>
                  <p><strong>Cidade/UF:</strong> {[selected.city, selected.state].filter(Boolean).join(", ") || "—"}</p>
                  {selected.whatsapp && <p className="flex items-center gap-1"><Phone className="h-3 w-3" />{selected.whatsapp}</p>}
                  {selected.instagram && <p className="flex items-center gap-1"><Instagram className="h-3 w-3" />{selected.instagram}</p>}
                  {selected.description && <p className="text-muted-foreground">{selected.description}</p>}
                </CardContent></Card>

                {photos.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Fotos ({photos.length})</h4>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                      {photos.map(p => <img key={p.id} src={p.photo_url} alt="" className="aspect-square object-cover rounded" />)}
                    </div>
                  </div>
                )}

                {campos.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Respostas do onboarding</h4>
                    <div className="border rounded-lg divide-y">
                      {campos.map(c => {
                        const r = respostas.find(x => x.campo_id === c.id);
                        return (
                          <div key={c.id} className="p-3 grid grid-cols-[1fr_2fr] gap-3 text-sm">
                            <div className="text-muted-foreground">{c.label}</div>
                            <div>{renderValor(c, r?.valor)}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {historico.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Histórico</h4>
                    <div className="space-y-1 text-sm">
                      {historico.map(h => (
                        <div key={h.id} className="text-muted-foreground">
                          <span className="font-medium text-foreground">{h.acao}</span> · {new Date(h.created_at).toLocaleString("pt-BR")}
                          {h.motivo && <p className="text-xs ml-2">— {h.motivo}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="flex flex-wrap gap-2">
                <Button variant="outline" asChild><Link to={`/fornecedor/${selected.id}`} target="_blank"><ExternalLink className="h-3 w-3 mr-1" />Ver perfil público</Link></Button>
                {selected.status !== "rejected" && (
                  <Button variant="destructive" onClick={() => setRejectOpen(true)}><X className="h-3 w-3 mr-1" />Rejeitar</Button>
                )}
                {selected.status !== "approved" && (
                  <Button onClick={() => decide("approved")}><Check className="h-3 w-3 mr-1" />Aprovar</Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rejeitar fornecedor</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">O motivo será exibido ao fornecedor para que ele possa ajustar o cadastro.</p>
            <Textarea rows={4} value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ex.: As fotos estão com baixa qualidade. Por favor reenvie..." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => decide("rejected", motivo)} disabled={!motivo.trim()}>Rejeitar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
