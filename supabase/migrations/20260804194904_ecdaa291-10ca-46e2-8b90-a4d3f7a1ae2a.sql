CREATE OR REPLACE FUNCTION public.on_idle_reservation_confirmed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _couple_user uuid;
  _supplier_user uuid;
  _supplier_nome text;
  _quote_id uuid;
  _quando text;
  _texto text;
BEGIN
  IF NEW.status = 'confirmada' AND (OLD.status IS DISTINCT FROM 'confirmada') THEN
    INSERT INTO public.supplier_blocked_dates (supplier_id, blocked_date, reason)
    VALUES (NEW.supplier_id, NEW.promo_date, 'Reserva confirmada')
    ON CONFLICT DO NOTHING;

    SELECT c.user_id INTO _couple_user FROM public.couples c WHERE c.id = NEW.couple_id;
    SELECT s.user_id, s.company_name INTO _supplier_user, _supplier_nome
      FROM public.suppliers s WHERE s.id = NEW.supplier_id;

    _quando := to_char(COALESCE(NEW.confirmada_em, now()) AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY "às" HH24:MI');

    _texto := COALESCE(_supplier_nome,'O fornecedor') || ' confirmou a data ' ||
      to_char(NEW.promo_date,'DD/MM/YYYY') || ' em ' || _quando || '. ' ||
      'A plataforma apenas intermedia a reserva: entrem em contato para alinhar os detalhes e formalizar um contrato entre vocês, deixando tudo documentado.';

    IF _couple_user IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, body, link)
      VALUES (_couple_user, 'reserva_confirmada', 'Sua reserva foi confirmada!', _texto, '/minhas-reservas');
    END IF;

    IF _supplier_user IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, body, link)
      VALUES (_supplier_user, 'reserva_confirmada', 'Você confirmou uma data',
        'Reserva de ' || to_char(NEW.promo_date,'DD/MM/YYYY') || ' confirmada em ' || _quando ||
        '. Combine os detalhes com o casal e formalizem um contrato entre vocês.',
        '/fornecedor/painel?tab=reservas');
    END IF;

    SELECT q.id INTO _quote_id FROM public.quotes q
      WHERE q.couple_id = NEW.couple_id AND q.supplier_id = NEW.supplier_id
      ORDER BY q.created_at DESC LIMIT 1;

    IF _quote_id IS NOT NULL AND _supplier_user IS NOT NULL THEN
      INSERT INTO public.quote_messages (quote_id, sender_id, message, is_template)
      VALUES (_quote_id, _supplier_user, _texto, true);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;