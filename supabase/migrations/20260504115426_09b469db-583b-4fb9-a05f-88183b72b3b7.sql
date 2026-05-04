
-- 1. Status do kanban no fornecedor do casal
ALTER TABLE public.couple_suppliers
  ADD COLUMN IF NOT EXISTS kanban_status text NOT NULL DEFAULT 'nao_iniciado',
  ADD COLUMN IF NOT EXISTS kanban_order int NOT NULL DEFAULT 0;

-- 2. Marcar tarefas concluídas pelo sistema (se ainda não houver completed_at)
ALTER TABLE public.wedding_tasks
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS auto_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS auto_completed_source text;

-- 3. Cidade/estilo do plano (vem da simulação)
ALTER TABLE public.couples
  ADD COLUMN IF NOT EXISTS wedding_city text,
  ADD COLUMN IF NOT EXISTS wedding_style text;

-- 4. Trigger: ao mudar kanban_status para 'contratado',
--    sincroniza status legado e marca tarefas correspondentes como concluídas.
CREATE OR REPLACE FUNCTION public.handle_kanban_contracted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _cat_slug text;
BEGIN
  IF NEW.kanban_status = 'contratado'
     AND (OLD.kanban_status IS DISTINCT FROM 'contratado') THEN
    NEW.status := 'contracted';
    NEW.contracted_at := COALESCE(NEW.contracted_at, now());

    SELECT COALESCE(slug, name) INTO _cat_slug
      FROM public.categories WHERE id = NEW.category_id;

    IF _cat_slug IS NOT NULL THEN
      UPDATE public.wedding_tasks
        SET completed = true,
            completed_at = now(),
            auto_completed_at = now(),
            auto_completed_source = 'kanban_contracted'
        WHERE couple_id = NEW.couple_id
          AND completed = false
          AND (category = _cat_slug OR category ILIKE _cat_slug || '%');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_kanban_contracted ON public.couple_suppliers;
CREATE TRIGGER trg_kanban_contracted
  BEFORE UPDATE ON public.couple_suppliers
  FOR EACH ROW EXECUTE FUNCTION public.handle_kanban_contracted();

-- 5. Garantir trigger de sync de orçamento já existente continue ligado
DROP TRIGGER IF EXISTS trg_sync_budget_on_contract ON public.couple_suppliers;
CREATE TRIGGER trg_sync_budget_on_contract
  AFTER INSERT OR UPDATE ON public.couple_suppliers
  FOR EACH ROW EXECUTE FUNCTION public.sync_budget_on_contract();
