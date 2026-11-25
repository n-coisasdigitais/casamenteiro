import type { Dispatch, ReactNode, SetStateAction } from "react";
import { NavLink } from "react-router-dom";
import { Loader2 } from "lucide-react";
import type { StatusMeta } from "@/lib/oferta";
import "./oferta.css";

export function Cabecalho({
  titulo,
  destaque,
  descricao,
  acoes,
}: {
  titulo: string;
  destaque?: string;
  descricao?: string;
  acoes?: ReactNode;
}) {
  return (
    <header className="of-cab">
      <div>
        <h1>
          {titulo} {destaque && <em>{destaque}</em>}
        </h1>
        {descricao && <p>{descricao}</p>}
      </div>
      {acoes && <div className="of-cab-acoes">{acoes}</div>}
    </header>
  );
}

export function AbasOferta() {
  const abas = [
    ["/admin/oferta", "Visão geral"],
    ["/admin/oferta/categorias", "Categorias"],
    ["/admin/oferta/mapa", "Mapa"],
    ["/admin/oferta/profissionais", "Profissionais"],
    ["/admin/comportamento", "Comportamento"],
  ];
  return (
    <nav className="of-abas" aria-label="Painel de oferta">
      {abas.map(([to, nome]) => (
        <NavLink key={to} to={to} end className={({ isActive }) => (isActive ? "on" : "")}>
          {nome}
        </NavLink>
      ))}
    </nav>
  );
}

/** Bloco branco com título (cartão). */
export function Bloco({
  titulo,
  sub,
  acoes,
  children,
}: {
  titulo: ReactNode;
  sub?: ReactNode;
  acoes?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="cz-card of-bloco">
      <div className="of-bloco-topo">
        <div>
          <h2>{titulo}</h2>
          {sub && <p>{sub}</p>}
        </div>
        {acoes}
      </div>
      {children}
    </section>
  );
}

/** Número grande. Botão nativo (não o Button do shadcn, que tem altura fixa e cortava o texto). */
export function Kpi({
  rotulo,
  valor,
  detalhe,
  tom,
  ativo,
  onClick,
}: {
  rotulo: string;
  valor: ReactNode;
  detalhe?: ReactNode;
  tom?: "ok" | "warn" | "err";
  ativo?: boolean;
  onClick?: () => void;
}) {
  const conteudo = (
    <>
      <span className="of-kpi-r">{rotulo}</span>
      <strong className="of-kpi-v cz-num">{valor}</strong>
      {detalhe && <span className={`of-kpi-d ${tom ?? ""}`}>{detalhe}</span>}
    </>
  );
  return onClick ? (
    <button type="button" className={`of-kpi ${ativo ? "on" : ""}`} aria-pressed={!!ativo} onClick={onClick}>
      {conteudo}
    </button>
  ) : (
    <div className="of-kpi">{conteudo}</div>
  );
}

export function Chips<T extends string>({
  rotulo,
  valor,
  onChange,
  opcoes,
}: {
  rotulo: string;
  valor: NoInfer<T>;
  onChange: Dispatch<SetStateAction<T>>;
  opcoes: readonly { id: NoInfer<T>; nome: string }[];
}) {
  return (
    <div className="of-chips" role="group" aria-label={rotulo}>
      {opcoes.map((o) => (
        <button
          key={o.id}
          type="button"
          className={valor === o.id ? "on" : ""}
          aria-pressed={valor === o.id}
          onClick={() => onChange(o.id)}
        >
          {o.nome}
        </button>
      ))}
    </div>
  );
}

export function Erro({ texto, acao }: { texto: string; acao?: ReactNode }) {
  return (
    <div className="of-estado err" role="alert">
      <span>{texto}</span>
      {acao}
    </div>
  );
}

export function Carregando({ texto = "Carregando…" }: { texto?: string }) {
  return (
    <div className="of-estado" role="status">
      <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
      {texto}
    </div>
  );
}

export function Vazio({ children }: { children: ReactNode }) {
  return <div className="of-vazio">{children}</div>;
}

export function Status({ s }: { s: StatusMeta }) {
  return (
    <span className={`cz-st ${s === "ok" ? "cz-ok" : s === "abaixo" ? "cz-warn" : "cz-err"}`}>
      {s === "ok" ? "Na meta" : s === "abaixo" ? "Abaixo" : "Vazia"}
    </span>
  );
}

export function Barra({ valor, max, cor = "var(--ad-clay)" }: { valor: number; max: number; cor?: string }) {
  const percent = max > 0 ? Math.min(100, Math.max(0, (valor / max) * 100)) : 0;
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={Math.max(0, max)}
      aria-valuenow={Math.max(0, Math.min(valor, max))}
      className="h-2 w-full overflow-hidden rounded-full bg-muted"
    >
      <div className="h-full rounded-full" style={{ width: `${percent}%`, background: cor }} />
    </div>
  );
}

export function Legenda({ itens }: { itens: { cor: string; rotulo: string; borda?: string }[] }) {
  return (
    <div className="of-legenda">
      {itens.map((i) => (
        <span key={i.rotulo}>
          <i aria-hidden="true" style={{ background: i.cor, borderColor: i.borda ?? i.cor }} />
          {i.rotulo}
        </span>
      ))}
    </div>
  );
}
