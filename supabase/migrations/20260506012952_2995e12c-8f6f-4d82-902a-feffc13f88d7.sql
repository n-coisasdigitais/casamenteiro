
-- 1. Marcar simulação ativa (a que virou plano)
ALTER TABLE public.home_simulacoes
  ADD COLUMN IF NOT EXISTS is_active_plan boolean NOT NULL DEFAULT false;

-- 2. Permitir o casal/dono apagar simulações que NÃO viraram o plano
DROP POLICY IF EXISTS "Dono apaga simulação não ativa" ON public.home_simulacoes;
CREATE POLICY "Dono apaga simulação não ativa"
ON public.home_simulacoes
FOR DELETE
USING (
  is_active_plan = false
  AND (
    (user_id IS NOT NULL AND user_id = auth.uid())
    OR (couple_id IS NOT NULL AND couple_id = public.get_couple_id_for_user(auth.uid()))
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);

-- 3. Notifica fornecedor quando o casal descarta (kanban_status -> descartado)
CREATE OR REPLACE FUNCTION public.notify_supplier_on_discard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _supplier_user uuid;
  _couple_name text;
BEGIN
  IF NEW.kanban_status = 'descartado'
     AND (OLD.kanban_status IS DISTINCT FROM 'descartado') THEN
    SELECT user_id INTO _supplier_user FROM public.suppliers WHERE id = NEW.supplier_id;
    SELECT COALESCE(p.full_name, 'Um casal') INTO _couple_name
      FROM public.couples c
      LEFT JOIN public.profiles p ON p.user_id = c.user_id
      WHERE c.id = NEW.couple_id;
    IF _supplier_user IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, body, link)
      VALUES (
        _supplier_user,
        'quote_discarded',
        'Casal desistiu da contratação',
        COALESCE(_couple_name, 'Um casal') || ' não seguirá com seus serviços neste momento.',
        '/painel-fornecedor?tab=quotes'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_supplier_on_discard ON public.couple_suppliers;
CREATE TRIGGER trg_notify_supplier_on_discard
AFTER UPDATE OF kanban_status ON public.couple_suppliers
FOR EACH ROW EXECUTE FUNCTION public.notify_supplier_on_discard();
