
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
        SET is_completed = true,
            completed_at = now(),
            auto_completed_at = now(),
            auto_completed_source = 'kanban_contracted'
        WHERE couple_id = NEW.couple_id
          AND is_completed = false
          AND (category = _cat_slug OR category ILIKE _cat_slug || '%');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
