import { useMemo, useState } from "react";
import type { Depoimento } from "@/lib/homeDestaques";

/** Mínimo de depoimentos aprovados para o grupo aparecer na Home. */
export const MIN_DEPOIMENTOS = 3;

const CORES_AVATAR = ["#D9905A", "#4A7C6A", "#F2B98A", "#A9551F"];

function Card({ d, i }: { d: Depoimento; i: number }) {
  const forn = d.tipo === "fornecedor";
  return (
    <figure className="m-0 flex w-[340px] shrink-0 flex-col gap-4 rounded-[24px] bg-white p-6 sm:w-[360px]" style={{ boxShadow: "0 10px 30px rgba(110,60,25,.08)" }}>
      <span className="flex items-center justify-between">
        <span aria-label={`${d.nota} de 5 estrelas`} role="img" style={{ color: "var(--hv-terracota)", letterSpacing: 2 }}>
          {"★".repeat(Math.max(1, Math.min(5, Math.round(d.nota))))}
        </span>
        <span
          className="rounded-full px-2 py-1 text-[11px] font-extrabold uppercase"
          style={{ letterSpacing: ".05em", background: forn ? "#E7EFEB" : "#FBF1E8", color: forn ? "#3B6656" : "var(--hv-clay)" }}
        >
          {forn ? "Fornecedor" : "Casal verificado"}
        </span>
      </span>
      <blockquote className="m-0 line-clamp-6 text-[17px] leading-normal">“{d.texto}”</blockquote>
      <figcaption className="mt-auto flex items-center gap-3">
        <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full font-extrabold text-white" style={{ background: CORES_AVATAR[i % 4] }}>
          {(d.nome.trim()[0] || "♥").toUpperCase()}
        </span>
        <span className="flex flex-col">
          <strong className="text-[15px]">{d.nome}</strong>
          {d.detalhe && (
            <span className="text-[13px]" style={{ color: "var(--hv-body)" }}>
              {d.detalhe}
            </span>
          )}
        </span>
      </figcaption>
    </figure>
  );
}

/**
 * Prova social: depoimentos de casais e de fornecedores.
 * Cada grupo só aparece com MAIS de MIN_DEPOIMENTOS aprovados; sem nenhum grupo, a seção some.
 */
export default function ReviewsSection({ depoimentos }: { depoimentos: Depoimento[] }) {
  const grupos = useMemo(() => {
    const casais = depoimentos.filter((d) => d.tipo === "casal");
    const forn = depoimentos.filter((d) => d.tipo === "fornecedor");
    return [
      { id: "casal" as const, nome: "Casais", itens: casais },
      { id: "fornecedor" as const, nome: "Fornecedores", itens: forn },
    ].filter((g) => g.itens.length > MIN_DEPOIMENTOS);
  }, [depoimentos]);
  const [aba, setAba] = useState<"casal" | "fornecedor">("casal");

  if (!grupos.length) return null;
  const atual = grupos.find((g) => g.id === aba) ?? grupos[0];
  const media = atual.itens.reduce((s, d) => s + d.nota, 0) / atual.itens.length;
  const metade = Math.ceil(atual.itens.length / 2);
  const linha1 = atual.itens.slice(0, metade);
  const linha2 = atual.itens.slice(metade).length ? atual.itens.slice(metade) : linha1;

  return (
    <section aria-labelledby="rev-title" className="overflow-hidden pb-6 pt-28" style={{ background: "var(--hv-sand)" }}>
      <div className="mx-auto mb-12 flex max-w-[1200px] flex-wrap items-end justify-between gap-6 px-6">
        <div className="flex max-w-[640px] flex-col gap-3.5">
          <p className="hv-eyebrow m-0" style={{ color: "var(--hv-clay)" }}>
            Quem já viveu essa história
          </p>
          <h2 id="rev-title" className="hv-display m-0" style={{ fontSize: "clamp(40px, 5vw, 64px)" }}>
            Quem casou,
            <br />
            <span className="hv-serif" style={{ color: "var(--hv-clay)" }}>
              conta.
            </span>
          </h2>
          <p className="m-0 flex items-center gap-2.5 text-[17px]" style={{ color: "var(--hv-body)" }}>
            <span aria-hidden="true" className="text-xl" style={{ color: "var(--hv-terracota)", letterSpacing: 2 }}>
              ★★★★★
            </span>
            <strong style={{ color: "var(--hv-ink)" }}>{media.toLocaleString("pt-BR", { maximumFractionDigits: 1, minimumFractionDigits: 1 })}</strong>
            de média em {atual.itens.length} avaliações
          </p>
        </div>
        {grupos.length > 1 && (
          <div role="tablist" aria-label="Quem está falando" className="flex gap-1.5 rounded-full p-1.5" style={{ background: "#EADBCB" }}>
            {grupos.map((g) => {
              const on = g.id === atual.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => setAba(g.id)}
                  className="min-h-[44px] rounded-full px-5 text-[15px]"
                  style={on ? { background: "#fff", color: "var(--hv-ink)", fontWeight: 700, boxShadow: "0 4px 12px rgba(31,29,27,.12)" } : { color: "var(--hv-body)", fontWeight: 600 }}
                >
                  {g.nome}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="hv-marquee-wrap flex flex-col gap-4 pb-24">
        {[linha1, linha2].map((linha, li) => (
          <div key={`${atual.id}-${li}`} className={`hv-marquee pl-4 ${li ? "hv-rev" : ""}`}>
            {[...linha, ...linha, ...linha].map((d, i) => (
              <div key={`${d.id}-${i}`} aria-hidden={i >= linha.length}>
                <Card d={d} i={i} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
