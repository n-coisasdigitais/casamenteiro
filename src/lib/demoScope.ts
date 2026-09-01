/**
 * Escopo de dados de demonstração.
 *
 * No ambiente real (padrão) os fornecedores marcados como `is_demo = true`
 * NÃO devem aparecer em nenhuma listagem pública. No ambiente de demonstração
 * (usuário com `profile.is_demo`) tudo continua visível.
 */
const STORAGE_KEY = "mgd_demo_session";

let cached = false;

export function setDemoSession(v: boolean) {
  cached = v;
  try {
    sessionStorage.setItem(STORAGE_KEY, v ? "1" : "0");
  } catch {
    /* noop */
  }
}

export function isDemoSession(): boolean {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw !== null) return raw === "1";
  } catch {
    /* noop */
  }
  return cached;
}

/** Aplica o filtro `is_demo = false` quando a sessão não é de demonstração. */
export function semDemo<T extends { eq: (col: string, val: unknown) => T }>(query: T): T {
  return isDemoSession() ? query : query.eq("is_demo", false);
}
