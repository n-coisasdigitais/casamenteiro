
-- Função que recalcula due_date a partir de wedding_date + due_period
CREATE OR REPLACE FUNCTION public.recalc_task_due_dates(_couple_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _wd date;
BEGIN
  SELECT wedding_date INTO _wd FROM public.couples WHERE id = _couple_id;
  IF _wd IS NULL THEN
    UPDATE public.wedding_tasks SET due_date = NULL WHERE couple_id = _couple_id AND is_completed = false;
    RETURN;
  END IF;

  UPDATE public.wedding_tasks SET due_date = CASE due_period
    WHEN '10-12 meses'      THEN (_wd - INTERVAL '10 months')::date
    WHEN '7-9 meses'        THEN (_wd - INTERVAL '7 months')::date
    WHEN '4-6 meses'        THEN (_wd - INTERVAL '4 months')::date
    WHEN '2-3 meses'        THEN (_wd - INTERVAL '2 months')::date
    WHEN 'ultimo-mes'       THEN (_wd - INTERVAL '25 days')::date
    WHEN 'ultima-semana'    THEN (_wd - INTERVAL '7 days')::date
    WHEN 'dia-do-casamento' THEN _wd
    ELSE due_date
  END
  WHERE couple_id = _couple_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.recalc_task_due_dates(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recalc_task_due_dates(uuid) TO authenticated;

-- Trigger: quando wedding_date muda, recalcula
CREATE OR REPLACE FUNCTION public.recalc_dates_on_wedding_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.wedding_date IS DISTINCT FROM OLD.wedding_date THEN
    PERFORM public.recalc_task_due_dates(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS recalc_due_dates_on_wedding_change ON public.couples;
CREATE TRIGGER recalc_due_dates_on_wedding_change
AFTER UPDATE ON public.couples
FOR EACH ROW
EXECUTE FUNCTION public.recalc_dates_on_wedding_change();

-- Trigger: quando seed_default_tasks roda, calcular já no insert
CREATE OR REPLACE FUNCTION public.set_task_due_date_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _wd date;
BEGIN
  IF NEW.due_date IS NOT NULL THEN RETURN NEW; END IF;
  IF NEW.due_period IS NULL THEN RETURN NEW; END IF;

  SELECT wedding_date INTO _wd FROM public.couples WHERE id = NEW.couple_id;
  IF _wd IS NULL THEN RETURN NEW; END IF;

  NEW.due_date := CASE NEW.due_period
    WHEN '10-12 meses'      THEN (_wd - INTERVAL '10 months')::date
    WHEN '7-9 meses'        THEN (_wd - INTERVAL '7 months')::date
    WHEN '4-6 meses'        THEN (_wd - INTERVAL '4 months')::date
    WHEN '2-3 meses'        THEN (_wd - INTERVAL '2 months')::date
    WHEN 'ultimo-mes'       THEN (_wd - INTERVAL '25 days')::date
    WHEN 'ultima-semana'    THEN (_wd - INTERVAL '7 days')::date
    WHEN 'dia-do-casamento' THEN _wd
    ELSE NULL
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_task_due_date ON public.wedding_tasks;
CREATE TRIGGER set_task_due_date
BEFORE INSERT ON public.wedding_tasks
FOR EACH ROW
EXECUTE FUNCTION public.set_task_due_date_on_insert();

-- Recalcular para todos casais existentes que já têm data
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.couples WHERE wedding_date IS NOT NULL LOOP
    PERFORM public.recalc_task_due_dates(r.id);
  END LOOP;
END $$;
