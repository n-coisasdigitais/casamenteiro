import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import SEO from "@/components/SEO";

/**
 * Página de pouso após o usuário clicar no link de confirmação de e-mail.
 * - Confirma visualmente o sucesso.
 * - Conta 4s e redireciona conforme o estado:
 *   - há simulação pendente -> cria e abre o resultado
 *   - onboarding já feito  -> /dashboard
 *   - caso contrário        -> /onboarding
 */
export default function EmailConfirmado() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [count, setCount] = useState(4);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    document.title = "E-mail confirmado — Casamenteiro";
  }, []);

  const decideAndGo = async () => {
    if (redirecting) return;
    setRedirecting(true);
    try {
      // Sem usuário (caso o link não tenha logado), manda pro login
      if (!user) {
        navigate("/login", { replace: true });
        return;
      }

      // 1) Simulação pendente do localStorage
      const pending = localStorage.getItem("pending_simulacao");
      if (pending) {
        try {
          const payload = JSON.parse(pending);
          const { data: couple } = await supabase
            .from("couples")
            .select("id, onboarding_completed")
            .eq("user_id", user.id)
            .maybeSingle();
          const { data, error } = await (supabase.from("home_simulacoes" as any) as any)
            .insert({ ...payload, user_id: user.id, couple_id: couple?.id || null })
            .select("id")
            .maybeSingle();
          if (error) throw error;
          localStorage.removeItem("pending_simulacao");
          navigate(`/simulador/resultado?id=${data?.id}`, { replace: true });
          return;
        } catch (e: any) {
          toast({
            title: "Simulação não pôde ser recuperada",
            description: e.message,
            variant: "destructive",
          });
        }
      }

      // 2) Onboarding pronto?
      const { data: couple } = await supabase
        .from("couples")
        .select("onboarding_completed")
        .eq("user_id", user.id)
        .maybeSingle();

      if (couple?.onboarding_completed) {
        navigate("/dashboard", { replace: true });
      } else {
        navigate("/onboarding", { replace: true });
      }
    } finally {
      setRedirecting(false);
    }
  };

  // contador
  useEffect(() => {
    if (loading) return;
    if (count <= 0) {
      decideAndGo();
      return;
    }
    const t = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, loading]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-beige px-4">
      <SEO title="E-mail confirmado — Casamenteiro" noIndex />
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link to="/" className="flex items-center justify-center gap-2 mb-4">
            <Heart className="h-6 w-6 text-primary fill-primary" />
            <span className="text-xl font-bold">Casamenteiro</span>
          </Link>
          <div className="flex justify-center mb-3">
            <CheckCircle2 className="h-14 w-14 text-primary" strokeWidth={1.5} />
          </div>
          <CardTitle className="text-2xl">E-mail confirmado!</CardTitle>
          <CardDescription>
            Sua conta está ativa. Estamos preparando tudo para você continuar.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            {redirecting || count <= 0
              ? "Redirecionando…"
              : `Você será direcionado em ${count}s.`}
          </p>
          <Button onClick={decideAndGo} className="w-full" disabled={redirecting || loading}>
            {redirecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Continuando…
              </>
            ) : (
              "Continuar agora"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}