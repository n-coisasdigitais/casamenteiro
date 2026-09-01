/**
 * Escopo de dados de demonstração.
 *
 * No ambiente real (padrão) os fornecedores marcados como `is_demo = true`
 * NÃO devem aparecer em nenhuma listagem pública. No ambiente de demonstração
 * (usuário com `profile.is_demo`) tudo continua visível.
 */
const STORAGE_KEY = "mgd_demo_session";
const ADMIN_SCOPE_KEY = "mgd_admin_demo_scope";

let cached = false;

export function setDemoSession(v: boolean) {
  cached = v;
  try {
    sessionStorage.setItem(STORAGE_KEY, v ? "1" : "0");
  } catch {
    /* noop */
  }
}

/** Define explicitamente qual conjunto de dados o administrador está consultando. */
export function setAdminDemoScope(v: boolean) {
  try {
    sessionStorage.setItem(ADMIN_SCOPE_KEY, v ? "1" : "0");
  } catch {
    /* noop */
  }
}

export function clearDemoScope() {
  cached = false;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(ADMIN_SCOPE_KEY);
  } catch {
    /* noop */
  }
}

export function isDemoSession(): boolean {
  try {
    const adminScope = sessionStorage.getItem(ADMIN_SCOPE_KEY);
    if (adminScope !== null) return adminScope === "1";
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw !== null) return raw === "1";
  } catch {
    /* noop */
  }
  return cached;
}

/** Aplica exclusivamente o ambiente ativo à consulta. */
export function semDemo(query: any): any {
  return query.eq("is_demo", isDemoSession());
}

/** Valores aceitos para `is_demo` conforme a sessão atual (uso com `.in()`). */
export function demoValues(): boolean[] {
  return [isDemoSession()];
}
