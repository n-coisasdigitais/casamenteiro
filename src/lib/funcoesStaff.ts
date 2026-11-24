/**
 * Funções dos profissionais de eventos e os endereços públicos de cada uma.
 * Arquivo puro (sem Supabase): usado pelo app e pelos scripts de prerender/sitemap.
 */

export const FUNCOES_STAFF = [
  "Garçom",
  "Garçonete",
  "Copeiro",
  "Barman",
  "Cozinheiro(a)",
  "Auxiliar de cozinha",
  "Recepcionista",
  "Segurança",
  "Manobrista",
  "Chapeleiro(a)",
  "Iluminador(a)",
  "Operador(a) de som",
  "Roadie",
  "Auxiliar de palco",
  "Assistente de decoração",
  "Assistente de foto/vídeo",
  "Cerimonialista assistente",
  "Limpeza pós-evento",
];

export const slugFuncao = (f: string) =>
  (f || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\(a\)/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const funcaoDoSlug = (slug?: string | null) =>
  slug ? FUNCOES_STAFF.find((f) => slugFuncao(f) === slug) || null : null;

/** Plural para títulos: "Garçons para eventos". */
const PLURAL: Record<string, string> = {
  Garçom: "Garçons",
  Garçonete: "Garçonetes",
  Copeiro: "Copeiros",
  Barman: "Barmen",
  "Cozinheiro(a)": "Cozinheiros",
  "Auxiliar de cozinha": "Auxiliares de cozinha",
  Recepcionista: "Recepcionistas",
  Segurança: "Seguranças",
  Manobrista: "Manobristas",
  "Chapeleiro(a)": "Chapeleiros",
  "Iluminador(a)": "Iluminadores",
  "Operador(a) de som": "Operadores de som",
  Roadie: "Roadies",
  "Auxiliar de palco": "Auxiliares de palco",
  "Assistente de decoração": "Assistentes de decoração",
  "Assistente de foto/vídeo": "Assistentes de foto e vídeo",
  "Cerimonialista assistente": "Cerimonialistas assistentes",
  "Limpeza pós-evento": "Equipe de limpeza pós-evento",
};
export const pluralFuncao = (f: string) => PLURAL[f] || f;

/** "Garçom e Barman" / "Garçom, Barman e Copeiro" */
export function listaFuncoes(funcoes: string[] | null | undefined, max = 3): string {
  const l = (funcoes || []).slice(0, max);
  if (l.length <= 1) return l[0] || "Profissional de eventos";
  return `${l.slice(0, -1).join(", ")} e ${l[l.length - 1]}`;
}
