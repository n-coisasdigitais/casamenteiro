
-- Add fields to couple_suppliers
ALTER TABLE public.couple_suppliers
  ADD COLUMN IF NOT EXISTS estimated_value numeric,
  ADD COLUMN IF NOT EXISTS proposed_value numeric,
  ADD COLUMN IF NOT EXISTS final_value numeric,
  ADD COLUMN IF NOT EXISTS simulation_id uuid,
  ADD COLUMN IF NOT EXISTS contracted_at timestamp with time zone;

-- quote_proposals table
CREATE TABLE IF NOT EXISTS public.quote_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'proposal', -- 'proposal' | 'discount_request' | 'counter' | 'acceptance' | 'rejection'
  amount numeric,
  description text,
  status text NOT NULL DEFAULT 'pending', -- 'pending' | 'accepted' | 'rejected'
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.quote_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parties view proposals"
ON public.quote_proposals FOR SELECT
USING (
  quote_id IN (
    SELECT id FROM public.quotes WHERE couple_id = public.get_couple_id_for_user(auth.uid())
    UNION
    SELECT q.id FROM public.quotes q JOIN public.suppliers s ON q.supplier_id = s.id WHERE s.user_id = auth.uid()
  ) OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Parties insert proposals"
ON public.quote_proposals FOR INSERT
WITH CHECK (
  auth.uid() = sender_id AND (
    quote_id IN (
      SELECT id FROM public.quotes WHERE couple_id = public.get_couple_id_for_user(auth.uid())
      UNION
      SELECT q.id FROM public.quotes q JOIN public.suppliers s ON q.supplier_id = s.id WHERE s.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Parties update proposals"
ON public.quote_proposals FOR UPDATE
USING (
  quote_id IN (
    SELECT id FROM public.quotes WHERE couple_id = public.get_couple_id_for_user(auth.uid())
    UNION
    SELECT q.id FROM public.quotes q JOIN public.suppliers s ON q.supplier_id = s.id WHERE s.user_id = auth.uid()
  )
);

CREATE TRIGGER update_quote_proposals_updated_at
BEFORE UPDATE ON public.quote_proposals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Notify other party on new proposal
CREATE OR REPLACE FUNCTION public.notify_on_proposal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _couple_user uuid;
  _supplier_user uuid;
  _supplier_name text;
  _quote record;
BEGIN
  SELECT q.user_id, q.supplier_id INTO _quote
  FROM public.quotes q WHERE q.id = NEW.quote_id;

  SELECT user_id, company_name INTO _supplier_user, _supplier_name
  FROM public.suppliers WHERE id = _quote.supplier_id;
  _couple_user := _quote.user_id;

  -- Notify the OTHER party
  IF NEW.sender_id = _couple_user AND _supplier_user IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (
      _supplier_user,
      'proposal_received',
      CASE WHEN NEW.kind = 'discount_request' THEN 'Pedido de desconto recebido' ELSE 'Nova mensagem de proposta' END,
      'Acesse o painel para responder.',
      '/painel-fornecedor?tab=quotes'
    );
  ELSIF NEW.sender_id = _supplier_user AND _couple_user IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (
      _couple_user,
      'proposal_received',
      'Você recebeu uma proposta de ' || COALESCE(_supplier_name, 'um fornecedor'),
      CASE WHEN NEW.amount IS NOT NULL THEN 'Valor proposto: R$ ' || NEW.amount::text ELSE 'Confira no seu painel.' END,
      '/meus-fornecedores'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_on_proposal_trg
AFTER INSERT ON public.quote_proposals
FOR EACH ROW EXECUTE FUNCTION public.notify_on_proposal();
