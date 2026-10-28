import { cn } from "@/lib/utils";

/** Logo do fornecedor sem distorção; mostra as iniciais quando não houver logo. */
export default function LogoFornecedor({
  url, nome, className,
}: { url?: string | null; nome?: string | null; className?: string }) {
  const iniciais = (nome || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
  return (
    <div className={cn("shrink-0 overflow-hidden rounded-xl border border-border bg-card flex items-center justify-center h-12 w-12", className)}>
      {url ? (
        <img src={url} alt={`Logo de ${nome || "fornecedor"}`} className="h-full w-full object-contain p-1" loading="lazy" />
      ) : (
        <span className="text-sm font-semibold text-muted-foreground">{iniciais}</span>
      )}
    </div>
  );
}
