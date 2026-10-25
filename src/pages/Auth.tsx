import { traduzirErro } from "@/lib/errorMessages";
import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { destinoProfissional } from "@/lib/vagaPendente";
import { supabase } from "@/integrations/supabase/client";
import { Briefcase, Check, Eye, EyeOff, Heart, MailCheck, Store } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { traduzirErroAuth } from "@/lib/authErrors";
import { getStoredReferral } from "@/lib/referral";
import SEO from "@/components/SEO";
import { analytics } from "@/lib/analytics";
import { useFeatureFlag } from "@/contexts/FeatureFlagsContext";
import heroCasal from "@/assets/hero-wedding.jpg";
import "@/components/auth/auth-v2.css";

type Tipo = "couple" | "supplier" | "profissional";

/** Textos por perfil e modo (login/cadastro). */
const TEXTOS: Record<Tipo, { login: [string, string]; signup: [string, string]; nome: string; cta: string; faixa: string }> = {
  couple: {
    login: ["Que bom ter você de volta", "Entre para ver seus orçamentos e a sua lista."],
    signup: ["Vamos planejar juntos", "Crie a conta do casal. Leva menos de um minuto."],
    nome: "Seu nome",
    cta: "Criar conta do casal",
    faixa: "Casal: orçamentos, convidados e cronograma juntos.",
  },
  supplier: {
    login: ["Bom te ver por aqui", "Entre para responder pedidos e cuidar da agenda."],
    signup: ["Cadastre o seu negócio", "Grátis para começar. Aprovação em até 24 horas."],
    nome: "Seu nome (responsável)",
    cta: "Criar conta de fornecedor",
    faixa: "Fornecedor: pedidos com data, convidados e contato do casal.",
  },
  profissional: {
    login: ["Pronto para o próximo evento?", "Entre para ver convites e vagas da sua região."],
    signup: ["Monte seu perfil profissional", "Grátis para você. Receba convites de buffets e espaços."],
    nome: "Seu nome",
    cta: "Criar perfil profissional",
    faixa: "Profissional: convites e vagas de eventos perto de você.",
  },
};

