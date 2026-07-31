CREATE TABLE IF NOT EXISTS public.platform_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  couple_id uuid REFERENCES public.couples(id) ON DELETE SET NULL,
  autor_nome text,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comentario text,
  aprovado boolean NOT NULL DEFAULT false,
  destaque boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.platform_reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_reviews TO authenticated;
GRANT ALL ON public.platform_reviews TO service_role;

ALTER TABLE public.platform_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "platform_reviews_public_read" ON public.platform_reviews;
CREATE POLICY "platform_reviews_public_read" ON public.platform_reviews
  FOR SELECT USING (aprovado = true);

DROP POLICY IF EXISTS "platform_reviews_own_read" ON public.platform_reviews;
CREATE POLICY "platform_reviews_own_read" ON public.platform_reviews
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "platform_reviews_own_insert" ON public.platform_reviews;
CREATE POLICY "platform_reviews_own_insert" ON public.platform_reviews
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "platform_reviews_own_update" ON public.platform_reviews;
CREATE POLICY "platform_reviews_own_update" ON public.platform_reviews
  FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "platform_reviews_admin_delete" ON public.platform_reviews;
CREATE POLICY "platform_reviews_admin_delete" ON public.platform_reviews
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS update_platform_reviews_updated_at ON public.platform_reviews;
CREATE TRIGGER update_platform_reviews_updated_at
  BEFORE UPDATE ON public.platform_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.feature_flags (key, label, description, grupo, essencial, enabled)
VALUES ('avaliacoes_plataforma', 'Avaliações da plataforma', 'Casais podem avaliar o Casamenteiro; depoimentos aprovados aparecem na Home.', 'Casal', false, false)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.platform_prices (chave, categoria, label, descricao, modo, valor_fixo, percentual, ativo)
VALUES ('desconto_indicacao', 'assinaturas', 'Desconto por indicação', 'Desconto aplicado no primeiro mês de assinatura de quem chega por link de indicação.', 'percentual', 0, 50, true)
ON CONFLICT (chave) DO NOTHING;