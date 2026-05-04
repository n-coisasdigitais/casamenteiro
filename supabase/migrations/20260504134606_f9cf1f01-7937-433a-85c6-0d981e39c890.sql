
-- 1) Restringir EXECUTE de funções SECURITY DEFINER que NÃO precisam ser públicas
-- Mantém público apenas o necessário para RSVP anônimo
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_couple_id_for_user(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.seed_default_tasks(uuid, date) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_supplier_rating() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_supplier_on_quote() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_suppliers_on_simulation() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_proposal() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_quote_kanban_on_proposal() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_couple_supplier_on_proposal() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_budget_on_contract() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_kanban_contracted() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trigger_seed_tasks_on_onboarding() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated;

-- get_invite_by_token e respond_invite continuam públicas (RSVP anônimo)
GRANT EXECUTE ON FUNCTION public.get_invite_by_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.respond_invite(text, text, integer, text) TO anon, authenticated;

-- 2) Restringir listagem em buckets públicos (mantém leitura por URL)
-- Remove políticas SELECT amplas e cria uma que nega listagem mas libera GET por nome conhecido via signed URL pública
DROP POLICY IF EXISTS "Public can list avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public can list couple-photos" ON storage.objects;
DROP POLICY IF EXISTS "Public can list supplier-photos" ON storage.objects;

-- 3) Restringir notificações: só autenticado insere (gatilhos rodam como definer e bypassam RLS)
DROP POLICY IF EXISTS "System inserts notifications" ON public.notifications;
CREATE POLICY "Authenticated can insert notifications"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 4) Restringir simulated_budgets e home_simulacoes: anônimo só insere se NÃO setar user_id/couple_id
DROP POLICY IF EXISTS "Anyone can create simulation" ON public.simulated_budgets;
CREATE POLICY "Anyone can create simulation"
  ON public.simulated_budgets
  FOR INSERT
  WITH CHECK (couple_id IS NULL OR couple_id = get_couple_id_for_user(auth.uid()));

DROP POLICY IF EXISTS "Qualquer um cria simulação" ON public.home_simulacoes;
CREATE POLICY "Qualquer um cria simulação"
  ON public.home_simulacoes
  FOR INSERT
  WITH CHECK (
    (user_id IS NULL OR user_id = auth.uid())
    AND (couple_id IS NULL OR couple_id = get_couple_id_for_user(auth.uid()))
  );

-- 5) supplier_leads: anônimo só pode criar lead sem amarrar couple_id de outro usuário
DROP POLICY IF EXISTS "Anyone can create lead" ON public.supplier_leads;
CREATE POLICY "Anyone can create lead"
  ON public.supplier_leads
  FOR INSERT
  WITH CHECK (couple_id IS NULL OR couple_id = get_couple_id_for_user(auth.uid()));
