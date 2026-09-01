-- 1) Broadcast simples também grava histórico + evento
CREATE OR REPLACE FUNCTION public.admin_broadcast_notification(_segment text, _title text, _body text, _link text DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count integer := 0;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  IF _segment = 'couples' THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    SELECT user_id, 'admin_broadcast', _title, _body, _link
    FROM public.profiles WHERE account_type = 'couple';
  ELSIF _segment = 'suppliers' THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    SELECT user_id, 'admin_broadcast', _title, _body, _link
    FROM public.profiles WHERE account_type = 'supplier';
  ELSIF _segment = 'all' THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    SELECT user_id, 'admin_broadcast', _title, _body, _link
    FROM public.profiles WHERE account_type IN ('couple','supplier');
  ELSE
    RAISE EXCEPTION 'Segmento inválido';
  END IF;

  GET DIAGNOSTICS _count = ROW_COUNT;

  INSERT INTO public.broadcast_history (admin_id, segment, filters, title, body, link, recipients_count, channel)
  VALUES (auth.uid(), _segment, '{}'::jsonb, _title, _body, _link, _count, 'in_app');

  INSERT INTO public.platform_events (actor_id, actor_role, action, entity, severity, source, details)
  VALUES (auth.uid(), 'admin', 'broadcast.enviado', 'broadcast_history', 'info', 'rpc',
          jsonb_build_object('segment', _segment, 'title', _title, 'recipients', _count));

  RETURN _count;
END;
$$;

-- 2) Broadcast segmentado também registra evento de auditoria
CREATE OR REPLACE FUNCTION public.admin_broadcast_segmented(_segment text, _title text, _body text, _link text DEFAULT NULL, _city text DEFAULT NULL, _category_id uuid DEFAULT NULL, _days_to_wedding_max integer DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _count integer := 0; BEGIN
  IF NOT has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  IF _segment = 'couples' THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    SELECT DISTINCT p.user_id, 'admin_broadcast', _title, _body, _link
    FROM public.profiles p
    LEFT JOIN public.couples c ON c.user_id = p.user_id
    WHERE p.account_type = 'couple'
      AND (_city IS NULL OR c.wedding_city ILIKE '%'||_city||'%')
      AND (_days_to_wedding_max IS NULL OR (c.wedding_date IS NOT NULL AND c.wedding_date - CURRENT_DATE <= _days_to_wedding_max));
  ELSIF _segment = 'suppliers' THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    SELECT DISTINCT p.user_id, 'admin_broadcast', _title, _body, _link
    FROM public.profiles p
    LEFT JOIN public.suppliers s ON s.user_id = p.user_id
    WHERE p.account_type = 'supplier'
      AND (_city IS NULL OR s.city ILIKE '%'||_city||'%')
      AND (_category_id IS NULL OR s.category_id = _category_id);
  ELSE
    INSERT INTO public.notifications (user_id, type, title, body, link)
    SELECT user_id, 'admin_broadcast', _title, _body, _link
    FROM public.profiles WHERE account_type IN ('couple','supplier');
  END IF;
  GET DIAGNOSTICS _count = ROW_COUNT;
  INSERT INTO public.broadcast_history (admin_id, segment, filters, title, body, link, recipients_count, channel)
  VALUES (auth.uid(), _segment, jsonb_build_object('city',_city,'category_id',_category_id,'days_max',_days_to_wedding_max), _title, _body, _link, _count, 'in_app');
  INSERT INTO public.platform_events (actor_id, actor_role, action, entity, severity, source, details)
  VALUES (auth.uid(), 'admin', 'broadcast.enviado', 'broadcast_history', 'info', 'rpc',
          jsonb_build_object('segment', _segment, 'title', _title, 'recipients', _count,
                             'city', _city, 'category_id', _category_id, 'days_max', _days_to_wedding_max));
  RETURN _count;
END; $$;

-- 3) Auditoria genérica
CREATE OR REPLACE FUNCTION public.audit_row()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _old jsonb;
  _new jsonb;
  _diff_old jsonb := '{}'::jsonb;
  _diff_new jsonb := '{}'::jsonb;
  _k text;
  _eid uuid;
  _role text;
  _sensiveis text[] := ARRAY['password','password_hash','token','access_token','refresh_token','secret','api_key','client_secret','invite_token'];
