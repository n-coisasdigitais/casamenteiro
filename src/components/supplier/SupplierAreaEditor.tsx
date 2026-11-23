import { traduzirErro } from "@/lib/errorMessages";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { MoedaInput } from "@/components/ui/moeda-input";
import CityAutocomplete from "@/components/CityAutocomplete";
import { Globe2, MapPin, X } from "lucide-react";
import {
  FORMAS_NACIONAL,
  categoriaPermiteNacional,
  coordenadaDe,
  type FormaNacional,
  type ModoAtendimento,
  type TaxaDeslocamento,
} from "@/lib/atendimento";

interface Props {
  supplierId: string;
  /** Se inline (modo onboarding) o componente não mostra Card. */
  inline?: boolean;
  onSaved?: () => void;
}

const TAXAS: { valor: TaxaDeslocamento; rotulo: string }[] = [
  { valor: "inclusa", rotulo: "Já está no preço" },
  { valor: "a_combinar", rotulo: "A combinar" },
  { valor: "a_partir", rotulo: "A partir de um valor" },
];

/**
 * Editor "Onde você atende?"
 * 1ª pergunta: atende todo o Brasil?
 *   Sim → como (online / vou até o evento / envio) + exterior + taxa de deslocamento.
 *   Não → cidades específicas + raio em km (como era antes).
 */
