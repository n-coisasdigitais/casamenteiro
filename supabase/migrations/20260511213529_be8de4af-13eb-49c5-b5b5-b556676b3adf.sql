CREATE OR REPLACE FUNCTION public.notify_on_proposal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _couple_user uuid;
  _supplier_user uuid;
  _supplier_name text;
  _quote record;
BEGIN
  SELECT q.user_id, q.supplier_id INTO _quote
  FROM public.quotes q WHERE q.id = NEW.quote_id;

  SELECT user_id, company_name INTO _supplier_user, _supplier_name
  FROM public.suppliers WHERE id = _quote.supplier_id;
  _couple_user := _quote.user_id;

  IF NEW.sender_id = _couple_user AND _supplier_user IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (
      _supplier_user,
      'proposal_received',
      CASE WHEN NEW.kind = 'discount_request' THEN 'Pedido de desconto recebido' ELSE 'Nova mensagem de proposta' END,
      'Acesse o painel para responder.',
      '/painel-fornecedor?tab=quotes&quote=' || NEW.quote_id::text
    );
  ELSIF NEW.sender_id = _supplier_user AND _couple_user IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (
      _couple_user,
      'proposal_received',
      'Você recebeu uma proposta de ' || COALESCE(_supplier_name, 'um fornecedor'),
      CASE WHEN NEW.amount IS NOT NULL THEN 'Valor proposto: R$ ' || NEW.amount::text ELSE 'Confira no seu painel.' END,
      '/orcamento?quote=' || NEW.quote_id::text
    );
  END IF;
  RETURN NEW;
END;
$$;