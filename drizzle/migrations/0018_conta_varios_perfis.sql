
CREATE OR REPLACE FUNCTION public.meus_perfis()
RETURNS TABLE(casal boolean, fornecedor boolean, profissional boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.couples WHERE user_id = auth.uid()),
         EXISTS(SELECT 1 FROM public.suppliers WHERE user_id = auth.uid()),
         EXISTS(SELECT 1 FROM public.staff_profiles WHERE user_id = auth.uid());
$$;

-- Trava: account_type só muda via RPCs oficiais, admin ou backend
CREATE OR REPLACE FUNCTION public.profiles_trava_account_type()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.account_type IS DISTINCT FROM OLD.account_type
     AND auth.uid() IS NOT NULL
     AND coalesce(current_setting('app.troca_perfil', true), '') <> '1'
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Para mudar de perfil, use a opção "Trocar perfil" no menu da sua conta.';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS profiles_trava_account_type_trg ON public.profiles;
CREATE TRIGGER profiles_trava_account_type_trg BEFORE UPDATE OF account_type ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_trava_account_type();

-- fiquei_noivo continua funcionando (sinal local)
CREATE OR REPLACE FUNCTION public.fiquei_noivo()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Faça login.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND account_type = 'generico') THEN
    RAISE EXCEPTION 'Esta conta não é um perfil de sonhos.';
  END IF;
  PERFORM set_config('app.troca_perfil', '1', true);
  UPDATE public.profiles SET account_type = 'couple', updated_at = now() WHERE user_id = auth.uid();
  PERFORM set_config('app.troca_perfil', '', true);
  IF NOT EXISTS (SELECT 1 FROM public.couples WHERE user_id = auth.uid()) THEN
    INSERT INTO public.couples (user_id) VALUES (auth.uid());
  END IF;
END $$;

-- Casal exclusivo
CREATE OR REPLACE FUNCTION public.prevent_role_conflict()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.account_type = 'couple' AND (
       EXISTS (SELECT 1 FROM public.suppliers WHERE user_id = NEW.user_id)
    OR EXISTS (SELECT 1 FROM public.staff_profiles WHERE user_id = NEW.user_id)) THEN
    RAISE EXCEPTION 'Esta conta já tem perfil de fornecedor ou profissional. Use outro e-mail para criar uma conta de casal.';
  END IF;
  IF NEW.account_type IN ('supplier','profissional') AND EXISTS (
    SELECT 1 FROM public.couples WHERE user_id = NEW.user_id) THEN
    RAISE EXCEPTION 'Contas de casal não podem ter perfil de fornecedor ou profissional.';
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.perfil_trabalho_sem_casal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.couples WHERE user_id = NEW.user_id)
     AND NOT public.has_role(NEW.user_id, 'admin') THEN
    RAISE EXCEPTION 'Contas de casal não podem ter perfil de fornecedor ou profissional.';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS staff_profiles_sem_casal_trg ON public.staff_profiles;
CREATE TRIGGER staff_profiles_sem_casal_trg BEFORE INSERT ON public.staff_profiles
  FOR EACH ROW EXECUTE FUNCTION public.perfil_trabalho_sem_casal();
DROP TRIGGER IF EXISTS suppliers_sem_casal_trg ON public.suppliers;
CREATE TRIGGER suppliers_sem_casal_trg BEFORE INSERT ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.perfil_trabalho_sem_casal();

