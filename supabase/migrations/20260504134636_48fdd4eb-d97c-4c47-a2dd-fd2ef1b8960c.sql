
-- Revogar EXECUTE do role PUBLIC (que é o padrão herdado por anon e authenticated)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_couple_id_for_user(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.seed_default_tasks(uuid, date) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_supplier_rating() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_supplier_on_quote() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_suppliers_on_simulation() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_on_proposal() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_quote_kanban_on_proposal() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_couple_supplier_on_proposal() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_budget_on_contract() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_kanban_contracted() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trigger_seed_tasks_on_onboarding() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC;

-- Concede APENAS para authenticated nas que ainda precisam ser chamadas (has_role e get_couple_id_for_user são usadas por RLS)
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_couple_id_for_user(uuid) TO authenticated;

-- Buckets públicos: bloquear listagem (LIST) mantendo download por URL pública
-- A listagem ocorre quando um SELECT com filtro de bucket retorna nomes. Vamos limitar a SELECT a usuários autenticados na própria pasta.
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Public can view supplier-photos" ON storage.objects;
DROP POLICY IF EXISTS "Public can view couple-photos" ON storage.objects;
DROP POLICY IF EXISTS "Avatares públicos para leitura" ON storage.objects;

-- Acesso público aos buckets continua via URL CDN do Supabase (não passa por RLS).
-- Aqui só permitimos LIST/SELECT no client se o usuário for o dono do arquivo.
CREATE POLICY "Owners can list own files in public buckets"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id IN ('avatars', 'couple-photos', 'supplier-photos')
    AND owner = auth.uid()
  );
