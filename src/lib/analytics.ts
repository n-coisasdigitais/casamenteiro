/**
 * Camada 2 — única API de analytics do app.
 *
 * Toda medição passa por aqui. Se a tag do GA não estiver carregada
 * (ex.: preview local sem measurement ID), tudo vira no-op silencioso.
 *
 * Para adicionar outra ferramenta (Meta Pixel, Hotjar, Clarity...),
 * carregue o script em `index.html` e envie o evento também dentro
 * de `trackEvent` — nenhum componente precisa ser alterado.
 */

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    __GA_ID__?: string;
    __abrirPreferenciasCookies__?: () => void;
  }
}

export const CONSENT_STORAGE_KEY = "cs_consent_v1";
export const CONSENT_EVENT = "cs-consent-change";

export type ConsentValue = "granted" | "denied";

function gtag(...args: unknown[]) {
  if (typeof window === "undefined") return;
  // O snippet do index.html cria dataLayer/gtag antes do React montar.
  if (typeof window.gtag === "function") window.gtag(...args);
}

function gaAtivo() {
  const id = typeof window !== "undefined" ? window.__GA_ID__ : undefined;
  return !!id && id.startsWith("G-") && !id.includes("XXXX");
}

/* ------------------------------------------------------------------ */
/* Consentimento (Google Consent Mode v2)                              */
/* ------------------------------------------------------------------ */

export function getConsent(): ConsentValue | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null;
  }
}

export function setConsent(value: ConsentValue) {
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, value);
  } catch {
    /* modo privado / storage bloqueado */
  }
  aplicarConsentimento(value);
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: value }));
}

/** Envia o estado atual para o Consent Mode (não grava nada). */
export function aplicarConsentimento(value: ConsentValue) {
  gtag("consent", "update", {
    analytics_storage: value,
    ad_storage: value,
    ad_user_data: value,
    ad_personalization: value,
    functionality_storage: "granted",
    security_storage: "granted",
  });
}

/* ------------------------------------------------------------------ */
/* Deduplicação                                                        */
/* ------------------------------------------------------------------ */

const memoria = new Map<string, number>();
const DEDUPE_PREFIX = "cs_evt_";

type DedupeScope = "action" | "session";

function jaEnviado(key: string, scope: DedupeScope, janelaMs: number): boolean {
  if (scope === "session") {
    try {
      if (window.sessionStorage.getItem(DEDUPE_PREFIX + key)) return true;
      window.sessionStorage.setItem(DEDUPE_PREFIX + key, "1");
      return false;
    } catch {
      /* cai para memória */
    }
  }
  const agora = Date.now();
  const anterior = memoria.get(key);
  if (anterior && agora - anterior < janelaMs) return true;
  memoria.set(key, agora);
  return false;
}

/* ------------------------------------------------------------------ */
/* Eventos                                                             */
/* ------------------------------------------------------------------ */

export type TrackOptions = {
  /** Chave de deduplicação. Padrão: o próprio nome do evento. */
  dedupeKey?: string;
  /** "action" = janela curta (duplo clique); "session" = uma vez por sessão. */
  scope?: DedupeScope;
  /** Janela em ms para scope "action". Padrão 2000. */
  janelaMs?: number;
};

export function trackEvent(
  name: string,
  params: Record<string, unknown> = {},
  options: TrackOptions = {},
) {
  if (typeof window === "undefined") return;
  const { dedupeKey, scope = "action", janelaMs = 2000 } = options;
  const key = dedupeKey ?? `${name}:${JSON.stringify(params)}`;
  if (jaEnviado(key, scope, janelaMs)) return;
  if (!gaAtivo()) {
    if (import.meta.env.DEV) console.debug("[analytics] (inativo)", name, params);
    return;
  }
  gtag("event", name, params);
}

// A tag já envia o page_view do primeiro carregamento (config em index.html).
// Guardamos o path inicial para não duplicar.
let ultimoPath: string | null =
  typeof window !== "undefined" ? window.location.pathname + window.location.search : null;

export function trackPageView(path: string, title?: string) {
  if (typeof window === "undefined") return;
  if (path === ultimoPath) return; // evita disparo em re-render
  ultimoPath = path;
  if (!gaAtivo()) return;
  gtag("event", "page_view", {
    page_path: path,
    page_title: title ?? document.title,
    page_location: window.location.href,
  });
}

/* ------------------------------------------------------------------ */
/* Eventos do funil (atalhos tipados)                                  */
/* ------------------------------------------------------------------ */

export const analytics = {
  signUp: (userType: string, method = "email") =>
    trackEvent("sign_up", { method, user_type: userType }, { scope: "session", dedupeKey: "sign_up" }),

  login: (method = "email") =>
    trackEvent("login", { method }, { scope: "session", dedupeKey: "login" }),

  onboardingComplete: (userType: string) =>
    trackEvent(
      "onboarding_complete",
      { user_type: userType },
      { scope: "session", dedupeKey: `onboarding_complete:${userType}` },
    ),

  formSubmit: (formName: string, params: Record<string, unknown> = {}) =>
    trackEvent("form_submit", { form_name: formName, ...params }, { dedupeKey: `form_submit:${formName}` }),

  contactCtaClick: (params: { supplier_id?: string; origem: string }) =>
    trackEvent("contact_cta_click", params, {
      dedupeKey: `contact_cta_click:${params.supplier_id ?? "-"}:${params.origem}`,
    }),
};
