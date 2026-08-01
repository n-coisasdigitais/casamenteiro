import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * IDs dos fornecedores que já estão no plano/orçamento do casal logado.
 * Retorna um Set vazio para visitantes e fornecedores.
 */
export function useMyPlanSuppliers(): Set<string> {
  const { user, profile } = useAuth();
  const [ids, setIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let ativo = true;
    (async () => {
      if (!user || (profile && profile.account_type !== "couple")) {
        setIds(new Set());
        return;
      }
      const { data: couple } = await supabase
        .from("couples").select("id").eq("user_id", user.id).maybeSingle();
      if (!couple) return;
      const { data } = await supabase
        .from("couple_suppliers").select("supplier_id").eq("couple_id", couple.id);
      if (!ativo) return;
      setIds(new Set(((data as any[]) || []).map((r) => r.supplier_id).filter(Boolean)));
    })();
    return () => { ativo = false; };
  }, [user?.id, profile?.account_type]);

  return ids;
}