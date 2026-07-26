
-- ============ 1. TABELA DE PREÇOS ============
CREATE TABLE public.platform_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chave text NOT NULL UNIQUE,
  categoria text NOT NULL DEFAULT 'outros',
  label text NOT NULL,
  descricao text,
  modo text NOT NULL DEFAULT 'fixo' CHECK (modo IN ('fixo','percentual','hibrido')),
  valor_fixo numeric NOT NULL DEFAULT 0,
  percentual numeric NOT NULL DEFAULT 0,
  valor_min numeric,
  valor_max numeric,
  moeda text NOT NULL DEFAULT 'BRL',
  ativo boolean NOT NULL DEFAULT true,
  overrides jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.platform_prices TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.platform_prices TO authenticated;
GRANT ALL ON public.platform_prices TO service_role;

ALTER TABLE public.platform_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform_prices_public_read" ON public.platform_prices
  FOR SELECT USING (true);

CREATE POLICY "platform_prices_admin_write" ON public.platform_prices
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_platform_prices_updated_at
  BEFORE UPDATE ON public.platform_prices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed inicial
INSERT INTO public.platform_prices (chave, categoria, label, descricao, modo, valor_fixo)
VALUES
  ('reserva_data_ociosa', 'reservas', 'Taxa de reserva de data ociosa',
   'Cobrada do fornecedor quando ele confirma uma reserva de data ociosa.',
   'fixo', 100),
  ('assinatura_fornecedor_pro', 'assinaturas', 'Assinatura Fornecedor Pro',
   'Plano mensal do fornecedor com destaque na busca e recursos extras.',
   'fixo', 0),
  ('destaque_busca', 'destaques', 'Destaque na busca',
   'Impulsiona o fornecedor nos resultados por período determinado.',
   'fixo', 0);

-- ============ 2. RESERVAS DE DATAS OCIOSAS ============
CREATE TABLE public.idle_date_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  couple_id uuid NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  promo_date date NOT NULL,
  guest_count int,
  valor_estimado numeric,
  desconto_pct numeric,
  status text NOT NULL DEFAULT 'solicitada'
    CHECK (status IN ('solicitada','pre_reservada','confirmada','recusada','expirada','cancelada')),
  solicitada_em timestamptz NOT NULL DEFAULT now(),
  expira_em timestamptz,
  respondida_em timestamptz,
  taxa_plataforma numeric,
  taxa_status text NOT NULL DEFAULT 'pendente'
    CHECK (taxa_status IN ('pendente','faturada','paga','estornada')),
  taxa_memoria jsonb,
  mp_payment_id text,
  mp_status text,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.idle_date_reservations TO authenticated;
GRANT ALL ON public.idle_date_reservations TO service_role;

ALTER TABLE public.idle_date_reservations ENABLE ROW LEVEL SECURITY;

-- Índice único parcial: apenas uma confirmada por fornecedor/data
CREATE UNIQUE INDEX idle_reservations_unique_confirmada
  ON public.idle_date_reservations (supplier_id, promo_date)
  WHERE status = 'confirmada';

CREATE INDEX idle_reservations_supplier_status ON public.idle_date_reservations (supplier_id, status);
CREATE INDEX idle_reservations_couple_status ON public.idle_date_reservations (couple_id, status);
CREATE INDEX idle_reservations_expira ON public.idle_date_reservations (expira_em) WHERE status IN ('solicitada','pre_reservada');

-- Casal vê / cria as próprias
CREATE POLICY "idle_res_couple_select" ON public.idle_date_reservations
  FOR SELECT TO authenticated
  USING (couple_id = get_couple_id_for_user(auth.uid()));

CREATE POLICY "idle_res_couple_insert" ON public.idle_date_reservations
  FOR INSERT TO authenticated
  WITH CHECK (couple_id = get_couple_id_for_user(auth.uid()));

CREATE POLICY "idle_res_couple_cancel" ON public.idle_date_reservations
  FOR UPDATE TO authenticated
  USING (couple_id = get_couple_id_for_user(auth.uid()))
  WITH CHECK (couple_id = get_couple_id_for_user(auth.uid()));

-- Fornecedor vê / responde as dele
CREATE POLICY "idle_res_supplier_select" ON public.idle_date_reservations
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = supplier_id AND s.user_id = auth.uid()));

CREATE POLICY "idle_res_supplier_update" ON public.idle_date_reservations
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = supplier_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = supplier_id AND s.user_id = auth.uid()));

-- Admin tudo
CREATE POLICY "idle_res_admin_all" ON public.idle_date_reservations
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'))
  WITH CHECK (has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_idle_res_updated_at
  BEFORE UPDATE ON public.idle_date_reservations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ 3. TRIGGER: confirmar reserva bloqueia a data ============
CREATE OR REPLACE FUNCTION public.on_idle_reservation_confirmed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _couple_user uuid;
BEGIN
  IF NEW.status = 'confirmada' AND (OLD.status IS DISTINCT FROM 'confirmada') THEN
    INSERT INTO public.supplier_blocked_dates (supplier_id, blocked_date, reason)
    VALUES (NEW.supplier_id, NEW.promo_date, 'Reserva confirmada')
    ON CONFLICT DO NOTHING;

    SELECT c.user_id INTO _couple_user FROM public.couples c WHERE c.id = NEW.couple_id;
    IF _couple_user IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, body, link)
      VALUES (_couple_user, 'reserva_confirmada',
        'Sua reserva foi confirmada!',
        'O fornecedor confirmou a disponibilidade para a data solicitada.',
        '/meus-fornecedores');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_idle_res_confirm
  AFTER UPDATE ON public.idle_date_reservations
  FOR EACH ROW EXECUTE FUNCTION public.on_idle_reservation_confirmed();

