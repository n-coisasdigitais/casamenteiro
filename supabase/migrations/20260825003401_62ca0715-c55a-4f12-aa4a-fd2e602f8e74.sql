CREATE OR REPLACE FUNCTION public.cancelar_reserva_fornecedor(_reservation_id uuid, _motivo text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _r public.idle_date_reservations;
  _carencia int;
  _taxa numeric := 0;
  _com_custo boolean := false;
  _supplier_user uuid;
  _supplier_nome text;
  _couple_user uuid;
  _base timestamptz;
BEGIN
  SELECT * INTO _r FROM public.idle_date_reservations WHERE id = _reservation_id;
  IF _r.id IS NULL THEN RAISE EXCEPTION 'Reserva não encontrada'; END IF;

  SELECT s.user_id, s.company_name INTO _supplier_user, _supplier_nome
    FROM public.suppliers s WHERE s.id = _r.supplier_id;

  IF _supplier_user IS DISTINCT FROM auth.uid() AND NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  IF _r.status IN ('cancelada','expirada','recusada') THEN
    RAISE EXCEPTION 'Esta reserva já foi encerrada';
  END IF;

  SELECT COALESCE((value->>'dias')::int, (value #>> '{}')::int, 7) INTO _carencia
    FROM public.system_settings WHERE key = 'cancelamento_carencia_dias';
  _carencia := COALESCE(_carencia, 7);

  _base := COALESCE(_r.confirmada_em, _r.solicitada_em);

  IF now() > _base + (_carencia || ' days')::interval THEN
    _com_custo := true;
    SELECT COALESCE((public.calc_platform_fee('cancelamento_data_ociosa', NULL, _r.valor_estimado)->>'valor')::numeric, 0)
      INTO _taxa;
  END IF;

  IF _taxa <= 0 THEN _com_custo := false; END IF;

  UPDATE public.idle_date_reservations SET
    status = 'cancelada',
    cancelada_em = now(),
    cancelada_por = auth.uid(),
    motivo_cancelamento = _motivo,
    taxa_cancelamento = CASE WHEN _com_custo THEN _taxa ELSE 0 END,
    taxa_cancelamento_status = CASE WHEN _com_custo THEN 'pendente' ELSE 'isenta' END,
    taxa_status = CASE WHEN taxa_status = 'paga' THEN 'estornada' WHEN taxa_status = 'pendente' THEN 'isenta' ELSE taxa_status END,
    updated_at = now()
  WHERE id = _reservation_id;

  DELETE FROM public.supplier_blocked_dates
    WHERE supplier_id = _r.supplier_id AND blocked_date = _r.promo_date AND reason = 'Reserva confirmada';

  SELECT user_id INTO _couple_user FROM public.couples WHERE id = _r.couple_id;

  IF _couple_user IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (_couple_user, 'reserva_cancelada', 'Reserva cancelada pelo fornecedor',
      COALESCE(_supplier_nome,'O fornecedor') || ' cancelou a data ' || to_char(_r.promo_date,'DD/MM/YYYY') || '.' ||
      CASE WHEN _motivo IS NOT NULL AND _motivo <> '' THEN ' Motivo: ' || _motivo ELSE '' END ||
      ' Você pode buscar outra data ou outro fornecedor na plataforma.',
      '/minhas-reservas');
  END IF;

  IF _supplier_user IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (_supplier_user, 'reserva_cancelada', 'Você cancelou uma reserva',
      'A data ' || to_char(_r.promo_date,'DD/MM/YYYY') || ' foi liberada na sua agenda.' ||
      CASE WHEN _com_custo THEN ' Uma taxa de cancelamento ficou pendente.' ELSE ' Cancelamento sem custo (dentro do prazo de carência).' END,
      '/fornecedor/painel?tab=reservas');
  END IF;

  RETURN jsonb_build_object('com_custo', _com_custo, 'taxa', _taxa, 'carencia_dias', _carencia);
END;
$$;

REVOKE ALL ON FUNCTION public.cancelar_reserva_fornecedor(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancelar_reserva_fornecedor(uuid, text) TO authenticated;