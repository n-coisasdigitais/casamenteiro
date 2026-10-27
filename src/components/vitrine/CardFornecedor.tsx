import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Heart, MapPin, Star } from "lucide-react";
import { textoPreco, type FornecedorVitrine } from "@/lib/vitrine";

export default function CardFornecedor({
  f,
  favorito,
  onFavoritar,
  mostrarCategoria = true,
  mostrarDescricao = false,
  destaque = false,
  selo,
}: {
  f: FornecedorVitrine;
  favorito: boolean;
  onFavoritar: (id: string) => void;
  mostrarCategoria?: boolean;
  mostrarDescricao?: boolean;
  destaque?: boolean;
  selo?: string;
}) {
  const fotos = f.fotos.slice(0, 5);
  const [atual, setAtual] = useState(0);
  const trilho = useRef<HTMLDivElement>(null);
  const preco = textoPreco(f);
  const temNota = !!f.rating && Number(f.rating) > 0 && !!f.review_count;
  const local = [f.city, f.state].filter(Boolean).join(", ");

  const mover = (e: React.MouseEvent, d: number) => {
    e.preventDefault();
    e.stopPropagation();
    const t = trilho.current;
    if (!t) return;
    const prox = (atual + d + fotos.length) % fotos.length;
    t.scrollTo({ left: prox * t.clientWidth, behavior: "smooth" });
  };

  return (
    <Link to={`/fornecedor/${f.id}`} className="vt-card group">
      <div className="vt-foto">
        <div
          ref={trilho}
          className="vt-foto-trilho"
          onScroll={(e) => {
            const t = e.currentTarget;
            if (t.clientWidth) setAtual(Math.round(t.scrollLeft / t.clientWidth));
          }}
        >
          {fotos.map((u, k) => (
            <img key={u + k} src={u} alt={k === 0 ? f.company_name : ""} loading={k === 0 ? "eager" : "lazy"} draggable={false} />
          ))}
        </div>
        {destaque && <span className="vt-tagc">Destaque</span>}
        {selo && <span className="vt-tagc" style={{ top: "auto", bottom: 10, background: "var(--vt-ink)" }}>{selo}</span>}
        <button
          type="button"
          className={`vt-coracao ${favorito ? "on" : ""}`}
          aria-label={favorito ? "Remover dos favoritos" : "Salvar nos favoritos"}
          aria-pressed={favorito}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onFavoritar(f.id);
          }}
        >
          <Heart className={`h-[17px] w-[17px] ${favorito ? "fill-current" : ""}`} />
        </button>
        {fotos.length > 1 && (
          <>
            <button type="button" className="vt-nav left-2" onClick={(e) => mover(e, -1)} aria-label="Foto anterior">
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button type="button" className="vt-nav right-2" onClick={(e) => mover(e, 1)} aria-label="Próxima foto">
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
            <span className="vt-pontos">
              {fotos.map((_, k) => (
                <i key={k} className={k === atual ? "on" : ""} />
              ))}
            </span>
          </>
        )}
      </div>
      <div className="flex items-start justify-between gap-2.5">
        <b className="vt-clamp2 text-[15.5px] leading-snug">{f.company_name}</b>
        {temNota ? (
          <span className="inline-flex flex-none items-center gap-1 text-[13.5px] font-bold">
            <Star className="h-3.5 w-3.5 fill-[var(--vt-star)] text-[var(--vt-star)]" />
            {Number(f.rating).toFixed(1).replace(".", ",")}
            <span className="font-medium text-[var(--vt-muted)]">({f.review_count})</span>
          </span>
        ) : (
          <span className="vt-novo">Novo</span>
        )}
      </div>
      <div className="-mt-1.5 flex items-center gap-1 truncate text-[13.5px] text-[var(--vt-muted)]">
        {mostrarCategoria ? (
          <span className="truncate">
            {f.categories?.name || "Fornecedor"}
            {local ? ` · ${local}` : ""}
          </span>
        ) : (
          <>
            <MapPin className="h-3.5 w-3.5 flex-none" />
            <span className="truncate">{local || "Cidade não informada"}</span>
          </>
        )}
      </div>
      {mostrarDescricao && f.description && <p className="vt-clamp2 -mt-1 text-[13.5px] text-[var(--vt-body)]">{f.description}</p>}
      <div className="-mt-1 text-sm">
        {preco ? (
          <>
            a partir de <b>{preco}</b>
          </>
        ) : (
          <span className="text-[var(--vt-muted)]">Preço sob consulta</span>
        )}
      </div>
    </Link>
  );
}