import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";

type OtpType = "signup" | "magiclink" | "recovery" | "invite" | "email_change";

const TYPE_MAP: Record<string, OtpType> = {
  signup: "signup",
  magiclink: "magiclink",
  recovery: "recovery",
  invite: "invite",
  email_change: "email_change",
};

export default function AuthConfirmar() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState<"loading" | "error">("loading");
  const [message, setMessage] = useState("Validando seu link...");

  useEffect(() => {
    const tokenHash = params.get("token_hash");
    const rawType = params.get("type") || "signup";
    const redirectTo = params.get("redirect_to");
    const type = TYPE_MAP[rawType];

    if (!tokenHash || !type) {
      setState("error");
      setMessage("Link inválido ou incompleto.");
      return;
    }

    supabase.auth.verifyOtp({ token_hash: tokenHash, type }).then(({ error }) => {
      if (error) {
        setState("error");
        setMessage(
          error.message?.includes("expired")
            ? "Este link expirou. Solicite um novo e-mail."
            : "Não conseguimos validar este link. Ele pode já ter sido usado.",
        );
        return;
      }

      if (type === "recovery") {
        navigate("/redefinir-senha", { replace: true });
        return;
      }

      if (redirectTo) {
        try {
          const url = new URL(redirectTo);
          navigate(url.pathname + url.search, { replace: true });
          return;
        } catch {
          /* ignora url inválida */
        }
      }
      navigate("/confirmado", { replace: true });
    });
  }, [params, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <SEO title="Confirmando acesso | Casamenteiro" description="Validação do link enviado por e-mail." noindex />
      <div className="max-w-sm w-full text-center space-y-4">
        {state === "loading" ? (
          <>
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">{message}</p>
          </>
        ) : (
          <>
            <XCircle className="h-8 w-8 mx-auto text-destructive" />
            <h1 className="text-xl font-semibold">Não foi possível confirmar</h1>
            <p className="text-muted-foreground text-sm">{message}</p>
            <Button onClick={() => navigate("/login")}>Ir para o login</Button>
          </>
        )}
      </div>
    </div>
  );
}
