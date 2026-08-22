CREATE OR REPLACE FUNCTION public.notificar_casal_do_lead(_quote_id uuid, _title text, _body text, _link text DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_couple_id uuid;
  v_count integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;
  IF coalesce(trim(_title), '') = '' OR length(_title) > 200 OR length(coalesce(_body, '')) > 500 THEN
    RAISE EXCEPTION 'Conteúdo inválido';
  END IF;

  SELECT q.couple_id INTO v_couple_id
  FROM public.quotes q
  JOIN public.suppliers s ON s.id = q.supplier_id
  WHERE q.id = _quote_id AND s.user_id = auth.uid();

  IF v_couple_id IS NULL THEN
    RAISE EXCEPTION 'Sem permissão para este orçamento';
  END IF;

  INSERT INTO public.notifications (user_id, type, title, body, link)
  SELECT u, 'quote_reminder', _title, _body, _link
  FROM (
    SELECT c.user_id AS u FROM public.couples c WHERE c.id = v_couple_id AND c.user_id IS NOT NULL
    UNION
    SELECT c.partner2_user_id FROM public.couples c WHERE c.id = v_couple_id AND c.partner2_user_id IS NOT NULL
  ) t;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.notificar_casal_do_lead(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.notificar_casal_do_lead(uuid, text, text, text) TO authenticated, service_role;