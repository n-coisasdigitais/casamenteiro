import {
  Building,
  Cake,
  Camera,
  Car,
  ClipboardList,
  Flower2,
  HeartHandshake,
  Mail,
  Music,
  Package,
  Shield,
  Shirt,
  Sparkles,
  Speaker,
  Utensils,
  Video,
} from "lucide-react";

/** Nome salvo em categories.icon (ex.: "camera") → ícone. Nome desconhecido ou emoji antigo: mostra como texto. */
export const ICONES_CATEGORIA: Record<string, any> = {
  building: Building,
  cake: Cake,
  camera: Camera,
  car: Car,
  clipboard: ClipboardList,
  flower: Flower2,
  heart: HeartHandshake,
  mail: Mail,
  music: Music,
  shield: Shield,
  shirt: Shirt,
  sparkles: Sparkles,
  speaker: Speaker,
  utensils: Utensils,
  video: Video,
};

export default function IconeCategoria({ nome, className = "h-5 w-5" }: { nome: string | null | undefined; className?: string }) {
  const Icone = nome ? ICONES_CATEGORIA[nome.trim().toLowerCase()] : null;
  if (Icone) return <Icone className={className} aria-hidden="true" />;
  // emoji ou texto curto cadastrado à mão continua aparecendo; nome em inglês desconhecido vira um ícone neutro
  if (nome && !/^[a-z-]+$/i.test(nome.trim())) return <span aria-hidden="true">{nome}</span>;
  return <Package className={className} aria-hidden="true" />;
}
