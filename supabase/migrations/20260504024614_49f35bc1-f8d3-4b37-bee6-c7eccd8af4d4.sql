
-- ============ KANBAN DE ORÇAMENTOS ============
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS kanban_status text NOT NULL DEFAULT 'enviado';
-- valores: enviado, respondido, negociando, fechado, recusado

-- Sincroniza kanban quando fornecedor responde
CREATE OR REPLACE FUNCTION public.sync_quote_kanban_on_proposal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _supplier_user uuid;
  _quote record;
BEGIN
  SELECT q.user_id, q.supplier_id, q.kanban_status INTO _quote
  FROM public.quotes q WHERE q.id = NEW.quote_id;

  SELECT user_id INTO _supplier_user FROM public.suppliers WHERE id = _quote.supplier_id;

  -- Se quem enviou é o fornecedor e o kanban está em 'enviado', move para 'respondido'
  IF NEW.sender_id = _supplier_user AND _quote.kanban_status = 'enviado' THEN
    UPDATE public.quotes SET kanban_status = 'respondido' WHERE id = NEW.quote_id;
  END IF;

  -- Se foi marcado como aceito (kind = accept), vira 'fechado'
  IF NEW.kind = 'accept' OR NEW.status = 'accepted' THEN
    UPDATE public.quotes SET kanban_status = 'fechado' WHERE id = NEW.quote_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_quote_kanban ON public.quote_proposals;
CREATE TRIGGER trg_sync_quote_kanban
AFTER INSERT ON public.quote_proposals
FOR EACH ROW EXECUTE FUNCTION public.sync_quote_kanban_on_proposal();

-- ============ CONVITES DO CASAL ============
ALTER TABLE public.couples
  ADD COLUMN IF NOT EXISTS invite_message text,
  ADD COLUMN IF NOT EXISTS invite_photo_url text,
  ADD COLUMN IF NOT EXISTS ceremony_time text,
  ADD COLUMN IF NOT EXISTS ceremony_address text,
  ADD COLUMN IF NOT EXISTS reception_address text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS dress_code text;

-- Tabela de convites enviados
CREATE TABLE IF NOT EXISTS public.guest_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id uuid NOT NULL REFERENCES public.wedding_guests(id) ON DELETE CASCADE,
  couple_id uuid NOT NULL,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(18), 'hex'),
  sent_at timestamptz,
  opened_at timestamptz,
  responded_at timestamptz,
  reminder_sent_at timestamptz,
  rsvp_response text, -- confirmed | declined
  rsvp_companions int DEFAULT 0,
  rsvp_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_guest_invites_guest ON public.guest_invites(guest_id);
CREATE INDEX IF NOT EXISTS idx_guest_invites_couple ON public.guest_invites(couple_id);
CREATE INDEX IF NOT EXISTS idx_guest_invites_token ON public.guest_invites(token);

ALTER TABLE public.guest_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Couple manages own invites"
ON public.guest_invites FOR ALL
USING (couple_id = public.get_couple_id_for_user(auth.uid()))
WITH CHECK (couple_id = public.get_couple_id_for_user(auth.uid()));

-- Função pública (security definer) para a página de convite carregar dados pelo token
CREATE OR REPLACE FUNCTION public.get_invite_by_token(_token text)
RETURNS TABLE (
  invite_id uuid,
  guest_name text,
  rsvp_response text,
  rsvp_companions int,
  rsvp_note text,
  responded_at timestamptz,
  partner_name text,
  user_full_name text,
  wedding_date date,
  ceremony_time text,
  ceremony_address text,
  reception_address text,
  invite_message text,
  invite_photo_url text,
  contact_phone text,
  dress_code text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- marca como aberto na primeira leitura
  UPDATE public.guest_invites SET opened_at = COALESCE(opened_at, now())
  WHERE token = _token;

  RETURN QUERY
  SELECT
    gi.id, wg.name, gi.rsvp_response, gi.rsvp_companions, gi.rsvp_note, gi.responded_at,
    c.partner_name, p.full_name,
    c.wedding_date, c.ceremony_time, c.ceremony_address, c.reception_address,
    c.invite_message, c.invite_photo_url, c.contact_phone, c.dress_code
  FROM public.guest_invites gi
  JOIN public.wedding_guests wg ON wg.id = gi.guest_id
  JOIN public.couples c ON c.id = gi.couple_id
  LEFT JOIN public.profiles p ON p.user_id = c.user_id
  WHERE gi.token = _token;
END;
$$;

-- Função pública para confirmar RSVP via token
CREATE OR REPLACE FUNCTION public.respond_invite(_token text, _response text, _companions int DEFAULT 0, _note text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _guest uuid;
BEGIN
  IF _response NOT IN ('confirmed','declined') THEN
    RAISE EXCEPTION 'Resposta inválida';
  END IF;

  UPDATE public.guest_invites
  SET rsvp_response = _response,
      rsvp_companions = COALESCE(_companions, 0),
      rsvp_note = _note,
      responded_at = now()
  WHERE token = _token
  RETURNING guest_id INTO _guest;

  IF _guest IS NULL THEN RETURN false; END IF;

  UPDATE public.wedding_guests
  SET rsvp_status = CASE WHEN _response = 'confirmed' THEN 'confirmed' ELSE 'declined' END
  WHERE id = _guest;

  RETURN true;
END;
$$;

-- Permitir execução pública das funções
GRANT EXECUTE ON FUNCTION public.get_invite_by_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.respond_invite(text, text, int, text) TO anon, authenticated;
