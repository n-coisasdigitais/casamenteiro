/**
 * PostHog — comportamento no site (páginas, caminhos, mapa de calor, gravações).
 *
 * Regras de privacidade (LGPD):
 *  - Antes de a pessoa escolher no banner de cookies, nada é enviado.
 *  - "Aceitar todos"      → eventos + mapa de calor + gravação de sessão (campos mascarados).
 *  - "Apenas necessários" → contagem anônima sem cookie (cookieless): eventos e mapa de calor,
 *                           sem gravação e sem identificar a pessoa.
 *  - Páginas /admin e o site aberto dentro do painel (iframe do mapa de calor) não são medidos.
 *
 * O token abaixo é público (feito para ficar no navegador). A chave pessoal da API,
 * que lê os dados, fica só no Supabase (secret POSTHOG_PERSONAL_API_KEY).
 */
import posthog from "posthog-js";
import { CONSENT_EVENT, getConsent, type ConsentValue } from "@/lib/analytics";

const TOKEN =
  (import.meta.env.VITE_POSTHOG_TOKEN as string | undefined) ?? "phc_qJeamYgfWpr7tkJ5xsoCCxPcmjGeEudyyUBbc4C47ZcM";
const HOST = (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ?? "https://us.i.posthog.com";

let iniciado = false;

function dentroDeIframe() {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function paginaIgnorada(pathname: string) {
  return pathname.startsWith("/admin");
}

function aplicar(valor: ConsentValue | null) {
  if (!iniciado) return;
  if (valor === "granted") {
    posthog.opt_in_capturing();
    posthog.startSessionRecording();
  } else if (valor === "denied") {
    posthog.stopSessionRecording();
    posthog.opt_out_capturing(); // com cookieless_mode "on_reject" vira contagem anônima
  }
}

export function iniciarPostHog() {
  if (iniciado || typeof window === "undefined") return;
  if (!TOKEN || dentroDeIframe()) return;
  if (import.meta.env.MODE === "test") return;

  posthog.init(TOKEN, {
    api_host: HOST,
    ui_host: "https://us.posthog.com",
    defaults: "2025-05-24",
    cookieless_mode: "on_reject",
    person_profiles: "identified_only",
    capture_pageview: "history_change",
    capture_pageleave: true,
    capture_heatmaps: true,
    capture_dead_clicks: true,
    autocapture: true,
    disable_session_recording: true, // liga só depois do "Aceitar todos"
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: "[data-ph-mask]",
    },
    before_send: (evento) => {
      if (!evento) return null;
      const path = (evento.properties?.$pathname as string | undefined) ?? window.location.pathname;
      return paginaIgnorada(path) ? null : evento;
    },
  });
  iniciado = true;

  aplicar(getConsent());
  window.addEventListener(CONSENT_EVENT, (e) => aplicar((e as CustomEvent<ConsentValue>).detail));
}

/** Evento de produto. Só envia se o PostHog estiver ativo e a pessoa já tiver escolhido. */
export function capturarPostHog(nome: string, props: Record<string, unknown> = {}) {
  if (!iniciado || getConsent() === null) return;
  posthog.capture(nome, props);
}

/** Liga a sessão a um usuário logado — só com consentimento total. */
export function identificarPostHog(userId: string, props: Record<string, unknown>) {
  if (!iniciado || getConsent() !== "granted") return;
  if (posthog.get_distinct_id() !== userId) posthog.identify(userId, props);
  else posthog.setPersonProperties(props);
}

export function registrarPostHog(props: Record<string, unknown>) {
  if (!iniciado) return;
  posthog.register(props);
}

export function sairPostHog() {
  if (!iniciado) return;
  posthog.reset();
}
