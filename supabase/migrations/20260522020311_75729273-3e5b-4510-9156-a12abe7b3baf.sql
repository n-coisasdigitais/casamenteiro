-- ============ MENSAGENS ENTRE CASAIS ============
CREATE TABLE public.couple_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  remetente_couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  destinatario_couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  texto TEXT NOT NULL,
  lida BOOLEAN NOT NULL DEFAULT false,
  lida_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (remetente_couple_id <> destinatario_couple_id)
);

CREATE INDEX idx_couple_messages_dest ON public.couple_messages(destinatario_couple_id, created_at DESC);
CREATE INDEX idx_couple_messages_rem ON public.couple_messages(remetente_couple_id, created_at DESC);

ALTER TABLE public.couple_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Casais veem suas mensagens"
  ON public.couple_messages FOR SELECT
  USING (
    remetente_couple_id = public.get_couple_id_for_user(auth.uid())
    OR destinatario_couple_id = public.get_couple_id_for_user(auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Casais enviam mensagens"
  ON public.couple_messages FOR INSERT
  WITH CHECK (
    remetente_couple_id = public.get_couple_id_for_user(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.couple_public_profiles p
      WHERE p.couple_id = destinatario_couple_id
        AND p.publico = true
        AND p.mensagens_casais = true
    )
  );

CREATE POLICY "Destinatario marca como lida"
  ON public.couple_messages FOR UPDATE
  USING (destinatario_couple_id = public.get_couple_id_for_user(auth.uid()))
  WITH CHECK (destinatario_couple_id = public.get_couple_id_for_user(auth.uid()));

CREATE POLICY "Admin gerencia mensagens"
  ON public.couple_messages FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ============ INDICAÇÕES ============
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_code TEXT;
  v_exists BOOLEAN;
BEGIN
  LOOP
    v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
    SELECT EXISTS(SELECT 1 FROM public.referrals WHERE codigo = v_code) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;
  RETURN v_code;
END;
$$;

CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  codigo TEXT NOT NULL UNIQUE,
  cliques INTEGER NOT NULL DEFAULT 0,
  conversoes INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(couple_id)
);

CREATE INDEX idx_referrals_codigo ON public.referrals(codigo);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Códigos públicos para validação"
  ON public.referrals FOR SELECT
  USING (true);

CREATE POLICY "Dono atualiza seu código"
  ON public.referrals FOR UPDATE
  USING (couple_id = public.get_couple_id_for_user(auth.uid()))
  WITH CHECK (couple_id = public.get_couple_id_for_user(auth.uid()));

CREATE POLICY "Dono cria seu código"
  ON public.referrals FOR INSERT
  WITH CHECK (couple_id = public.get_couple_id_for_user(auth.uid()));

CREATE POLICY "Admin gerencia indicações"
  ON public.referrals FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ============ CONVERSÕES DE INDICAÇÃO ============
CREATE TABLE public.referral_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id UUID NOT NULL REFERENCES public.referrals(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL,
  tipo_conta TEXT NOT NULL CHECK (tipo_conta IN ('couple','supplier')),
  status TEXT NOT NULL DEFAULT 'cadastrado' CHECK (status IN ('cadastrado','onboarding','ativo')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(referred_user_id)
);

CREATE INDEX idx_referral_conv_ref ON public.referral_conversions(referral_id);

ALTER TABLE public.referral_conversions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dono vê suas conversões"
  ON public.referral_conversions FOR SELECT
  USING (
    referral_id IN (SELECT id FROM public.referrals WHERE couple_id = public.get_couple_id_for_user(auth.uid()))
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Qualquer um registra conversão"
  ON public.referral_conversions FOR INSERT
  WITH CHECK (auth.uid() = referred_user_id);

CREATE POLICY "Admin gerencia conversões"
  ON public.referral_conversions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Trigger para incrementar conversões
CREATE OR REPLACE FUNCTION public.increment_referral_conversions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.referrals
    SET conversoes = conversoes + 1, updated_at = now()
    WHERE id = NEW.referral_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_increment_referral_conversions
  AFTER INSERT ON public.referral_conversions
  FOR EACH ROW EXECUTE FUNCTION public.increment_referral_conversions();

-- Trigger updated_at
CREATE TRIGGER trg_referrals_updated_at
  BEFORE UPDATE ON public.referrals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();