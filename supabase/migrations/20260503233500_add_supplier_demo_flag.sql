ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS suppliers_is_demo_idx ON public.suppliers(is_demo) WHERE is_demo = true;
