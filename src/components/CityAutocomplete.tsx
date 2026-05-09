import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Loader2 } from "lucide-react";

type Sugestao = { cidade: string; estado: string | null };

interface Props {
  value: string;
  onChange: (cidade: string, estado?: string | null, semFornecedor?: boolean) => void;
  placeholder?: string;
  autoFocus?: boolean;
  /** Estilo grande (página do simulador) ou compacto (forms). */
  variant?: "large" | "compact";
  className?: string;
}

/**
 * Autocomplete de cidades baseado em fornecedores aprovados.
 * Se nenhuma cidade encontrada, oferece "Continuar com X mesmo assim".
 */
export default function CityAutocomplete({
  value,
  onChange,
  placeholder = "Ex: Belo Horizonte",
  autoFocus,
  variant = "compact",
  className = "",
}: Props) {
  const [query, setQuery] = useState(value);
  const [sugestoes, setSugestoes] = useState<Sugestao[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [touched, setTouched] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => setQuery(value), [value]);

  useEffect(() => {
    if (!touched) return;
    if (!query || query.trim().length < 2) {
      setSugestoes([]);
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc("cidades_disponiveis", { _prefix: query.trim() });
      setLoading(false);
      if (error) {
        setSugestoes([]);
      } else {
        setSugestoes((data || []) as Sugestao[]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query, touched]);

  // Fecha ao clicar fora
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const escolher = (s: Sugestao) => {
    setQuery(s.cidade);
    setOpen(false);
    onChange(s.cidade, s.estado, false);
  };

  const continuarMesmoAssim = () => {
    setOpen(false);
    onChange(query.trim(), null, true);
  };

  const inputBase =
    variant === "large"
      ? "w-full bg-transparent border-0 outline-none"
      : "w-full px-4 py-2.5 rounded-lg border outline-none transition";

  const inputStyle =
    variant === "large"
      ? {
          fontSize: 28,
          fontWeight: 600,
          color: "hsl(var(--color-dark))",
          borderBottom: "2px solid hsl(var(--color-border))",
          padding: "8px 0 12px",
        }
      : {
          background: "hsl(var(--color-bg))",
          borderColor: "hsl(var(--color-border))",
          color: "hsl(var(--color-text-body))",
        };

  const semResultado = touched && query.trim().length >= 2 && !loading && sugestoes.length === 0;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <input
        autoFocus={autoFocus}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setTouched(true);
          setOpen(true);
          onChange(e.target.value, null, false);
        }}
        onFocus={(e) => {
          setOpen(true);
          if (variant === "large") e.currentTarget.style.borderBottomColor = "hsl(var(--color-primary))";
        }}
        onBlur={(e) => {
          if (variant === "large") e.currentTarget.style.borderBottomColor = "hsl(var(--color-border))";
        }}
        placeholder={placeholder}
        className={inputBase}
        style={inputStyle}
        autoComplete="off"
      />

      {open && touched && query.trim().length >= 2 && (
        <div
          className="absolute z-30 left-0 right-0 mt-2 rounded-xl shadow-lg overflow-hidden"
          style={{
            background: "hsl(var(--color-bg))",
            border: "1px solid hsl(var(--color-border))",
            maxHeight: 320,
            overflowY: "auto",
          }}
        >
          {loading && (
            <div className="flex items-center gap-2 px-4 py-3 text-sm" style={{ color: "hsl(var(--color-text-muted))" }}>
              <Loader2 className="w-4 h-4 animate-spin" /> Buscando cidades...
            </div>
          )}

          {!loading &&
            sugestoes.map((s) => (
              <button
                type="button"
                key={`${s.cidade}-${s.estado}`}
                onClick={() => escolher(s)}
                className="w-full text-left px-4 py-3 transition flex items-center gap-2 hover:bg-[hsl(var(--color-secondary)/0.4)]"
                style={{ color: "hsl(var(--color-text-body))" }}
              >
                <MapPin className="w-4 h-4 flex-shrink-0" style={{ color: "hsl(var(--color-primary))" }} />
                <span className="font-medium">{s.cidade}</span>
                {s.estado && (
                  <span className="text-xs" style={{ color: "hsl(var(--color-text-muted))" }}>
                    — {s.estado}
                  </span>
                )}
              </button>
            ))}

          {semResultado && (
            <button
              type="button"
              onClick={continuarMesmoAssim}
              className="w-full text-left px-4 py-3 transition border-t"
              style={{
                background: "hsl(var(--color-secondary) / 0.3)",
                borderColor: "hsl(var(--color-border))",
                color: "hsl(var(--color-dark))",
              }}
            >
              <div className="flex items-start gap-2">
                <span className="text-base">📍</span>
                <div>
                  <div className="font-semibold text-sm">
                    Continuar com "{query.trim()}" mesmo assim
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: "hsl(var(--color-text-muted))" }}>
                    Avisaremos a equipe para buscar fornecedores na sua região.
                  </div>
                </div>
              </div>
            </button>
          )}
        </div>
      )}
    </div>
  );
}