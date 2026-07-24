
-- 1) Colunas is_demo
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.couples ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_profiles_is_demo ON public.profiles(is_demo) WHERE is_demo = true;
CREATE INDEX IF NOT EXISTS idx_couples_is_demo ON public.couples(is_demo) WHERE is_demo = true;
CREATE INDEX IF NOT EXISTS idx_suppliers_is_demo ON public.suppliers(is_demo) WHERE is_demo = true;

-- 2) Helper: verifica se um user é demo
CREATE OR REPLACE FUNCTION public.is_demo_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE((SELECT is_demo FROM public.profiles WHERE user_id = _user_id LIMIT 1), false)
$$;

-- 3) Trigger: impede conta demo de virar admin
CREATE OR REPLACE FUNCTION public.prevent_demo_role_escalation()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF public.is_demo_user(NEW.user_id) THEN
    RAISE EXCEPTION 'Contas de demonstração não podem receber papéis administrativos';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_demo_role_escalation ON public.user_roles;
CREATE TRIGGER trg_prevent_demo_role_escalation
  BEFORE INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_demo_role_escalation();

-- 4) Função de reset da demo (apaga todos os dados das contas demo)
CREATE OR REPLACE FUNCTION public.admin_reset_demo()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _demo_user_ids uuid[];
  _demo_couple_ids uuid[];
  _demo_supplier_ids uuid[];
  _deleted_count int := 0;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT ARRAY_AGG(user_id) INTO _demo_user_ids FROM public.profiles WHERE is_demo = true;
  IF _demo_user_ids IS NULL OR array_length(_demo_user_ids, 1) IS NULL THEN
    RETURN jsonb_build_object('reset', false, 'reason', 'Nenhuma conta demo encontrada');
  END IF;

  SELECT ARRAY_AGG(id) INTO _demo_couple_ids FROM public.couples WHERE user_id = ANY(_demo_user_ids);
  SELECT ARRAY_AGG(id) INTO _demo_supplier_ids FROM public.suppliers WHERE user_id = ANY(_demo_user_ids);

  -- Dados dependentes de casais demo
  IF _demo_couple_ids IS NOT NULL THEN
    DELETE FROM public.wedding_guests WHERE couple_id = ANY(_demo_couple_ids);
    DELETE FROM public.wedding_tasks WHERE couple_id = ANY(_demo_couple_ids);
    DELETE FROM public.budget_items WHERE couple_id = ANY(_demo_couple_ids);
    DELETE FROM public.budget_payments WHERE couple_id = ANY(_demo_couple_ids);
    DELETE FROM public.guest_invites WHERE couple_id = ANY(_demo_couple_ids);
    DELETE FROM public.guest_groups WHERE couple_id = ANY(_demo_couple_ids);
    DELETE FROM public.couple_suppliers WHERE couple_id = ANY(_demo_couple_ids);
    DELETE FROM public.couple_photos WHERE couple_id = ANY(_demo_couple_ids);
    DELETE FROM public.couple_videos WHERE couple_id = ANY(_demo_couple_ids);
    DELETE FROM public.couple_public_profiles WHERE couple_id = ANY(_demo_couple_ids);
    DELETE FROM public.couple_favorites WHERE couple_id = ANY(_demo_couple_ids);
    DELETE FROM public.couple_links WHERE couple_id = ANY(_demo_couple_ids);
    DELETE FROM public.quotes WHERE couple_id = ANY(_demo_couple_ids);
    DELETE FROM public.reviews WHERE couple_id = ANY(_demo_couple_ids);
    DELETE FROM public.home_simulacoes WHERE couple_id = ANY(_demo_couple_ids);
    DELETE FROM public.simulated_budgets WHERE couple_id = ANY(_demo_couple_ids);
  END IF;

  -- Dados dependentes de fornecedores demo
  IF _demo_supplier_ids IS NOT NULL THEN
    DELETE FROM public.supplier_photos WHERE supplier_id = ANY(_demo_supplier_ids);
    DELETE FROM public.supplier_blocked_dates WHERE supplier_id = ANY(_demo_supplier_ids);
    DELETE FROM public.supplier_promo_dates WHERE supplier_id = ANY(_demo_supplier_ids);
    DELETE FROM public.supplier_profile_views WHERE supplier_id = ANY(_demo_supplier_ids);
    DELETE FROM public.reviews WHERE supplier_id = ANY(_demo_supplier_ids);
    DELETE FROM public.quotes WHERE supplier_id = ANY(_demo_supplier_ids);
  END IF;

  -- Notificações + audit
  DELETE FROM public.notifications WHERE user_id = ANY(_demo_user_ids);
  GET DIAGNOSTICS _deleted_count = ROW_COUNT;

  INSERT INTO public.admin_audit_log (admin_id, action, target_table, target_id, details)
  VALUES (auth.uid(), 'reset_demo', 'profiles', NULL,
    jsonb_build_object('demo_users', _demo_user_ids, 'demo_couples', _demo_couple_ids, 'demo_suppliers', _demo_supplier_ids));

  RETURN jsonb_build_object(
    'reset', true,
    'demo_users', array_length(_demo_user_ids, 1),
    'demo_couples', COALESCE(array_length(_demo_couple_ids, 1), 0),
    'demo_suppliers', COALESCE(array_length(_demo_supplier_ids, 1), 0)
  );
END;
$$;
