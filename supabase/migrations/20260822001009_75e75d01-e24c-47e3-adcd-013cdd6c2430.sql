-- =========================
-- CUPONS
-- =========================
CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  descricao text,
  tipo text NOT NULL DEFAULT 'percentual', -- percentual | valor | meses_gratis
  valor numeric NOT NULL DEFAULT 0,        -- % | R$ | nº de meses
  ciclos integer NOT NULL DEFAULT 1,       -- por quantos ciclos vale
  valido_de timestamptz,
  valido_ate timestamptz,
  max_usos integer,                        -- null = ilimitado
  usos integer NOT NULL DEFAULT 0,
  max_usos_por_fornecedor integer NOT NULL DEFAULT 1,
  planos_elegiveis uuid[] NOT NULL DEFAULT '{}', -- vazio = todos
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.coupons TO anon, authenticated;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coupons_select_ativos" ON public.coupons FOR SELECT USING (ativo = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "coupons_admin_all" ON public.coupons FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_coupons_updated_at BEFORE UPDATE ON public.coupons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- BENEFÍCIOS DO FORNECEDOR
-- =========================
CREATE TABLE public.supplier_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  origem text NOT NULL,                    -- cupom | indicacao | presente
  origem_id uuid,
  tipo text NOT NULL,                      -- percentual | valor | meses_gratis
  valor numeric NOT NULL DEFAULT 0,
  ciclos_total integer NOT NULL DEFAULT 1,
  ciclos_restantes integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'pendente', -- pendente | aplicado | consumido | expirado | cancelado
  valor_original numeric,
  valor_com_desconto numeric,
  aplicado_em timestamptz,
  encerrado_em timestamptz,
  expira_em timestamptz,
  concedido_por uuid,
  motivo text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX supplier_credits_supplier_idx ON public.supplier_credits(supplier_id, status);
GRANT SELECT ON public.supplier_credits TO authenticated;
GRANT ALL ON public.supplier_credits TO service_role;
ALTER TABLE public.supplier_credits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "supplier_credits_owner_select" ON public.supplier_credits FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = supplier_credits.supplier_id AND s.user_id = auth.uid())
         OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "supplier_credits_admin_all" ON public.supplier_credits FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_supplier_credits_updated_at BEFORE UPDATE ON public.supplier_credits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- RESGATES DE CUPOM
