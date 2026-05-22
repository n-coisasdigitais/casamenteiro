import { useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { z } from "zod";
import { CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_LANDING, CtaCfg } from "@/lib/supplierLandingConfig";

const emailSchema = z
  .string()
  .trim()
  .min(1, "Informe seu e-mail.")
  .max(255, "E-mail muito longo.")
  .email("E-mail inválido.");

export default function VendorCTASection({ cfg = DEFAULT_LANDING.cta }: { cfg?: CtaCfg }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string>("");
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-15%" });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setStatus("error");
      setMessage(parsed.error.issues[0]?.message || "E-mail inválido.");
      return;
    }
    setStatus("loading");
    setMessage("");
    const { error } = await (supabase.from("fornecedor_landing_emails" as any) as any).insert({
      email: parsed.data.toLowerCase(),
      origem: "cta_fornecedor",
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 500) : null,
    });
    if (error) {
      setStatus("error");
      setMessage("Não conseguimos registrar agora. Tente novamente em instantes.");
      return;
    }
    setStatus("success");
    setMessage("Recebemos seu e-mail! Em breve nosso time entra em contato.");
    setEmail("");
  };

  return (
    <section className="py-24 px-4 bg-[hsl(var(--color-dark))] text-white">
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 24 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        className="max-w-2xl mx-auto text-center"
      >
        <span className="text-xs uppercase tracking-wider text-white/50">{cfg.eyebrow}</span>
        <h2 className="font-serif text-3xl md:text-5xl mt-3 mb-4 text-white">{cfg.title}</h2>
        <p className="text-base text-white/65 mb-10">{cfg.subtitle}</p>

        {status === "success" ? (
          <div
            role="status"
            aria-live="polite"
            className="max-w-xl mx-auto flex flex-col items-center gap-3 bg-white/5 border border-white/15 rounded-2xl px-6 py-8"
          >
            <CheckCircle2 className="h-10 w-10 text-primary" />
            <p className="text-base text-white">{message}</p>
          </div>
        ) : (
          <>
            <form onSubmit={submit} noValidate className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (status === "error") setStatus("idle");
                }}
                aria-invalid={status === "error"}
                aria-describedby="cta-email-feedback"
                placeholder="seu@email.com"
                disabled={status === "loading"}
                className={`flex-1 rounded-full px-6 py-3.5 text-sm bg-white/10 text-white placeholder:text-white/35 border focus:outline-none transition disabled:opacity-60 ${
                  status === "error" ? "border-destructive focus:border-destructive" : "border-white/15 focus:border-primary"
                }`}
              />
              <button
                type="submit"
                disabled={status === "loading"}
                className="inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 hover:-translate-y-0.5 transition shadow-xl shadow-primary/35 disabled:opacity-60 disabled:translate-y-0"
              >
                {status === "loading" && <Loader2 className="h-4 w-4 animate-spin" />}
                {cfg.button_label}
              </button>
            </form>
            <p
              id="cta-email-feedback"
              aria-live="polite"
              className={`mt-3 text-sm min-h-[1.25rem] ${status === "error" ? "text-destructive" : "text-white/65"}`}
            >
              {message}
            </p>
          </>
        )}

        <p className="mt-6 text-xs text-white/35">{cfg.footnote}</p>
      </motion.div>
    </section>
  );
}
