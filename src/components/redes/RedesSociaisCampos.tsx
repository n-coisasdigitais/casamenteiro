import { Label } from "@/components/ui/label";
import { REDES, normalizarRede, type Redes } from "@/lib/redesSociais";
import RedeIcon from "./RedeIcon";

/** Campos de redes sociais: a pessoa digita só o @ (ou cola o link inteiro, que é limpo ao sair do campo). */
export default function RedesSociaisCampos({ value, onChange }: { value: Redes; onChange: (v: Redes) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {REDES.map((r) => (
        <div key={r.chave} className="min-w-0">
          <Label htmlFor={`rede-${r.chave}`} className="mb-1.5 flex items-center gap-1.5">
            {r.nome} <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
          </Label>
          <div className="flex h-10 items-center overflow-hidden rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring">
            <span className="flex h-full shrink-0 items-center gap-1.5 border-r border-input bg-muted/50 pl-2.5 pr-2 text-xs text-muted-foreground">
              <RedeIcon rede={r.chave} className="h-4 w-4" />
              {r.prefixo}
            </span>
            <input
              id={`rede-${r.chave}`}
              className="h-full min-w-0 flex-1 bg-transparent px-2.5 text-sm outline-none"
              value={value[r.chave] || ""}
              placeholder={r.placeholder}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              onChange={(e) => onChange({ ...value, [r.chave]: e.target.value })}
              onBlur={(e) => onChange({ ...value, [r.chave]: normalizarRede(r.chave, e.target.value) || "" })}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
