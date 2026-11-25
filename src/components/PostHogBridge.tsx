import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { CONSENT_EVENT } from "@/lib/analytics";
import { iniciarPostHog, identificarPostHog, registrarPostHog, sairPostHog } from "@/lib/posthog";

/**
 * Liga o PostHog ao login. Não desenha nada.
 * Coloque uma vez em App.tsx, logo abaixo de <CookieConsent />.
 */
export default function PostHogBridge() {
  const { user, profile, isDemo, loading } = useAuth();
  const ultimoUser = useRef<string | null>(null);

  useEffect(() => {
    iniciarPostHog();
  }, []);

  useEffect(() => {
    if (loading) return;

    const sincronizar = () => {
      registrarPostHog({
        logado: !!user,
        tipo_conta: profile?.account_type ?? "visitante",
        is_demo: isDemo,
      });
      if (user) {
        identificarPostHog(user.id, {
          tipo_conta: profile?.account_type ?? null,
          is_demo: isDemo,
        });
      }
    };

    if (!user && ultimoUser.current) sairPostHog();
    ultimoUser.current = user?.id ?? null;
    sincronizar();

    window.addEventListener(CONSENT_EVENT, sincronizar);
    return () => window.removeEventListener(CONSENT_EVENT, sincronizar);
  }, [user, profile?.account_type, isDemo, loading]);

  return null;
}