/** Sugere correção para domínios de e-mail digitados errado (gmial.com → gmail.com). */
const DOMINIOS = ["gmail.com", "hotmail.com", "outlook.com", "yahoo.com.br", "yahoo.com", "icloud.com", "live.com", "uol.com.br", "bol.com.br"];
function distancia(a: string, b: string) {
  const m = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = m[0];
    m[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const t = m[j];
      m[j] = Math.min(m[j] + 1, m[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = t;
    }
  }
  return m[b.length];
}
function sugerirEmail(v: string): string | null {
  const [user, dom] = v.trim().toLowerCase().split("@");
  if (!user || !dom || DOMINIOS.includes(dom)) return null;
  const s = DOMINIOS.find((d) => distancia(dom, d) <= 2);
  return s ? `${user}@${s}` : null;
}
function forcaSenha(v: string) {
  if (!v) return 0;
  let s = 0;
  if (v.length >= 8) s++;
  if (/[A-Z]/.test(v) && /[a-z]/.test(v)) s++;
  if (/\d/.test(v)) s++;
  if (/[^A-Za-z0-9]/.test(v) || v.length >= 12) s++;
  return Math.max(1, s);
}
const DICA_SENHA = ["", "Fraca: use 8 ou mais caracteres.", "Razoável: misture maiúsculas e minúsculas.", "Boa: um número ou símbolo deixa ainda melhor.", "Forte."];
const COR_SENHA = ["", "var(--a-err)", "var(--a-terracota)", "#c2a03c", "var(--a-ok)"];

export default function Auth() {
  const [searchParams] = useSearchParams();
  const path = typeof window !== "undefined" ? window.location.pathname : "";
  const isSupplierContext = path.startsWith("/fornecedor");
  const isProfissionalContext = path.startsWith("/profissional");
  const isLogin =
    !searchParams.get("tipo") &&
    (path === "/login" || path === "/fornecedor/login" || path === "/profissional/login");
  const defaultType: Tipo =
    searchParams.get("tipo") === "supplier" || isSupplierContext
      ? "supplier"
      : searchParams.get("tipo") === "profissional" || isProfissionalContext
      ? "profissional"
      : "couple";
  const vagasFlag = useFeatureFlag("vagas", false);

  const [mode, setMode] = useState<"login" | "signup">(isLogin ? "login" : "signup");
  const [accountType, setAccountType] = useState<Tipo>(defaultType);
  // e-mail vindo das páginas /fornecedor e /profissional já chega preenchido
  const [email, setEmail] = useState(() => (searchParams.get("email") || "").trim().slice(0, 254));
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [signupSent, setSignupSent] = useState<{ email: string; jaExistia: boolean } | null>(null);
  // UI
  const [verSenha, setVerSenha] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [sugestao, setSugestao] = useState<string | null>(null);
  const [trocou, setTrocou] = useState(0);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { session, profile } = useAuth();
  const processingRedirect = useRef(false);
  const refCodigo = searchParams.get("ref") || getStoredReferral()?.codigo || null;
  const refNome = getStoredReferral()?.nome || null;

  // perfil Profissional só aparece com o recurso "vagas" ligado
  const tipos: Tipo[] = vagasFlag ? ["couple", "supplier", "profissional"] : ["couple", "supplier"];
  useEffect(() => {
    if (!vagasFlag && accountType === "profissional") setAccountType("couple");
  }, [vagasFlag, accountType]);

  useEffect(() => {
    if (!session || !profile || processingRedirect.current) return;

    const finishRedirect = async () => {
      processingRedirect.current = true;

      // Admin always goes to admin panel
      try {
        const { data: isAdmin } = await supabase.rpc("has_role", {
          _user_id: session.user.id,
          _role: "admin" as any,
        });
        if (isAdmin) {
          navigate("/admin", { replace: true });
          return;
        }
      } catch (_) { /* noop */ }

      if (profile.account_type !== "couple") {
        if (profile.account_type === "profissional") {
          const { data: sp } = await (supabase.from("staff_profiles" as any) as any)
            .select("cidade, consentimento_lgpd")
            .eq("user_id", session.user.id)
            .maybeSingle();
          if (!sp?.cidade || !sp?.consentimento_lgpd) {
            navigate("/profissional/onboarding", { replace: true });
          } else {
            // volta para a vaga em que clicou antes do login, se houver
            navigate(destinoProfissional(), { replace: true });
          }
          return;
        }
        // se onboarding pendente, manda completar; senão, painel
        const { data: sup } = await supabase
          .from("suppliers")
          .select("onboarding_completed")
          .eq("user_id", session.user.id)
          .maybeSingle();
        if (sup && !sup.onboarding_completed) {
          navigate("/fornecedor/cadastro", { replace: true });
        } else {
          navigate("/fornecedor/painel", { replace: true });
        }
        return;
      }

      // Preview do simulador salvo em sessionStorage (novo fluxo)
      const previewRaw = sessionStorage.getItem("preview_simulacao");
      if (previewRaw) {
        try {
          const payload = JSON.parse(previewRaw);
          const { data: couple } = await supabase
            .from("couples")
            .select("id")
            .eq("user_id", session.user.id)
            .maybeSingle();
          const { data, error } = await (supabase.from("home_simulacoes" as any) as any)
            .insert({ ...payload, user_id: session.user.id, couple_id: couple?.id || null })
            .select("id")
            .maybeSingle();
          if (error) throw error;
          sessionStorage.removeItem("preview_simulacao");
          navigate(`/simulador/resultado?id=${data?.id}`, { replace: true });
          return;
        } catch (error: any) {
          toast({ title: "Não foi possível recuperar a simulação", description: traduzirErro(error), variant: "destructive" });
        }
      }

      const pending = localStorage.getItem("pending_simulacao");
      if (pending) {
        try {
          const payload = JSON.parse(pending);
          const { data: couple } = await supabase
            .from("couples")
            .select("id")
            .eq("user_id", session.user.id)
            .maybeSingle();

          const { data, error } = await (supabase.from("home_simulacoes" as any) as any)
            .insert({ ...payload, user_id: session.user.id, couple_id: couple?.id || null })
            .select("id")
            .maybeSingle();

          if (error) throw error;
          localStorage.removeItem("pending_simulacao");
          navigate(`/simulador/resultado?id=${data?.id}`, { replace: true });
          return;
        } catch (error: any) {
          toast({ title: "Não foi possível recuperar a simulação", description: traduzirErro(error), variant: "destructive" });
        }
      }

      const redirect = searchParams.get("redirect");
      if (redirect?.startsWith("/")) {
        navigate(redirect, { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    };

    finishRedirect();
  }, [session, profile, navigate, searchParams, toast]);

  useEffect(() => {
    if (searchParams.get("redirect") === "simulador") {
      setAccountType("couple");
    }
  }, [searchParams]);

  // ---------- validação ----------
  const validarEmail = (v: string) => {
    const e = v.trim();
    if (!e) return "Informe seu e-mail.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) return "Esse e-mail parece incompleto. Confira o que vem depois do @.";
    return "";
  };
  const sairDoEmail = () => {
    const limpo = email.trim().toLowerCase();
    setEmail(limpo);
    const erro = limpo ? validarEmail(limpo) : "";
    setErros((x) => ({ ...x, email: erro }));
    setSugestao(erro ? null : sugerirEmail(limpo));
  };
  const mudarModo = (m: "login" | "signup") => {
    setMode(m);
    setErros({});
    setTrocou((n) => n + 1);
  };
  const tremer = (id: string) => {
    const el = document.getElementById(`campo-${id}`);
    if (!el) return;
    el.classList.remove("a-shake");
    void el.offsetWidth;
    el.classList.add("a-shake");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const limpo = email.trim().toLowerCase();
    const novos: Record<string, string> = {};
    const eEmail = validarEmail(limpo);
    if (eEmail) novos.email = eEmail;
    if (!password) novos.senha = "Informe sua senha.";
    else if (mode === "signup" && password.length < 6) novos.senha = "A senha precisa ter pelo menos 6 caracteres.";
    if (mode === "signup") {
      if (fullName.trim().length < 2) novos.nome = "Como podemos te chamar?";
      if (accountType === "supplier" && companyName.trim().length < 2) novos.empresa = "Informe o nome que os casais vão ver.";
      if (!acceptedTerms) novos.termos = "Para criar a conta, aceite os Termos de Uso e a Política de Privacidade.";
    }
    setErros(novos);
    const primeiro = ["empresa", "nome", "email", "senha", "termos"].find((k) => novos[k]);
    if (primeiro) {
      tremer(primeiro);
      document.getElementById(primeiro === "termos" ? "termos" : primeiro === "senha" ? "password" : primeiro === "nome" ? "fullName" : primeiro === "empresa" ? "companyName" : "email")?.focus();
      return;
    }
    setEmail(limpo);
    setLoading(true);

    try {
      if (mode === "signup") {
        const metadata: Record<string, string> = {
          full_name: fullName.trim(),
          account_type: accountType,
        };
        if (accountType === "supplier") {
          metadata.company_name = companyName.trim();
        }
        const { data, error } = await supabase.auth.signUp({
          email: limpo,
          password,
          options: {
            data: metadata,
            emailRedirectTo: `${window.location.origin}/confirmado`,
          },
        });
        if (error) throw error;
        // Quando o e-mail já existe, o Supabase retorna um usuário sem identities.
        const jaExistia = !!data.user && (data.user.identities?.length ?? 0) === 0;
        if (!jaExistia) analytics.signUp(accountType);
        setSignupSent({ email: limpo, jaExistia });
        setPassword("");
        setFullName("");
        setCompanyName("");
        setAcceptedTerms(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: limpo, password });
        if (error) throw error;
        analytics.login();
      }
    } catch (error: any) {
      const msg = traduzirErroAuth(error);
      setErros({ geral: msg });
      tremer("senha");
    } finally {
      setLoading(false);
    }
  };

  const reenviar = async () => {
    if (!signupSent) return;
    setLoading(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: signupSent.email,
      options: { emailRedirectTo: `${window.location.origin}/confirmado` },
    });
    setLoading(false);
    toast(
      error
        ? { title: "Não foi possível reenviar", description: traduzirErroAuth(error), variant: "destructive" }
        : { title: "E-mail reenviado", description: "Confira a caixa de entrada e o spam." },
    );
  };

  const t = TEXTOS[accountType];
  const forca = mode === "signup" ? forcaSenha(password) : 0;
  const idx = tipos.indexOf(accountType);

  return (
    <div className="auth-v2 grid min-h-screen lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <SEO title="Entrar — Casamenteiro" noIndex />

      {/* ---------- lado visual (desktop) ---------- */}
      <aside aria-hidden="true" className="relative m-4 mr-0 hidden overflow-hidden rounded-[28px] lg:block" style={{ position: "sticky", top: 16, height: "calc(100vh - 32px)", minHeight: 560 }}>
        <Cena on={accountType === "couple"} fundo={<><img src={heroCasal} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover" /><div className="absolute inset-0 -z-10" style={{ background: "linear-gradient(180deg, rgba(20,14,10,0) 30%, rgba(20,14,10,.78) 100%)" }} /></>}
          claro titulo={<>Do sim ao sim, <em className="a-serif" style={{ color: "#F7C9A1" }}>sem planilha.</em></>}
          itens={["Orçamentos de quem tem a sua data livre", "Lista de convidados e cronograma juntos", "Tudo salvo para continuar de onde parou"]}
          chips={[["✓", "Simulação salva", "Seus valores e convidados guardados", "#f6ede3", "#a9551f"], ["✉", "Orçamentos chegando", "Buffet, fotografia e decoração", "#e3eee8", "#3b6656"]]} chipsDireita />
        <Cena on={accountType === "supplier"} fundo={<div className="absolute inset-0 -z-10" style={{ background: "linear-gradient(160deg,#f6ece1 0%,#f0dfcd 100%)" }} />}
          titulo={<>Pedidos com data e <em className="a-serif" style={{ color: "#a9551f" }}>convidados.</em></>}
          itens={["Sem comissão sobre os seus contratos", "Funil de orçamentos e agenda num lugar só", "Aprovação do perfil em até 24 horas"]}
          chips={[["✉", "Novo pedido de orçamento", "Data, convidados e mensagem do casal", "#f6ede3", "#a9551f"], ["★", "Proposta aceita", "O casal confirmou pelo chat", "#e3eee8", "#3b6656"], ["◷", "Data ociosa reservada", "Com desconto, pela plataforma", "#1f1d1b", "#f2b98a"]]} />
        <Cena on={accountType === "profissional"} fundo={<div className="absolute inset-0 -z-10" style={{ background: "linear-gradient(160deg,#e9f1ec 0%,#d6e6dd 100%)" }} />}
          titulo={<>Trabalhe nos melhores <em className="a-serif" style={{ color: "#3b6656" }}>eventos da cidade.</em></>}
          itens={["Grátis para o profissional", "Valor do turno visível antes de aceitar", "Seu contato só aparece depois do aceite"]}
          chips={[["✉", "Convite para vaga", "Data, horário e valor do turno", "#f6ede3", "#a9551f"], ["✓", "Candidatura enviada", "Acompanhe pelo seu painel", "#e3eee8", "#3b6656"], ["★", "Avaliação recebida", "Reputação que acompanha você", "#1f1d1b", "#f2b98a"]]} />
      </aside>

      {/* ---------- formulário ---------- */}
      <section className="flex min-w-0 flex-col px-4 pb-7 pt-5 sm:px-6">
        <div className="mx-auto flex w-full max-w-[440px] items-center justify-between">
          <Link to="/" className="text-[21px] font-extrabold" style={{ letterSpacing: "-0.03em", color: "var(--a-ink)" }}>
            casamenteiro<span style={{ color: "var(--a-terracota)" }}>.</span>
          </Link>
          <Link to="/" className="text-sm" style={{ color: "var(--a-body)" }}>← Voltar ao site</Link>
        </div>

        <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center gap-[22px] py-7">
          {signupSent ? (
            <div key="enviado" className="a-swap flex flex-col items-start gap-4" role="status">
              <span className="a-pop grid h-16 w-16 place-items-center rounded-full" style={{ background: "#e3eee8", color: "var(--a-ok)" }}>
                {signupSent.jaExistia ? <MailCheck className="h-8 w-8" strokeWidth={1.6} /> : <Check className="h-8 w-8" strokeWidth={2.4} />}
              </span>
              <h1 className="m-0 text-[clamp(28px,3.2vw,34px)] font-extrabold leading-[1.1]" style={{ color: "var(--a-ink)", letterSpacing: "-0.035em" }}>
                {signupSent.jaExistia ? "Este e-mail já tem conta" : "Confirme seu e-mail"}
              </h1>
              <p className="m-0 text-[15.5px] leading-relaxed" style={{ color: "var(--a-body)" }}>
                {signupSent.jaExistia ? (
                  <>Já existe uma conta com <b style={{ color: "var(--a-ink)" }}>{signupSent.email}</b>. Entre com sua senha ou recupere o acesso.</>
                ) : (
                  <>Enviamos um link para <b style={{ color: "var(--a-ink)" }}>{signupSent.email}</b>. Abra o e-mail (confira também o spam) para ativar sua conta.</>
                )}
              </p>
              <div className="flex w-full flex-col gap-2.5">
                <button type="button" className="a-btn w-full" onClick={() => { setSignupSent(null); mudarModo("login"); }}>Ir para o login</button>
                {!signupSent.jaExistia && (
                  <button type="button" disabled={loading} onClick={reenviar} className="h-[50px] w-full rounded-full border bg-white text-[15px] font-semibold disabled:opacity-60" style={{ borderColor: "var(--a-line-strong)" }}>
                    {loading ? "Enviando…" : "Reenviar e-mail de confirmação"}
                  </button>
                )}
                <Link to="/esqueci-senha" className="text-center text-sm font-semibold" style={{ color: "var(--a-clay)" }}>Esqueci minha senha</Link>
              </div>
            </div>
          ) : (
            <div key={`form-${trocou}`} className={trocou ? "a-swap flex flex-col gap-[22px]" : "flex flex-col gap-[22px]"}>
              <div>
                <h1 className="m-0 text-[clamp(28px,3.2vw,34px)] font-extrabold leading-[1.1]" style={{ color: "var(--a-ink)", letterSpacing: "-0.035em", textWrap: "balance" as any }}>
                  {t[mode === "login" ? "login" : "signup"][0]}
                </h1>
                <p className="mb-0 mt-1.5 text-[15.5px] leading-normal" style={{ color: "var(--a-body)" }}>{t[mode === "login" ? "login" : "signup"][1]}</p>
              </div>

              {mode === "signup" && refCodigo && (
                <div className="rounded-2xl border px-4 py-3 text-sm" style={{ borderColor: "#e9c9ad", background: "#fbf1e7" }}>
                  <b>{refNome ? `${refNome} te indicou o Casamenteiro` : "Você chegou por uma indicação"}</b>
                  <p className="m-0 mt-0.5 text-[13px]" style={{ color: "var(--a-body)" }}>Crie sua conta para aproveitar os benefícios da indicação.</p>
                </div>
              )}

              {/* faixa de contexto (celular) */}
              <p className="m-0 flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm lg:hidden" style={{ background: "var(--a-sand)", color: "var(--a-body)" }}>
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: "var(--a-terracota)" }} />
                {t.faixa}
              </p>

              {/* perfil */}
              <fieldset className="m-0 border-0 p-0">
                <legend className="sr-only">Eu sou</legend>
                <div className="relative grid rounded-2xl border p-[5px]" style={{ gridTemplateColumns: `repeat(${tipos.length}, 1fr)`, background: "var(--a-sand)", borderColor: "var(--a-line)" }}>
                  <span aria-hidden="true" className="a-pill absolute bottom-[5px] left-[5px] top-[5px] rounded-xl bg-white" style={{ width: `calc((100% - 10px) / ${tipos.length})`, transform: `translateX(${idx * 100}%)`, boxShadow: "0 2px 8px rgba(31,29,27,.08), 0 0 0 1px var(--a-line)" }} />
                  {tipos.map((k) => {
                    const Icon = k === "couple" ? Heart : k === "supplier" ? Store : Briefcase;
                    const rot = k === "couple" ? "Casal" : k === "supplier" ? "Fornecedor" : "Profissional";
                    const on = accountType === k;
                    return (
                      <label key={k} className="relative z-[1] flex min-h-[62px] cursor-pointer flex-col items-center justify-center gap-1 rounded-xl px-1.5 text-center text-sm font-semibold transition-colors" style={{ color: on ? "var(--a-ink)" : "var(--a-body)" }}>
                        <input type="radio" name="perfil" value={k} checked={on} onChange={() => setAccountType(k)} className="sr-only" />
                        <Icon className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
                        {rot}
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              {/* Entrar / Criar conta */}
              <div role="tablist" aria-label="Entrar ou criar conta" className="flex gap-[22px] border-b" style={{ borderColor: "var(--a-line)" }}>
                {(["login", "signup"] as const).map((m) => (
                  <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => mode !== m && mudarModo(m)} className="a-tab relative bg-transparent pb-2.5 text-[15px] font-semibold" style={{ color: mode === m ? "var(--a-ink)" : "var(--a-muted)" }}>
                    {m === "login" ? "Entrar" : "Criar conta"}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
                {mode === "signup" && accountType === "supplier" && (
                  <Campo id="companyName" chave="empresa" rotulo="Nome da empresa" erro={erros.empresa} ok={companyName.trim().length >= 2}>
                    <input id="companyName" className="a-input" autoComplete="organization" placeholder="Ex.: Buffet Villa Serena" value={companyName} onChange={(e) => { setCompanyName(e.target.value); setErros((x) => ({ ...x, empresa: "" })); }} aria-invalid={!!erros.empresa} aria-describedby="m-empresa" />
                  </Campo>
                )}
                {mode === "signup" && (
                  <Campo id="fullName" chave="nome" rotulo={t.nome} erro={erros.nome} ok={fullName.trim().length >= 2}>
                    <input id="fullName" className="a-input" autoComplete="name" placeholder="Como você quer ser chamado" value={fullName} onChange={(e) => { setFullName(e.target.value); setErros((x) => ({ ...x, nome: "" })); }} aria-invalid={!!erros.nome} aria-describedby="m-nome" />
                  </Campo>
                )}

                <Campo id="email" chave="email" rotulo="E-mail" erro={erros.email} ok={!erros.email && !sugestao && !validarEmail(email) && email.includes(".")}
                  dica={sugestao ? (
                    <span style={{ color: "var(--a-clay)" }}>
                      Você quis dizer{" "}
                      <button type="button" className="font-bold underline" onClick={() => { setEmail(sugestao); setSugestao(null); }}>{sugestao}</button>?
                    </span>
                  ) : null}>
                  <input id="email" className="a-input" type="email" inputMode="email" autoComplete="email" placeholder="voce@email.com" value={email}
                    onChange={(e) => { setEmail(e.target.value); setErros((x) => ({ ...x, email: "", geral: "" })); setSugestao(null); }} onBlur={sairDoEmail} aria-invalid={!!erros.email} aria-describedby="m-email" />
                </Campo>

                <Campo id="password" chave="senha" rotulo="Senha" erro={erros.senha}
                  acao={mode === "login" ? <Link to="/esqueci-senha" className="text-sm font-semibold" style={{ color: "var(--a-clay)" }}>Esqueci a senha</Link> : null}
                  dica={capsLock ? <span style={{ color: "var(--a-clay)" }}>Caps Lock está ligado.</span> : mode === "signup" && password ? <span style={{ color: forca >= 3 ? "var(--a-ok)" : "var(--a-body)" }}>{DICA_SENHA[forca]}</span> : null}
                  extra={mode === "signup" ? (
                    <div className="mt-0.5 grid grid-cols-4 gap-1" aria-hidden="true">
                      {[1, 2, 3, 4].map((n) => <i key={n} className="h-1 rounded transition-colors" style={{ background: forca >= n ? COR_SENHA[forca] : "var(--a-line)" }} />)}
                    </div>
                  ) : null}>
                  <div className="relative">
                    <input id="password" className="a-input pr-[52px]" type={verSenha ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"}
                      placeholder={mode === "login" ? "Sua senha" : "Mínimo de 6 caracteres"} value={password}
                      onChange={(e) => { setPassword(e.target.value); setErros((x) => ({ ...x, senha: "", geral: "" })); }}
                      onKeyUp={(e) => setCapsLock(e.getModifierState?.("CapsLock") ?? false)} onBlur={() => setCapsLock(false)}
                      aria-invalid={!!erros.senha} aria-describedby="m-senha" />
                    <button type="button" onClick={() => setVerSenha((v) => !v)} aria-label={verSenha ? "Ocultar senha" : "Mostrar senha"} aria-pressed={verSenha}
                      className="absolute right-1 top-1 grid h-[42px] w-[42px] place-items-center rounded-[10px]" style={{ color: "var(--a-muted)" }}>
                      {verSenha ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </Campo>

                {mode === "signup" && (
                  <div id="campo-termos">
                    <label className="flex cursor-pointer items-start gap-2.5 text-sm leading-snug" style={{ color: "var(--a-body)" }}>
                      <input id="termos" type="checkbox" checked={acceptedTerms} onChange={(e) => { setAcceptedTerms(e.target.checked); setErros((x) => ({ ...x, termos: "" })); }}
                        className="mt-0.5 h-5 w-5 shrink-0" style={{ accentColor: "var(--a-clay)" }} aria-describedby="m-termos" />
                      <span>
                        Li e aceito os{" "}
                        <Link to="/termos" target="_blank" className="font-semibold" style={{ color: "var(--a-clay)" }}>Termos de Uso</Link> e a{" "}
                        <Link to="/privacidade" target="_blank" className="font-semibold" style={{ color: "var(--a-clay)" }}>Política de Privacidade</Link>.
                      </span>
                    </label>
                    {erros.termos && <p id="m-termos" className="m-0 mt-1.5 text-[13px]" style={{ color: "var(--a-err)" }}>{erros.termos}</p>}
                  </div>
                )}

                {erros.geral && (
                  <p role="alert" className="m-0 rounded-xl px-3.5 py-3 text-sm" style={{ background: "#f8e3de", color: "var(--a-err)" }}>{erros.geral}</p>
                )}

                <button type="submit" disabled={loading} className="a-btn mt-1 grid w-full place-items-center">
                  {loading ? <span className="a-spin" aria-label="Aguarde" /> : mode === "login" ? "Entrar" : t.cta}
                </button>
              </form>
            </div>
          )}
        </div>

        <div className="mx-auto flex w-full max-w-[440px] flex-wrap justify-between gap-3 text-[13px]" style={{ color: "var(--a-muted)" }}>
          <span>Seus dados são protegidos (LGPD).</span>
          <span><Link to="/termos" className="font-semibold" style={{ color: "var(--a-clay)" }}>Termos</Link> · <Link to="/privacidade" className="font-semibold" style={{ color: "var(--a-clay)" }}>Privacidade</Link></span>
        </div>
      </section>
    </div>
  );
}

/** Campo com rótulo, mensagem de erro/dica e estado visual. */
function Campo({ id, chave, rotulo, erro, ok, dica, acao, extra, children }: {
  id: string; chave: string; rotulo: string; erro?: string; ok?: boolean; dica?: React.ReactNode; acao?: React.ReactNode; extra?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div id={`campo-${chave}`} className={`a-field flex flex-col gap-1.5 ${erro ? "bad" : ok ? "good" : ""}`}>
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-sm font-semibold">{rotulo}</label>
        {acao}
      </div>
      {children}
      {extra}
      <p id={`m-${chave}`} aria-live="polite" className="m-0 text-[13px]" style={{ color: "var(--a-err)" }} hidden={!erro && !dica}>
        {erro || dica}
      </p>
    </div>
  );
}

/** Uma "cena" do lado esquerdo, por perfil. */
function Cena({ on, fundo, titulo, itens, chips, claro, chipsDireita }: {
  on: boolean; fundo: React.ReactNode; titulo: React.ReactNode; itens: string[];
  chips: [string, string, string, string, string][]; claro?: boolean; chipsDireita?: boolean;
}) {
  return (
    <div className={`a-scene absolute inset-0 isolate flex flex-col justify-end gap-[22px] p-11 ${on ? "on" : ""}`} style={{ color: claro ? "#fff" : "#1f1d1b" }}>
      {fundo}
      <div className={`absolute flex w-[min(340px,70%)] flex-col gap-2.5 ${chipsDireita ? "right-9 top-9" : "left-11 top-11"}`}>
        {chips.map(([ic, t, s, bg, fg], i) => (
          <div key={t} className="a-chip flex items-start gap-3 rounded-2xl bg-white px-4 py-3.5 text-sm leading-snug" style={{ color: "#1f1d1b", boxShadow: "0 18px 40px rgba(31,29,27,.14)", marginLeft: i === 1 ? 28 : 0 }}>
            <i className={`grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full text-sm font-extrabold not-italic ${i === 0 ? "a-ping" : ""}`} style={{ background: bg, color: fg }}>{ic}</i>
            <span><b className="block text-[14.5px]">{t}</b><span style={{ color: "#6b635b" }}>{s}</span></span>
          </div>
        ))}
      </div>
      <h2 className="m-0 max-w-[16ch] text-[clamp(30px,3.2vw,44px)] font-extrabold leading-[1.04]" style={{ letterSpacing: "-0.04em", color: claro ? "#fff" : "#1f1d1b" }}>{titulo}</h2>
      <ul className="m-0 flex list-none flex-col gap-2.5 p-0 text-[15px]">
        {itens.map((it) => (
          <li key={it} className="flex items-center gap-2.5"><span className="h-[18px] w-[18px] shrink-0 rounded-full" style={{ background: "currentColor", opacity: 0.18 }} />{it}</li>
        ))}
      </ul>
    </div>
  );
}
