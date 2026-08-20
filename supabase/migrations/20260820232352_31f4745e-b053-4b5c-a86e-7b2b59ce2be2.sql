ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS mp_access_token text,
  ADD COLUMN IF NOT EXISTS mp_refresh_token text,
  ADD COLUMN IF NOT EXISTS mp_token_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS mp_connected_at timestamptz;

REVOKE SELECT (mp_access_token, mp_refresh_token) ON public.suppliers FROM anon, authenticated;
REVOKE UPDATE (mp_access_token, mp_refresh_token) ON public.suppliers FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS public.mp_oauth_states (
  state text PRIMARY KEY,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  expira_em timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.mp_oauth_states TO service_role;
ALTER TABLE public.mp_oauth_states ENABLE ROW LEVEL SECURITY;