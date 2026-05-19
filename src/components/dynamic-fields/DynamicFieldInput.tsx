import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useState } from "react";

export type CampoTipo =
  | "texto"
  | "numero"
  | "booleano"
  | "select"
  | "lista"
  | "faixa"
  | "textarea"
  | "checkbox";

export type Campo = {
  id: string;
  chave: string;
  label: string;
  ajuda?: string | null;
  tipo: CampoTipo;
  opcoes?: any;
  obrigatorio?: boolean;
  placeholder?: string | null;
  mostrar_no_perfil?: boolean;
};

type Props = {
  campo: Campo;
  value: any;
  onChange: (v: any) => void;
};

export default function DynamicFieldInput({ campo, value, onChange }: Props) {
  const [draft, setDraft] = useState("");

  switch (campo.tipo) {
    case "texto":
      return (
        <Input
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={campo.placeholder || ""}
        />
      );
    case "textarea":
      return (
        <Textarea
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          placeholder={campo.placeholder || ""}
        />
      );
    case "numero":
      return (
        <Input
          type="number"
          inputMode="numeric"
          value={value ?? ""}
          onChange={(e) =>
            onChange(e.target.value === "" ? null : Number(e.target.value))
          }
          placeholder={campo.placeholder || ""}
        />
      );
    case "booleano":
    case "checkbox":
      return (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onChange(true)}
            className={`flex-1 h-12 rounded-full border-2 transition ${
              value === true
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background"
            }`}
          >
            Sim
          </button>
          <button
            type="button"
            onClick={() => onChange(false)}
            className={`flex-1 h-12 rounded-full border-2 transition ${
              value === false
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background"
            }`}
          >
            Não
          </button>
        </div>
      );
    case "select": {
      const opts: string[] = Array.isArray(campo.opcoes) ? campo.opcoes : [];
      return (
        <div className="grid sm:grid-cols-2 gap-2">
          {opts.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => onChange(o)}
              className={`text-left p-3 rounded-xl border-2 transition ${
                value === o
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40"
              }`}
            >
              {o}
            </button>
          ))}
        </div>
      );
    }
    case "lista": {
      const list: string[] = Array.isArray(value) ? value : [];
      const add = () => {
        const t = draft.trim();
        if (!t) return;
        onChange([...list, t]);
        setDraft("");
      };
      return (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  add();
                }
              }}
              placeholder={campo.placeholder || "Digite e pressione Enter"}
            />
            <Button type="button" onClick={add}>
              Adicionar
            </Button>
          </div>
          {list.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {list.map((it, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm"
                >
                  {it}
                  <button
                    type="button"
                    onClick={() =>
                      onChange(list.filter((_, idx) => idx !== i))
                    }
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      );
    }
    case "faixa": {
      const fv = value || {};
      return (
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            placeholder="De"
            value={fv.min ?? ""}
            onChange={(e) =>
              onChange({
                ...fv,
                min: e.target.value === "" ? null : Number(e.target.value),
              })
            }
          />
          <Input
            type="number"
            placeholder="Até"
            value={fv.max ?? ""}
            onChange={(e) =>
              onChange({
                ...fv,
                max: e.target.value === "" ? null : Number(e.target.value),
              })
            }
          />
        </div>
      );
    }
    default:
      return null;
  }
}