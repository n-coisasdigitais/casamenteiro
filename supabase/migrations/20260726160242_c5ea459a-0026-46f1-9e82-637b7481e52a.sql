
-- 1. Extend supplier_promo_dates
ALTER TABLE public.supplier_promo_dates
  ADD COLUMN IF NOT EXISTS piso_fornecedor numeric,
  ADD COLUMN IF NOT EXISTS markup_pct numeric,
  ADD COLUMN IF NOT EXISTS valor_ofertado numeric;

-- 2. Extend idle_date_reservations
ALTER TABLE public.idle_date_reservations
  ADD COLUMN IF NOT EXISTS piso_fornecedor numeric,
  ADD COLUMN IF NOT EXISTS markup_pct numeric,
  ADD COLUMN IF NOT EXISTS valor_ofertado numeric,
  ADD COLUMN IF NOT EXISTS comissao_plataforma numeric,
  ADD COLUMN IF NOT EXISTS mp_split_payment_id text,
  ADD COLUMN IF NOT EXISTS modo_cobranca text NOT NULL DEFAULT 'taxa_reserva',
  ADD COLUMN IF NOT EXISTS contrato_id uuid;

DO $$ BEGIN
  ALTER TABLE public.idle_date_reservations
    ADD CONSTRAINT idle_reservations_modo_cobranca_chk
    CHECK (modo_cobranca IN ('taxa_reserva','corretagem'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Extend suppliers
ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS mp_account_id text;

-- 4. reservation_contracts
CREATE TABLE IF NOT EXISTS public.reservation_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL UNIQUE REFERENCES public.idle_date_reservations(id) ON DELETE CASCADE,
  couple_id uuid NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  piso numeric NOT NULL,
  valor_ofertado numeric NOT NULL,
  comissao numeric NOT NULL,
  corpo_html text NOT NULL,
  status text NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho','emitido','assinado','cancelado')),
  assinado_casal_em timestamptz,
  assinado_fornecedor_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.reservation_contracts TO authenticated;
GRANT ALL ON public.reservation_contracts TO service_role;
ALTER TABLE public.reservation_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contratos_partes_veem" ON public.reservation_contracts FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(),'admin')
  OR couple_id = public.get_couple_id_for_user(auth.uid())
  OR EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = supplier_id AND s.user_id = auth.uid())
);
CREATE POLICY "contratos_casal_cria" ON public.reservation_contracts FOR INSERT TO authenticated
WITH CHECK (couple_id = public.get_couple_id_for_user(auth.uid()));
CREATE POLICY "contratos_admin_all" ON public.reservation_contracts FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_reservation_contracts_updated
BEFORE UPDATE ON public.reservation_contracts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Link the FK now that both tables exist
DO $$ BEGIN
  ALTER TABLE public.idle_date_reservations
    ADD CONSTRAINT idle_reservations_contrato_fk
    FOREIGN KEY (contrato_id) REFERENCES public.reservation_contracts(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 5. commission_ledger
CREATE TABLE IF NOT EXISTS public.commission_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL UNIQUE REFERENCES public.idle_date_reservations(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  couple_id uuid NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  piso numeric NOT NULL,
  valor_ofertado numeric NOT NULL,
  comissao numeric NOT NULL,
  mp_payment_id text,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','pago','estornado','cancelado')),
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.commission_ledger TO authenticated;
GRANT ALL ON public.commission_ledger TO service_role;
ALTER TABLE public.commission_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ledger_partes_veem" ON public.commission_ledger FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(),'admin')
  OR couple_id = public.get_couple_id_for_user(auth.uid())
  OR EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = supplier_id AND s.user_id = auth.uid())
);
CREATE POLICY "ledger_admin_all" ON public.commission_ledger FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_commission_ledger_updated
BEFORE UPDATE ON public.commission_ledger
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. calc_oferta_corretagem
CREATE OR REPLACE FUNCTION public.calc_oferta_corretagem(_piso numeric, _markup_pct numeric)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _piso_n numeric := COALESCE(_piso, 0);
  _mk numeric := COALESCE(_markup_pct, 15);
  _valor numeric;
  _com numeric;
BEGIN
  _valor := ROUND(_piso_n * (1 + _mk / 100.0), 2);
  _com := ROUND(_valor - _piso_n, 2);
  RETURN jsonb_build_object(
    'piso', _piso_n,
    'markup_pct', _mk,
    'valor_ofertado', _valor,
    'comissao', _com
  );
END; $$;

-- 7. Trigger: lock corretagem financial fields after insert
CREATE OR REPLACE FUNCTION public.lock_reservation_corretagem_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.modo_cobranca = 'corretagem' THEN
    IF NEW.piso_fornecedor IS DISTINCT FROM OLD.piso_fornecedor
       OR NEW.valor_ofertado IS DISTINCT FROM OLD.valor_ofertado
       OR NEW.comissao_plataforma IS DISTINCT FROM OLD.comissao_plataforma
       OR NEW.markup_pct IS DISTINCT FROM OLD.markup_pct THEN
      RAISE EXCEPTION 'Valores da corretagem não podem ser alterados após a criação da reserva';
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_lock_reservation_corretagem ON public.idle_date_reservations;
CREATE TRIGGER trg_lock_reservation_corretagem
BEFORE UPDATE ON public.idle_date_reservations
FOR EACH ROW EXECUTE FUNCTION public.lock_reservation_corretagem_fields();

-- 8. Seed pricing entry
INSERT INTO public.platform_prices (chave, categoria, label, descricao, modo, valor_fixo, percentual, ativo)
VALUES ('corretagem_data_ociosa','reservas','Corretagem de data ociosa',
  'Percentual de markup cobrado sobre o piso do fornecedor na corretagem de datas ociosas.',
  'percentual', 0, 15, true)
ON CONFLICT (chave) DO NOTHING;

-- 9. Seed feature flag
INSERT INTO public.feature_flags (key, label, description, grupo, essencial, enabled)
VALUES ('corretagem_datas_ociosas', 'Corretagem de datas ociosas',
  'Permite ao casal reservar datas ociosas pagando pela plataforma com split via Mercado Pago (piso + markup).',
  'aquisicao', false, false)
ON CONFLICT (key) DO NOTHING;
