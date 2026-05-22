
CREATE TABLE public.fornecedor_landing_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'novo' CHECK (status IN ('novo','contatado','convertido','descartado')),
  origem TEXT NOT NULL DEFAULT 'cta_fornecedor',
  user_agent TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX fornecedor_landing_emails_status_idx ON public.fornecedor_landing_emails (status);
CREATE INDEX fornecedor_landing_emails_email_idx ON public.fornecedor_landing_emails (lower(email));

ALTER TABLE public.fornecedor_landing_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit landing email"
  ON public.fornecedor_landing_emails FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view landing emails"
  ON public.fornecedor_landing_emails FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update landing emails"
  ON public.fornecedor_landing_emails FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete landing emails"
  ON public.fornecedor_landing_emails FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER set_updated_at_fornecedor_landing_emails
  BEFORE UPDATE ON public.fornecedor_landing_emails
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
