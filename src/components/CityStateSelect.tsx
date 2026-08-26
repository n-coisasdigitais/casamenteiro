import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CityAutocomplete from "@/components/CityAutocomplete";

/** UFs oficiais (IBGE). */
export const UFS_BRASIL = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

interface Props {
  cidade: string;
  estado: string;
  onChange: (cidade: string, estado: string) => void;
  labelCidade?: string;
  labelEstado?: string;
  placeholderCidade?: string;
  /** Texto de ajuda abaixo do campo de cidade. */
  ajuda?: string;
}

/**
 * Par de campos Estado (UF) + Cidade usando a base oficial do IBGE.
 * Escolher a UF filtra as cidades; escolher a cidade preenche a UF.
 */
export default function CityStateSelect({
  cidade,
  estado,
  onChange,
  labelCidade = "Cidade",
  labelEstado = "Estado (UF)",
  placeholderCidade = "Digite e selecione a cidade",
  ajuda = "Selecione uma cidade da lista oficial (IBGE).",
}: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div>
        <Label>{labelEstado}</Label>
        <Select value={estado || undefined} onValueChange={(uf) => onChange("", uf)}>
          <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
          <SelectContent className="max-h-72">
            {UFS_BRASIL.map((uf) => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="sm:col-span-2">
        <Label>{labelCidade}</Label>
        <CityAutocomplete
          fonte="brasil"
          uf={estado || null}
          mostrarContinuarMesmoAssim={false}
          value={cidade}
          placeholder={placeholderCidade}
          onChange={(c) => onChange(c, estado)}
          onSelect={(c, uf) => onChange(c, uf || estado)}
        />
        <p className="text-xs text-muted-foreground mt-1">{ajuda}</p>
      </div>
    </div>
  );
}
