import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  city: string;
  text: string;
  rating: number;
  avatarUrl?: string;
  emoji?: string;
}

const DEFAULT: Testimonial[] = [
  {
    id: "1",
    name: "Camila Rocha",
    role: "Cerimonialista",
    city: "Belo Horizonte",
    rating: 5,
    emoji: "👰",
    text: "Em 2 semanas já tinha fechado 3 contratos para datas que estavam paradas há meses. O perfil é simples de preencher e os leads chegam qualificados mesmo.",
  },
  {
    id: "2",
    name: "Rafael Mendes",
    role: "Fotógrafo",
    city: "São Paulo",
    rating: 5,
    emoji: "📸",
    text: "Já testei outras plataformas e sempre perdia tempo com casais sem orçamento definido. Aqui os pedidos chegam com data, local e valor em mente. Outra realidade.",
  },
  {
    id: "3",
    name: "Juliana Lima",
    role: "Buffet & Gastronomia",
    city: "Curitiba",
    rating: 5,
    emoji: "🍽️",
    text: "Cadastrei meu buffet numa segunda, na quarta já tinha uma visita agendada. O casal já sabia meu preço e minha proposta. Fechamos na hora.",
  },
  {
    id: "4",
    name: "André Costa",
    role: "DJ",
    city: "Rio de Janeiro",
    rating: 5,
    emoji: "🎧",
    text: "Sou DJ há 12 anos e nunca tinha tido um canal assim. Casal com data marcada, sabe o que quer. Minha agenda de fim de semana lotou em 30 dias.",
  },
];

const INTERVAL = 5000;

export default function TestimonialsSection({ testimonials }: { testimonials?: Testimonial[] }) {
  const items = testimonials && testimonials.length ? testimonials : DEFAULT;
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const headerRef = useRef(null);
  const headerInView = useInView(headerRef, { once: true, margin: "-15%" });

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setActive((a) => (a + 1) % items.length), INTERVAL);
    return () => clearInterval(id);
  }, [paused, items.length]);

  const prev = () => setActive((a) => (a - 1 + items.length) % items.length);
  const next = () => setActive((a) => (a + 1) % items.length);

  return (
    <section className="py-24 px-4 bg-background">
      <div className="max-w-4xl mx-auto">
        <motion.div
          ref={headerRef}
          initial={{ opacity: 0, y: 24 }}
          animate={headerInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          className="text-center mb-12"
        >
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Depoimentos</span>
          <h2 className="font-serif text-3xl md:text-4xl mt-3 mb-4">
            Wall of <em className="italic font-normal text-primary">love</em> 💛
          </h2>
          <p className="text-base text-muted-foreground mb-3">Fornecedores reais, resultados reais.</p>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <span className="flex" aria-hidden>
              {[0, 1, 2, 3, 4].map((i) => (
                <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              ))}
            </span>
            <span>4.9 de avaliação média na plataforma</span>
          </div>
        </motion.div>

        {/* Carousel */}
        <div
          className="overflow-hidden"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div
            className="flex transition-transform duration-500"
            style={{
              transform: `translateX(-${active * 100}%)`,
              transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            {items.map((t) => (
              <div key={t.id} className="w-full flex-shrink-0 px-2">
                <article className="relative bg-card border border-border rounded-3xl p-8 md:p-10 shadow-sm">
                  <span
                    aria-hidden
                    className="absolute top-3 left-5 font-serif text-7xl md:text-8xl text-primary/15 leading-none select-none"
                  >
                    “
                  </span>
                  <p className="relative italic text-base md:text-lg text-foreground leading-relaxed mb-8">
                    {t.text}
                  </p>
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-2xl overflow-hidden">
                        {t.avatarUrl ? (
                          <img src={t.avatarUrl} alt={t.name} className="w-full h-full object-cover" />
                        ) : (
                          <span aria-hidden>{t.emoji ?? "🙂"}</span>
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-foreground">{t.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {t.role} · {t.city}
                        </div>
                      </div>
                    </div>
                    <div className="flex" aria-label={`${t.rating} de 5`}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < t.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </article>
              </div>
            ))}
          </div>
        </div>

        {/* Avatar nav */}
        <div className="flex items-center justify-center mt-8 pl-2.5">
          {items.map((t, i) => (
            <button
              key={t.id}
              onClick={() => setActive(i)}
              aria-label={`Ver depoimento de ${t.name}`}
              className={`-ml-2.5 w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-xl border-2 transition-all overflow-hidden ${
                i === active
                  ? "border-primary scale-110 z-10 shadow-md"
                  : "border-background hover:border-primary/40"
              }`}
            >
              {t.avatarUrl ? (
                <img src={t.avatarUrl} alt={t.name} className="w-full h-full object-cover" />
              ) : (
                <span aria-hidden>{t.emoji ?? "🙂"}</span>
              )}
            </button>
          ))}
        </div>

        {/* Arrows */}
        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            onClick={prev}
            aria-label="Depoimento anterior"
            className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:border-primary hover:bg-primary/5 transition"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={next}
            aria-label="Próximo depoimento"
            className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:border-primary hover:bg-primary/5 transition"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}