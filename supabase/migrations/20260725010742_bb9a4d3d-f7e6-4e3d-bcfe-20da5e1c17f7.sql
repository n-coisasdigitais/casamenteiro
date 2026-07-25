
CREATE TABLE public.couple_supplier_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_supplier_id uuid NOT NULL REFERENCES public.couple_suppliers(id) ON DELETE CASCADE,
  type text NOT NULL,
  from_status text,
  to_status text,
  payload jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.couple_supplier_events TO authenticated;
GRANT ALL ON public.couple_supplier_events TO service_role;

ALTER TABLE public.couple_supplier_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Casal ve proprios eventos"
  ON public.couple_supplier_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.couple_suppliers cs
      JOIN public.couples c ON c.id = cs.couple_id
      WHERE cs.id = couple_supplier_id AND c.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.couple_suppliers cs
      JOIN public.couple_links cl ON cl.couple_id = cs.couple_id
      WHERE cs.id = couple_supplier_id AND cl.linked_user_id = auth.uid()
    )
  );

CREATE POLICY "Casal registra proprios eventos"
  ON public.couple_supplier_events
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.couple_suppliers cs
      JOIN public.couples c ON c.id = cs.couple_id
      WHERE cs.id = couple_supplier_id AND c.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.couple_suppliers cs
      JOIN public.couple_links cl ON cl.couple_id = cs.couple_id
      WHERE cs.id = couple_supplier_id AND cl.linked_user_id = auth.uid()
    )
  );

CREATE INDEX idx_couple_supplier_events_cs
  ON public.couple_supplier_events (couple_supplier_id, created_at DESC);

-- Trigger genérico: registra mudança de kanban_status
CREATE OR REPLACE FUNCTION public.log_couple_supplier_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.couple_supplier_events (couple_supplier_id, type, to_status, payload)
    VALUES (NEW.id, 'created', NEW.kanban_status, jsonb_build_object('status', NEW.status));
    RETURN NEW;
  END IF;

  IF NEW.kanban_status IS DISTINCT FROM OLD.kanban_status THEN
    INSERT INTO public.couple_supplier_events (couple_supplier_id, type, from_status, to_status)
    VALUES (NEW.id, 'status_change', OLD.kanban_status, NEW.kanban_status);
  END IF;

  IF NEW.status = 'contracted' AND OLD.status IS DISTINCT FROM 'contracted' THEN
    INSERT INTO public.couple_supplier_events (couple_supplier_id, type, to_status, payload)
    VALUES (NEW.id, 'contract',
      NEW.kanban_status,
      jsonb_build_object('value', COALESCE(NEW.contract_value, NEW.final_value, NEW.proposed_value))
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_couple_supplier_events ON public.couple_suppliers;
CREATE TRIGGER trg_log_couple_supplier_events
AFTER INSERT OR UPDATE ON public.couple_suppliers
FOR EACH ROW EXECUTE FUNCTION public.log_couple_supplier_status_change();
