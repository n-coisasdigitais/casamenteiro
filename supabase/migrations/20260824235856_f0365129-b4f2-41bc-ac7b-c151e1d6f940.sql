DROP POLICY IF EXISTS "Approved suppliers are public" ON public.suppliers;

CREATE POLICY "Approved suppliers are public"
ON public.suppliers
FOR SELECT
TO public
USING (
  (
    status = 'approved'::public.supplier_status
    AND (
      is_demo = false
      OR public.is_demo_user(auth.uid())
    )
  )
  OR auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);