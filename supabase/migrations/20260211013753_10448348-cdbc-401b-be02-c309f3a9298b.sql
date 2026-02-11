
-- Drop recursive policies
DROP POLICY IF EXISTS "Couple owner can read" ON public.couples;
DROP POLICY IF EXISTS "Couple owner can update" ON public.couples;
DROP POLICY IF EXISTS "Couple links readable by members" ON public.couple_links;
DROP POLICY IF EXISTS "Couple owner can insert link" ON public.couple_links;

-- Recreate couples policies without referencing couple_links
CREATE POLICY "Couple owner can read" ON public.couples
  FOR SELECT USING (
    auth.uid() = user_id
    OR id = public.get_couple_id_for_user(auth.uid())
  );

CREATE POLICY "Couple owner can update" ON public.couples
  FOR UPDATE USING (
    auth.uid() = user_id
    OR id = public.get_couple_id_for_user(auth.uid())
  );

-- Recreate couple_links policies without referencing couples
CREATE POLICY "Couple links readable by members" ON public.couple_links
  FOR SELECT USING (
    auth.uid() = linked_user_id
    OR couple_id = public.get_couple_id_for_user(auth.uid())
  );

CREATE POLICY "Couple owner can insert link" ON public.couple_links
  FOR INSERT WITH CHECK (
    couple_id = public.get_couple_id_for_user(auth.uid())
  );
