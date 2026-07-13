import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const FALLBACK_HERO = "https://images.unsplash.com/photo-1519741497674-611481863552?w=1600&q=80&auto=format&fit=crop";

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
    <section
      className="relative"
      style={{ background: "hsl(var(--color-bg))" }}
    >
      <div className="container pt-24 pb-16 md:pt-32 md:pb-24 md:min-h-[calc(100svh-56px)] flex items-center">
        <div className="grid md:grid-cols-2 gap-10 md:gap-14 items-center w-full">
          {/* Texto */}
          <div className="max-w-xl">
            <p className="label-ui mb-5">
              Marketplace de casamentos · Belo Horizonte e região metropolitana
            </p>
            <h1
              className="font-serif mb-5"
              style={{
                fontSize: "clamp(2.5rem, 5.5vw, 4rem)",
                lineHeight: 1.05,
                fontWeight: 500,
                letterSpacing: "-0.025em",
                color: "hsl(var(--color-dark))",
              }}
            >
              Descubra quanto custa o seu casamento — e economize casando em datas com desconto.
            </h1>
            <p
              className="text-lg md:text-xl mb-8 max-w-xl"
              style={{ color: "hsl(var(--color-text-muted))", lineHeight: 1.55, fontWeight: 400 }}
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
                className="inline-flex items-center justify-center rounded-full font-medium transition hover:bg-black/[.03] w-full sm:w-auto"
                style={{
                  border: "1px solid hsl(var(--color-border))",
                  color: "hsl(var(--color-dark))",
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
              style={{ color: "hsl(var(--color-text-muted))" }}
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

          {/* Imagem */}
          <div className="relative">
            <img
              src={image}
              alt="Casal em ensaio luminoso de casamento"
              loading="eager"
              className="w-full object-cover rounded-3xl aspect-[4/3] md:aspect-[4/5] shadow-[0_20px_60px_-30px_hsl(30_10%_12%/0.35)]"
            />
          </div>
        </div>
      </div>
    </section>
  );
}