CREATE OR REPLACE FUNCTION public.adicionar_perfil(tipo text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _p public.profiles%ROWTYPE; _s public.suppliers%ROWTYPE; _t public.staff_profiles%ROWTYPE; _email text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Entre na sua conta para continuar.'; END IF;
  IF tipo NOT IN ('supplier','profissional') THEN RAISE EXCEPTION 'Tipo de perfil inválido.'; END IF;
  SELECT * INTO _p FROM public.profiles WHERE user_id = _uid;
  IF coalesce(_p.suspended, false) THEN RAISE EXCEPTION 'Sua conta está suspensa. Fale com o suporte.'; END IF;
  IF EXISTS (SELECT 1 FROM public.couples WHERE user_id = _uid) OR _p.account_type IN ('couple','generico') THEN
    RAISE EXCEPTION 'Contas de casal não podem ter perfil de fornecedor ou profissional.';
  END IF;
  SELECT email INTO _email FROM auth.users WHERE id = _uid;
  SELECT * INTO _s FROM public.suppliers WHERE user_id = _uid;
  SELECT * INTO _t FROM public.staff_profiles WHERE user_id = _uid;
  IF tipo = 'supplier' THEN
    IF _s.id IS NOT NULL THEN RAISE EXCEPTION 'Você já tem perfil de fornecedor.'; END IF;
    INSERT INTO public.suppliers (user_id, company_name, email, phone, whatsapp, city, state, onboarding_completed)
    VALUES (_uid, coalesce(nullif(_t.nome,''), nullif(_p.full_name,''), 'Minha Empresa'),
            coalesce(_t.email, _email), _t.telefone, _t.telefone, _t.cidade, _t.estado, false);
  ELSE
    IF _t.id IS NOT NULL THEN RAISE EXCEPTION 'Você já tem perfil profissional.'; END IF;
    INSERT INTO public.staff_profiles (user_id, criado_por, nome, email, telefone, cidade, estado)
    VALUES (_uid, _uid, coalesce(nullif(_p.full_name,''), nullif(_s.company_name,''), 'Profissional'),
            coalesce(_s.email, _email), coalesce(_s.whatsapp, _s.phone), _s.city, _s.state);
  END IF;
  PERFORM set_config('app.troca_perfil', '1', true);
  UPDATE public.profiles SET account_type = tipo, updated_at = now() WHERE user_id = _uid;
  PERFORM set_config('app.troca_perfil', '', true);
  INSERT INTO public.platform_events (actor_id, actor_role, action, entity, severity, source, details)
  VALUES (_uid, tipo, 'perfil_adicionado', 'profiles', 'info', 'rpc', jsonb_build_object('tipo', tipo));
END $$;

CREATE OR REPLACE FUNCTION public.trocar_perfil(tipo text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _susp boolean; _de text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Entre na sua conta para continuar.'; END IF;
  SELECT suspended, account_type INTO _susp, _de FROM public.profiles WHERE user_id = _uid;
  IF coalesce(_susp, false) THEN RAISE EXCEPTION 'Sua conta está suspensa e não pode trocar de perfil.'; END IF;
  IF tipo = 'supplier' AND NOT EXISTS (SELECT 1 FROM public.suppliers WHERE user_id = _uid) THEN
    RAISE EXCEPTION 'Você ainda não tem perfil de fornecedor.';
  ELSIF tipo = 'profissional' AND NOT EXISTS (SELECT 1 FROM public.staff_profiles WHERE user_id = _uid) THEN
    RAISE EXCEPTION 'Você ainda não tem perfil profissional.';
  ELSIF tipo NOT IN ('supplier','profissional') THEN
    RAISE EXCEPTION 'Só é possível alternar entre fornecedor e profissional.';
  END IF;
  IF _de = tipo THEN RETURN; END IF;
  PERFORM set_config('app.troca_perfil', '1', true);
  UPDATE public.profiles SET account_type = tipo, updated_at = now() WHERE user_id = _uid;
  PERFORM set_config('app.troca_perfil', '', true);
  INSERT INTO public.platform_events (actor_id, actor_role, action, entity, severity, source, details)
  VALUES (_uid, tipo, 'perfil_trocado', 'profiles', 'info', 'rpc', jsonb_build_object('de', _de, 'para', tipo));
END $$;

CREATE OR REPLACE FUNCTION public.admin_broadcast_notification(_segment text, _title text, _body text, _link text DEFAULT NULL::text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _count integer := 0;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  IF _segment NOT IN ('couples','suppliers','profissionais','genericos','all') THEN RAISE EXCEPTION 'Segmento inválido'; END IF;
  INSERT INTO public.notifications (user_id, type, title, body, link)
  SELECT p.user_id, 'admin_broadcast', _title, _body, _link
  FROM public.profiles p
  WHERE coalesce(p.is_demo, false) = false AND (
       (_segment IN ('couples','all') AND EXISTS (SELECT 1 FROM public.couples c WHERE c.user_id = p.user_id))
    OR (_segment IN ('suppliers','all') AND EXISTS (SELECT 1 FROM public.suppliers s WHERE s.user_id = p.user_id))
    OR (_segment IN ('profissionais','all') AND EXISTS (SELECT 1 FROM public.staff_profiles t WHERE t.user_id = p.user_id))
    OR (_segment IN ('genericos','all') AND p.account_type = 'generico'));
  GET DIAGNOSTICS _count = ROW_COUNT;
  INSERT INTO public.broadcast_history (admin_id, segment, filters, title, body, link, recipients_count, channel)
  VALUES (auth.uid(), _segment, '{}'::jsonb, _title, coalesce(_body, ''), _link, _count, 'in_app');
  INSERT INTO public.platform_events (actor_id, actor_role, action, entity, severity, source, details)
  VALUES (auth.uid(), 'admin', 'broadcast.enviado', 'broadcast_history', 'info', 'rpc',
          jsonb_build_object('segment', _segment, 'title', _title, 'recipients', _count));
  RETURN _count;
END $$;

CREATE OR REPLACE FUNCTION public.admin_broadcast_segmented(_segment text, _title text, _body text, _link text DEFAULT NULL::text, _city text DEFAULT NULL::text, _category_id uuid DEFAULT NULL::uuid, _days_to_wedding_max integer DEFAULT NULL::integer)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _count integer := 0; BEGIN
  IF NOT has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  IF _segment = 'couples' THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    SELECT DISTINCT c.user_id, 'admin_broadcast', _title, _body, _link
    FROM public.couples c
    WHERE (_city IS NULL OR c.wedding_city ILIKE '%'||_city||'%')
      AND (_days_to_wedding_max IS NULL OR (c.wedding_date IS NOT NULL AND c.wedding_date - CURRENT_DATE <= _days_to_wedding_max));
  ELSIF _segment = 'suppliers' THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    SELECT DISTINCT s.user_id, 'admin_broadcast', _title, _body, _link
    FROM public.suppliers s
    WHERE (_city IS NULL OR s.city ILIKE '%'||_city||'%')
      AND (_category_id IS NULL OR s.category_id = _category_id);
  ELSE
    INSERT INTO public.notifications (user_id, type, title, body, link)
    SELECT u.user_id, 'admin_broadcast', _title, _body, _link FROM (
      SELECT user_id FROM public.couples UNION SELECT user_id FROM public.suppliers) u;
  END IF;
  GET DIAGNOSTICS _count = ROW_COUNT;
  INSERT INTO public.broadcast_history (admin_id, segment, filters, title, body, link, recipients_count, channel)
  VALUES (auth.uid(), _segment, jsonb_build_object('city',_city,'category_id',_category_id,'days_max',_days_to_wedding_max), _title, _body, _link, _count, 'in_app');
  INSERT INTO public.platform_events (actor_id, actor_role, action, entity, severity, source, details)
  VALUES (auth.uid(), 'admin', 'broadcast.enviado', 'broadcast_history', 'info', 'rpc',
          jsonb_build_object('segment', _segment, 'title', _title, 'recipients', _count, 'city', _city, 'category_id', _category_id, 'days_max', _days_to_wedding_max));
  RETURN _count;
END; $$;

DROP FUNCTION IF EXISTS public.admin_buscar_usuarios(text);
CREATE FUNCTION public.admin_buscar_usuarios(_termo text)
RETURNS TABLE(user_id uuid, nome text, email text, tipo text, avatar_url text, perfis text[])
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE _t text := trim(coalesce(_termo, ''));
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  IF length(_t) < 2 THEN RETURN; END IF;
  RETURN QUERY
  SELECT p.user_id, coalesce(s.company_name, sp.nome, p.full_name)::text, u.email::text, p.account_type::text, p.avatar_url::text,
    array_remove(ARRAY[
      CASE WHEN EXISTS (SELECT 1 FROM public.couples c WHERE c.user_id = p.user_id) THEN 'couple' END,
      CASE WHEN s.id IS NOT NULL THEN 'supplier' END,
      CASE WHEN sp.id IS NOT NULL THEN 'profissional' END], NULL)
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.user_id
  LEFT JOIN public.suppliers s ON s.user_id = p.user_id
  LEFT JOIN public.staff_profiles sp ON sp.user_id = p.user_id
  WHERE coalesce(p.is_demo, false) = false
    AND (p.user_id::text = _t OR p.full_name ILIKE '%'||_t||'%' OR u.email ILIKE '%'||_t||'%'
         OR s.company_name ILIKE '%'||_t||'%' OR sp.nome ILIKE '%'||_t||'%')
  ORDER BY p.full_name NULLS LAST LIMIT 15;
END $$;

-- Perfis de cada conta para a lista de usuários do admin
CREATE OR REPLACE FUNCTION public.admin_perfis_usuarios()
RETURNS TABLE(user_id uuid, perfis text[])
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  RETURN QUERY SELECT x.user_id, array_agg(DISTINCT x.t) FROM (
    SELECT c.user_id, 'couple'::text t FROM public.couples c
    UNION ALL SELECT s.user_id, 'supplier' FROM public.suppliers s
    UNION ALL SELECT sp.user_id, 'profissional' FROM public.staff_profiles sp) x
  WHERE x.user_id IS NOT NULL GROUP BY x.user_id;
END $$;

REVOKE ALL ON FUNCTION public.meus_perfis(), public.adicionar_perfil(text), public.trocar_perfil(text), public.admin_buscar_usuarios(text), public.admin_perfis_usuarios() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.meus_perfis(), public.adicionar_perfil(text), public.trocar_perfil(text), public.admin_buscar_usuarios(text), public.admin_perfis_usuarios() TO authenticated;
REVOKE ALL ON FUNCTION public.profiles_trava_account_type(), public.perfil_trabalho_sem_casal() FROM PUBLIC, anon, authenticated;
