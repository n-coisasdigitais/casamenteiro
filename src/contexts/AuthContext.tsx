import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { attributeReferralConversion, getStoredReferralCode } from "@/lib/referral";
import { clearDemoScope, setDemoSession } from "@/lib/demoScope";
import type { Perfis, TipoTrabalho } from "@/lib/perfis";

type Profile = {
  id: string;
  user_id: string;
  full_name: string | null;
  account_type: string;
  avatar_url: string | null;
  is_demo?: boolean | null;
};

type AuthContextType = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  isDemo: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  /** Relê o perfil (ex.: depois de mudar o tipo de conta). */
  refreshProfile: () => Promise<void>;
  /** Perfis que a conta possui (casal / fornecedor / profissional). */
  perfis: Perfis | null;
  /** Ativa outro perfil da conta. Lança erro com mensagem amigável. */
  trocarPerfil: (tipo: TipoTrabalho) => Promise<void>;
  /** Cria e ativa um perfil novo (fornecedor ou profissional). */
  adicionarPerfil: (tipo: TipoTrabalho) => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  isAdmin: false,
  isDemo: false,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
  perfis: null,
  trocarPerfil: async () => {},
  adicionarPerfil: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [perfis, setPerfis] = useState<Perfis | null>(null);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle();
    setProfile(data);
    const { data: mp } = await (supabase.rpc as any)("meus_perfis");
    const linha = Array.isArray(mp) ? mp[0] : mp;
    setPerfis(linha ? { casal: !!linha.casal, fornecedor: !!linha.fornecedor, profissional: !!linha.profissional } : null);
    setDemoSession(!!data?.is_demo);

    const { data: adminCheck } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    setIsAdmin(!!adminCheck);
    // Atribui indicação se houver código salvo
    if (getStoredReferralCode() && data?.account_type) {
      const tipo = data.account_type === "supplier" ? "supplier" : "couple";
      attributeReferralConversion(userId, tipo).catch(() => {});
    }
  };

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => fetchProfile(session.user.id), 0);
      } else {
        setProfile(null);
        setPerfis(null);
        setIsAdmin(false);
        clearDemoScope();
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
    setIsAdmin(false);
    clearDemoScope();
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  // A troca de perfil vale para todas as abas: relê o perfil quando a aba volta ao foco.
  useEffect(() => {
    if (!user) return;
    const aoFocar = () => {
      if (document.visibilityState === "visible") fetchProfile(user.id);
    };
    document.addEventListener("visibilitychange", aoFocar);
    return () => document.removeEventListener("visibilitychange", aoFocar);
  }, [user?.id]);

  const chamar = async (fn: string, tipo: TipoTrabalho) => {
    const { error } = await (supabase.rpc as any)(fn, { tipo });
    if (error) throw new Error(error.message || "Não foi possível concluir agora. Tente de novo.");
    await refreshProfile();
  };
  const trocarPerfil = (tipo: TipoTrabalho) => chamar("trocar_perfil", tipo);
  const adicionarPerfil = (tipo: TipoTrabalho) => chamar("adicionar_perfil", tipo);

  return (
    <AuthContext.Provider
      value={{ session, user, profile, isAdmin, isDemo: !!profile?.is_demo, loading, signOut, refreshProfile, perfis, trocarPerfil, adicionarPerfil }}
    >
      {children}
    </AuthContext.Provider>
  );
}
