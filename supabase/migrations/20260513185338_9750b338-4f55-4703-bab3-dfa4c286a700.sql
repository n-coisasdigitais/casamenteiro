
-- RPC for partner to link via invite code
CREATE OR REPLACE FUNCTION public.link_partner_by_invite_code(_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _target_couple_id uuid;
  _linker_couple_id uuid;
  _has_data boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  SELECT id INTO _target_couple_id
  FROM public.couples
  WHERE invite_code = lower(trim(_code))
     OR invite_code = trim(_code)
  LIMIT 1;

  IF _target_couple_id IS NULL THEN
    RAISE EXCEPTION 'Código inválido';
  END IF;

  IF EXISTS (SELECT 1 FROM public.couples WHERE id = _target_couple_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Esse é o seu próprio código';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.couple_links
    WHERE couple_id = _target_couple_id AND linked_user_id = auth.uid()
  ) THEN
    RETURN jsonb_build_object('couple_id', _target_couple_id, 'already', true);
  END IF;

  -- A linked user can only belong to one couple
  IF EXISTS (SELECT 1 FROM public.couple_links WHERE linked_user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Você já está vinculado a outro casamento. Desvincule antes.';
  END IF;

  -- Remove linker's own empty couple, if it has no data
  SELECT id INTO _linker_couple_id
  FROM public.couples
  WHERE user_id = auth.uid()
  LIMIT 1;

  IF _linker_couple_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.budget_items WHERE couple_id = _linker_couple_id
      UNION ALL
      SELECT 1 FROM public.couple_suppliers WHERE couple_id = _linker_couple_id
      UNION ALL
      SELECT 1 FROM public.guest_invites WHERE couple_id = _linker_couple_id
      UNION ALL
      SELECT 1 FROM public.wedding_tasks WHERE couple_id = _linker_couple_id
      UNION ALL
      SELECT 1 FROM public.wedding_guests WHERE couple_id = _linker_couple_id
    ) INTO _has_data;

    IF _has_data THEN
      RAISE EXCEPTION 'Sua conta já tem dados de casamento preenchidos. Não é possível vincular sem perder esses dados.';
    END IF;

    DELETE FROM public.couples WHERE id = _linker_couple_id;
  END IF;

  INSERT INTO public.couple_links (couple_id, linked_user_id)
  VALUES (_target_couple_id, auth.uid());

  RETURN jsonb_build_object('couple_id', _target_couple_id, 'already', false);
END;
$$;

-- Allow members of a couple link to remove it (self-unlink or owner-removed)
DROP POLICY IF EXISTS "Members can unlink" ON public.couple_links;
CREATE POLICY "Members can unlink"
ON public.couple_links
FOR DELETE
USING (
  auth.uid() = linked_user_id
  OR EXISTS (
    SELECT 1 FROM public.couples c
    WHERE c.id = couple_links.couple_id AND c.user_id = auth.uid()
  )
);
