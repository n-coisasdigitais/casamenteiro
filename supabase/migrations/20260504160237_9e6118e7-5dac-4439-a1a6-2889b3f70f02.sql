
-- Admin leitura ampla
CREATE POLICY "Admin can view all wedding tasks" ON public.wedding_tasks
FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can view all wedding guests" ON public.wedding_guests
FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can view all budget items" ON public.budget_items
FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can view all budget payments" ON public.budget_payments
FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can view all couple suppliers" ON public.couple_suppliers
FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can view all suppliers" ON public.suppliers
FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can view all quotes" ON public.quotes
FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- Função para campanhas push (admin envia notification para vários users)
CREATE OR REPLACE FUNCTION public.admin_broadcast_notification(
  _segment text,
  _title text,
  _body text,
  _link text DEFAULT NULL
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count integer := 0;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  IF _segment = 'couples' THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    SELECT user_id, 'admin_broadcast', _title, _body, _link
    FROM public.profiles WHERE account_type = 'couple';
  ELSIF _segment = 'suppliers' THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    SELECT user_id, 'admin_broadcast', _title, _body, _link
    FROM public.profiles WHERE account_type = 'supplier';
  ELSIF _segment = 'all' THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    SELECT user_id, 'admin_broadcast', _title, _body, _link
    FROM public.profiles WHERE account_type IN ('couple','supplier');
  ELSE
    RAISE EXCEPTION 'Segmento inválido';
  END IF;

  GET DIAGNOSTICS _count = ROW_COUNT;
  RETURN _count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_broadcast_notification(text,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_broadcast_notification(text,text,text,text) TO authenticated;
