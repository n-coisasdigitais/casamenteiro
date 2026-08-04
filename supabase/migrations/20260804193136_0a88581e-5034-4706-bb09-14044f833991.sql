ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS recursos jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.featured_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  dias integer NOT NULL DEFAULT 7,
  valor numeric NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.featured_packages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.featured_packages TO authenticated;
GRANT ALL ON public.featured_packages TO service_role;

ALTER TABLE public.featured_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "featured_packages_public_select" ON public.featured_packages
  FOR SELECT USING (ativo = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "featured_packages_admin_all" ON public.featured_packages
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_featured_packages_updated_at
  BEFORE UPDATE ON public.featured_packages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.featured_packages (label, dias, valor, ordem)
SELECT * FROM (VALUES ('7 dias', 7, 89::numeric, 1), ('15 dias', 15, 159::numeric, 2), ('30 dias', 30, 279::numeric, 3)) AS v(label, dias, valor, ordem)
WHERE NOT EXISTS (SELECT 1 FROM public.featured_packages);