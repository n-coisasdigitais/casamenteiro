CREATE OR REPLACE FUNCTION public.admin_suppliers_contacts()
RETURNS TABLE(id uuid, phone text, whatsapp text, email text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.phone, s.whatsapp, s.email
  FROM public.suppliers s
  WHERE public.has_role(auth.uid(), 'admin');
$$;

REVOKE EXECUTE ON FUNCTION public.admin_suppliers_contacts() FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_suppliers_contacts() TO authenticated;

-- contatos dos fornecedores contratados/negociados pelo casal (uso em massa)
CREATE OR REPLACE FUNCTION public.my_supplier_contacts(_ids uuid[])
RETURNS TABLE(id uuid, phone text, whatsapp text, email text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.phone, s.whatsapp, s.email
  FROM public.suppliers s
  WHERE s.id = ANY(_ids)
    AND (
      s.user_id = auth.uid()
      OR public.has_role(auth.uid(),'admin')
      OR EXISTS (SELECT 1 FROM public.quotes q WHERE q.supplier_id = s.id AND q.couple_id = public.get_couple_id_for_user(auth.uid()))
      OR EXISTS (SELECT 1 FROM public.couple_suppliers cs WHERE cs.supplier_id = s.id AND cs.couple_id = public.get_couple_id_for_user(auth.uid()))
      OR EXISTS (SELECT 1 FROM public.idle_date_reservations r WHERE r.supplier_id = s.id AND r.couple_id = public.get_couple_id_for_user(auth.uid()))
    );
$$;

REVOKE EXECUTE ON FUNCTION public.my_supplier_contacts(uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.my_supplier_contacts(uuid[]) TO authenticated;