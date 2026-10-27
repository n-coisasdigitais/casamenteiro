import * as React from "react";
import { cn } from "@/lib/utils";

/** Formata um número como real: 1235.45 → "1.235,45" (sem o "R$", que fica fixo no campo). */
export function formatarReais(valor: number | null | undefined, casas: 0 | 2 = 2): string {
  if (valor === null || valor === undefined || Number.isNaN(Number(valor))) return "";
  return Number(valor).toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: 2 });
}

/** "R$ 1.235,45" para exibir valores (sem centavos quando é inteiro). */
export function reais(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || Number.isNaN(Number(valor))) return "—";
  const n = Number(valor);
  return `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })}`;
}

/** Lê o que a pessoa digitou no padrão brasileiro: "1.235,45" → 1235.45; "5800" → 5800. */
export function lerReais(texto: string): number | null {
  const limpo = (texto || "").replace(/[^\d,]/g, "");
  if (!limpo) return null;
  const [inteiro, ...resto] = limpo.split(",");
  const centavos = resto.join("").slice(0, 2);
  const n = Number(`${inteiro || "0"}${centavos ? `.${centavos}` : ""}`);
  return Number.isFinite(n) ? n : null;
}

/** Enquanto digita: põe os pontos de milhar e mantém a vírgula e até 2 casas. */
function mascarar(texto: string): string {
  const limpo = (texto || "").replace(/[^\d,]/g, "");
  if (!limpo) return "";
  const temVirgula = limpo.includes(",");
  const [inteiroBruto, ...resto] = limpo.split(",");
  const inteiro = inteiroBruto.replace(/^0+(?=\d)/, "");
  const milhar = (inteiro || "0").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return temVirgula ? `${milhar},${resto.join("").slice(0, 2)}` : milhar;
}

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> & {
  value: number | string | null | undefined;
  onValueChange: (valor: number | null) => void;
};

/**
 * Campo de valor em real: mostra "R$" fixo, aceita "1.235,45" ou "1235,45" ou "5800"
 * e devolve número (1235.45). Ao sair do campo, completa os centavos (",00").
 */
export const MoedaInput = React.forwardRef<HTMLInputElement, Props>(({ value, onValueChange, className, onBlur, onFocus, ...rest }, ref) => {
  const numero = value === "" || value === null || value === undefined ? null : Number(value);
  const [texto, setTexto] = React.useState(() => formatarReais(numero));
  const focado = React.useRef(false);

  // quando o valor muda por fora (carregou do banco, limpou o formulário), atualiza o texto
  React.useEffect(() => {
    if (focado.current) return;
    setTexto(formatarReais(numero));
  }, [numero]);

  return (
    <div
      className={cn(
        "flex h-10 w-full items-center rounded-md border border-input bg-background text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
        rest.disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      <span className="select-none pl-3 pr-1.5 text-muted-foreground">R$</span>
      <input
        ref={ref}
        {...rest}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        className="h-full min-w-0 flex-1 bg-transparent pr-3 tabular-nums outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
        value={texto}
        placeholder={rest.placeholder ?? "0,00"}
        onFocus={(e) => {
          focado.current = true;
          onFocus?.(e);
        }}
        onChange={(e) => {
          const t = mascarar(e.target.value);
          setTexto(t);
          onValueChange(lerReais(t));
        }}
        onBlur={(e) => {
          focado.current = false;
          setTexto(formatarReais(lerReais(texto)));
          onBlur?.(e);
        }}
      />
    </div>
  );
});
MoedaInput.displayName = "MoedaInput";

/** Campos dinâmicos de categoria que guardam dinheiro (faixas sempre; números quando o rótulo fala de preço/valor). */
export const ehCampoDinheiro = (c: { tipo: string; label?: string | null; chave?: string | null }) =>
  c.tipo === "faixa" || (c.tipo === "numero" && /R\$|pre[cç]o|valor/i.test(`${c.label || ""} ${c.chave || ""}`));
