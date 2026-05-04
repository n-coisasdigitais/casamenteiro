
ALTER TABLE public.couples
  ADD COLUMN IF NOT EXISTS target_budget numeric,
  ADD COLUMN IF NOT EXISTS budget_mode text NOT NULL DEFAULT 'fixed',
  ADD COLUMN IF NOT EXISTS header_photo_url text,
  ADD COLUMN IF NOT EXISTS header_quote text;
