/**
 * Utilitários para formatar e validar telefones brasileiros.
 * Aceita celular (11 dígitos com DDD) e fixo (10 dígitos com DDD).
 */

export function onlyDigits(value: string): string {
  return (value || "").replace(/\D/g, "");
}

/**
 * Formata o telefone enquanto o usuário digita: (11) 91234-5678 ou (11) 1234-5678.
 */
export function formatPhoneBR(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/**
 * Valida se contém um DDD válido + número de 8 ou 9 dígitos.
 */
export function isValidPhoneBR(value: string): boolean {
  const d = onlyDigits(value);
  if (d.length !== 10 && d.length !== 11) return false;
  const ddd = parseInt(d.slice(0, 2), 10);
  if (ddd < 11 || ddd > 99) return false;
  // celular começa com 9
  if (d.length === 11 && d[2] !== "9") return false;
  return true;
}

/**
 * Converte para formato E.164 BR usado em links wa.me (sem o "+").
 */
export function toWhatsAppNumber(value: string): string | null {
  const d = onlyDigits(value);
  if (!isValidPhoneBR(d)) return null;
  return `55${d}`;
}

/**
 * Monta a URL completa para o WhatsApp; retorna null se telefone inválido.
 */
export function buildWhatsAppLink(phone: string, message?: string): string | null {
  const num = toWhatsAppNumber(phone);
  if (!num) return null;
  const base = `https://wa.me/${num}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}