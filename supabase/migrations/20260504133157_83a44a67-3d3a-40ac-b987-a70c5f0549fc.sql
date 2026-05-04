-- Sincroniza couple_suppliers com proposta enviada pelo fornecedor
CREATE OR REPLACE FUNCTION public.sync_couple_supplier_on_proposal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _quote record;
  _supplier_user uuid;
  _existing record;
BEGIN
  -- só nos importa proposta com valor numérico
  IF NEW.amount IS NULL THEN RETURN NEW; END IF;

  SELECT q.couple_id, q.supplier_id INTO _quote
  FROM public.quotes q WHERE q.id = NEW.quote_id;
  IF _quote.couple_id IS NULL OR _quote.supplier_id IS NULL THEN RETURN NEW; END IF;

  SELECT user_id INTO _supplier_user FROM public.suppliers WHERE id = _quote.supplier_id;

  -- só dispara quando quem envia é o fornecedor (proposta/contraproposta)
  IF NEW.sender_id IS DISTINCT FROM _supplier_user THEN RETURN NEW; END IF;

  -- procura registro existente
  SELECT id, kanban_status, category_id INTO _existing
  FROM public.couple_suppliers
  WHERE couple_id = _quote.couple_id AND supplier_id = _quote.supplier_id
  LIMIT 1;

  IF _existing.id IS NOT NULL THEN
    -- não mexer em contratado nem descartado
    IF _existing.kanban_status IN ('contratado','descartado') THEN
      UPDATE public.couple_suppliers
        SET proposed_value = NEW.amount, updated_at = now()
        WHERE id = _existing.id;
    ELSE
      UPDATE public.couple_suppliers
        SET proposed_value = NEW.amount,
            kanban_status = 'negociando',
            updated_at = now()
        WHERE id = _existing.id;
    END IF;
  ELSE
    INSERT INTO public.couple_suppliers
      (couple_id, supplier_id, category_id, status, kanban_status, proposed_value, estimated_value)
    SELECT _quote.couple_id, _quote.supplier_id, s.category_id, 'saved', 'negociando', NEW.amount, NEW.amount
    FROM public.suppliers s WHERE s.id = _quote.supplier_id;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_sync_couple_supplier_on_proposal ON public.quote_proposals;
CREATE TRIGGER trg_sync_couple_supplier_on_proposal
AFTER INSERT ON public.quote_proposals
FOR EACH ROW EXECUTE FUNCTION public.sync_couple_supplier_on_proposal();