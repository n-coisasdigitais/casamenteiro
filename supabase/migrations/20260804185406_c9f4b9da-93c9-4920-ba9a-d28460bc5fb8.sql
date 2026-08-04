
CREATE TABLE public.webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'mercadopago',
  evento text,
  ambiente text,
  tipo text,
  referencia_id uuid,
  reservation_id uuid,
  mp_payment_id text,
  status_recebido text,
  http_status integer,
  assinatura_valida boolean NOT NULL DEFAULT false,
  resultado text,
  erro text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.webhook_events TO authenticated;
GRANT ALL ON public.webhook_events TO service_role;

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin vê tentativas de webhook"
ON public.webhook_events FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX webhook_events_created_idx ON public.webhook_events (created_at DESC);
CREATE INDEX webhook_events_ref_idx ON public.webhook_events (referencia_id);
CREATE INDEX webhook_events_reservation_idx ON public.webhook_events (reservation_id);
