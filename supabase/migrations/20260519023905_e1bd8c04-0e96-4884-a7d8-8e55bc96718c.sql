ALTER TABLE public.quote_messages
  ADD COLUMN IF NOT EXISTS attachment_urls TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE public.quote_proposals
  ADD COLUMN IF NOT EXISTS attachment_urls TEXT[] NOT NULL DEFAULT '{}';