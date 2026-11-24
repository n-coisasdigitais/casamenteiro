CREATE POLICY "Admins podem moderar avaliações" ON public.reviews FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins podem excluir avaliações" ON public.reviews FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
GRANT UPDATE, DELETE ON public.reviews TO authenticated;