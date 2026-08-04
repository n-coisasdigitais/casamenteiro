ALTER TABLE public.idle_date_reservations
  ADD COLUMN IF NOT EXISTS ambiente text NOT NULL DEFAULT 'live';

ALTER TABLE public.commission_ledger
  ADD COLUMN IF NOT EXISTS ambiente text NOT NULL DEFAULT 'live';

DO $$ BEGIN
  ALTER TABLE public.idle_date_reservations
    ADD CONSTRAINT idle_date_reservations_ambiente_check CHECK (ambiente IN ('sandbox','live'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.commission_ledger
    ADD CONSTRAINT commission_ledger_ambiente_check CHECK (ambiente IN ('sandbox','live'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;