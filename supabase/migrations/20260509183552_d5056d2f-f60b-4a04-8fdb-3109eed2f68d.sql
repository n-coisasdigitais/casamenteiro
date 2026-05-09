-- Tabela para conexões OAuth de agenda dos fornecedores
CREATE TABLE public.supplier_calendar_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('google','outlook')),
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  calendar_id TEXT,
  account_email TEXT,
  last_synced_at TIMESTAMPTZ,
  sync_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (supplier_id, provider)
);

ALTER TABLE public.supplier_calendar_connections ENABLE ROW LEVEL SECURITY;

-- Apenas dono do supplier (e admin) pode ler/gerir
CREATE POLICY "Owner reads own calendar connection"
ON public.supplier_calendar_connections FOR SELECT
USING (supplier_id IN (SELECT id FROM suppliers WHERE user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owner deletes own calendar connection"
ON public.supplier_calendar_connections FOR DELETE
USING (supplier_id IN (SELECT id FROM suppliers WHERE user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owner updates own calendar connection"
ON public.supplier_calendar_connections FOR UPDATE
USING (supplier_id IN (SELECT id FROM suppliers WHERE user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- INSERT só pela edge function (service role bypassa RLS)

-- Marca origem nas datas bloqueadas para podermos limpar imports antigos
ALTER TABLE public.supplier_blocked_dates
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS external_event_id TEXT;

CREATE INDEX IF NOT EXISTS idx_blocked_source ON public.supplier_blocked_dates(supplier_id, source);

-- Trigger updated_at
CREATE TRIGGER update_supplier_calendar_connections_updated_at
BEFORE UPDATE ON public.supplier_calendar_connections
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();