-- Notifica fornecedor ao criar solicitação
CREATE OR REPLACE FUNCTION public.on_idle_reservation_requested()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _supplier_user uuid;
BEGIN
  SELECT user_id INTO _supplier_user FROM public.suppliers WHERE id = NEW.supplier_id;
  IF _supplier_user IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (_supplier_user, 'reserva_solicitada',
      'Nova solicitação de reserva de data ociosa',
      'Um casal solicitou reserva para ' || to_char(NEW.promo_date, 'DD/MM/YYYY') || '. Responda em até 24h.',
      '/fornecedor/painel?tab=reservas');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_idle_res_request
  AFTER INSERT ON public.idle_date_reservations
  FOR EACH ROW EXECUTE FUNCTION public.on_idle_reservation_requested();

-- ============ 4. FUNÇÃO HELPER: calcular taxa ============
CREATE OR REPLACE FUNCTION public.calc_platform_fee(_chave text, _categoria_slug text DEFAULT NULL, _valor_base numeric DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row public.platform_prices;
  _cfg jsonb;
  _modo text;
  _valor_fixo numeric;
  _pct numeric;
  _min numeric;
  _max numeric;
  _resultado numeric := 0;
BEGIN
  SELECT * INTO _row FROM public.platform_prices WHERE chave = _chave AND ativo = true LIMIT 1;
  IF _row.id IS NULL THEN
    RETURN jsonb_build_object('valor', 0, 'memoria', jsonb_build_object('erro','preco_nao_configurado'));
  END IF;

  _modo := _row.modo;
  _valor_fixo := _row.valor_fixo;
  _pct := _row.percentual;
  _min := _row.valor_min;
  _max := _row.valor_max;

  IF _categoria_slug IS NOT NULL AND _row.overrides ? _categoria_slug THEN
    _cfg := _row.overrides -> _categoria_slug;
    _modo := COALESCE(_cfg->>'modo', _modo);
    _valor_fixo := COALESCE((_cfg->>'valor_fixo')::numeric, _valor_fixo);
    _pct := COALESCE((_cfg->>'percentual')::numeric, _pct);
    _min := COALESCE((_cfg->>'valor_min')::numeric, _min);
    _max := COALESCE((_cfg->>'valor_max')::numeric, _max);
  END IF;

  IF _modo = 'fixo' THEN
    _resultado := _valor_fixo;
  ELSIF _modo = 'percentual' THEN
    _resultado := ROUND(COALESCE(_valor_base,0) * _pct / 100, 2);
  ELSIF _modo = 'hibrido' THEN
    _resultado := _valor_fixo + ROUND(COALESCE(_valor_base,0) * _pct / 100, 2);
  END IF;

  IF _min IS NOT NULL AND _resultado < _min THEN _resultado := _min; END IF;
  IF _max IS NOT NULL AND _resultado > _max THEN _resultado := _max; END IF;

  RETURN jsonb_build_object(
    'valor', _resultado,
    'memoria', jsonb_build_object(
      'chave', _chave, 'modo', _modo,
      'valor_fixo', _valor_fixo, 'percentual', _pct,
      'valor_base', _valor_base, 'valor_min', _min, 'valor_max', _max,
      'categoria', _categoria_slug, 'aplicou_override', (_categoria_slug IS NOT NULL AND _row.overrides ? _categoria_slug)
    )
  );
END;
$$;

-- ============ 5. DEMANDA: campos no couples ============
ALTER TABLE public.couples
  ADD COLUMN IF NOT EXISTS quer_datas_ociosas boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS data_pretendida date;

-- ============ 6. DEDUP DE NOTIFICAÇÕES DE MATCH ============
CREATE TABLE public.idle_match_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  promo_date date NOT NULL,
  direcao text NOT NULL CHECK (direcao IN ('casal_para_fornecedor','fornecedor_para_casal')),
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (couple_id, supplier_id, promo_date, direcao)
);

GRANT SELECT ON public.idle_match_notifications TO authenticated;
GRANT ALL ON public.idle_match_notifications TO service_role;

ALTER TABLE public.idle_match_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "idle_match_admin_read" ON public.idle_match_notifications
  FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'));

CREATE INDEX idle_match_sent ON public.idle_match_notifications (sent_at);

-- ============ 7. FEATURE FLAGS ============
INSERT INTO public.feature_flags (key, enabled, label, grupo, essencial, description)
VALUES
  ('reserva_datas_ociosas', false, 'Reserva de datas ociosas',
   'Aquisição', false,
   'Permite ao casal solicitar reserva de datas com desconto; taxa cobrada do fornecedor no aceite.'),
  ('tabela_precos', false, 'Tabela de preços',
   'Geral', false,
   'Habilita o admin de valores cobrados pela plataforma (taxas, assinaturas, destaques).')
ON CONFLICT (key) DO NOTHING;
