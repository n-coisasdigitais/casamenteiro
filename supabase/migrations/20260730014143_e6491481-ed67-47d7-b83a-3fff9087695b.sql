CREATE POLICY "staff_docs_own_select" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'staff-docs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "staff_docs_own_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'staff-docs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "staff_docs_own_delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'staff-docs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "staff_docs_admin_select" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'staff-docs' AND public.has_role(auth.uid(), 'admin'));