-- Indicações de fornecedor: só o dono e o admin leem
DROP POLICY IF EXISTS supplier_referrals_select_all ON public.supplier_referrals;
CREATE POLICY supplier_referrals_owner_select ON public.supplier_referrals
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = supplier_referrals.supplier_id AND s.user_id = auth.uid()));

-- Indicações de casal: só o dono lê; o público valida via funções
DROP POLICY IF EXISTS "Códigos públicos para validação" ON public.referrals;
CREATE POLICY "Dono lê seu código" ON public.referrals
  FOR SELECT TO authenticated
  USING (couple_id = public.get_couple_id_for_user(auth.uid()));

CREATE OR REPLACE FUNCTION public.indicacao_publica(_codigo text)
RETURNS TABLE(id uuid, nome_casal text, e_propria boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT r.id,
         (SELECT p.nome_casal FROM public.couple_public_profiles p WHERE p.couple_id = r.couple_id LIMIT 1),
         (auth.uid() IS NOT NULL AND r.couple_id = public.get_couple_id_for_user(auth.uid()))
  FROM public.referrals r
  WHERE r.codigo = upper(left(coalesce(_codigo, ''), 32)) AND r.ativo = true
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.registrar_clique_indicacao(_codigo text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.referrals SET cliques = coalesce(cliques, 0) + 1
  WHERE codigo = upper(left(coalesce(_codigo, ''), 32)) AND ativo = true;
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.indicacao_publica(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.registrar_clique_indicacao(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.indicacao_publica(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_clique_indicacao(text) TO anon, authenticated;

-- Avaliações: públicas só as de profissionais com perfil público; participantes veem as suas
DROP POLICY IF EXISTS staff_reviews_public_select ON public.staff_reviews;
CREATE POLICY staff_reviews_perfil_publico_select ON public.staff_reviews
  FOR SELECT TO anon, authenticated
  USING (autor_tipo = 'fornecedor' AND EXISTS (
    SELECT 1 FROM public.staff_profiles sp WHERE sp.id = staff_reviews.avaliado_id AND sp.is_public = true));
CREATE POLICY staff_reviews_participantes_select ON public.staff_reviews
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.staff_profiles sp
            WHERE sp.id IN (staff_reviews.autor_id, staff_reviews.avaliado_id)
              AND (sp.user_id = auth.uid() OR sp.criado_por = auth.uid()))
    OR EXISTS (SELECT 1 FROM public.suppliers s
               WHERE s.id IN (staff_reviews.autor_id, staff_reviews.avaliado_id) AND s.user_id = auth.uid())
  );

-- Configuração da página profissional: público lê apenas o registro mais recente
DROP POLICY IF EXISTS "Config da página de profissional é pública" ON public.profissional_landing_config;
CREATE POLICY "Config atual da página de profissional é pública" ON public.profissional_landing_config
  FOR SELECT TO anon, authenticated
  USING (id = (SELECT c.id FROM public.profissional_landing_config c ORDER BY c.updated_at DESC NULLS LAST LIMIT 1));
REVOKE SELECT ON public.profissional_landing_config FROM anon;
GRANT SELECT (id, config, updated_at) ON public.profissional_landing_config TO anon;

-- Arquivos do fornecedor: público só lê arquivos registrados como visíveis
DROP POLICY IF EXISTS "Public reads supplier-files visible" ON storage.objects;
CREATE POLICY "Public reads registered visible supplier-files" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (
    bucket_id = 'supplier-files'
    AND EXISTS (
      SELECT 1 FROM public.supplier_attachments a
      JOIN public.suppliers s ON s.id = a.supplier_id
      LEFT JOIN public.profiles p ON p.user_id = s.user_id
      WHERE a.storage_path = objects.name
        AND a.tipo IN ('galeria', 'planta_baixa', 'anexo')
        AND (s.id)::text = (storage.foldername(objects.name))[1]
        AND s.status = 'approved'
        AND COALESCE(p.is_demo, false) = false
    )
  );