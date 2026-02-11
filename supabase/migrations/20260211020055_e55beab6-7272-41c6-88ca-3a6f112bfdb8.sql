
-- Quotes table
CREATE TABLE public.quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  couple_id UUID NOT NULL REFERENCES public.couples(id),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id),
  user_id UUID NOT NULL,
  event_date DATE,
  guest_count INTEGER,
  message TEXT NOT NULL,
  phone TEXT,
  phone_visible BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','viewed','answered','accepted','rejected','cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

-- Couple can see own quotes
CREATE POLICY "Couple can view own quotes" ON public.quotes
  FOR SELECT USING (couple_id = get_couple_id_for_user(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- Couple can create quotes
CREATE POLICY "Couple can create quotes" ON public.quotes
  FOR INSERT WITH CHECK (auth.uid() = user_id AND couple_id = get_couple_id_for_user(auth.uid()));

-- Couple can update own quotes (cancel)
CREATE POLICY "Couple can update own quotes" ON public.quotes
  FOR UPDATE USING (auth.uid() = user_id);

-- Supplier can see quotes sent to them
CREATE POLICY "Supplier can view received quotes" ON public.quotes
  FOR SELECT USING (supplier_id IN (SELECT id FROM public.suppliers WHERE user_id = auth.uid()));

-- Supplier can update quote status
CREATE POLICY "Supplier can update received quotes" ON public.quotes
  FOR UPDATE USING (supplier_id IN (SELECT id FROM public.suppliers WHERE user_id = auth.uid()));

-- Quote messages table
CREATE TABLE public.quote_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  message TEXT NOT NULL,
  attachment_url TEXT,
  is_template BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.quote_messages ENABLE ROW LEVEL SECURITY;

-- Both parties can view messages of their quotes
CREATE POLICY "Parties can view quote messages" ON public.quote_messages
  FOR SELECT USING (
    quote_id IN (
      SELECT id FROM public.quotes WHERE couple_id = get_couple_id_for_user(auth.uid())
      UNION
      SELECT q.id FROM public.quotes q JOIN public.suppliers s ON q.supplier_id = s.id WHERE s.user_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Both parties can send messages
CREATE POLICY "Parties can send quote messages" ON public.quote_messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    quote_id IN (
      SELECT id FROM public.quotes WHERE couple_id = get_couple_id_for_user(auth.uid())
      UNION
      SELECT q.id FROM public.quotes q JOIN public.suppliers s ON q.supplier_id = s.id WHERE s.user_id = auth.uid()
    )
  );

-- Trigger for updated_at on quotes
CREATE TRIGGER update_quotes_updated_at
  BEFORE UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for quote attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('quote-attachments', 'quote-attachments', false);

-- Storage policies
CREATE POLICY "Authenticated users can upload quote attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'quote-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view quote attachments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'quote-attachments' AND auth.role() = 'authenticated');
