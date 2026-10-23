import { Link } from "react-router-dom";
import { estiloFoco, type CategoriaHome, type DataDesconto } from "@/lib/homeDestaques";
import { indiceRotacao } from "@/hooks/useRotacao";
import { ChapterLabel, Dots, useImpressao } from "./parts";

const CORES_BLOCO = [
  { bg: "#4A7C6A", fg: "#fff", sub: "#DDEBE5" },
  { bg: "#D9905A", fg: "#1F1D1B", sub: "#3B2414" },
  { bg: "#1F1D1B", fg: "#FAFAF7", sub: "#CFC6BC" },
  { bg: "#A9551F", fg: "#fff", sub: "#FBEFE5" },
];

function TileCategoria({ c, i, tick }: { c: CategoriaHome; i: number; tick: number }) {
  const atual = indiceRotacao(tick, c.slides.length, i);
  const s = c.slides[atual];
  const impRef = useImpressao(s, true);
  const temFoto = c.slides.length > 0;
  const cor = CORES_BLOCO[i % CORES_BLOCO.length];
  const span = i === 0 ? "lg:row-span-2" : i === 1 ? "sm:col-span-2" : "";

  return (
    <Link
      ref={impRef as any}
      to={`/categoria/${c.slug}`}
      className={`hv-zoom hv-lift relative block min-w-0 overflow-hidden rounded-[28px] ${span}`}
      style={{ background: temFoto ? "var(--hv-ink)" : cor.bg, color: temFoto ? "#fff" : cor.fg }}
    >
      {c.slides.map((sl, k) => (
        <img
          key={sl.key}
          src={sl.imagem}
          alt={k === atual ? `${c.nome}${sl.supplierNome ? ` — ${sl.supplierNome}` : ""}` : ""}
          aria-hidden={k !== atual}
          loading="lazy"
          className="hv-foco absolute inset-0 block h-full w-full object-cover"
          style={{ ...estiloFoco(sl), opacity: k === atual ? 1 : 0 }}
        />
      ))}
      {temFoto && <span aria-hidden="true" className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(20,14,10,.15) 0%, transparent 35%, rgba(20,14,10,.75) 100%)" }} />}
      {s?.purchaseId && (
        <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-white" style={{ background: "rgba(20,14,10,.5)", border: "1px solid rgba(255,255,255,.3)" }}>
          ★ Destaque · {s.supplierNome}
        </span>
      )}
      <span className="absolute right-[18px] top-[22px]">
        <Dots n={c.slides.length} atual={atual} />
      </span>
      <span className="absolute bottom-[22px] left-6 right-6 flex flex-col gap-1">
        <span className="font-extrabold" style={{ fontSize: i === 1 ? 36 : 28, letterSpacing: "-0.03em" }}>
          {c.nome}
        </span>
        <span className="text-[15px]" style={{ color: temFoto ? "#FBEFE5" : cor.sub }}>
          {c.descricao || `${c.fornecedores} ${c.fornecedores === 1 ? "fornecedor" : "fornecedores"}`}
        </span>
      </span>
    </Link>
  );
}

const fmtDia = (iso: string) => {
  const d = new Date(`${iso}T12:00:00`);
  return {
    semana: d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""),
    mes: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
    dia: d.getDate(),
  };
};

/**
 * Passo 2 · Comparem — categorias (com destaque pago e rotação),
 * comparação de propostas e, se houver, o bônus de datas com desconto.
 */
