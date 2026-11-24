import { Link } from "react-router-dom";
import { MapPin, ShieldCheck, Star } from "lucide-react";
import { listaFuncoes } from "@/lib/funcoesStaff";
import { ehVerificado, localDe, reaisTurno, type ProfissionalPublico } from "@/lib/profissionais";

export function AvatarProfissional({
  nome,
  foto,
  tamanho = 64,
}: {
  nome: string;
  foto?: string | null;
  tamanho?: number;
}) {
  const iniciais = (nome || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
  return foto ? (
    <img
      src={foto}
      alt={nome}
      loading="lazy"
      className="flex-none rounded-full object-cover"
      style={{ width: tamanho, height: tamanho }}
    />
  ) : (
    <span
      aria-hidden
      className="flex flex-none items-center justify-center rounded-full font-semibold text-[var(--vt-clay)]"
      style={{ width: tamanho, height: tamanho, background: "var(--vt-blush)", fontSize: tamanho * 0.36 }}
    >
      {iniciais}
    </span>
  );
}

export default function CardProfissional({ p }: { p: ProfissionalPublico }) {
  const nota = Number(p.rating || 0);
  const local = localDe(p);
  const valor = reaisTurno(p.valor_min_turno);
  return (
    <Link
      to={`/profissional/${p.slug}`}
      className="vt-caixa flex flex-col gap-3 !p-5 transition hover:border-[var(--vt-line2)] hover:shadow-[var(--vt-shadow)]"
    >
      <div className="flex items-start gap-3.5">
        <AvatarProfissional nome={p.nome} foto={p.foto_url} />
        <div className="min-w-0 flex-1">
          <b className="vt-clamp2 text-[15.5px] leading-snug">{p.nome}</b>
          <p className="mt-0.5 truncate text-[13.5px] text-[var(--vt-body)]">{listaFuncoes(p.funcoes)}</p>
          {ehVerificado(p) && (
            <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-[var(--vt-sage)] px-2 py-0.5 text-[11.5px] font-bold text-[var(--vt-ok)]">
              <ShieldCheck className="h-3 w-3" /> Verificado
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-[var(--vt-muted)]">
        {local && (
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" /> {local}
            {p.distancia_km != null && p.distancia_km > 0 ? ` · ${Math.round(p.distancia_km)} km` : ""}
          </span>
        )}
        {nota > 0 && p.review_count ? (
          <span className="inline-flex items-center gap-1 font-semibold text-[var(--vt-ink)]">
            <Star className="h-3.5 w-3.5 fill-[var(--vt-star)] text-[var(--vt-star)]" />
            {nota.toFixed(1).replace(".", ",")}
            <span className="font-normal text-[var(--vt-muted)]">({p.review_count})</span>
          </span>
        ) : (
          <span className="vt-novo">Novo</span>
        )}
        {!!p.eventos_concluidos && (
          <span>
            {p.eventos_concluidos} {p.eventos_concluidos === 1 ? "evento" : "eventos"}
          </span>
        )}
      </div>
      {valor && (
        <p className="text-sm">
          a partir de <b>{valor}</b> por turno
        </p>
      )}
    </Link>
  );
}