-- =========================
CREATE TABLE public.coupon_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  credit_id uuid REFERENCES public.supplier_credits(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX coupon_redemptions_coupon_idx ON public.coupon_redemptions(coupon_id, supplier_id);
GRANT SELECT ON public.coupon_redemptions TO authenticated;
GRANT ALL ON public.coupon_redemptions TO service_role;
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coupon_redemptions_owner_select" ON public.coupon_redemptions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = coupon_redemptions.supplier_id AND s.user_id = auth.uid())
         OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "coupon_redemptions_admin_all" ON public.coupon_redemptions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================
-- INDICAÇÃO ENTRE FORNECEDORES
-- =========================
CREATE TABLE public.supplier_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL UNIQUE REFERENCES public.suppliers(id) ON DELETE CASCADE,
  codigo text NOT NULL UNIQUE,
  cliques integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.supplier_referrals TO anon, authenticated;
GRANT ALL ON public.supplier_referrals TO service_role;
ALTER TABLE public.supplier_referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "supplier_referrals_select_all" ON public.supplier_referrals FOR SELECT USING (true);
CREATE POLICY "supplier_referrals_owner_insert" ON public.supplier_referrals FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = supplier_referrals.supplier_id AND s.user_id = auth.uid()));
CREATE POLICY "supplier_referrals_admin_all" ON public.supplier_referrals FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_supplier_referrals_updated_at BEFORE UPDATE ON public.supplier_referrals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.supplier_referral_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id uuid NOT NULL REFERENCES public.supplier_referrals(id) ON DELETE CASCADE,
  indicado_user_id uuid,
  indicado_supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  indicado_nome text,
  status text NOT NULL DEFAULT 'convidado', -- convidado | cadastro_incompleto | cadastro_completo | assinou
  bonus_cadastro_credit_id uuid REFERENCES public.supplier_credits(id) ON DELETE SET NULL,
  bonus_assinatura_credit_id uuid REFERENCES public.supplier_credits(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX supplier_referral_events_unico ON public.supplier_referral_events(referral_id, indicado_user_id);
GRANT SELECT ON public.supplier_referral_events TO authenticated;
GRANT ALL ON public.supplier_referral_events TO service_role;
ALTER TABLE public.supplier_referral_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "supplier_referral_events_owner_select" ON public.supplier_referral_events FOR SELECT TO authenticated
  USING (EXISTS (
      SELECT 1 FROM public.supplier_referrals r
      JOIN public.suppliers s ON s.id = r.supplier_id
      WHERE r.id = supplier_referral_events.referral_id AND s.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "supplier_referral_events_admin_all" ON public.supplier_referral_events FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_supplier_referral_events_updated_at BEFORE UPDATE ON public.supplier_referral_events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- FUNÇÕES
-- =========================

-- Código de indicação do fornecedor (cria se não existir)
CREATE OR REPLACE FUNCTION public.get_or_create_supplier_referral(_supplier_id uuid)
RETURNS TABLE(id uuid, codigo text, cliques integer, ativo boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _codigo text;
  _row public.supplier_referrals;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = _supplier_id AND (s.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))) THEN
    RAISE EXCEPTION 'Sem permissão para este fornecedor';
  END IF;

  SELECT * INTO _row FROM public.supplier_referrals WHERE supplier_id = _supplier_id;
  IF _row.id IS NULL THEN
    LOOP
      _codigo := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.supplier_referrals WHERE supplier_referrals.codigo = _codigo);
    END LOOP;
    INSERT INTO public.supplier_referrals(supplier_id, codigo) VALUES (_supplier_id, _codigo) RETURNING * INTO _row;
  END IF;

  RETURN QUERY SELECT _row.id, _row.codigo, _row.cliques, _row.ativo;
END;
$$;

-- Clique no link de indicação (público)
CREATE OR REPLACE FUNCTION public.registrar_clique_indicacao_fornecedor(_codigo text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.supplier_referrals SET cliques = cliques + 1
  WHERE codigo = upper(_codigo) AND ativo = true;
  RETURN FOUND;
END;
$$;

-- Resgate de cupom pelo fornecedor: valida janela, limites e plano; cria o benefício pendente
CREATE OR REPLACE FUNCTION public.resgatar_cupom(_supplier_id uuid, _codigo text, _plan_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _c public.coupons;
  _usos_forn integer;
  _credit_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = _supplier_id AND (s.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Sem permissão para este fornecedor.');
  END IF;

  SELECT * INTO _c FROM public.coupons WHERE codigo = upper(trim(_codigo));
  IF _c.id IS NULL OR _c.ativo = false THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Cupom inválido.');
  END IF;
  IF _c.valido_de IS NOT NULL AND now() < _c.valido_de THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Este cupom ainda não está valendo.');
  END IF;
  IF _c.valido_ate IS NOT NULL AND now() > _c.valido_ate THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Este cupom expirou.');
  END IF;
  IF _c.max_usos IS NOT NULL AND _c.usos >= _c.max_usos THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Este cupom já atingiu o limite de usos.');
  END IF;
  IF array_length(_c.planos_elegiveis, 1) IS NOT NULL AND _plan_id IS NOT NULL AND NOT (_plan_id = ANY(_c.planos_elegiveis)) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Este cupom não vale para o plano escolhido.');
  END IF;

  SELECT count(*) INTO _usos_forn FROM public.coupon_redemptions WHERE coupon_id = _c.id AND supplier_id = _supplier_id;
  IF _usos_forn >= _c.max_usos_por_fornecedor THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Você já usou este cupom.');
  END IF;

  INSERT INTO public.supplier_credits(supplier_id, origem, origem_id, tipo, valor, ciclos_total, ciclos_restantes, status, motivo)
  VALUES (_supplier_id, 'cupom', _c.id, _c.tipo, _c.valor, GREATEST(_c.ciclos, 1), GREATEST(_c.ciclos, 1), 'pendente',
          concat('Cupom ', _c.codigo))
  RETURNING id INTO _credit_id;

  INSERT INTO public.coupon_redemptions(coupon_id, supplier_id, credit_id) VALUES (_c.id, _supplier_id, _credit_id);
  UPDATE public.coupons SET usos = usos + 1 WHERE id = _c.id;

  RETURN jsonb_build_object('ok', true, 'credit_id', _credit_id, 'tipo', _c.tipo, 'valor', _c.valor, 'ciclos', GREATEST(_c.ciclos, 1), 'codigo', _c.codigo);
END;
$$;

-- Presente/desconto concedido pelo admin
CREATE OR REPLACE FUNCTION public.admin_conceder_beneficio(_supplier_id uuid, _tipo text, _valor numeric, _ciclos integer, _motivo text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem conceder benefícios';
  END IF;
  IF _tipo NOT IN ('percentual', 'valor', 'meses_gratis') THEN
    RAISE EXCEPTION 'Tipo de benefício inválido';
  END IF;
  INSERT INTO public.supplier_credits(supplier_id, origem, tipo, valor, ciclos_total, ciclos_restantes, status, concedido_por, motivo)
  VALUES (_supplier_id, 'presente', _tipo, _valor, GREATEST(coalesce(_ciclos, 1), 1), GREATEST(coalesce(_ciclos, 1), 1), 'pendente', auth.uid(), _motivo)
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;

-- Registra a etapa de uma indicação e concede o bônus correspondente ao indicador
CREATE OR REPLACE FUNCTION public.registrar_etapa_indicacao_fornecedor(_indicado_user_id uuid, _codigo text, _status text, _indicado_supplier_id uuid DEFAULT NULL, _indicado_nome text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _ref public.supplier_referrals;
  _ev public.supplier_referral_events;
  _pct numeric;
  _credit_id uuid;
BEGIN
  SELECT * INTO _ref FROM public.supplier_referrals WHERE codigo = upper(trim(_codigo)) AND ativo = true;
  IF _ref.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'erro', 'Código de indicação inválido.'); END IF;

  -- não permite auto-indicação
  IF EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = _ref.supplier_id AND s.user_id = _indicado_user_id) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Auto-indicação não permitida.');
  END IF;

  SELECT * INTO _ev FROM public.supplier_referral_events
  WHERE referral_id = _ref.id AND indicado_user_id = _indicado_user_id;

  IF _ev.id IS NULL THEN
    INSERT INTO public.supplier_referral_events(referral_id, indicado_user_id, indicado_supplier_id, indicado_nome, status)
    VALUES (_ref.id, _indicado_user_id, _indicado_supplier_id, _indicado_nome, _status)
    RETURNING * INTO _ev;
  ELSE
    UPDATE public.supplier_referral_events
    SET status = _status,
        indicado_supplier_id = coalesce(_indicado_supplier_id, indicado_supplier_id),
        indicado_nome = coalesce(_indicado_nome, indicado_nome)
    WHERE id = _ev.id
    RETURNING * INTO _ev;
  END IF;

  -- bônus de cadastro completo
  IF _status = 'cadastro_completo' AND _ev.bonus_cadastro_credit_id IS NULL THEN
    _pct := coalesce((SELECT (value->>'pct_cadastro')::numeric FROM public.system_settings WHERE key = 'indicacao_fornecedor'), 10);
    INSERT INTO public.supplier_credits(supplier_id, origem, origem_id, tipo, valor, ciclos_total, ciclos_restantes, status, motivo)
    VALUES (_ref.supplier_id, 'indicacao', _ev.id, 'percentual', _pct, 1, 1, 'pendente', 'Indicação: cadastro completo')
    RETURNING id INTO _credit_id;
    UPDATE public.supplier_referral_events SET bonus_cadastro_credit_id = _credit_id WHERE id = _ev.id;
  END IF;

  -- bônus de assinatura paga
  IF _status = 'assinou' AND _ev.bonus_assinatura_credit_id IS NULL THEN
    _pct := coalesce((SELECT (value->>'pct_assinatura')::numeric FROM public.system_settings WHERE key = 'indicacao_fornecedor'), 50);
    INSERT INTO public.supplier_credits(supplier_id, origem, origem_id, tipo, valor, ciclos_total, ciclos_restantes, status, motivo)
    VALUES (_ref.supplier_id, 'indicacao', _ev.id, 'percentual', _pct, 1, 1, 'pendente', 'Indicação: assinatura confirmada')
    RETURNING id INTO _credit_id;
    UPDATE public.supplier_referral_events SET bonus_assinatura_credit_id = _credit_id WHERE id = _ev.id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'event_id', _ev.id, 'status', _status);
END;
$$;