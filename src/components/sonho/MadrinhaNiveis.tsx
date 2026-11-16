import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Copy, Lock, Share2, Star } from "lucide-react";
import { NIVEIS_MADRINHA, carregarMadrinha } from "@/lib/quiz";
import { absoluteUrl } from "@/lib/seo";
import { useToast } from "@/hooks/use-toast";

const OURO = "#8A6420";
const SUAVE = "#6E625A";

/** Níveis de Madrinha: quem faz o quiz pelo link da pessoa conta (1 por pessoa ou aparelho). Sem sorteio. */
export default function MadrinhaNiveis({ codigo }: { codigo: string }) {
  const { toast } = useToast();
  const [estado, setEstado] = useState<{ amigas: number; nivel: number } | null>(null);
  const link = absoluteUrl(`/quiz?de=${codigo}`);

  useEffect(() => {
    carregarMadrinha().then(setEstado);
  }, []);

  const amigas = estado?.amigas ?? 0;
  const proximo = NIVEIS_MADRINHA.find((n) => amigas < n.meta);
  const anterior = [...NIVEIS_MADRINHA].reverse().find((n) => amigas >= n.meta);
  const base = anterior?.meta ?? 0;
  const pct = proximo ? Math.round(((amigas - base) / (proximo.meta - base)) * 100) : 100;

  const compartilhar = async () => {
    const nav = navigator as any;
    if (nav.share) {
      try {
        await nav.share({ text: "Descobre como seria o seu casamento dos sonhos:", url: link });
        return;
      } catch (e: any) {
        if (e?.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(link);
      toast({ title: "Link copiado", description: "Cole no story, no WhatsApp ou onde quiser." });
    } catch {
      toast({ title: "Seu link", description: link });
    }
  };

  return (
    <section
      className="flex flex-col gap-4 rounded-2xl border p-4"
      style={{ borderColor: "#E8D3A6", background: "#FBF4E8" }}
      aria-labelledby="titulo-madrinha"
    >
      <div className="flex items-start gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
          style={{ background: "#F3E2B8", color: "#5C4310" }}
        >
          <Star className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 id="titulo-madrinha" className="text-base font-semibold">
            Seja madrinha dos sonhos
          </h2>
          <p className="text-[13px] leading-snug" style={{ color: "#5E4F45" }}>
            Cada pessoa que faz o quiz pelo seu link conta uma vez. Quanto mais madrinha, mais você desbloqueia.
          </p>
        </div>
      </div>

      <div>
        <div className="flex justify-between text-[13px]" style={{ color: SUAVE }}>
          <span>
            {amigas} {amigas === 1 ? "pessoa" : "pessoas"} pelo seu link
          </span>
          {proximo && <span>Próximo nível: {proximo.meta}</span>}
        </div>
        <div
          className="mt-1.5 h-2 rounded-full"
          style={{ background: "#EFE4DA" }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, background: "#C49A3C" }} />
        </div>
      </div>

      <ul className="flex flex-col gap-2">
        {NIVEIS_MADRINHA.map((n) => {
          const ok = amigas >= n.meta;
          return (
            <li
              key={n.nivel}
              className="flex items-start gap-3 rounded-xl border p-3"
              style={
                ok
                  ? { background: "#FFFDF8", borderColor: "#E8D3A6" }
                  : { background: "#FFFFFF", borderColor: "#ECE3DA" }
              }
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
                style={ok ? { background: OURO, color: "#FFFFFF" } : { background: "#F1EBE4", color: SUAVE }}
              >
                {ok ? <Check className="h-4 w-4" aria-hidden="true" /> : n.meta}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold">
                  {n.nome}{" "}
                  <span className="text-xs font-normal" style={{ color: ok ? "#3B6D11" : SUAVE }}>
                    {ok ? "Conquistado" : `Faltam ${n.meta - amigas}`}
                  </span>
                </p>
                <p className="text-[13px] leading-snug" style={{ color: "#5E4F45" }}>
                  {n.premio}
                </p>
                {n.nivel === 2 &&
                  (ok ? (
                    <Link
                      to="/meu-sonho/dossie"
                      className="mt-1.5 inline-block text-[13px] font-semibold underline"
                      style={{ color: "#A9582D" }}
                    >
                      Abrir meu dossiê
                    </Link>
                  ) : (
                    <span className="mt-1.5 inline-flex items-center gap-1 text-xs" style={{ color: SUAVE }}>
                      <Lock className="h-3 w-3" aria-hidden="true" /> Bloqueado
                    </span>
                  ))}
                {n.nivel === 3 && ok && (
                  <p className="mt-1.5 text-xs font-medium" style={{ color: "#3B6D11" }}>
                    Aviso antecipado ligado: vale quando você noivar.
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={compartilhar}
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: "#2B211B" }}
        >
          <Share2 className="h-4 w-4" aria-hidden="true" /> Compartilhar meu link
        </button>
        <button
          type="button"
          aria-label="Copiar link"
          onClick={() => navigator.clipboard?.writeText(link).then(() => toast({ title: "Link copiado" }))}
          className="flex h-11 w-11 items-center justify-center rounded-xl border bg-white"
          style={{ borderColor: "#DCCFC3" }}
        >
          <Copy className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <p className="text-xs" style={{ color: SUAVE }}>
        Conta quem termina o quiz pelo seu link, uma vez por pessoa. Sem sorteio.
      </p>
    </section>
  );
}
