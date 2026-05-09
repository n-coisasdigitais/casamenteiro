import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import CityAutocomplete from "@/components/CityAutocomplete";
import { MapPin, X } from "lucide-react";

interface Props {
  supplierId: string;
  /** Se inline (modo onboarding) o componente não mostra Card. */
  inline?: boolean;
  onSaved?: () => void;
}

/**
 * Editor "Onde você atende?" — chips de cidades + raio em km.
 */
export default function SupplierAreaEditor({ supplierId, inline = false, onSaved }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cidades, setCidades] = useState<string[]>([]);
  const [novaCidade, setNovaCidade] = useState("");
  const [usaRaio, setUsaRaio] = useState(false);
  const [raioKm, setRaioKm] = useState(50);
  const [cidadePrincipal, setCidadePrincipal] = useState<string>("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("suppliers")
        .select("city, cidades_atendidas, raio_atendimento_km")
        .eq("id", supplierId)
        .maybeSingle();
      if (data) {
        setCidadePrincipal((data as any).city || "");
        const lista: string[] = Array.isArray((data as any).cidades_atendidas)
          ? (data as any).cidades_atendidas
          : [];
        setCidades(lista);
        const raio = Number((data as any).raio_atendimento_km || 0);
        setUsaRaio(raio > 0);
        if (raio > 0) setRaioKm(raio);
      }
      setLoading(false);
    })();
  }, [supplierId]);

  const adicionarCidade = (c: string) => {
    const nome = c.trim();
    if (!nome) return;
    if (cidades.some((x) => x.toLowerCase() === nome.toLowerCase())) return;
    setCidades([...cidades, nome]);
    setNovaCidade("");
  };

  const removerCidade = (c: string) => setCidades(cidades.filter((x) => x !== c));

  const salvar = async () => {
    setSaving(true);
    // Atualiza coordenadas do fornecedor a partir da tabela de coordenadas
    let lat: number | null = null;
    let lng: number | null = null;
    if (cidadePrincipal) {
      const { data: coord } = await supabase
        .from("cidades_coordenadas")
        .select("lat, lng")
        .ilike("cidade", cidadePrincipal)
        .maybeSingle();
      if (coord) {
        lat = Number((coord as any).lat);
        lng = Number((coord as any).lng);
      }
    }

    const update: any = {
      cidades_atendidas: cidades,
      raio_atendimento_km: usaRaio ? raioKm : 0,
    };
    if (lat !== null && lng !== null) {
      update.lat = lat;
      update.lng = lng;
    }

    const { error } = await supabase.from("suppliers").update(update).eq("id", supplierId);
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Atendimento atualizado" });
    onSaved?.();
  };

  if (loading) return <div className="text-sm text-muted-foreground">Carregando...</div>;

  const body = (
    <div className="space-y-6">
      <div>
        <Label className="text-sm font-semibold">Cidades específicas que você atende</Label>
        <p className="text-xs text-muted-foreground mb-3">
          Adicione todas as cidades onde você presta serviço (além da sua cidade principal).
        </p>

        <CityAutocomplete
          value={novaCidade}
          onChange={(c, _est, sem) => {
            setNovaCidade(c);
            // Quando vem de uma sugestão (não "sem fornecedor"), adiciona automaticamente
            if (!sem && c && c !== novaCidade) adicionarCidade(c);
          }}
          placeholder="Digite uma cidade e selecione..."
        />

        {cidades.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {cidades.map((c) => (
              <span
                key={c}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm"
                style={{
                  background: "hsl(var(--color-secondary))",
                  color: "hsl(var(--color-dark))",
                }}
              >
                <MapPin className="w-3 h-3" />
                {c}
                <button
                  type="button"
                  onClick={() => removerCidade(c)}
                  className="ml-1 opacity-60 hover:opacity-100"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}

        {novaCidade.trim().length >= 2 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => adicionarCidade(novaCidade)}
          >
            Adicionar "{novaCidade.trim()}"
          </Button>
        )}
      </div>

      <div className="border-t pt-5">
        <div className="flex items-center justify-between mb-2">
          <div>
            <Label className="text-sm font-semibold">Atendo em um raio de distância</Label>
            <p className="text-xs text-muted-foreground">
              Calculamos a partir da sua cidade principal{cidadePrincipal ? ` (${cidadePrincipal})` : ""}.
            </p>
          </div>
          <Switch checked={usaRaio} onCheckedChange={setUsaRaio} />
        </div>

        {usaRaio && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm" style={{ color: "hsl(var(--color-text-muted))" }}>
                Atendo até
              </span>
              <span className="text-lg font-bold" style={{ color: "hsl(var(--color-primary))" }}>
                {raioKm} km
              </span>
            </div>
            <Slider
              value={[raioKm]}
              onValueChange={([v]) => setRaioKm(v)}
              min={10}
              max={300}
              step={10}
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>10 km</span>
              <span>300 km</span>
            </div>
          </div>
        )}
      </div>

      <Button onClick={salvar} disabled={saving} className="w-full">
        {saving ? "Salvando..." : "Salvar atendimento"}
      </Button>
    </div>
  );

  if (inline) return body;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Onde você atende?</CardTitle>
      </CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  );
}