export default function CompareSection({
  categorias,
  datas,
  tick,
}: {
  categorias: CategoriaHome[];
  datas: DataDesconto[];
  tick: number;
}) {
  const mostrarDatas = datas.length >= 3;

  return (
    <section id="comparar" aria-labelledby="cmp-title" className="scroll-mt-20 px-6 pb-28 pt-6">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-10">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div className="flex max-w-[700px] flex-col gap-3.5">
            <ChapterLabel n="02" text="Passo 2 · Comparem" color="var(--hv-sage)" />
            <h2 id="cmp-title" className="hv-display m-0" style={{ fontSize: "clamp(40px, 5vw, 64px)" }}>
              Tudo pra festa.
              <br />
              <span style={{ color: "#A39A90" }}>Num lugar só.</span>
            </h2>
          </div>
          <Link to="/explorar" className="text-[17px] font-semibold" style={{ color: "var(--hv-clay)" }}>
            Ver todas as categorias ›
          </Link>
        </div>

        {categorias.length > 0 && (
          <div className="grid auto-rows-[240px] grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            {categorias.map((c, i) => (
              <TileCategoria key={c.id} c={c} i={i} tick={tick} />
            ))}
          </div>
        )}

        {/* Comparar propostas (ilustração do produto) */}
        <div className="flex flex-wrap items-center gap-10 rounded-[32px] border bg-white p-8 md:p-10" style={{ borderColor: "var(--hv-line)" }}>
          <div className="flex min-w-0 flex-1 basis-[320px] flex-col gap-3.5">
            <h3 className="m-0 text-[34px] font-extrabold leading-[1.08]" style={{ letterSpacing: "-0.035em" }}>
              Peçam orçamento.
              <br />
              Comparem lado a lado.
            </h3>
            <p className="m-0 text-[17px] leading-relaxed" style={{ color: "var(--hv-body)" }}>
              Cada fornecedor responde pelo chat com proposta e anexos. Vocês negociam ali mesmo e guardam tudo em “Meus fornecedores”.
            </p>
            <Link to="/explorar" className="text-[17px] font-semibold" style={{ color: "var(--hv-clay)" }}>
              Ver fornecedores em BH ›
            </Link>
          </div>
          <div className="grid min-w-0 flex-[1.4] basis-[480px] gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }} aria-label="Exemplo de comparação de propostas">
            {[
              { l: "A", nome: "Buffet A", itens: ["✓ Jantar completo", "✓ Bebidas", "— Bolo à parte"], status: "● Proposta + 1 anexo", fav: false, ok: true },
              { l: "B", nome: "Buffet B", itens: ["✓ Jantar completo", "✓ Bebidas", "✓ Bolo incluso"], status: "● Respondeu no chat", fav: true, ok: true },
              { l: "C", nome: "Buffet C", itens: ["Pedido enviado com data, convidados e orçamento."], status: "○ Aguardando resposta", fav: false, ok: false },
            ].map((p) => (
              <div key={p.l} className="relative flex flex-col gap-2.5 rounded-[22px] p-[18px]" style={{ border: p.fav ? "2px solid var(--hv-sage)" : "1px solid var(--hv-line)" }}>
                {p.fav && (
                  <span className="absolute -top-3 left-4 rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase text-white" style={{ letterSpacing: ".06em", background: "var(--hv-sage)" }}>
                    Favorito
                  </span>
                )}
                <span className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full font-extrabold" style={{ background: p.fav ? "#E7EFEB" : "var(--hv-sand)", color: p.fav ? "var(--hv-sage)" : "var(--hv-clay)" }}>
                    {p.l}
                  </span>
                  <span className="text-[15px] font-bold">{p.nome}</span>
                </span>
                <span className="text-[22px] font-extrabold" style={{ letterSpacing: "-0.03em", color: p.ok ? "var(--hv-ink)" : "#A39A90" }}>
                  {p.ok ? "Proposta" : "aguardando"}
                </span>
                <span className="text-[13px] leading-relaxed" style={{ color: "var(--hv-body)" }}>
                  {p.itens.map((t) => (
                    <span key={t} className="block">
                      {t}
                    </span>
                  ))}
                </span>
                <span className="text-xs font-semibold" style={{ color: p.ok ? "var(--hv-sage)" : "#8A8178" }}>
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bônus: só aparece quando há datas com desconto cadastradas */}
        {mostrarDatas && (
          <div className="flex flex-wrap items-center gap-x-10 gap-y-6 rounded-[32px] px-9 py-8" style={{ background: "var(--hv-ink)", color: "var(--hv-cream)" }}>
            <div className="flex flex-1 basis-[300px] flex-col gap-2">
              <span className="self-start rounded-full px-2.5 py-1 text-xs font-extrabold uppercase" style={{ letterSpacing: ".08em", background: "var(--hv-peach)", color: "var(--hv-ink)" }}>
                Bônus
              </span>
              <span className="text-[30px] font-extrabold" style={{ letterSpacing: "-0.03em" }}>
                A data certa vale <span className="hv-serif" style={{ color: "var(--hv-peach)" }}>ouro.</span>
              </span>
              <span className="text-base" style={{ color: "#CFC6BC" }}>
                Fornecedores com agenda livre dão desconto em dias específicos.
              </span>
            </div>
            <div className="grid flex-[1.3] basis-[420px] grid-cols-2 gap-2.5 sm:grid-cols-4">
              {datas.slice(0, 3).map((d) => {
                const f = fmtDia(d.data);
                return (
                  <Link key={d.data} to="/explorar" className="flex flex-col gap-0.5 rounded-[18px] p-3.5" style={{ background: "#2B2825", color: "var(--hv-cream)" }}>
                    <span className="text-xs capitalize" style={{ color: "#CFC6BC" }}>
                      {f.semana} · {f.mes}
                    </span>
                    <span className="text-[28px] font-extrabold">{f.dia}</span>
                    <span className="text-xs font-bold" style={{ color: "var(--hv-sage-light)" }}>
                      até {Math.round(d.descontoMax)}% off
                    </span>
                    <span className="text-[11px]" style={{ color: "#CFC6BC" }}>
                      {d.fornecedores} {d.fornecedores === 1 ? "fornecedor" : "fornecedores"}
                    </span>
                  </Link>
                );
              })}
              <Link to="/explorar" className="flex items-center justify-center rounded-[18px] p-3.5 text-center text-sm font-bold" style={{ background: "#2B2825", color: "var(--hv-peach)" }}>
                Ver calendário ›
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
