CREATE OR REPLACE FUNCTION public.notify_supplier_on_quote()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _supplier_user UUID;
BEGIN
  SELECT user_id INTO _supplier_user
  FROM public.suppliers WHERE id = NEW.supplier_id;
  IF _supplier_user IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (
      _supplier_user,
      'quote_received',
      'Novo pedido de orçamento!',
      'Você recebeu um novo pedido de orçamento. Responda rápido para aumentar suas chances.',
      '/fornecedor/painel?tab=quotes&quote=' || NEW.id::text
    );
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.notify_supplier_on_quote() FROM anon, authenticated, PUBLIC;

CREATE OR REPLACE FUNCTION public.notify_on_proposal()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _couple_user UUID;
  _supplier_user UUID;
  _is_supplier BOOLEAN;
  _target_user UUID;
  _link TEXT;
BEGIN
  SELECT c.user_id, s.user_id
    INTO _couple_user, _supplier_user
  FROM public.quotes q
  JOIN public.couples c ON c.id = q.couple_id
  JOIN public.suppliers s ON s.id = q.supplier_id
  WHERE q.id = NEW.quote_id;

  _is_supplier := (NEW.sender_id = _supplier_user);
  IF _is_supplier THEN
    _target_user := _couple_user;
    _link := '/orcamento?quote=' || NEW.quote_id::text;
  ELSE
    _target_user := _supplier_user;
    _link := '/fornecedor/painel?tab=quotes&quote=' || NEW.quote_id::text;
  END IF;

  IF _target_user IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (
      _target_user,
      'proposal_received',
      CASE WHEN NEW.kind = 'discount_request' THEN 'Pedido de desconto recebido'
           WHEN NEW.kind = 'counter' THEN 'Contraproposta recebida'
           ELSE 'Nova proposta recebida' END,
      COALESCE(NEW.description, 'Abra para ver detalhes da negociação.'),
      _link
    );
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.notify_on_proposal() FROM anon, authenticated, PUBLIC;

CREATE OR REPLACE FUNCTION public.notify_supplier_on_quote_accepted()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _supplier_user UUID;
  _couple_name TEXT;
BEGIN
  IF NEW.status = 'accepted' AND COALESCE(OLD.status,'') <> 'accepted' THEN
    SELECT s.user_id INTO _supplier_user
    FROM public.suppliers s WHERE s.id = NEW.supplier_id;
    SELECT COALESCE(p.full_name, c.partner_name, 'Casal') INTO _couple_name
    FROM public.couples c
    LEFT JOIN public.profiles p ON p.user_id = c.user_id
    WHERE c.id = NEW.couple_id;
    IF _supplier_user IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, body, link)
      VALUES (
        _supplier_user,
        'quote_contracted',
        'Você foi contratado!',
        COALESCE(_couple_name, 'Um casal') || ' marcou sua proposta como contratada.',
        '/fornecedor/painel?tab=quotes&quote=' || NEW.id::text
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.notify_supplier_on_quote_accepted() FROM anon, authenticated, PUBLIC;

DROP TRIGGER IF EXISTS trg_notify_supplier_on_quote_accepted ON public.quotes;
CREATE TRIGGER trg_notify_supplier_on_quote_accepted
AFTER UPDATE OF status ON public.quotes
FOR EACH ROW EXECUTE FUNCTION public.notify_supplier_on_quote_accepted();