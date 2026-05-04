import { forwardRef, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Check, Leaf, Sparkles, PartyPopper, Calendar as CalIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { computeSimulador } from "@/lib/simulador/match";

const CIDADES_MG = [
  "Belo Horizonte","Uberlândia","Contagem","Juiz de Fora","Betim","Montes Claros","Ribeirão das Neves","Uberaba","Governador Valadares","Ipatinga","Sete Lagoas","Divinópolis","Santa Luzia","Ibirité","Poços de Caldas","Patos de Minas","Pouso Alegre","Teófilo Otoni","Barbacena","Sabará","Varginha","Conselheiro Lafaiete","Vespasiano","Itabira","Araguari","Ubá","Passos","Coronel Fabriciano","Muriaé","Lavras"
];

const GUEST_OPTIONS = [
  { letter: "A", label: "Até 50 pessoas — íntimo e especial", value: 40 },
  { letter: "B", label: "51 a 100 — família e amigos próximos", value: 80 },
  { letter: "C", label: "101 a 200 — uma festa completa", value: 150 },
  { letter: "D", label: "Mais de 200 — grande e memorável", value: 250 },
];

const STYLES = [
  { id: "Simples e emocionante", icon: Leaf, name: "Intimista", desc: "Simples, acolhedor e muito especial" },
  { id: "Médio e elegante", icon: Sparkles, name: "Elegante", desc: "Equilibrado, bonito e bem organizado" },
  { id: "Grande e memorável", icon: PartyPopper, name: "Grandioso", desc: "Festa completa, inesquecível e marcante" },
];

const PRAZO_OPTIONS = [
  { letter: "A", label: "Em até 6 meses", value: 6 },
  { letter: "B", label: "Entre 6 e 12 meses", value: 12 },
  { letter: "C", label: "Entre 1 e 2 anos", value: 18 },
  { letter: "D", label: "Mais de 2 anos / ainda não sei", value: 36 },
];

const SimulatorCTA = forwardRef<HTMLElement>((_, ref) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(0); // 0 welcome, 1..5 questions, 6 done
  const [orcamento, setOrcamento] = useState(20000);
  const [convidados, setConvidados] = useState<number | null>(null);
  const [cidade, setCidade] = useState("");
  const [estilo, setEstilo] = useState<string | null>(null);
  const [dataMode, setDataMode] = useState<"exata" | "faixa" | null>(null);
  const [dataEvento, setDataEvento] = useState<string>(""); // YYYY-MM-DD
  const [prazoMeses, setPrazoMeses] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const fmtOrc = (n: number) =>
    n >= 1000 ? `R$ ${(n / 1000).toLocaleString("pt-BR")} mil` : `R$ ${n}`;

  const progressPct = [0, 16, 32, 48, 64, 82, 100][step];

  const goTo = (n: number) => setStep(n);

  const submit = async () => {
    setLoading(true);
    const payload: any = {
      orcamento_total: orcamento,
      num_convidados: convidados ?? 100,
      cidade,
      estilo: estilo ?? "Médio e elegante",
      data_evento: dataMode === "exata" && dataEvento ? dataEvento : null,
      prazo_meses: dataMode === "faixa" ? prazoMeses : null,
    };
    try {
      // Computa o resultado já no cliente, antes de salvar — assim guarda snapshot
      const resultado = await computeSimulador({
        orcamento_total: payload.orcamento_total,
        num_convidados: payload.num_convidados,
        cidade: payload.cidade,
        estilo: payload.estilo,
        data_evento: payload.data_evento,
      });
      payload.resultado = resultado;

      if (!user) {
        localStorage.setItem("pending_simulacao", JSON.stringify(payload));
        toast({ title: "Seu simulador foi salvo!", description: "Crie sua conta gratuita pra ver o resultado." });
        navigate("/cadastro?redirect=simulador");
        return;
      }
      // pega o couple do usuário (se for casal) para vincular a simulação
      const { data: c } = await supabase.from("couples").select("id").eq("user_id", user.id).maybeSingle();
      const { data, error } = await (supabase.from("home_simulacoes" as any) as any)
        .insert({ ...payload, user_id: user.id, couple_id: c?.id || null })
        .select("id")
        .maybeSingle();
      if (error) throw error;
      navigate(`/simulador/resultado?id=${data?.id}`);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Enter key advances
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter") return;
      if (step === 0) goTo(1);
      else if (step === 1) goTo(2);
      else if (step === 3 && cidade.trim().length > 1) goTo(4);
      else if (step === 6) submit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, cidade]);

  const stepVariants = {
    enter: { opacity: 0, y: 28 },
    center: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -28 },
  };

  return (
    <section
      ref={ref}
      className="relative min-h-screen flex items-center px-4 py-16 md:py-20"
      style={{
        background:
          "linear-gradient(180deg, hsl(30, 10%, 12%) 0%, hsl(30, 12%, 18%) 40%, hsl(36, 25%, 93%) 100%)",
      }}
    >
      <div className="max-w-2xl mx-auto w-full">
        <div
          className="relative overflow-hidden flex flex-col"
          style={{
            background: "hsl(var(--color-bg))",
            borderRadius: 20,
            minHeight: 540,
            boxShadow: "0 30px 80px -40px hsl(var(--color-dark) / 0.25)",
            border: "1px solid hsl(var(--color-border))",
          }}
        >
          {/* progress */}
          <div className="h-[3px] w-full" style={{ background: "hsl(var(--color-border))" }}>
            <div
              className="h-full transition-[width] duration-500"
              style={{ width: `${progressPct}%`, background: "hsl(var(--color-primary))" }}
            />
          </div>

          <div className="relative flex-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                className="absolute inset-0 flex flex-col justify-center px-7 md:px-14 py-12"
              >
                {step === 0 && (
                  <div className="text-center flex flex-col items-center">
                    <p className="font-serif text-xl mb-7" style={{ color: "hsl(var(--color-primary))", letterSpacing: ".5px" }}>
                      casamenteiro
                    </p>
                    <h2 className="font-serif text-3xl md:text-4xl mb-4" style={{ color: "hsl(var(--color-dark))", lineHeight: 1.2 }}>
                      Vamos planejar o casamento dos seus sonhos?
                    </h2>
                    <p className="text-sm md:text-base mb-10 max-w-md" style={{ color: "hsl(var(--color-text-muted))", lineHeight: 1.7 }}>
                      4 perguntas rápidas. A gente monta um plano completo com fornecedores dentro do seu orçamento.
                    </p>
                    <button
                      onClick={() => goTo(1)}
                      className="rounded-full px-9 py-3.5 font-semibold text-sm transition hover:opacity-90"
                      style={{ background: "hsl(var(--color-dark))", color: "hsl(var(--color-bg))" }}
                    >
                      Começar agora →
                    </button>
                  </div>
                )}

                {step === 1 && (
                  <div>
                    <StepHeader num="Pergunta 1 de 5" title="Qual é o orçamento do casamento?" hint="Inclua tudo — buffet, espaço, decoração, foto e mais." />
                    <div className="font-serif mb-5" style={{ fontSize: 38, color: "hsl(var(--color-dark))" }}>
                      {fmtOrc(orcamento)} <span className="font-sans font-light text-base ml-1" style={{ color: "hsl(var(--color-text-muted))" }}>estimado</span>
                    </div>
                    <input
                      type="range"
                      min={5000}
                      max={300000}
                      step={1000}
                      value={orcamento}
                      onChange={(e) => setOrcamento(+e.target.value)}
                      className="w-full sim-range"
                    />
                    <div className="flex justify-between mt-3 text-[11px]" style={{ color: "hsl(var(--color-text-muted))" }}>
                      <span>R$ 5 mil</span><span>R$ 300 mil</span>
                    </div>
                    <Nav onBack={() => goTo(0)} onNext={() => goTo(2)} hint="pressione Enter ↵" />
                  </div>
                )}

                {step === 2 && (
                  <div>
                    <StepHeader num="Pergunta 2 de 5" title="Quantos convidados vocês esperam?" hint="Uma estimativa já ajuda bastante." />
                    <div className="flex flex-col gap-2.5">
                      {GUEST_OPTIONS.map((g) => {
                        const sel = convidados === g.value;
                        return (
                          <button
                            key={g.letter}
                            onClick={() => { setConvidados(g.value); setTimeout(() => goTo(3), 280); }}
                            className="flex items-center gap-3 text-left px-5 py-3.5 transition rounded-xl"
                            style={{
                              background: sel ? "hsl(var(--color-primary) / 0.10)" : "hsl(var(--color-bg))",
                              border: `1.5px solid ${sel ? "hsl(var(--color-primary))" : "hsl(var(--color-border))"}`,
                              color: sel ? "hsl(var(--color-dark))" : "hsl(var(--color-text-body))",
                              fontWeight: sel ? 600 : 400,
                              fontSize: 15,
                            }}
                          >
                            <span
                              className="w-7 h-7 rounded-md flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                              style={{
                                background: sel ? "hsl(var(--color-primary))" : "hsl(var(--color-secondary))",
                                color: sel ? "hsl(var(--color-bg))" : "hsl(var(--color-text-muted))",
                              }}
                            >
                              {g.letter}
                            </span>
                            {g.label}
                          </button>
                        );
                      })}
                    </div>
                    <Nav onBack={() => goTo(1)} onNext={() => convidados !== null && goTo(3)} disabled={convidados === null} />
                  </div>
                )}

                {step === 3 && (
                  <div>
                    <StepHeader num="Pergunta 3 de 5" title="Em qual cidade será o casamento?" hint="Vamos encontrar os melhores fornecedores da sua região." />
                    <input
                      autoFocus
                      list="cidades-mg-tf"
                      value={cidade}
                      onChange={(e) => setCidade(e.target.value)}
                      placeholder="Ex: Belo Horizonte"
                      className="w-full bg-transparent border-0 outline-none font-serif"
                      style={{
                        fontSize: 28,
                        color: "hsl(var(--color-dark))",
                        borderBottom: "2px solid hsl(var(--color-border))",
                        padding: "8px 0 12px",
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderBottomColor = "hsl(var(--color-primary))")}
                      onBlur={(e) => (e.currentTarget.style.borderBottomColor = "hsl(var(--color-border))")}
                    />
                    <datalist id="cidades-mg-tf">{CIDADES_MG.map(c => <option key={c} value={c} />)}</datalist>
                    <Nav onBack={() => goTo(2)} onNext={() => goTo(4)} disabled={cidade.trim().length < 2} hint="pressione Enter ↵" />
                  </div>
                )}

                {step === 4 && (
                  <div>
                    <StepHeader num="Pergunta 4 de 5" title="Qual é o estilo do casamento?" hint="Isso ajuda a selecionar fornecedores com a sua cara." />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                      {STYLES.map((s) => {
                        const Icon = s.icon;
                        const sel = estilo === s.id;
                        return (
                          <button
                            key={s.id}
                            onClick={() => { setEstilo(s.id); setTimeout(() => goTo(5), 320); }}
                            className="text-center px-4 py-5 transition"
                            style={{
                              background: sel ? "hsl(var(--color-primary) / 0.10)" : "hsl(var(--color-bg))",
                              border: `1.5px solid ${sel ? "hsl(var(--color-primary))" : "hsl(var(--color-border))"}`,
                              borderRadius: 14,
                            }}
                          >
                            <Icon className="mx-auto mb-2" style={{ color: "hsl(var(--color-primary))" }} size={22} />
                            <div className="text-[15px] mb-1" style={{ color: sel ? "hsl(var(--color-primary))" : "hsl(var(--color-dark))", fontWeight: sel ? 600 : 500 }}>
                              {s.name}
                            </div>
                            <div className="text-[11px] font-light leading-relaxed" style={{ color: "hsl(var(--color-text-muted))" }}>
                              {s.desc}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <Nav onBack={() => goTo(3)} onNext={() => goTo(5)} disabled={!estilo} />
                  </div>
                )}

                {step === 5 && (
                  <div>
                    <StepHeader num="Pergunta 5 de 5" title="Quando vocês querem casar?" hint="Se já tem data, conseguimos ver disponibilidade real e descontos em dias ociosos." />
                    {!dataMode && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        <button
                          onClick={() => setDataMode("exata")}
                          className="text-left px-5 py-4 rounded-xl transition hover:opacity-90"
                          style={{ background: "hsl(var(--color-bg))", border: "1.5px solid hsl(var(--color-border))" }}
                        >
                          <CalIcon className="mb-2" style={{ color: "hsl(var(--color-primary))" }} size={22} />
                          <div className="text-[15px] font-semibold" style={{ color: "hsl(var(--color-dark))" }}>Já temos a data</div>
                          <div className="text-[12px]" style={{ color: "hsl(var(--color-text-muted))" }}>
                            Vamos checar agenda dos fornecedores e descontos do dia.
                          </div>
                        </button>
                        <button
                          onClick={() => setDataMode("faixa")}
                          className="text-left px-5 py-4 rounded-xl transition hover:opacity-90"
                          style={{ background: "hsl(var(--color-bg))", border: "1.5px solid hsl(var(--color-border))" }}
                        >
                          <Sparkles className="mb-2" style={{ color: "hsl(var(--color-primary))" }} size={22} />
                          <div className="text-[15px] font-semibold" style={{ color: "hsl(var(--color-dark))" }}>Ainda não sei</div>
                          <div className="text-[12px]" style={{ color: "hsl(var(--color-text-muted))" }}>
                            Escolha um prazo aproximado.
                          </div>
                        </button>
                      </div>
                    )}
                    {dataMode === "exata" && (
                      <div>
                        <input
                          type="date"
                          value={dataEvento}
                          min={new Date().toISOString().slice(0, 10)}
                          onChange={(e) => setDataEvento(e.target.value)}
                          className="w-full bg-transparent border-0 outline-none font-serif"
                          style={{
                            fontSize: 26,
                            color: "hsl(var(--color-dark))",
                            borderBottom: "2px solid hsl(var(--color-primary))",
                            padding: "8px 0 12px",
                          }}
                        />
                        <button
                          onClick={() => setDataMode(null)}
                          className="text-[12px] mt-3"
                          style={{ color: "hsl(var(--color-text-muted))", background: "transparent", border: "none", cursor: "pointer" }}
                        >
                          ← trocar opção
                        </button>
                      </div>
                    )}
                    {dataMode === "faixa" && (
                      <div className="flex flex-col gap-2.5">
                        {PRAZO_OPTIONS.map((p) => {
                          const sel = prazoMeses === p.value;
                          return (
                            <button
                              key={p.letter}
                              onClick={() => { setPrazoMeses(p.value); setTimeout(() => goTo(6), 280); }}
                              className="flex items-center gap-3 text-left px-5 py-3.5 rounded-xl"
                              style={{
                                background: sel ? "hsl(var(--color-primary) / 0.10)" : "hsl(var(--color-bg))",
                                border: `1.5px solid ${sel ? "hsl(var(--color-primary))" : "hsl(var(--color-border))"}`,
                                fontSize: 15,
                              }}
                            >
                              <span className="w-7 h-7 rounded-md flex items-center justify-center text-[11px] font-bold"
                                style={{ background: sel ? "hsl(var(--color-primary))" : "hsl(var(--color-secondary))", color: sel ? "hsl(var(--color-bg))" : "hsl(var(--color-text-muted))" }}>
                                {p.letter}
                              </span>
                              {p.label}
                            </button>
                          );
                        })}
                        <button
                          onClick={() => { setDataMode(null); setPrazoMeses(null); }}
                          className="text-[12px] mt-1 self-start"
                          style={{ color: "hsl(var(--color-text-muted))", background: "transparent", border: "none", cursor: "pointer" }}
                        >
                          ← trocar opção
                        </button>
                      </div>
                    )}
                    <Nav
                      onBack={() => goTo(4)}
                      onNext={() => goTo(6)}
                      disabled={!dataMode || (dataMode === "exata" && !dataEvento) || (dataMode === "faixa" && prazoMeses === null)}
                      label="Ver meu plano →"
                    />
                  </div>
                )}

                {step === 6 && (
                  <div className="text-center flex flex-col items-center">
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center mb-6"
                      style={{ background: "hsl(var(--color-primary) / 0.12)" }}
                    >
                      <Check style={{ color: "hsl(var(--color-primary))" }} size={28} />
                    </div>
                    <h2 className="font-serif text-2xl md:text-3xl mb-3" style={{ color: "hsl(var(--color-dark))" }}>
                      Plano criado com sucesso!
                    </h2>
                    <p className="text-sm md:text-base mb-8 max-w-md" style={{ color: "hsl(var(--color-text-muted))", lineHeight: 1.7 }}>
                      Encontramos fornecedores dentro do seu orçamento em <strong>{cidade || "sua cidade"}</strong>. {user ? "Veja o resultado agora." : "Crie sua conta gratuita para ver o resultado completo."}
                    </p>
                    <button
                      onClick={submit}
                      disabled={loading}
                      className="rounded-full px-8 py-3.5 font-semibold text-sm transition hover:opacity-90 disabled:opacity-50"
                      style={{ background: "hsl(var(--color-primary))", color: "hsl(var(--color-bg))" }}
                    >
                      {loading ? "Salvando..." : "Ver meu plano de casamento →"}
                    </button>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      <style>{`
        .sim-range { -webkit-appearance:none; appearance:none; height:4px; background:hsl(var(--color-border)); border-radius:2px; outline:none; cursor:pointer; }
        .sim-range::-webkit-slider-thumb { -webkit-appearance:none; appearance:none; width:22px; height:22px; border-radius:50%; background:hsl(var(--color-primary)); cursor:pointer; border:3px solid hsl(var(--color-bg)); box-shadow:0 0 0 2px hsl(var(--color-primary)); }
        .sim-range::-moz-range-thumb { width:22px; height:22px; border-radius:50%; background:hsl(var(--color-primary)); cursor:pointer; border:3px solid hsl(var(--color-bg)); box-shadow:0 0 0 2px hsl(var(--color-primary)); }
      `}</style>
    </section>
  );
});

SimulatorCTA.displayName = "SimulatorCTA";
export default SimulatorCTA;

function StepHeader({ num, title, hint }: { num: string; title: string; hint?: string }) {
  return (
    <>
      <p className="label-ui mb-4" style={{ color: "hsl(var(--color-primary))" }}>{num}</p>
      <h3 className="font-serif text-2xl md:text-3xl mb-2" style={{ color: "hsl(var(--color-dark))", lineHeight: 1.2 }}>{title}</h3>
      {hint && <p className="text-sm font-light mb-7" style={{ color: "hsl(var(--color-text-muted))", lineHeight: 1.6 }}>{hint}</p>}
    </>
  );
}

function Nav({ onBack, onNext, disabled, hint, label = "Próxima →" }: { onBack: () => void; onNext: () => void; disabled?: boolean; hint?: string; label?: string }) {
  return (
    <div className="flex items-center justify-between mt-8">
      <button
        onClick={onBack}
        className="text-[13px] py-2 transition"
        style={{ color: "hsl(var(--color-text-muted))", background: "transparent", border: "none", cursor: "pointer" }}
      >
        <ArrowLeft className="inline w-3.5 h-3.5 mr-1" /> Voltar
      </button>
      <div className="flex items-center gap-4">
        {hint && <span className="text-[11px] font-light" style={{ color: "hsl(var(--color-text-muted))" }}>{hint}</span>}
        <button
          onClick={onNext}
          disabled={disabled}
          className="rounded-full px-6 py-3 text-[14px] font-semibold transition hover:opacity-90 disabled:opacity-40 disabled:cursor-default flex items-center gap-2"
          style={{ background: "hsl(var(--color-primary))", color: "hsl(var(--color-bg))" }}
        >
          {label}
        </button>
      </div>
    </div>
  );
}
