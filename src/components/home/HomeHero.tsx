import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const FALLBACK_HERO = "https://images.unsplash.com/photo-1519741497674-611481863552?w=2000&q=85&auto=format&fit=crop";

/**
 * Hero full-bleed: a imagem toma a tela inteira, com texto e botões sobre ela.
 * A imagem vem de `heroImage` (linha ordem=0 de secoes_home) — é o espaço de
 * destaque monetizável: um fornecedor de plano premium pode ocupar essa imagem.
 */
export default function HomeHero({ heroImage }: { heroImage?: string | null }) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const { count: c } = await supabase
        .from("suppliers")
        .select("id", { count: "exact", head: true })
        .eq("status", "approved");
      if (typeof c === "number") setCount(c);
    })();
  }, []);

  const proof =
    count === null
      ? null
      : count >= 20
        ? `${count} fornecedores verificados · BH e região`
        : "Fornecedores avaliados · BH e região";

  const image = heroImage || FALLBACK_HERO;

  return (
    <section className="relative h-[100svh] min-h-[600px] w-full overflow-hidden">
      {/* Imagem de fundo full-bleed (destaque monetizável) */}
      <img
        src={image}
        alt="Casamento dos sonhos"
        loading="eager"
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* Gradiente para legibilidade do texto sobre a imagem */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, hsl(0 0% 0% / 0.45) 0%, hsl(0 0% 0% / 0.25) 35%, hsl(0 0% 0% / 0.55) 100%)",
        }}
      />

      {/* Conteúdo sobre a imagem */}
      <div className="relative z-10 h-full container flex items-center">
        <div className="max-w-xl">
          <p
            className="label-ui mb-5"
            style={{ color: "hsl(48, 27%, 98%)", textShadow: "0 2px 10px hsl(0 0% 0% / 0.6)" }}
          >
            Marketplace de casamentos · Belo Horizonte e região
          </p>
          <h1
            className="font-serif mb-5 text-white"
            style={{
              fontSize: "clamp(2rem, 3.6vw, 3.25rem)",
              lineHeight: 1.08,
              fontWeight: 500,
              letterSpacing: "-0.02em",
              textShadow: "0 2px 24px hsl(0 0% 0% / 0.5), 0 1px 4px hsl(0 0% 0% / 0.4)",
            }}
          >
            Descubra quanto custa o seu casamento — e economize casando em datas com desconto.
          </h1>
          <p
            className="text-base md:text-lg mb-8 max-w-md"
            style={{
              color: "hsl(48, 30%, 96%)",
              lineHeight: 1.55,
              fontWeight: 400,
              textShadow: "0 1px 10px hsl(0 0% 0% / 0.5)",
            }}
          >
            Simule em 1 minuto e receba fornecedores avaliados dentro do seu orçamento.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-7">
            <Link
              to="/simulador"
              className="inline-flex items-center justify-center rounded-full font-medium transition hover:opacity-90 w-full sm:w-auto"
              style={{
                background: "hsl(var(--color-primary))",
                color: "hsl(var(--color-bg))",
                height: "56px",
                padding: "0 32px",
                fontSize: "16px",
              }}
            >
              Simular meu casamento
            </Link>
            <Link
              to="/explorar"
              className="inline-flex items-center justify-center rounded-full font-medium transition w-full sm:w-auto"
              style={{
                border: "1px solid hsl(48, 27%, 96% / 0.5)",
                color: "hsl(48, 27%, 98%)",
                background: "hsl(48, 27%, 96% / 0.1)",
                backdropFilter: "blur(6px)",
                height: "56px",
                padding: "0 28px",
                fontSize: "15px",
              }}
            >
              Explorar fornecedores
            </Link>
          </div>

          <div
            className="flex items-center gap-2 text-sm min-h-[24px]"
            style={{ color: "hsl(48, 30%, 96%)", textShadow: "0 1px 8px hsl(0 0% 0% / 0.5)" }}
          >
            <span className="flex items-center gap-0.5">
              {[0, 1, 2, 3, 4].map((i) => (
                <Star
                  key={i}
                  className="w-4 h-4"
                  style={{ color: "hsl(var(--color-primary))", fill: "hsl(var(--color-primary))" }}
                />
              ))}
            </span>
            {proof && <span>{proof}</span>}
          </div>
        </div>
      </div>

      {/* Dica de scroll */}
      <div className="absolute bottom-8 left-0 right-0 z-10 flex flex-col items-center gap-2 pointer-events-none">
        <span className="label-ui" style={{ color: "hsl(48, 27%, 97% / 0.85)" }}>
          role para descobrir
        </span>
        <div className="w-[1px] h-10" style={{ background: "hsl(48 27% 97% / 0.6)" }} />
      </div>
    </section>
  );
}
