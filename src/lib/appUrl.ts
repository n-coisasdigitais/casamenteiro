// URL pública canônica da plataforma (domínio próprio).
export const APP_URL = "https://www.casamenteiro.com.br";

/**
 * Base para links compartilháveis (convites, avaliações, indicações, perfil público).
 * Em preview/lovable.app usamos sempre o domínio próprio para o link funcionar fora do preview.
 */
export function publicBaseUrl(): string {
  if (typeof window === "undefined") return APP_URL;
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1" || host.includes("lovable")) return APP_URL;
  return window.location.origin;
}

export function publicUrl(path: string): string {
  return `${publicBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}