BEGIN
  IF TG_OP <> 'INSERT' THEN _old := to_jsonb(OLD); END IF;
  IF TG_OP <> 'DELETE' THEN _new := to_jsonb(NEW); END IF;

  -- remove campos sensíveis
  FOREACH _k IN ARRAY _sensiveis LOOP
    IF _old ? _k THEN _old := jsonb_set(_old, ARRAY[_k], '"[oculto]"'::jsonb); END IF;
    IF _new ? _k THEN _new := jsonb_set(_new, ARRAY[_k], '"[oculto]"'::jsonb); END IF;
  END LOOP;

  BEGIN
    _eid := COALESCE(_new->>'id', _old->>'id')::uuid;
  EXCEPTION WHEN OTHERS THEN _eid := NULL;
  END;

  IF TG_OP = 'UPDATE' THEN
    FOR _k IN SELECT jsonb_object_keys(_new) LOOP
      IF (_new->_k) IS DISTINCT FROM (_old->_k) THEN
        _diff_old := _diff_old || jsonb_build_object(_k, _old->_k);
        _diff_new := _diff_new || jsonb_build_object(_k, _new->_k);
      END IF;
    END LOOP;
    IF _diff_new = '{}'::jsonb THEN RETURN NEW; END IF;
    _old := _diff_old;
    _new := _diff_new;
  END IF;

  IF auth.uid() IS NULL THEN
    _role := 'sistema';
  ELSIF has_role(auth.uid(), 'admin') THEN
    _role := 'admin';
  ELSE
    _role := COALESCE((SELECT account_type FROM public.profiles WHERE user_id = auth.uid() LIMIT 1), 'usuario');
  END IF;

  INSERT INTO public.platform_events (actor_id, actor_role, action, entity, entity_id, severity, source, before, after)
  VALUES (
    auth.uid(), _role,
    TG_TABLE_NAME || '.' || lower(TG_OP),
    TG_TABLE_NAME, _eid,
    CASE WHEN TG_OP = 'DELETE' THEN 'warning' ELSE 'info' END,
    CASE WHEN auth.uid() IS NULL THEN 'sistema' ELSE 'app' END,
    _old, _new
  );

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
EXCEPTION WHEN OTHERS THEN
  -- auditoria nunca pode quebrar a operação de negócio
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.audit_row() FROM PUBLIC, anon, authenticated;

-- 4) Aplica em todas as tabelas de negócio (exceto ruído/alto volume)
DO $$
DECLARE t record;
BEGIN
  FOR t IN
    SELECT c.relname AS nome
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
      AND c.relname NOT IN (
        'platform_events','admin_audit_log','email_send_log','email_send_state',
        'email_unsubscribe_tokens','supplier_profile_views','notifications',
        'mp_oauth_states','broadcast_gatilho_execucoes','cidades_coordenadas',
        'lead_events','reservation_events'
      )
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS zz_audit_row ON public.%I', t.nome);
    EXECUTE format('CREATE TRIGGER zz_audit_row AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.audit_row()', t.nome);
  END LOOP;
END; $$;

CREATE INDEX IF NOT EXISTS idx_platform_events_actor ON public.platform_events (actor_id, created_at DESC);

-- 5) Retenção configurável (padrão 12 meses)
CREATE OR REPLACE FUNCTION public.purge_platform_events(_meses integer DEFAULT 12)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _n integer;
BEGIN
  IF NOT has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  DELETE FROM public.platform_events WHERE created_at < now() - make_interval(months => GREATEST(_meses,1));
  GET DIAGNOSTICS _n = ROW_COUNT;
  RETURN _n;
END; $$;

REVOKE EXECUTE ON FUNCTION public.purge_platform_events(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.purge_platform_events(integer) TO authenticated;