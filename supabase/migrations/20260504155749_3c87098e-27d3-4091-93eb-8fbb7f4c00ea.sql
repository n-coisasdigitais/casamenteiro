
CREATE POLICY "Admin can view all profiles" ON public.profiles
FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can view all couples" ON public.couples
FOR SELECT USING (has_role(auth.uid(), 'admin'));
