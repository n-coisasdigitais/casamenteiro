ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS pricing_model text NOT NULL DEFAULT 'fixo';

ALTER TABLE public.suppliers
  DROP CONSTRAINT IF EXISTS suppliers_pricing_model_check;

ALTER TABLE public.suppliers
  ADD CONSTRAINT suppliers_pricing_model_check
  CHECK (pricing_model IN ('fixo', 'por_pessoa'));