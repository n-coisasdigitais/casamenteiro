
-- Adicionar coluna de onboarding completo no fornecedor
ALTER TABLE public.suppliers 
ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

-- Tabela de visualizações de perfil para métricas
CREATE TABLE IF NOT EXISTS public.supplier_profile_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  viewer_id uuid,
  viewed_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS supplier_profile_views_supplier_idx 
  ON public.supplier_profile_views(supplier_id, viewed_at DESC);

ALTER TABLE public.supplier_profile_views ENABLE ROW LEVEL SECURITY;

-- Qualquer um pode registrar uma visita (anônima ou autenticada)
CREATE POLICY "Anyone can record profile view"
  ON public.supplier_profile_views
  FOR INSERT
  WITH CHECK (true);

-- Apenas o dono do fornecedor (ou admin) pode ler suas visitas
CREATE POLICY "Supplier owner can view own profile views"
  ON public.supplier_profile_views
  FOR SELECT
  USING (
    supplier_id IN (SELECT id FROM public.suppliers WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );
