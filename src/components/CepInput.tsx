import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, MapPin } from "lucide-react";

interface Props {
  cep: string;
  endereco: string;
  onChange: (data: { cep: string; endereco: string; lat?: number | null; lng?: number | null }) => void;
  label?: string;
}

/**
 * Campo de CEP integrado com ViaCEP. Ao digitar 8 dígitos, busca o endereço
 * automaticamente e tenta geocodificar via Nominatim (OpenStreetMap, gratuito).
 */
export default function CepInput({ cep, endereco, onChange, label = "Endereço" }: Props) {
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const handleCepChange = async (value: string) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 8);
    onChange({ cep: cleaned, endereco });
    if (cleaned.length !== 8) {
      setErro(null);
      return;
    }
    setLoading(true);
    setErro(null);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`);
      const data = await res.json();
      if (data.erro) {
        setErro("CEP não encontrado");
        setLoading(false);
        return;
      }
      const enderecoCompleto = `${data.logradouro || ""}${data.bairro ? ", " + data.bairro : ""}${data.localidade ? " - " + data.localidade : ""}${data.uf ? "/" + data.uf : ""}`.trim();

      // Geocoding gratuito via Nominatim
      let lat: number | null = null;
      let lng: number | null = null;
      try {
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(enderecoCompleto + ", Brasil")}`
        );
        const geoData = await geoRes.json();
        if (Array.isArray(geoData) && geoData[0]) {
          lat = parseFloat(geoData[0].lat);
          lng = parseFloat(geoData[0].lon);
        }
      } catch {
        // ignora erro de geocoding
      }
      onChange({ cep: cleaned, endereco: enderecoCompleto, lat, lng });
    } catch {
      setErro("Erro ao buscar CEP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <Label>{label} — CEP</Label>
        <div className="relative">
          <Input
            value={cep}
            onChange={(e) => handleCepChange(e.target.value)}
            placeholder="00000-000"
            maxLength={8}
          />
          {loading && (
            <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
        {erro && <p className="text-xs text-destructive mt-1">{erro}</p>}
      </div>
      <div>
        <Label>{label} — completo</Label>
        <div className="relative">
          <Input
            value={endereco}
            onChange={(e) => onChange({ cep, endereco: e.target.value })}
            placeholder="Rua, número, bairro, cidade"
            className="pl-9"
          />
          <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        </div>
        <p className="text-xs text-muted-foreground mt-1">Confira e ajuste o endereço se necessário (ex.: número da casa).</p>
      </div>
    </div>
  );
}