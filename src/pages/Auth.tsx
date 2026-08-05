import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, MailCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Checkbox } from "@/components/ui/checkbox";
import { traduzirErroAuth } from "@/lib/authErrors";
import { getStoredReferral } from "@/lib/referral";
import SEO from "@/components/SEO";
import { useFeatureFlag } from "@/contexts/FeatureFlagsContext";

export default function Auth() {
  const [searchParams] = useSearchParams();
  const path = typeof window !== "undefined" ? window.location.pathname : "";
  const isSupplierContext = path.startsWith("/fornecedor");
  const isProfissionalContext = path.startsWith("/profissional");
  const isLogin =
    !searchParams.get("tipo") &&
    (path === "/login" || path === "/fornecedor/login" || path === "/profissional/login");
  const defaultType =
    searchParams.get("tipo") === "supplier" || isSupplierContext
      ? "supplier"
      : searchParams.get("tipo") === "profissional" || isProfissionalContext
      ? "profissional"
      : "couple";
  const vagasFlag = useFeatureFlag("vagas", false);

  const [mode, setMode] = useState<"login" | "signup">(isLogin ? "login" : "signup");
  const [accountType, setAccountType] = useState(defaultType);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [signupSent, setSignupSent] = useState<{ email: string; jaExistia: boolean } | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { session, profile } = useAuth();
  const processingRedirect = useRef(false);
  const refCodigo = searchParams.get("ref") || getStoredReferral()?.codigo || null;
  const refNome = getStoredReferral()?.nome || null;

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
            navigate("/profissional/painel", { replace: true });
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
          toast({ title: "Não foi possível recuperar a simulação", description: error.message, variant: "destructive" });
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
          toast({ title: "Não foi possível recuperar a simulação", description: error.message, variant: "destructive" });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "signup" && !acceptedTerms) {
      toast({
        title: "Aceite necessário",
        description: "Você precisa aceitar os Termos de Uso e a Política de Privacidade para criar sua conta.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);

    try {
      if (mode === "signup") {
        const metadata: Record<string, string> = {
          full_name: fullName,
          account_type: accountType,
        };
        if (accountType === "supplier") {
          metadata.company_name = companyName;
        }
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: metadata,
            emailRedirectTo: `${window.location.origin}/confirmado`,
          },
        });
        if (error) throw error;
        // Quando o e-mail já existe, o Supabase retorna um usuário sem identities.
        const jaExistia = !!data.user && (data.user.identities?.length ?? 0) === 0;
        setSignupSent({ email, jaExistia });
        setPassword("");
        setFullName("");
        setCompanyName("");
        setAcceptedTerms(false);
        toast({
          title: jaExistia ? "Este e-mail já tem conta" : "Cadastro realizado!",
          description: jaExistia
            ? "Faça login ou recupere sua senha."
            : "Enviamos um e-mail de confirmação. Confira a caixa de entrada e o spam.",
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error: any) {
      toast({
        title: "Não foi possível continuar",
        description: traduzirErroAuth(error),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-beige px-4">
      <SEO title="Entrar — Casamenteiro" noIndex />
      {signupSent ? (
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Link to="/" className="flex items-center justify-center gap-2 mb-4">
              <Heart className="h-6 w-6 text-primary fill-primary" />
              <span className="text-xl font-bold">Casamenteiro</span>
            </Link>
            <div className="flex justify-center mb-3">
              <MailCheck className="h-12 w-12 text-primary" strokeWidth={1.5} />
            </div>
            <CardTitle className="text-2xl">
              {signupSent.jaExistia ? "Este e-mail já tem conta" : "Confirme seu e-mail"}
            </CardTitle>
            <CardDescription>
              {signupSent.jaExistia
                ? `Já existe uma conta com ${signupSent.email}. Entre com sua senha ou recupere o acesso.`
                : `Enviamos um link de confirmação para ${signupSent.email}. Abra a caixa de entrada (e o spam) para ativar sua conta.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!signupSent.jaExistia && (
              <Button
                variant="outline"
                className="w-full"
                disabled={loading}
                onClick={async () => {
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
                      : { title: "E-mail reenviado", description: "Confira a caixa de entrada e o spam." }
                  );
                }}
              >
                Reenviar e-mail de confirmação
              </Button>
            )}
            <Button
              className="w-full"
              onClick={() => {
                setSignupSent(null);
                setMode("login");
              }}
            >
              Ir para o login
            </Button>
            <Link to="/esqueci-senha" className="block text-center text-sm text-muted-foreground hover:underline">
              Esqueci minha senha
            </Link>
          </CardContent>
        </Card>
      ) : (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link to="/" className="flex items-center justify-center gap-2 mb-4">
            <Heart className="h-6 w-6 text-primary fill-primary" />
            <span className="text-xl font-bold">Casamenteiro</span>
          </Link>
          <CardTitle className="text-2xl">
            {mode === "login" ? "Entrar" : "Criar conta"}
          </CardTitle>
          <CardDescription>
            {mode === "login"
              ? "Entre com seu e-mail e senha"
              : "Preencha os dados para se cadastrar"}
          </CardDescription>
          {mode === "signup" && refCodigo && (
            <div className="mt-4 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-left">
              <span className="font-medium">
                {refNome ? `${refNome} te indicou o Casamenteiro 💛` : "Você chegou por uma indicação 💛"}
              </span>
              <p className="text-xs text-muted-foreground mt-0.5">
                Crie sua conta para aproveitar os benefícios da indicação.
              </p>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    type="button"
                    variant={accountType === "couple" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setAccountType("couple")}
                  >
                    <Heart className="mr-2 h-4 w-4" /> Sou Casal
                  </Button>
                  <Button
                    type="button"
                    variant={accountType === "supplier" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setAccountType("supplier")}
                  >
                    Sou Fornecedor
                  </Button>
                  {vagasFlag && (
                    <Button
                      type="button"
                      variant={accountType === "profissional" ? "default" : "outline"}
                      className="flex-1"
                      onClick={() => setAccountType("profissional")}
                    >
                      Sou Profissional
                    </Button>
                  )}
                </div>
                <div>
                  <Label htmlFor="fullName">Nome completo</Label>
                  <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                </div>
                {accountType === "supplier" && (
                  <div>
                    <Label htmlFor="companyName">Nome da empresa</Label>
                    <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
                  </div>
                )}
              </>
            )}
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>
            {mode === "login" && (
              <div className="text-right">
                <Link to="/esqueci-senha" className="text-xs text-primary underline">
                  Esqueci minha senha
                </Link>
              </div>
            )}
            {mode === "signup" && (
              <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer">
                <Checkbox
                  checked={acceptedTerms}
                  onCheckedChange={(v) => setAcceptedTerms(v === true)}
                  className="mt-0.5"
                />
                <span>
                  Li e aceito os{" "}
                  <Link to="/termos" target="_blank" className="text-primary underline">Termos de Uso</Link>{" "}
                  e a{" "}
                  <Link to="/privacidade" target="_blank" className="text-primary underline">Política de Privacidade</Link>.
                </span>
              </label>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Cadastrar"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            {mode === "login" ? (
              <>
                Não tem conta?{" "}
                <button onClick={() => setMode("signup")} className="text-primary underline">
                  Cadastre-se
                </button>
              </>
            ) : (
              <>
                Já tem conta?{" "}
                <button onClick={() => setMode("login")} className="text-primary underline">
                  Entrar
                </button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
      )}
    </div>
  );
}
