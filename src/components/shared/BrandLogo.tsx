import logo from "@/assets/casamenteiro-logo.svg.asset.json";
import logoClaro from "@/assets/casamenteiro-logo-claro.svg.asset.json";
import { cn } from "@/lib/utils";

/** Identidade da plataforma, sem substituir a marca dos fornecedores. */
export default function BrandLogo({ light = false, symbolOnly = false, className, nameClassName }: {
  light?: boolean;
  symbolOnly?: boolean;
  className?: string;
  nameClassName?: string;
}) {
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-2 align-middle font-sans text-lg font-bold tracking-normal", className)}>
      <img src={(light ? logoClaro : logo).url} alt={symbolOnly ? "Casamenteiro" : ""} aria-hidden={symbolOnly ? undefined : true} width={932} height={430} className="h-auto w-12 shrink-0 object-contain" />
      {!symbolOnly && <span className={cn("whitespace-nowrap", nameClassName)}>Casamenteiro</span>}
    </span>
  );
}