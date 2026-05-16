import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView } from "framer-motion";
import { DEFAULT_LANDING, HowCfg } from "@/lib/supplierLandingConfig";

const INTERVAL = 4000;

export default function HowItWorksSection({ cfg = DEFAULT_LANDING.how }: { cfg?: HowCfg }) {
  const STEPS = cfg.steps;
  const [active, setActive] = useState(0);
  const [tick, setTick] = useState(0);
  const headerRef = useRef(null);
  const headerInView = useInView(headerRef, { once: true, margin: "-15%" });

  useEffect(() => {
    if (!STEPS.length) return;
    const id = setInterval(() => setActive((a) => (a + 1) % STEPS.length), INTERVAL);
    return () => clearInterval(id);
  }, [tick, STEPS.length]);

  const handlePick = (i: number) => { setActive(i); setTick((t) => t + 1); };
  const step = STEPS[active] ?? STEPS[0];
  if (!step) return null;

  return (
    <section id="como-funciona" className="py-24 px-4 bg-secondary">
      <div className="max-w-5xl mx-auto">
        <motion.div
          ref={headerRef}
          initial={{ opacity: 0, y: 24 }}
          animate={headerInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          className="text-center mb-14"
        >
          <span className="text-xs uppercase tracking-wider text-muted-foreground">{cfg.eyebrow}</span>
          <h2 className="font-serif text-3xl md:text-4xl mt-3 mb-4">{cfg.title}</h2>
          <p className="text-base text-muted-foreground max-w-xl mx-auto">{cfg.subtitle}</p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-start">
          <div className="flex flex-col gap-3">
            {STEPS.map((s, i) => {
              const isActive = i === active;
              return (
                <button
                  key={i}
                  onClick={() => handlePick(i)}
                  className={`text-left rounded-2xl p-5 transition-all ${
                    isActive ? "bg-card border border-border shadow-md" : "bg-transparent border border-transparent hover:bg-card/40"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <span className={`mt-1.5 w-2.5 h-2.5 rounded-full flex-shrink-0 transition-colors ${isActive ? "bg-primary" : "bg-muted-foreground/30"}`} />
                    <div className="flex-1 min-w-0">
                      <div className={`text-[11px] uppercase tracking-wider mb-1 ${isActive ? "text-primary" : "text-muted-foreground/60"}`}>{s.label}</div>
                      <div className={`font-serif text-lg ${isActive ? "text-foreground" : "text-muted-foreground"}`}>{s.title}</div>
                      <AnimatePresence initial={false}>
                        {isActive && (
                          <motion.p
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="text-sm text-muted-foreground mt-2 overflow-hidden leading-relaxed"
                          >
                            {s.description}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="md:sticky md:top-24">
            <div className="relative rounded-3xl bg-background border border-border aspect-[4/3] overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={active}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                  className="absolute inset-0 flex flex-col items-center justify-center text-center p-8"
                >
                  <div className="text-7xl md:text-8xl mb-5">{step.emoji}</div>
                  <p className="font-serif text-xl text-foreground">{step.preview}</p>
                </motion.div>
              </AnimatePresence>
              <div className="absolute bottom-0 inset-x-0 h-1 bg-border/40">
                <motion.div
                  key={`${active}-${tick}`}
                  className="h-full bg-primary"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: INTERVAL / 1000, ease: "linear" }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
