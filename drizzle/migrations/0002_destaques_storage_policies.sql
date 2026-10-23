DROP POLICY IF EXISTS "Leitura pública destaques" ON storage.objects;
CREATE POLICY "Leitura pública destaques" ON storage.objects FOR SELECT USING (bucket_id = 'destaques');
DROP POLICY IF EXISTS "Fornecedor envia imagem de destaque" ON storage.objects;
CREATE POLICY "Fornecedor envia imagem de destaque" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'destaques' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "Admin gerencia imagens de destaque" ON storage.objects;
CREATE POLICY "Admin gerencia imagens de destaque" ON storage.objects FOR ALL TO authenticated USING (bucket_id = 'destaques' AND public.has_role(auth.uid(),'admin'::public.app_role)) WITH CHECK (bucket_id = 'destaques' AND public.has_role(auth.uid(),'admin'::public.app_role));