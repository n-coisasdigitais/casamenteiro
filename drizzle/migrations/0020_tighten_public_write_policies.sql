DROP POLICY IF EXISTS "platform_prices_public_read" ON public.platform_prices;
CREATE POLICY "platform_prices_public_read" ON public.platform_prices FOR SELECT TO anon, authenticated USING (ativo = true);

DROP POLICY IF EXISTS "Settings are public read" ON public.system_settings;
CREATE POLICY "Settings are public read" ON public.system_settings FOR SELECT TO anon, authenticated
USING (key = ANY (ARRAY['cancelamento_carencia_dias','reserva_antecedencia_min_dias','indicacao_fornecedor','suporte_email','trial_dias','fornecedor_aprovacao_horas','budget_distribution','quiz_textos','ajuda_conteudo']));

DROP POLICY IF EXISTS "Qualquer um registra interesse" ON public.cidades_interesse;
CREATE POLICY "Qualquer um registra interesse" ON public.cidades_interesse FOR INSERT TO anon, authenticated
WITH CHECK (atendida = false AND length(btrim(cidade)) BETWEEN 2 AND 120 AND (estado IS NULL OR length(estado) <= 40));

DROP POLICY IF EXISTS "Qualquer um pode registrar cidade pendente" ON public.cidades_pendentes;
CREATE POLICY "Usuario registra cidade pendente" ON public.cidades_pendentes FOR INSERT TO authenticated
WITH CHECK (resolvida = false AND length(btrim(cidade)) BETWEEN 2 AND 120
  AND (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
  AND (supplier_id IS NULL OR public.has_role(auth.uid(), 'admin'::app_role)
       OR EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = supplier_id AND s.user_id = auth.uid())));

DROP POLICY IF EXISTS "Anyone can record profile view" ON public.supplier_profile_views;
CREATE POLICY "Anyone can record profile view" ON public.supplier_profile_views FOR INSERT TO anon, authenticated
WITH CHECK ((viewer_id IS NULL OR viewer_id = auth.uid())
  AND EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = supplier_id AND s.status = 'approved'::supplier_status));

DROP POLICY IF EXISTS "Anyone can submit landing email" ON public.fornecedor_landing_emails;
CREATE POLICY "Anyone can submit landing email" ON public.fornecedor_landing_emails FOR INSERT TO anon, authenticated
WITH CHECK (status = 'novo' AND notes IS NULL AND length(email) <= 254
  AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' AND length(origem) <= 60
  AND (user_agent IS NULL OR length(user_agent) <= 500));

DROP POLICY IF EXISTS "Authenticated users can upload supplier photos" ON storage.objects;
CREATE POLICY "Authenticated users can upload supplier photos" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'supplier-photos' AND (
  (storage.foldername(name))[1] = (select auth.uid()::text)
  OR ((storage.foldername(name))[1] = 'logos' AND (storage.foldername(name))[2] = (select auth.uid()::text))
  OR public.has_role(auth.uid(), 'admin'::app_role)));