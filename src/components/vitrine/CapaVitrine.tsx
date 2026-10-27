import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import type { Anuncio } from "@/lib/vitrine";

/**
 * Capa com foto grande. Com destaque pago ativo, a foto é a do anunciante e aparece o cartão "Patrocinado"
 * (alterna a cada 6 s quando há mais de um). Sem destaque, mostra a foto institucional.
 */
export default function CapaVitrine({
  anuncios,
  fotoPadrao,
  tipo,
  children,
}: {
  anuncios: Anuncio[];
  fotoPadrao: string;
  tipo: "explorar" | "categoria";
  children: ReactNode;
}) {
  const [i, setI] = useState(0);
  const [mobile, setMobile] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches);
  const n = anuncios.length;

  useEffect(() => setI(0), [n]);
  useEffect(() => {
    if (n < 2) return;
    const t = setInterval(() => setI((x) => (x + 1) % n), 6000);
    return () => clearInterval(t);
  }, [n]);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const f = () => setMobile(mq.matches);
    mq.addEventListener?.("change", f);
    return () => mq.removeEventListener?.("change", f);
  }, []);

  const atual = anuncios[i];
  const fundos = n ? anuncios : [{ imagem: fotoPadrao } as Anuncio];

  return (
    <section className={`vt-capa ${tipo === "categoria" ? "cat" : ""} ${n ? "" : "sem-anuncio"}`}>
      <div className="vt-capa-fundo" aria-hidden>
        {fundos.map((a, k) => (
          <img
            key={`${a.supplier_id || "padrao"}-${k}`}
            src={a.imagem}
            alt=""
            className={k === (n ? i : 0) ? "on" : ""}
            loading={k === 0 ? "eager" : "lazy"}
            style={{ objectPosition: (mobile ? a.foco_mobile : a.foco_desktop) || "50% 50%" }}
          />
        ))}
      </div>

      {atual && (
        <>
          <Link to={`/fornecedor/${atual.supplier_id}`} className="vt-anunciante" aria-label={`Patrocinado: ${atual.nome}`}>
            <img src={atual.imagem} alt="" />
            <span className="flex min-w-0 flex-col leading-tight">
              <small>Patrocinado</small>
              <b className="truncate text-[14.5px]">{atual.nome}</b>
              <span className="truncate text-[12.5px] text-[var(--vt-muted)]">
                {[atual.categoria, [atual.cidade, atual.estado].filter(Boolean).join(", ")].filter(Boolean).join(" · ")}
              </span>
            </span>
            <span className="grid h-[34px] w-[34px] flex-none place-items-center rounded-full bg-[var(--vt-clay)] text-white">
              <ChevronRight className="h-4 w-4" />
            </span>
          </Link>
          {n > 1 && (
            <div className="vt-pts">
              {anuncios.map((a, k) => (
                <button key={a.supplier_id} type="button" className={k === i ? "on" : ""} onClick={() => setI(k)} aria-label={`Anúncio ${k + 1}`} />
              ))}
            </div>
          )}
        </>
      )}

      <div className="vt-wrap vt-capa-in">{children}</div>
    </section>
  );
}