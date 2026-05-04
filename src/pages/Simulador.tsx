import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { calcularSimulacao, type Estilo } from "@/lib/simulador";
import { Loader2 } from "lucide-react";

const GUEST_OPTIONS = [
  { letter: "A", label: "Até 50 pessoas — íntimo e especial", value: 50 },
  { letter: "B", label: "51 a 100 — família e amigos próximos", value: 100 },
  { letter: "C", label: "101 a 200 — uma festa completa", value: 200 },
  { letter: "D", label: "Mais de 200 — grande e memorável", value: 300 },
];

const ESTILOS: { id: Estilo; emoji: string; nome: string; desc: string }[] = [
  { id: "intimista", emoji: "🌿", nome: "Intimista", desc: "Simples, acolhedor e muito especial" },
  { id: "elegante", emoji: "✨", nome: "Elegante", desc: "Equilibrado, bonito e bem organizado" },
  { id: "grandioso", emoji: "🎊", nome: "Grandioso", desc: "Festa completa, inesquecível e marcante" },
];

export default function Simulador() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState(0); // 0 boas-vindas, 1..4 perguntas, 5 loading
  const [orcamento, setOrcamento] = useState(20000);
  const [convidados, setConvidados] = useState<number | null>(null);
  const [cidade, setCidade] = useState("");
  const [estilo, setEstilo] = useState<Estilo | null>(null);

  useEffect(() => {
    document.title = "Simulador — Casamenteiro";
  }, []);

  const total = 4;
  const progressPct = step === 0 ? 0 : Math.min(100, (step / total) * 100);

  const fmtOrc = (n: number) =>
    n >= 1000 ? `R$ ${(n / 1000).toLocaleString("pt-BR")} mil` : `R$ ${n}`;

  const finalizar = async () => {
    if (!convidados || !cidade.trim() || !estilo) return;
    setStep(5);
    try {
      const r = await calcularSimulacao(orcamento, convidados, cidade.trim(), estilo, false);
      if (!user) {
        if (r.simulacaoId) {
          sessionStorage.setItem(
            "pendingSimulacao",
            JSON.stringify({ id: r.simulacaoId }),
          );
        }
        toast({
          title: "Seu plano foi salvo!",
          description: "Crie sua conta gratuita para acessá-lo.",
        });
        navigate(
          r.simulacaoId
            ? `/cadastro?redirect=${encodeURIComponent(`/simulador/resultado?id=${r.simulacaoId}`)}`
            : "/cadastro",
        );
        return;
      }
      navigate(`/simulador/resultado?id=${r.simulacaoId}`);
    } catch (e: any) {
      toast({ title: "Erro ao calcular", description: e.message, variant: "destructive" });
      setStep(4);
    }
  };

  // Enter key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter") return;
      if (step === 0) setStep(1);
      else if (step === 1) setStep(2);
      else if (step === 3 && cidade.trim().length >= 2) setStep(4);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, cidade]);

  const variants = {
    enter: { opacity: 0, y: 30 },
    center: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -30 },
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "hsl(var(--color-bg))" }}>
      {/* Progress bar */}
      <div className="h-[3px] w-full" style={{ background: "hsl(var(--color-border))" }}>
        <div
          className="h-full transition-[width] duration-500"
          style={{ width: `${progressPct}%`, background: "hsl(var(--color-primary))" }}
        />
      </div>

      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            className="absolute inset-0 flex flex-col justify-center items-center px-6 md:px-10"
          >
            <div className="w-full max-w-2xl mx-auto">
              {step === 0 && (
                <div className="text-center">
                  <p
                    className="text-xl md:text-2xl mb-7 font-semibold tracking-wide"
                    style={{ color: "hsl(var(--color-primary))" }}
                  >
                    casamenteiro
                  </p>
                  <h1
                    className="text-3xl md:text-5xl mb-5"
                    style={{ color: "hsl(var(--color-dark))", lineHeight: 1.15, fontWeight: 700, letterSpacing: "-0.02em" }}
                  >
                    Vamos planejar o casamento dos seus sonhos?
                  </h1>
                  <p className="text-base md:text-lg mb-10 max-w-lg mx-auto" style={{ color: "hsl(var(--color-text-muted))" }}>
                    4 perguntas rápidas. A gente monta um plano completo com fornecedores dentro do seu orçamento.
                  </p>
                  <button
                    onClick={() => setStep(1)}
                    className="rounded-full px-10 py-4 font-semibold text-sm md:text-base transition hover:opacity-90"
                    style={{ background: "hsl(var(--color-dark))", color: "hsl(var(--color-bg))" }}
                  >
                    Começar agora →
                  </button>
                </div>
              )}

              {step === 1 && (
                <div>
                  <StepHeader num="Pergunta 1 de 4" title="Qual é o orçamento do casamento?" hint="Inclua tudo — buffet, espaço, decoração, foto e mais." />
                  <div className="font-bold mb-6" style={{ fontSize: 38, color: "hsl(var(--color-primary))" }}>
                    {fmtOrc(orcamento)}
                  </div>
                  <input
                    type="range"
                    min={5000}
                    max={150000}
                    step={1000}
                    value={orcamento}
                    onChange={(e) => setOrcamento(+e.target.value)}
                    className="w-full sim-range"
                  />
                  <div className="flex justify-between mt-3 text-xs" style={{ color: "hsl(var(--color-text-muted))" }}>
                    <span>R$ 5 mil</span><span>R$ 150 mil</span>
                  </div>
                  <Nav onBack={() => setStep(0)} onNext={() => setStep(2)} hint="pressione Enter ↵" />
                </div>
              )}

              {step === 2 && (
                <div>
                  <StepHeader num="Pergunta 2 de 4" title="Quantos convidados vocês esperam?" hint="Uma estimativa já ajuda bastante." />
                  <div className="flex flex-col gap-3">
                    {GUEST_OPTIONS.map((g) => {
                      const sel = convidados === g.value;
                      return (
                        <button
                          key={g.letter}
                          onClick={() => { setConvidados(g.value); setTimeout(() => setStep(3), 300); }}
                          className="flex items-center gap-3 text-left px-5 py-4 rounded-xl transition"
                          style={{
                            background: sel ? "hsl(var(--color-primary) / 0.10)" : "hsl(var(--color-bg))",
                            border: `1.5px solid ${sel ? "hsl(var(--color-primary))" : "hsl(var(--color-border))"}`,
                            color: "hsl(var(--color-text-body))",
                          }}
                        >
                          <span
                            className="w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold flex-shrink-0"
                            style={{
                              background: sel ? "hsl(var(--color-primary))" : "hsl(var(--color-secondary))",
                              color: sel ? "hsl(var(--color-bg))" : "hsl(var(--color-text-muted))",
                            }}
                          >
                            {g.letter}
                          </span>
                          <span className="text-sm md:text-base">{g.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  <Nav onBack={() => setStep(1)} onNext={() => convidados && setStep(3)} disabled={!convidados} />
                </div>
              )}

              {step === 3 && (
                <div>
                  <StepHeader num="Pergunta 3 de 4" title="Em qual cidade será o casamento?" hint="Vamos encontrar os melhores fornecedores da sua região." />
                  <input
                    autoFocus
                    value={cidade}
                    onChange={(e) => setCidade(e.target.value)}
                    placeholder="Ex: Belo Horizonte"
                    className="w-full bg-transparent border-0 outline-none"
                    style={{
                      fontSize: 28,
                      fontWeight: 600,
                      color: "hsl(var(--color-dark))",
                      borderBottom: "2px solid hsl(var(--color-border))",
                      padding: "8px 0 12px",
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderBottomColor = "hsl(var(--color-primary))")}
                    onBlur={(e) => (e.currentTarget.style.borderBottomColor = "hsl(var(--color-border))")}
                  />
                  <Nav onBack={() => setStep(2)} onNext={() => setStep(4)} disabled={cidade.trim().length < 2} hint="pressione Enter ↵" />
                </div>
              )}

              {step === 4 && (
                <div>
                  <StepHeader num="Pergunta 4 de 4" title="Qual é o estilo do casamento?" hint="Isso ajuda a selecionar fornecedores com a sua cara." />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {ESTILOS.map((s) => {
                      const sel = estilo === s.id;
                      return (
                        <button
                          key={s.id}
                          onClick={() => { setEstilo(s.id); setTimeout(() => finalizar(), 320); }}
                          className="text-center px-4 py-6 rounded-xl transition"
                          style={{
                            background: sel ? "hsl(var(--color-primary) / 0.10)" : "hsl(var(--color-bg))",
                            border: `1.5px solid ${sel ? "hsl(var(--color-primary))" : "hsl(var(--color-border))"}`,
                          }}
                        >
                          <div className="text-3xl mb-2">{s.emoji}</div>
                          <div
                            className="text-base mb-1"
                            style={{ color: sel ? "hsl(var(--color-primary))" : "hsl(var(--color-dark))", fontWeight: 600 }}
                          >
                            {s.nome}
                          </div>
                          <div className="text-xs leading-relaxed" style={{ color: "hsl(var(--color-text-muted))" }}>
                            {s.desc}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <Nav
                    onBack={() => setStep(3)}
                    onNext={() => estilo && finalizar()}
                    disabled={!estilo}
                    nextLabel="Ver meu plano →"
                  />
                </div>
              )}

              {step === 5 && (
                <div className="text-center flex flex-col items-center">
                  <Loader2 className="w-10 h-10 mb-4 animate-spin" style={{ color: "hsl(var(--color-primary))" }} />
                  <p className="text-lg" style={{ color: "hsl(var(--color-dark))", fontWeight: 600 }}>
                    Buscando fornecedores na sua cidade...
                  </p>
                  <p className="text-sm mt-2" style={{ color: "hsl(var(--color-text-muted))" }}>
                    Isso leva alguns segundos.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <style>{`
        .sim-range { -webkit-appearance: none; appearance: none; height: 4px; background: hsl(var(--color-border)); border-radius: 999px; outline: none; }
        .sim-range::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 22px; height: 22px; border-radius: 50%; background: hsl(var(--color-primary)); cursor: pointer; border: 3px solid hsl(var(--color-bg)); box-shadow: 0 2px 6px hsl(var(--color-dark) / 0.2); }
        .sim-range::-moz-range-thumb { width: 22px; height: 22px; border-radius: 50%; background: hsl(var(--color-primary)); cursor: pointer; border: 3px solid hsl(var(--color-bg)); box-shadow: 0 2px 6px hsl(var(--color-dark) / 0.2); }
      `}</style>
    </div>
  );
}

function StepHeader({ num, title, hint }: { num: string; title: string; hint?: string }) {
  return (
    <div className="mb-7">
      <p className="text-[11px] uppercase tracking-wider mb-3 font-semibold" style={{ color: "hsl(var(--color-text-muted))" }}>
        {num}
      </p>
      <h2
        className="text-2xl md:text-4xl mb-3"
        style={{ color: "hsl(var(--color-dark))", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.2 }}
      >
        {title}
      </h2>
      {hint && <p className="text-sm md:text-base" style={{ color: "hsl(var(--color-text-muted))" }}>{hint}</p>}
    </div>
  );
}

function Nav({
  onBack, onNext, disabled, hint, nextLabel,
}: { onBack: () => void; onNext: () => void; disabled?: boolean; hint?: string; nextLabel?: string }) {
  return (
    <div className="flex items-center justify-between mt-10 gap-4">
      <button
        onClick={onBack}
        className="text-sm transition hover:opacity-70 underline-offset-2 hover:underline"
        style={{ color: "hsl(var(--color-text-muted))" }}
      >
        ← Voltar
      </button>
      <div className="flex items-center gap-3">
        {hint && <span className="text-xs hidden md:inline" style={{ color: "hsl(var(--color-text-muted))" }}>{hint}</span>}
        <button
          onClick={onNext}
          disabled={disabled}
          className="rounded-full px-7 py-3 font-semibold text-sm transition disabled:opacity-40"
          style={{ background: "hsl(var(--color-primary))", color: "hsl(var(--color-bg))" }}
        >
          {nextLabel || "Próxima →"}
        </button>
      </div>
    </div>
  );
}