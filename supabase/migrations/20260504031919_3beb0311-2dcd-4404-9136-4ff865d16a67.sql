-- Sincroniza budget_items quando um couple_supplier é marcado como contratado
CREATE OR REPLACE FUNCTION public.sync_budget_on_contract()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _amount numeric;
  _category_slug text := 'outros';
  _description text := 'Fornecedor contratado';
  _existing uuid;
BEGIN
  IF NEW.status <> 'contracted' THEN
    RETURN NEW;
  END IF;

  _amount := COALESCE(NEW.final_value, NEW.contract_value, NEW.proposed_value, NEW.estimated_value, 0);

  IF NEW.category_id IS NOT NULL THEN
    SELECT COALESCE(slug, name) INTO _category_slug FROM public.categories WHERE id = NEW.category_id;
  END IF;

  SELECT COALESCE(company_name, 'Fornecedor contratado') INTO _description
  FROM public.suppliers WHERE id = NEW.supplier_id;

  SELECT id INTO _existing
  FROM public.budget_items
  WHERE couple_id = NEW.couple_id AND supplier_id = NEW.supplier_id
  LIMIT 1;

  IF _existing IS NOT NULL THEN
    UPDATE public.budget_items
    SET estimated_cost = COALESCE(NULLIF(_amount,0), estimated_cost),
        final_cost = COALESCE(NULLIF(_amount,0), final_cost),
        status = 'contracted',
        category = _category_slug,
        description = _description,
        updated_at = now()
    WHERE id = _existing;
  ELSE
    INSERT INTO public.budget_items (couple_id, supplier_id, category, description, estimated_cost, final_cost, status)
    VALUES (NEW.couple_id, NEW.supplier_id, _category_slug, _description, COALESCE(_amount, 0), COALESCE(_amount, 0), 'contracted');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_budget_on_contract ON public.couple_suppliers;
CREATE TRIGGER trg_sync_budget_on_contract
AFTER INSERT OR UPDATE OF status, final_value, contract_value, proposed_value, estimated_value
ON public.couple_suppliers
FOR EACH ROW
EXECUTE FUNCTION public.sync_budget_on_contract();