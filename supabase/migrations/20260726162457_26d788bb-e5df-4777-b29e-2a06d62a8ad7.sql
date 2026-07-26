CREATE TABLE public.lead_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  note text NOT NULL DEFAULT '',
  remind_at timestamptz,
  reminded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_notes_supplier ON public.lead_notes(supplier_id);
CREATE INDEX idx_lead_notes_quote ON public.lead_notes(quote_id);
CREATE INDEX idx_lead_notes_remind ON public.lead_notes(remind_at) WHERE remind_at IS NOT NULL AND reminded_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_notes TO authenticated;
GRANT ALL ON public.lead_notes TO service_role;

ALTER TABLE public.lead_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Supplier manages own lead notes" ON public.lead_notes
  FOR ALL TO authenticated
  USING (supplier_id IN (SELECT id FROM public.suppliers WHERE user_id = auth.uid()))
  WITH CHECK (supplier_id IN (SELECT id FROM public.suppliers WHERE user_id = auth.uid()));

CREATE POLICY "Admins view all lead notes" ON public.lead_notes
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_lead_notes_updated_at
  BEFORE UPDATE ON public.lead_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.feature_flags (key, enabled, label, grupo, essencial, description)
VALUES ('crm_fornecedor', true, 'Mini-CRM de leads do fornecedor', 'Fornecedor', false,
        'Habilita a aba Leads no painel do fornecedor com semáforo de resposta, anotações internas e lembretes.')
ON CONFLICT (key) DO NOTHING;