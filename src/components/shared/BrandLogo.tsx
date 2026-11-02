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
    <span className={cn("inline-flex shrink-0 items-center align-middle tracking-normal", className)}>
      <img src={(light ? logoClaro : logo).url} alt={symbolOnly ? "Casamenteiro" : ""} aria-hidden={symbolOnly ? undefined : true} width={932} height={430} className={cn("h-auto shrink-0 object-contain", symbolOnly ? "w-12" : "-mr-4 w-16")} />
      {!symbolOnly && <span className={cn("relative whitespace-nowrap", nameClassName)}>casamenteiro<span className="text-primary">.</span></span>}
    </span>
  );
}