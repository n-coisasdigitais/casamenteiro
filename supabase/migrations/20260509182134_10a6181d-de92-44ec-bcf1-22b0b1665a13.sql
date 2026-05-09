-- ============================================
-- FASE 2 — Contas + Convites
-- ============================================

-- 1) COUPLES: novos campos para o convite (item 4 e 6)
ALTER TABLE public.couples
  ADD COLUMN IF NOT EXISTS ceremony_lat numeric,
  ADD COLUMN IF NOT EXISTS ceremony_lng numeric,
  ADD COLUMN IF NOT EXISTS ceremony_cep text,
  ADD COLUMN IF NOT EXISTS ceremony_local_nome text,
  ADD COLUMN IF NOT EXISTS reception_lat numeric,
  ADD COLUMN IF NOT EXISTS reception_lng numeric,
  ADD COLUMN IF NOT EXISTS reception_cep text,
  ADD COLUMN IF NOT EXISTS reception_local_nome text,
  ADD COLUMN IF NOT EXISTS invite_video_url text,
  ADD COLUMN IF NOT EXISTS invite_album jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 2) Trigger: impedir conflito de papéis (item 3)
-- Um user_id não pode ter conta couple e supplier simultaneamente
CREATE OR REPLACE FUNCTION public.prevent_role_conflict()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.account_type = 'couple' AND EXISTS (
    SELECT 1 FROM public.suppliers WHERE user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'Esta conta já está cadastrada como fornecedor. Use outro e-mail para criar uma conta de casal.';
  END IF;
  IF NEW.account_type = 'supplier' AND EXISTS (
    SELECT 1 FROM public.couples WHERE user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'Esta conta já está cadastrada como casal. Use outro e-mail para criar uma conta de fornecedor.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_role_conflict_trg ON public.profiles;
CREATE TRIGGER prevent_role_conflict_trg
  BEFORE INSERT OR UPDATE OF account_type ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_conflict();

-- 3) CONVITE_LEMBRETES (item 5)
CREATE TABLE IF NOT EXISTS public.convite_lembretes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  invite_id uuid NOT NULL REFERENCES public.guest_invites(id) ON DELETE CASCADE,
  tipo text NOT NULL,  -- 'lembrete_30d', 'lembrete_7d', 'lembrete_1d', 'manual'
  enviado_em timestamptz NOT NULL DEFAULT now(),
  canal text NOT NULL DEFAULT 'email', -- 'email', 'whatsapp_link'
  status text NOT NULL DEFAULT 'enviado',
  detalhes jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_convite_lembretes_couple ON public.convite_lembretes(couple_id);
CREATE INDEX IF NOT EXISTS idx_convite_lembretes_invite ON public.convite_lembretes(invite_id);
CREATE INDEX IF NOT EXISTS idx_convite_lembretes_tipo_invite ON public.convite_lembretes(invite_id, tipo);

ALTER TABLE public.convite_lembretes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Couple ve seus lembretes"
  ON public.convite_lembretes FOR SELECT
  USING (couple_id = public.get_couple_id_for_user(auth.uid()));

CREATE POLICY "Admin ve todos lembretes"
  ON public.convite_lembretes FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Couple cria lembretes manuais"
  ON public.convite_lembretes FOR INSERT
  WITH CHECK (couple_id = public.get_couple_id_for_user(auth.uid()));