import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";

const FUNCTIONS_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/mp-oauth-callback`;

export default function MpCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [erro, setErro] = useState<string | null>(null);
  const rodou = useRef(false);

  useEffect(() => {
    if (rodou.current) return;
    rodou.current = true;

    const code = params.get("code");
    const state = params.get("state");
    if (!code || !state) {
      setErro("Autorização não concluída no Mercado Pago.");
      return;
    }
    const url =
      `${FUNCTIONS_URL}?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}` +
      `&origem=${encodeURIComponent(window.location.origin)}`;
    window.location.replace(url);
  }, [params, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-center px-6">
      {erro ? (
        <>
          <p className="text-muted-foreground">{erro}</p>
          <button className="underline" onClick={() => navigate("/fornecedor/painel")}>
            Voltar ao painel
          </button>
        </>
      ) : (
        <>
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Conectando sua conta Mercado Pago…</p>
        </>
      )}
    </div>
  );
}
