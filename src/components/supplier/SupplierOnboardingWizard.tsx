import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Check, ChevronLeft, ChevronRight, Upload, X } from "lucide-react";
import { formatPhoneBR, isValidPhoneBR } from "@/lib/phone";
import DynamicFieldsForm from "@/components/dynamic-fields/DynamicFieldsForm";

type Category = { id: string; name: string };

const STEPS = [
  "Dados da empresa",
  "Categoria e localização",
  "Fotos do portfólio",
  "Faixa de preço",
  "Detalhes da categoria",
  "Pronto!",
];

export default function SupplierOnboardingWizard({
  supplier, onComplete,
}: {
  supplier: any;
  onComplete: () => void;
}) {
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [companyName, setCompanyName] = useState(supplier.company_name || "");
  const [description, setDescription] = useState(supplier.description || "");
  const [whatsapp, setWhatsapp] = useState(formatPhoneBR(supplier.whatsapp || supplier.phone || ""));
  const [email, setEmail] = useState(supplier.email || "");
  const [categoryId, setCategoryId] = useState(supplier.category_id || "");
  const [city, setCity] = useState(supplier.city || "");
  const [state, setState] = useState(supplier.state || "");
  const [priceMin, setPriceMin] = useState<string>(supplier.price_min ? String(supplier.price_min) : "");
  const [priceMax, setPriceMax] = useState<string>(supplier.price_max ? String(supplier.price_max) : "");
  const [acceptsIdle, setAcceptsIdle] = useState<boolean>(!!supplier.accepts_idle_dates);
  const [pricingModel, setPricingModel] = useState<"fixo" | "por_pessoa">(
    (supplier.pricing_model as "fixo" | "por_pessoa") || "fixo",
  );

  useEffect(() => {
    supabase.from("categories").select("id, name").order("name").then(({ data }) => setCategories(data || []));
    supabase.from("supplier_photos").select("*").eq("supplier_id", supplier.id).order("display_order").then(({ data }) => setPhotos(data || []));
  }, [supplier.id]);

  const progress = ((step + 1) / STEPS.length) * 100;

  const canNext = () => {
    if (step === 0) return companyName.trim().length >= 2 && description.trim().length >= 20 && isValidPhoneBR(whatsapp);
    if (step === 1) return !!categoryId && !!city && !!state;
    if (step === 2) return photos.length >= 1;
    if (step === 3) return !!priceMin && Number(priceMin) > 0;
    return true;
  };

  const saveStep = async () => {
    setSaving(true);
    const patch: any = {};
    if (step === 0) {
      patch.company_name = companyName.trim();
      patch.description = description.trim();
      patch.whatsapp = whatsapp.replace(/\D/g, "");
      patch.phone = whatsapp.replace(/\D/g, "");
      patch.email = email.trim() || null;
    }
    if (step === 1) {
      patch.category_id = categoryId;
      patch.city = city.trim();
      patch.state = state.trim().toUpperCase().slice(0, 2);
    }
    if (step === 3) {
      patch.price_min = Number(priceMin) || null;
      patch.price_max = priceMax ? Number(priceMax) : null;
      patch.accepts_idle_dates = acceptsIdle;
      patch.pricing_model = pricingModel;
    }
    if (Object.keys(patch).length > 0) {
      const { error } = await supabase.from("suppliers").update(patch).eq("id", supplier.id);
      if (error) {
        toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
        setSaving(false);
        return false;
      }
    }
    setSaving(false);
    return true;
  };

  const next = async () => {
    if (!canNext()) return;
    const ok = await saveStep();
    if (!ok) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const finish = async () => {
    setSaving(true);
    await supabase.from("suppliers").update({ onboarding_completed: true }).eq("id", supplier.id);
    setSaving(false);
    toast({ title: "Perfil completo!", description: "Seu cadastro foi enviado para análise." });
    onComplete();
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || photos.length >= 10) return;
    setUploading(true);
    const file = e.target.files[0];
    const filePath = `${supplier.user_id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("supplier-photos").upload(filePath, file);
    if (error) {
      toast({ title: "Erro no upload", description: error.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from("supplier-photos").getPublicUrl(filePath);
    const { data: inserted } = await (supabase.from("supplier_photos") as any).insert({
      supplier_id: supplier.id, photo_url: publicUrl, display_order: photos.length,
    }).select().maybeSingle();
    if (inserted) setPhotos([...photos, inserted]);
    setUploading(false);
  };

  const removePhoto = async (id: string) => {
    await supabase.from("supplier_photos").delete().eq("id", id);
    setPhotos(photos.filter((p) => p.id !== id));
  };

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="p-6 space-y-5">
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Passo {step + 1} de {STEPS.length}
            </p>
            <p className="text-xs text-muted-foreground">{STEPS[step]}</p>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {step === 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Conte quem é a sua empresa</h3>
            <div>
              <Label>Nome da empresa *</Label>
              <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Ex.: Buffet Encanto" />
            </div>
            <div>
              <Label>Descrição dos serviços * (mínimo 20 caracteres)</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4}
                placeholder="Conte um pouco sobre seus diferenciais, anos de experiência, estilo..." />
              <p className="text-xs text-muted-foreground mt-1">{description.length} caracteres</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>WhatsApp * (com DDD)</Label>
                <Input value={whatsapp} onChange={(e) => setWhatsapp(formatPhoneBR(e.target.value))}
                  placeholder="(11) 91234-5678" inputMode="numeric" />
                {whatsapp && !isValidPhoneBR(whatsapp) && (
                  <p className="text-xs text-destructive mt-1">Telefone inválido. Use DDD + número.</p>
                )}
              </div>
              <div>
                <Label>E-mail comercial</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contato@empresa.com" />
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Categoria e localização</h3>
            <div>
              <Label>Categoria principal *</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Cidade *</Label>
                <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="São Paulo" />
              </div>
              <div>
                <Label>UF *</Label>
                <Input value={state} onChange={(e) => setState(e.target.value.toUpperCase().slice(0, 2))} maxLength={2} placeholder="SP" />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Mostre seu trabalho</h3>
            <p className="text-sm text-muted-foreground">
              Adicione pelo menos 1 foto (recomendamos de 4 a 6) — perfis com fotos recebem 5x mais pedidos.
            </p>
            <div className="grid grid-cols-3 gap-2">
              {photos.map((p) => (
                <div key={p.id} className="relative group rounded-lg overflow-hidden aspect-square">
                  <img src={p.photo_url} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => removePhoto(p.id)}
                    className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {photos.length < 10 && (
                <label className="flex items-center justify-center aspect-square border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-accent">
                  <div className="text-center">
                    <Upload className="h-5 w-5 text-muted-foreground mx-auto" />
                    <span className="text-xs text-muted-foreground">{uploading ? "Enviando..." : "Adicionar"}</span>
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
                </label>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Faixa de preço</h3>
            <p className="text-sm text-muted-foreground">
              Os casais usam isso para filtrar — você pode ajustar depois e cobrir só o piso se preferir.
            </p>
            <div>
              <Label>Modelo de preço *</Label>
              <Select value={pricingModel} onValueChange={(v) => setPricingModel(v as "fixo" | "por_pessoa")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixo">Fixo (valor total do serviço)</SelectItem>
                  <SelectItem value="por_pessoa">Por pessoa (valor por convidado)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {pricingModel === "por_pessoa"
                  ? "Os valores abaixo serão cobrados por convidado. O total é calculado automaticamente para os casais."
                  : "Os valores abaixo representam o total do serviço."}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>
                  {pricingModel === "por_pessoa" ? "A partir de (R$/convidado) *" : "A partir de (R$) *"}
                </Label>
                <Input type="number" value={priceMin} onChange={(e) => setPriceMin(e.target.value)}
                  placeholder={pricingModel === "por_pessoa" ? "120" : "3000"} />
              </div>
              <div>
                <Label>
                  {pricingModel === "por_pessoa" ? "Até (R$/convidado) — opcional" : "Até (R$) — opcional"}
                </Label>
                <Input type="number" value={priceMax} onChange={(e) => setPriceMax(e.target.value)}
                  placeholder={pricingModel === "por_pessoa" ? "250" : "15000"} />
              </div>
            </div>
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={acceptsIdle} onChange={(e) => setAcceptsIdle(e.target.checked)}
                className="mt-1" />
              <span className="text-sm">
                Aceito casamentos em <strong>datas ociosas</strong> (segunda a quinta) com desconto especial
              </span>
            </label>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Detalhes da categoria</h3>
            <p className="text-sm text-muted-foreground">
              Esses campos são específicos da sua categoria e ajudam os casais a encontrar você na busca. Você pode atualizar depois no seu perfil.
            </p>
            <DynamicFieldsForm supplierId={supplier.id} categoryId={categoryId || null} />
          </div>
        )}

        {step === 5 && (
          <div className="text-center py-6 space-y-3">
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-primary/10 text-primary">
              <Check className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-semibold">Tudo pronto!</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Seu perfil será revisado pela nossa equipe nas próximas 24h. Enquanto isso, configure suas
              datas de disponibilidade para começar a aparecer nas buscas dos casais.
            </p>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || saving}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={next} disabled={!canNext() || saving}>
              {saving ? "Salvando..." : "Continuar"} <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={finish} disabled={saving}>
              {saving ? "Concluindo..." : "Concluir cadastro"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}