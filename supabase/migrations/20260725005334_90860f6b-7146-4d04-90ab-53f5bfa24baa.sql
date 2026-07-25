
-- 1) coluna
ALTER TABLE public.wedding_tasks
  ADD COLUMN IF NOT EXISTS seeded_as_backlog boolean NOT NULL DEFAULT false;

-- 2) revisar prioridades: manter 23 essenciais
UPDATE public.default_tasks
  SET priority = 'recommended'
  WHERE priority = 'essential'
    AND sort_order IN (9,10,11,12,16,22,28,29,32,33,36,41,43,51,64,66,76,77);

-- 3) helper: meses até casamento (inteiro, floor)
CREATE OR REPLACE FUNCTION public._meses_ate(_wedding_date date)
RETURNS integer
LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN _wedding_date IS NULL THEN NULL
    ELSE GREATEST(0, ((_wedding_date - CURRENT_DATE) / 30)::int)
  END
$$;

-- 4) helper: due_period está vencido em relação a meses_ate?
CREATE OR REPLACE FUNCTION public._periodo_vencido(_due_period text, _wedding_date date)
RETURNS boolean
LANGUAGE plpgsql IMMUTABLE
SET search_path = public
AS $$
DECLARE
  _dias int;
  _meses int;
BEGIN
  IF _wedding_date IS NULL THEN RETURN false; END IF;
  _dias := _wedding_date - CURRENT_DATE;
  _meses := _dias / 30;
  RETURN CASE _due_period
    WHEN '10-12 meses'      THEN _meses < 10
    WHEN '7-9 meses'        THEN _meses < 7
    WHEN '4-6 meses'        THEN _meses < 4
    WHEN '2-3 meses'        THEN _meses < 2
    WHEN 'ultimo-mes'       THEN _dias < 30
    WHEN 'ultima-semana'    THEN _dias < 7
    WHEN 'dia-do-casamento' THEN false
    ELSE false
  END;
END;
$$;

-- 5) semeadura inteligente
CREATE OR REPLACE FUNCTION public.seed_default_tasks_smart(_couple_id uuid, _wedding_date date DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _meses int;
  _prazo_curto boolean;
BEGIN
  _meses := public._meses_ate(_wedding_date);
  _prazo_curto := _meses IS NOT NULL AND _meses < 6;

  -- limpar tarefas não customizadas anteriores
  DELETE FROM public.wedding_tasks WHERE couple_id = _couple_id AND is_custom = false;

  IF _prazo_curto THEN
    -- só essenciais
    INSERT INTO public.wedding_tasks
      (couple_id, title, category, priority, due_period, sort_order, action_label, action_url, seeded_as_backlog, due_date)
    SELECT
      _couple_id, dt.title, dt.category, dt.priority, dt.due_period, dt.sort_order, dt.action_label, dt.action_url,
      public._periodo_vencido(dt.due_period, _wedding_date),
      CASE WHEN public._periodo_vencido(dt.due_period, _wedding_date) THEN NULL ELSE NULL END
    FROM public.default_tasks dt
    WHERE dt.active = true AND dt.priority = 'essential'
    ORDER BY dt.sort_order;

    -- marcador para expandir
    INSERT INTO public.wedding_tasks
      (couple_id, title, category, priority, due_period, sort_order, action_label, action_url, is_custom)
    VALUES
      (_couple_id, 'Adicionar tarefas detalhadas ao meu plano', 'planejamento', 'optional', NULL, 999,
       'Adicionar todas', '/tarefas?expandir=1', true);
  ELSE
    -- semeadura completa
    INSERT INTO public.wedding_tasks
      (couple_id, title, category, priority, due_period, sort_order, action_label, action_url, seeded_as_backlog)
    SELECT
      _couple_id, dt.title, dt.category, dt.priority, dt.due_period, dt.sort_order, dt.action_label, dt.action_url,
      public._periodo_vencido(dt.due_period, _wedding_date)
    FROM public.default_tasks dt
    WHERE dt.active = true
    ORDER BY dt.sort_order;
  END IF;

  -- calcular datas só para tarefas fora do backlog
  PERFORM public.recalc_task_due_dates(_couple_id);

  -- limpar due_date do backlog (não pode virar "atrasada")
  UPDATE public.wedding_tasks
    SET due_date = NULL
    WHERE couple_id = _couple_id AND seeded_as_backlog = true;
END;
$$;

-- 6) expandir sob demanda
CREATE OR REPLACE FUNCTION public.expandir_tarefas_detalhadas(_couple_id uuid)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _wedding_date date;
  _inseridas int := 0;
BEGIN
  SELECT wedding_date INTO _wedding_date FROM public.couples WHERE id = _couple_id;

  INSERT INTO public.wedding_tasks
    (couple_id, title, category, priority, due_period, sort_order, action_label, action_url, seeded_as_backlog)
  SELECT
    _couple_id, dt.title, dt.category, dt.priority, dt.due_period, dt.sort_order, dt.action_label, dt.action_url,
    public._periodo_vencido(dt.due_period, _wedding_date)
  FROM public.default_tasks dt
  WHERE dt.active = true
    AND dt.priority <> 'essential'
    AND NOT EXISTS (
      SELECT 1 FROM public.wedding_tasks wt
      WHERE wt.couple_id = _couple_id
        AND wt.is_custom = false
        AND wt.title = dt.title
    )
  ORDER BY dt.sort_order;

  GET DIAGNOSTICS _inseridas = ROW_COUNT;

  -- remover marcador
  DELETE FROM public.wedding_tasks
    WHERE couple_id = _couple_id
      AND is_custom = true
      AND action_url = '/tarefas?expandir=1';

  PERFORM public.recalc_task_due_dates(_couple_id);

  UPDATE public.wedding_tasks
    SET due_date = NULL
    WHERE couple_id = _couple_id AND seeded_as_backlog = true;

  RETURN _inseridas;
END;
$$;

-- 7) trigger de onboarding passa a usar smart
CREATE OR REPLACE FUNCTION public.trigger_seed_tasks_on_onboarding()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.onboarding_completed = true AND (OLD.onboarding_completed = false OR OLD.onboarding_completed IS NULL) THEN
    PERFORM public.seed_default_tasks_smart(NEW.id, NEW.wedding_date);
  END IF;
  RETURN NEW;
END;
$$;
