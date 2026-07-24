import { supabase } from "@/integrations/supabase/client";

export const DEMO_ACCOUNTS = {
  couple: {
    email: "casal.teste@meugrandedia.com",
    password: "Mgd!Casal#2026$Xkq",
    label: "Entrar como casal",
    description: "Veja o painel completo: convidados, orçamento, tarefas, Kanban de fornecedores.",
  },
  supplier: {
    email: "fornecedor.teste@meugrandedia.com",
    password: "Mgd!Forn#2026$Xkq",
    label: "Entrar como fornecedor",
    description: "Veja o painel do fornecedor: leads, conversas, calendário, métricas.",
  },
} as const;

export type DemoRole = keyof typeof DEMO_ACCOUNTS;

export async function loginAsDemo(role: DemoRole) {
  await supabase.auth.signOut();
  const acc = DEMO_ACCOUNTS[role];
  const { error } = await supabase.auth.signInWithPassword({
    email: acc.email,
    password: acc.password,
  });
  if (error) throw error;
}

export const DEMO_EMAILS = new Set<string>(
  Object.values(DEMO_ACCOUNTS).map((a) => a.email)
);

export function isDemoEmail(email?: string | null): boolean {
  if (!email) return false;
  return DEMO_EMAILS.has(email.toLowerCase());
}