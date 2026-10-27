import { useState } from "react";
import { Plus, X } from "lucide-react";

/** Múltipla escolha: opções prontas para marcar + "Outro" para o que faltar. */
export default function ListaOpcoes({
  opcoes,
  value,
  onChange,
}: {
  opcoes: string[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [outro, setOutro] = useState("");
  const [abrirOutro, setAbrirOutro] = useState(false);
  const extras = value.filter((v) => !opcoes.includes(v));
  const toggle = (o: string) => onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o]);
  const addOutro = () => {
    const t = outro.trim();
    if (t && !value.includes(t)) onChange([...value, t]);
    setOutro("");
    setAbrirOutro(false);
  };
  const chip = "inline-flex min-h-10 items-center gap-1.5 rounded-full border-2 px-3.5 text-sm font-medium transition";

  return (
    <div className="flex flex-wrap gap-2">
      {opcoes.map((o) => {
        const on = value.includes(o);
        return (
          <button
            key={o}
            type="button"
            aria-pressed={on}
            onClick={() => toggle(o)}
            className={`${chip} ${on ? "border-primary bg-primary/10 text-primary" : "border-border bg-background hover:border-primary/40"}`}
          >
            {o}
          </button>
        );
      })}
      {extras.map((o) => (
        <span key={o} className={`${chip} border-primary bg-primary/10 text-primary`}>
          {o}
          <button type="button" onClick={() => toggle(o)} aria-label={`Remover ${o}`}>
            <X className="h-3.5 w-3.5" />
          </button>
        </span>
      ))}
      {abrirOutro ? (
        <span className="inline-flex items-center gap-1">
          <input
            autoFocus
            value={outro}
            onChange={(e) => setOutro(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addOutro();
              }
              if (e.key === "Escape") setAbrirOutro(false);
            }}
            onBlur={addOutro}
            placeholder="Escreva e tecle Enter"
            className="h-10 w-48 rounded-full border-2 border-primary/40 bg-background px-3.5 text-sm outline-none"
          />
        </span>
      ) : (
        <button type="button" onClick={() => setAbrirOutro(true)} className={`${chip} border-dashed border-border bg-background text-muted-foreground`}>
          <Plus className="h-3.5 w-3.5" /> Outro
        </button>
      )}
    </div>
  );
}
