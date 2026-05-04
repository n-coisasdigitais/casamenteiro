
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS suspended boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
  ADD COLUMN IF NOT EXISTS suspended_reason text;

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  action text NOT NULL,
  target_table text,
  target_id uuid,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin reads audit log" ON public.admin_audit_log;
CREATE POLICY "Admin reads audit log" ON public.admin_audit_log FOR SELECT USING (has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Admin writes audit log" ON public.admin_audit_log;
CREATE POLICY "Admin writes audit log" ON public.admin_audit_log FOR INSERT WITH CHECK (has_role(auth.uid(),'admin') AND admin_id = auth.uid());

DROP POLICY IF EXISTS "Admin can update suppliers" ON public.suppliers;
CREATE POLICY "Admin can update suppliers" ON public.suppliers FOR UPDATE USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Admin can delete suppliers" ON public.suppliers;
CREATE POLICY "Admin can delete suppliers" ON public.suppliers FOR DELETE USING (has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Admin can update couples" ON public.couples;
CREATE POLICY "Admin can update couples" ON public.couples FOR UPDATE USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Admin can update profiles" ON public.profiles;
CREATE POLICY "Admin can update profiles" ON public.profiles FOR UPDATE USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Admin manages roles" ON public.user_roles;
CREATE POLICY "Admin manages roles" ON public.user_roles FOR ALL USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.admin_set_user_suspended(_user_id uuid, _suspended boolean, _reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  UPDATE public.profiles
    SET suspended = _suspended,
        suspended_at = CASE WHEN _suspended THEN now() ELSE NULL END,
        suspended_reason = CASE WHEN _suspended THEN _reason ELSE NULL END
    WHERE user_id = _user_id;
  INSERT INTO public.admin_audit_log (admin_id, action, target_table, target_id, details)
    VALUES (auth.uid(), CASE WHEN _suspended THEN 'suspend_user' ELSE 'reactivate_user' END, 'profiles', _user_id, jsonb_build_object('reason', _reason));
END; $$;

CREATE OR REPLACE FUNCTION public.admin_toggle_admin_role(_user_id uuid, _make_admin boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  IF _make_admin THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, 'admin') ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    IF _user_id = auth.uid() THEN RAISE EXCEPTION 'Você não pode remover seu próprio admin'; END IF;
    DELETE FROM public.user_roles WHERE user_id = _user_id AND role = 'admin';
  END IF;
  INSERT INTO public.admin_audit_log (admin_id, action, target_table, target_id, details)
    VALUES (auth.uid(), CASE WHEN _make_admin THEN 'grant_admin' ELSE 'revoke_admin' END, 'user_roles', _user_id, NULL);
END; $$;
