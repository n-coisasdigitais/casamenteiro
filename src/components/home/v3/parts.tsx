import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import type { Slide } from "@/lib/homeDestaques";
import { registrarEvento } from "@/lib/homeDestaques";

/** Fio pontilhado animado que liga os capítulos da Home. */
export function Thread({ color = "var(--hv-terracota)" }: { color?: string }) {
  return (
    <div
      aria-hidden="true"
      className="hv-thread"
      style={{ backgroundImage: `radial-gradient(circle, ${color} 2px, transparent 2.5px)` }}
    />
  );
}

/** Rótulo de capítulo com número em círculo (Passo 1/2/3). */
export function ChapterLabel({ n, text, color, onDark = false }: { n?: string; text: string; color: string; onDark?: boolean }) {
  return (
    <p className="hv-eyebrow m-0 inline-flex items-center gap-2.5" style={{ color }}>
      {n && (
        <span
          className="inline-flex items-center justify-center rounded-full text-[13px]"
          style={{ width: 32, height: 32, background: color, color: onDark ? "var(--hv-ink)" : "#fff", letterSpacing: 0 }}
        >
          {n}
        </span>
      )}
      {text}
    </p>
  );
}

/** Link para o perfil do patrocinador; conta clique. */
export function SponsorLink({
  slide,
  className,
  style,
  children,
  ...rest
}: {
  slide: Slide;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  const to = slide.link || (slide.supplierId ? `/fornecedor/${slide.supplierId}` : "/explorar");
  const onClick = () => registrarEvento(slide.purchaseId, "clique");
  if (/^https?:\/\//.test(to)) {
    return (
      <a href={to} target="_blank" rel="noopener noreferrer sponsored" className={className} style={style} onClick={onClick} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Link to={to} className={className} style={style} onClick={onClick} {...(rest as any)}>
      {children}
    </Link>
  );
}

/**
 * Conta 1 impressão do slide pago quando ele está ativo e pelo menos metade
 * visível na tela. Slides padrão (sem purchaseId) são ignorados.
 */
export function useImpressao(slide: Slide | undefined, ativo: boolean) {
  const ref = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!ativo || !slide?.purchaseId || !ref.current || typeof IntersectionObserver === "undefined") return;
    const el = ref.current;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          registrarEvento(slide.purchaseId, "impressao");
          io.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [slide?.purchaseId, ativo]);
  return ref;
}

/** Bolinhas de progresso de um carrossel. */
export function Dots({ n, atual, light = true }: { n: number; atual: number; light?: boolean }) {
  if (n < 2) return null;
  return (
    <span aria-hidden="true" className="flex gap-1.5">
      {Array.from({ length: n }).map((_, i) => (
        <span
          key={i}
          className="block rounded-full transition-all duration-500"
          style={{
            height: 6,
            width: i === atual ? 22 : 6,
            background: light ? (i === atual ? "#fff" : "rgba(255,255,255,.5)") : i === atual ? "var(--hv-ink)" : "var(--hv-line)",
          }}
        />
      ))}
    </span>
  );
}
