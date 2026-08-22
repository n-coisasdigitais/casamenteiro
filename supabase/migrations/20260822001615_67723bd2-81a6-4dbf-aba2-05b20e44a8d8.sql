CREATE OR REPLACE FUNCTION public.marcar_indicacao_assinatura(_supplier_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _ev public.supplier_referral_events;
  _ref public.supplier_referrals;
  _pct numeric;
  _credit_id uuid;
  _user_id uuid;
BEGIN
  SELECT user_id INTO _user_id FROM public.suppliers WHERE id = _supplier_id;

  SELECT e.* INTO _ev
  FROM public.supplier_referral_events e
  WHERE e.indicado_supplier_id = _supplier_id
     OR (_user_id IS NOT NULL AND e.indicado_user_id = _user_id)
  ORDER BY e.created_at
  LIMIT 1;

  IF _ev.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'sem_indicacao');
  END IF;

  SELECT * INTO _ref FROM public.supplier_referrals WHERE id = _ev.referral_id;

  UPDATE public.supplier_referral_events
  SET status = 'assinou',
      indicado_supplier_id = coalesce(indicado_supplier_id, _supplier_id)
  WHERE id = _ev.id;

  IF _ev.bonus_assinatura_credit_id IS NULL AND _ref.id IS NOT NULL THEN
    _pct := coalesce((SELECT (value->>'pct_assinatura')::numeric FROM public.system_settings WHERE key = 'indicacao_fornecedor'), 50);
    INSERT INTO public.supplier_credits(supplier_id, origem, origem_id, tipo, valor, ciclos_total, ciclos_restantes, status, motivo)
    VALUES (_ref.supplier_id, 'indicacao', _ev.id, 'percentual', _pct, 1, 1, 'pendente', 'Indicação: assinatura confirmada')
    RETURNING id INTO _credit_id;
    UPDATE public.supplier_referral_events SET bonus_assinatura_credit_id = _credit_id WHERE id = _ev.id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'event_id', _ev.id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.marcar_indicacao_assinatura(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.marcar_indicacao_assinatura(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.consumir_creditos_ciclo(_supplier_id uuid, _valor_base numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _c public.supplier_credits;
  _pct_total numeric := 0;
  _fixo numeric := 0;
  _mes_gratis boolean := false;
  _valor_final numeric;
  _usados uuid[] := '{}';
BEGIN
  FOR _c IN
    SELECT * FROM public.supplier_credits
    WHERE supplier_id = _supplier_id
      AND status = 'pendente'
      AND (expira_em IS NULL OR expira_em > now())
    ORDER BY created_at
  LOOP
    IF _c.tipo = 'meses_gratis' THEN
      _mes_gratis := true;
    ELSIF _c.tipo = 'percentual' THEN
      IF _pct_total >= 100 THEN CONTINUE; END IF;
      _pct_total := _pct_total + _c.valor;
    ELSE
      _fixo := _fixo + _c.valor;
    END IF;
    _usados := _usados || _c.id;
    EXIT WHEN _mes_gratis OR _pct_total >= 100;
  END LOOP;

  IF array_length(_usados, 1) IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'aplicou', false, 'valor_final', _valor_base);
  END IF;

  IF _mes_gratis THEN
    _valor_final := 0;
  ELSE
    _valor_final := round(greatest(0, _valor_base * (1 - least(_pct_total, 100) / 100) - _fixo), 2);
  END IF;

  UPDATE public.supplier_credits
  SET status = CASE WHEN ciclos_restantes <= 1 THEN 'consumido' ELSE 'aplicado' END,
      ciclos_restantes = greatest(0, ciclos_restantes - 1),
      valor_original = _valor_base,
      valor_com_desconto = _valor_final,
      aplicado_em = coalesce(aplicado_em, now()),
      encerrado_em = CASE WHEN ciclos_restantes <= 1 THEN now() ELSE encerrado_em END
  WHERE id = ANY(_usados);

  RETURN jsonb_build_object(
    'ok', true, 'aplicou', true, 'valor_final', _valor_final,
    'pct', least(_pct_total, 100), 'fixo', _fixo, 'mes_gratis', _mes_gratis,
    'creditos', to_jsonb(_usados)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.consumir_creditos_ciclo(uuid, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consumir_creditos_ciclo(uuid, numeric) TO service_role;