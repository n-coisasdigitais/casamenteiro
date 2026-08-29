import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Cookie } from "lucide-react";
import { getConsent, setConsent, aplicarConsentimento } from "@/lib/analytics";

/**
 * Banner de consentimento (LGPD) com Google Consent Mode v2.
 * Enquanto o usuário não decide, a tag do GA fica em modo negado
 * (sem cookies). Ao aceitar, liberamos a medição sem recarregar.
 */
export default function CookieConsent() {
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    const atual = getConsent();
    if (atual) {
      // Reaplica a escolha salva a cada carregamento.
      aplicarConsentimento(atual);
    } else {
      setVisivel(true);
    }
    // Permite reabrir as preferências de qualquer lugar do app.
    window.__abrirPreferenciasCookies__ = () => setVisivel(true);
    return () => {
      delete window.__abrirPreferenciasCookies__;
    };
  }, []);

  if (!visivel) return null;

  const decidir = (valor: "granted" | "denied") => {
    setConsent(valor);
    setVisivel(false);
  };

  return (
    <div
      role="dialog"
      aria-label="Preferências de cookies"
      className="fixed inset-x-0 bottom-0 z-[60] p-3 sm:p-4"
    >
      <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-card text-card-foreground shadow-lg p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <Cookie className="h-6 w-6 text-primary shrink-0 hidden sm:block" />
        <p className="text-sm text-muted-foreground flex-1">
          Usamos cookies para entender como você usa o Casamenteiro e melhorar sua experiência.
          Você pode aceitar ou recusar a qualquer momento.{" "}
          <Link to="/privacidade" className="underline hover:text-foreground">
            Política de Privacidade
          </Link>
          .
        </p>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" className="rounded-full flex-1 sm:flex-none" onClick={() => decidir("denied")}>
            Rejeitar
          </Button>
          <Button className="rounded-full flex-1 sm:flex-none" onClick={() => decidir("granted")}>
            Aceitar
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Link discreto para reabrir o banner (use no rodapé ou na Política). */
export function CookiePreferencesLink({ className }: { className?: string }) {
  return (
    <button
      type="button"
      className={className ?? "text-sm text-muted-foreground underline hover:text-foreground"}
      onClick={() => window.__abrirPreferenciasCookies__?.()}
    >
      Preferências de cookies
    </button>
  );
}
