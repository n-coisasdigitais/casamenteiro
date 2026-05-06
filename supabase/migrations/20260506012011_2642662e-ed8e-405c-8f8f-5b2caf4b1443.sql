-- 1) Coluna max_companions
ALTER TABLE public.wedding_guests
  ADD COLUMN IF NOT EXISTS max_companions integer NOT NULL DEFAULT 0;

-- 2) Trigger: ao criar um quote, garante o fornecedor no plano (couple_suppliers) com kanban_status = 'em_orcamento'
CREATE OR REPLACE FUNCTION public.sync_quote_to_couple_supplier()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_category_id uuid;
  v_existing_id uuid;
  v_existing_status text;
BEGIN
  SELECT category_id INTO v_category_id FROM public.suppliers WHERE id = NEW.supplier_id;

  SELECT id, kanban_status INTO v_existing_id, v_existing_status
  FROM public.couple_suppliers
  WHERE couple_id = NEW.couple_id AND supplier_id = NEW.supplier_id
  LIMIT 1;

  IF v_existing_id IS NULL THEN
    INSERT INTO public.couple_suppliers (couple_id, supplier_id, category_id, kanban_status, status)
    VALUES (NEW.couple_id, NEW.supplier_id, v_category_id, 'em_orcamento', 'saved');
  ELSIF v_existing_status NOT IN ('contratado', 'descartado', 'negociando') THEN
    UPDATE public.couple_suppliers
       SET kanban_status = 'em_orcamento',
           updated_at = now()
     WHERE id = v_existing_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_quote_to_couple_supplier ON public.quotes;
CREATE TRIGGER trg_sync_quote_to_couple_supplier
AFTER INSERT ON public.quotes
FOR EACH ROW EXECUTE FUNCTION public.sync_quote_to_couple_supplier();