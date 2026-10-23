/**
 * Guarda a vaga em que o profissional clicou antes de ter conta/perfil,
 * para devolvê-lo a ela depois do cadastro, da confirmação de e-mail e do onboarding.
 * localStorage pode falhar (aba anônima, bloqueio): tudo em try/catch.
 */
const CHAVE = "casamenteiro_vaga_pendente";
const VALIDADE_MS = 7 * 24 * 60 * 60 * 1000;

export function guardarVagaPendente(id: string) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify({ id, em: Date.now() }));
  } catch {
    /* sem storage: segue sem lembrar */
  }
}

export function lerVagaPendente(): string | null {
  try {
    const v = JSON.parse(localStorage.getItem(CHAVE) || "null");
    if (!v?.id || Date.now() - Number(v.em) > VALIDADE_MS) return null;
    return String(v.id);
  } catch {
    return null;
  }
}

export function limparVagaPendente() {
  try {
    localStorage.removeItem(CHAVE);
  } catch {
    /* noop */
  }
}

/** Para onde mandar o profissional quando ele termina login/onboarding. */
export function destinoProfissional(padrao = "/profissional/painel") {
  const id = lerVagaPendente();
  return id ? `/vagas?vaga=${encodeURIComponent(id)}` : padrao;
}