export default function SupplierAreaEditor({ supplierId, inline = false, onSaved }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categoriaSlug, setCategoriaSlug] = useState<string | null>(null);
  const [cidadePrincipal, setCidadePrincipal] = useState<string>("");
  const [ufPrincipal, setUfPrincipal] = useState<string | null>(null);

  const [modo, setModo] = useState<ModoAtendimento>("local");
  const [formas, setFormas] = useState<FormaNacional[]>([]);
  const [exterior, setExterior] = useState(false);
  const [taxa, setTaxa] = useState<TaxaDeslocamento | null>(null);
  const [taxaValor, setTaxaValor] = useState<number | null>(null);

  const [cidades, setCidades] = useState<string[]>([]);
  const [novaCidade, setNovaCidade] = useState("");
  const [usaRaio, setUsaRaio] = useState(false);
  const [raioKm, setRaioKm] = useState(50);
  const [ufPorCidade, setUfPorCidade] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const { data } = await (supabase.from("suppliers") as any)
        .select(
          "city, state, cidades_atendidas, raio_atendimento_km, atendimento_modo, atendimento_formas, atende_exterior, taxa_deslocamento, taxa_deslocamento_valor, categories(slug)",
        )
        .eq("id", supplierId)
        .maybeSingle();
      if (data) {
        setCidadePrincipal(data.city || "");
        setUfPrincipal(data.state || null);
        setCategoriaSlug(data.categories?.slug ?? null);
        setCidades(Array.isArray(data.cidades_atendidas) ? data.cidades_atendidas : []);
        const raio = Number(data.raio_atendimento_km || 0);
        setUsaRaio(raio > 0);
        if (raio > 0) setRaioKm(raio);
        setModo(data.atendimento_modo === "nacional" ? "nacional" : "local");
        setFormas(Array.isArray(data.atendimento_formas) ? data.atendimento_formas : []);
        setExterior(!!data.atende_exterior);
        setTaxa(data.taxa_deslocamento ?? null);
        setTaxaValor(data.taxa_deslocamento_valor != null ? Number(data.taxa_deslocamento_valor) : null);
      }
      setLoading(false);
    })();
  }, [supplierId]);

  const permiteNacional = categoriaPermiteNacional(categoriaSlug);
  const nacional = permiteNacional && modo === "nacional";
  const viaja = nacional && formas.includes("viagem");

  const alternarForma = (f: FormaNacional, marcado: boolean) =>
    setFormas((atual) => (marcado ? [...new Set([...atual, f])] : atual.filter((x) => x !== f)));

  const adicionarCidade = (c: string) => {
    const nome = c.trim();
    if (!nome) return;
    if (cidades.some((x) => x.toLowerCase() === nome.toLowerCase())) return;
    setCidades([...cidades, nome]);
    setNovaCidade("");
  };
  const removerCidade = (c: string) => setCidades(cidades.filter((x) => x !== c));

  const salvar = async () => {
    if (nacional && formas.length === 0) {
      toast({
        title: "Falta um detalhe",
        description: "Marque como você atende todo o Brasil.",
        variant: "destructive",
      });
      return;
    }
    if (viaja && taxa === "a_partir" && !taxaValor) {
      toast({
        title: "Falta um detalhe",
        description: "Informe o valor inicial da taxa de deslocamento.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);

    let lat: number | null = null;
    let lng: number | null = null;
    if (cidadePrincipal) {
      const coord = await coordenadaDe(cidadePrincipal, ufPrincipal);
      if (coord) {
        lat = coord.lat;
        lng = coord.lng;
      }
    }

    // No modo nacional as cidades e o raio ficam guardados (não aparecem no formulário),
    // para não perder nada se o fornecedor voltar para "minha região".
    const update: any = {
      cidades_atendidas: cidades,
      raio_atendimento_km: usaRaio ? raioKm : 0,
      atendimento_modo: nacional ? "nacional" : "local",
      atendimento_formas: nacional ? formas : [],
      atende_exterior: nacional ? exterior : false,
      taxa_deslocamento: viaja ? taxa : null,
      taxa_deslocamento_valor: viaja && taxa === "a_partir" ? taxaValor : null,
    };
    if (lat !== null && lng !== null) {
      update.lat = lat;
      update.lng = lng;
    }

    const { error } = await (supabase.from("suppliers") as any).update(update).eq("id", supplierId);
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: traduzirErro(error), variant: "destructive" });
      return;
    }
    toast({ title: "Atendimento atualizado" });
    onSaved?.();
  };

  if (loading) return <div className="text-sm text-muted-foreground">Carregando...</div>;

  const opcao = (ativo: boolean) =>
    `flex-1 rounded-xl border px-4 py-3 text-left text-sm transition ${ativo ? "border-primary bg-primary/5 font-semibold" : "border-border hover:bg-muted/50"}`;

  const blocoCidades = (
    <>
      <div>
        <Label className="text-sm font-semibold">Cidades específicas que você atende</Label>
        <p className="text-xs text-muted-foreground mb-3">
          Adicione as cidades onde você presta serviço (além da sua cidade principal).
        </p>

        <CityAutocomplete
          value={novaCidade}
          onChange={(c) => setNovaCidade(c)}
          onSelect={(c, uf) => {
            if (uf) setUfPorCidade((p) => ({ ...p, [c]: uf }));
            adicionarCidade(c);
          }}
          fonte="brasil"
          mostrarContinuarMesmoAssim={false}
          placeholder="Digite uma cidade e selecione..."
        />

        {cidades.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {cidades.map((c) => (
              <span
                key={c}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm"
                style={{ background: "hsl(var(--color-secondary))", color: "hsl(var(--color-dark))" }}
              >
                <MapPin className="w-3 h-3" />
                {c}
                {ufPorCidade[c] ? ` — ${ufPorCidade[c]}` : ""}
                <button
                  type="button"
                  onClick={() => removerCidade(c)}
                  className="ml-1 opacity-60 hover:opacity-100"
                  aria-label={`Remover ${c}`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}

        {novaCidade.trim().length >= 2 && (
          <p className="mt-2 text-xs text-muted-foreground">
            Selecione uma cidade da lista oficial para adicionar ao atendimento.
          </p>
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
            <Slider value={[raioKm]} onValueChange={([v]) => setRaioKm(v)} min={10} max={300} step={10} />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>10 km</span>
              <span>300 km</span>
            </div>
          </div>
        )}
      </div>
    </>
  );

  const body = (
    <div className="space-y-6">
      {permiteNacional && (
        <div>
          <Label className="text-sm font-semibold">Você atende todo o Brasil?</Label>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              className={opcao(modo === "local")}
              onClick={() => setModo("local")}
              aria-pressed={modo === "local"}
            >
              Não, atendo na minha região
            </button>
            <button
              type="button"
              className={opcao(modo === "nacional")}
              onClick={() => setModo("nacional")}
              aria-pressed={modo === "nacional"}
            >
              <span className="inline-flex items-center gap-1.5">
                <Globe2 className="h-4 w-4" /> Sim, todo o Brasil
              </span>
            </button>
          </div>
        </div>
      )}

      {nacional && (
        <div className="space-y-4 rounded-xl border p-4">
          <div>
            <Label className="text-sm font-semibold">Como você atende quem está longe?</Label>
            <p className="text-xs text-muted-foreground mb-3">
              Pode marcar mais de uma opção. Isso aparece no seu perfil.
            </p>
            <div className="space-y-3">
              {FORMAS_NACIONAL.map((f) => (
                <label key={f.valor} className="flex cursor-pointer items-start gap-3">
                  <Checkbox
                    checked={formas.includes(f.valor)}
                    onCheckedChange={(v) => alternarForma(f.valor, v === true)}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="block text-sm font-medium">{f.titulo}</span>
                    <span className="block text-xs text-muted-foreground">{f.descricao}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          {viaja && (
            <div className="border-t pt-4">
              <Label className="text-sm font-semibold">Taxa de deslocamento</Label>
              <p className="text-xs text-muted-foreground mb-2">O casal vê isso antes de pedir orçamento.</p>
              <div className="flex flex-wrap gap-2">
                {TAXAS.map((t) => (
                  <button
                    key={t.valor}
                    type="button"
                    className={opcao(taxa === t.valor)}
                    onClick={() => setTaxa(t.valor)}
                    aria-pressed={taxa === t.valor}
                  >
                    {t.rotulo}
                  </button>
                ))}
              </div>
              {taxa === "a_partir" && (
                <div className="mt-3 max-w-[220px]">
                  <MoedaInput value={taxaValor} onValueChange={setTaxaValor} placeholder="0,00" />
                </div>
              )}
            </div>
          )}

          <label className="flex cursor-pointer items-center gap-3 border-t pt-4">
            <Checkbox checked={exterior} onCheckedChange={(v) => setExterior(v === true)} />
            <span className="text-sm">Também atendo casais fora do Brasil</span>
          </label>
        </div>
      )}

      {nacional ? (
        <p className="text-xs text-muted-foreground">
          Na sua cidade{cidadePrincipal ? ` (${cidadePrincipal})` : ""} você aparece junto com os fornecedores locais.
          Nas outras cidades, aparece na seção "Também atendem sua cidade".
        </p>
      ) : (
        blocoCidades
      )}

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
