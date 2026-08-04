ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS reserva_antecedencia_min_dias integer NOT NULL DEFAULT 15;

ALTER TABLE public.idle_date_reservations
  ADD COLUMN IF NOT EXISTS confirmada_em timestamptz,
  ADD COLUMN IF NOT EXISTS cancelada_em timestamptz,
  ADD COLUMN IF NOT EXISTS cancelada_por uuid,
  ADD COLUMN IF NOT EXISTS motivo_cancelamento text,
  ADD COLUMN IF NOT EXISTS taxa_cancelamento numeric,
  ADD COLUMN IF NOT EXISTS taxa_cancelamento_status text NOT NULL DEFAULT 'nao_aplicavel';

ALTER TABLE public.idle_date_reservations DROP CONSTRAINT IF EXISTS idle_res_taxa_cancel_status_chk;
ALTER TABLE public.idle_date_reservations ADD CONSTRAINT idle_res_taxa_cancel_status_chk
  CHECK (taxa_cancelamento_status = ANY (ARRAY['nao_aplicavel','isenta','pendente','paga','cancelada']));

-- Antecedência mínima na criação da reserva
CREATE OR REPLACE FUNCTION public.validate_reservation_lead_time()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _min int;
  _dias int;
BEGIN
  SELECT COALESCE(reserva_antecedencia_min_dias, 15) INTO _min
  FROM public.suppliers WHERE id = NEW.supplier_id;
  _min := COALESCE(_min, 15);
  _dias := NEW.promo_date - CURRENT_DATE;
  IF _dias < _min THEN
    RAISE EXCEPTION 'Esta data só pode ser reservada com no mínimo % dias de antecedência.', _min;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_reservation_lead_time ON public.idle_date_reservations;
CREATE TRIGGER trg_validate_reservation_lead_time
BEFORE INSERT ON public.idle_date_reservations
FOR EACH ROW EXECUTE FUNCTION public.validate_reservation_lead_time();

-- Cancelamento pelo casal
CREATE OR REPLACE FUNCTION public.cancelar_reserva_casal(_reservation_id uuid, _motivo text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _r public.idle_date_reservations;
  _couple uuid;
  _carencia int;
  _taxa numeric := 0;
  _com_custo boolean := false;
  _supplier_user uuid;
  _couple_user uuid;
BEGIN
  SELECT * INTO _r FROM public.idle_date_reservations WHERE id = _reservation_id;
  IF _r.id IS NULL THEN RAISE EXCEPTION 'Reserva não encontrada'; END IF;

  _couple := public.get_couple_id_for_user(auth.uid());
  IF _r.couple_id <> _couple AND NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  IF _r.status IN ('cancelada','expirada','recusada') THEN
    RAISE EXCEPTION 'Esta reserva já foi encerrada';
  END IF;

  SELECT COALESCE((value->>'dias')::int, (value #>> '{}')::int, 7) INTO _carencia
  FROM public.system_settings WHERE key = 'cancelamento_carencia_dias';
  _carencia := COALESCE(_carencia, 7);

  IF now() > _r.solicitada_em + (_carencia || ' days')::interval THEN
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
    taxa_status = CASE WHEN taxa_status = 'paga' THEN 'estornada' ELSE taxa_status END,
    updated_at = now()
  WHERE id = _reservation_id;

  -- libera a data
  DELETE FROM public.supplier_blocked_dates
    WHERE supplier_id = _r.supplier_id AND blocked_date = _r.promo_date AND reason = 'Reserva confirmada';

  SELECT user_id INTO _supplier_user FROM public.suppliers WHERE id = _r.supplier_id;
  SELECT user_id INTO _couple_user FROM public.couples WHERE id = _r.couple_id;

  IF _supplier_user IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (_supplier_user, 'reserva_cancelada', 'Reserva cancelada pelo casal',
      'A data ' || to_char(_r.promo_date,'DD/MM/YYYY') || ' foi liberada na sua agenda.' ||
      CASE WHEN _r.taxa_status = 'paga' THEN ' A taxa paga será estornada.' ELSE '' END,
      '/fornecedor/painel?tab=reservas');
  END IF;

  IF _couple_user IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (_couple_user, 'reserva_cancelada', 'Reserva cancelada',
      CASE WHEN _com_custo
        THEN 'Como o prazo de carência já passou, há uma taxa de cancelamento pendente.'
        ELSE 'Cancelamento realizado sem custos.' END,
      '/minhas-reservas');
  END IF;

  RETURN jsonb_build_object('cancelada', true, 'com_custo', _com_custo, 'taxa', COALESCE(_taxa,0), 'carencia_dias', _carencia);
END;
$$;