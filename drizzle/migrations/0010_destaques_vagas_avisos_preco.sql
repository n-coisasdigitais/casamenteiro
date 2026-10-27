CREATE OR REPLACE FUNCTION public.destaque_preencher_categoria()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.escopo = 'categoria' AND NEW.escopo_categoria_id IS NULL THEN
    SELECT category_id INTO NEW.escopo_categoria_id FROM public.suppliers WHERE id = NEW.supplier_id;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_destaque_preencher_categoria ON public.featured_purchases;
CREATE TRIGGER trg_destaque_preencher_categoria
  BEFORE INSERT ON public.featured_purchases
  FOR EACH ROW EXECUTE FUNCTION public.destaque_preencher_categoria();

CREATE OR REPLACE FUNCTION public.destaque_vagas_livres(_escopo text, _categoria_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH limite AS (
    SELECT COALESCE(max(max_vagas), 3) AS vagas
      FROM public.featured_packages
     WHERE ativo AND (escopo = _escopo OR (_escopo = 'home_hero' AND escopo = 'home'))
  ), ocupadas AS (
    SELECT count(*) AS n
      FROM public.featured_purchases
     WHERE status = 'ativo' AND fim > now()
       AND (escopo = _escopo OR (_escopo = 'home_hero' AND escopo = 'home'))
       AND (_escopo NOT IN ('categoria', 'home_categoria') OR escopo_categoria_id = _categoria_id)
  )
  SELECT GREATEST((SELECT vagas FROM limite) - (SELECT n FROM ocupadas), 0)::integer;
$$;
GRANT EXECUTE ON FUNCTION public.destaque_vagas_livres(text, uuid) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.destaque_checar_vagas()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _escopo text := CASE WHEN NEW.escopo = 'home' THEN 'home_hero' ELSE COALESCE(NEW.escopo, 'categoria') END;
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  IF public.destaque_vagas_livres(_escopo, NEW.escopo_categoria_id) <= 0 THEN
    RAISE EXCEPTION 'As vagas deste destaque estão esgotadas no momento. Tente outro período ou outro espaço.';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_destaque_checar_vagas ON public.featured_purchases;
CREATE TRIGGER trg_destaque_checar_vagas
  BEFORE INSERT ON public.featured_purchases
  FOR EACH ROW EXECUTE FUNCTION public.destaque_checar_vagas();

CREATE OR REPLACE FUNCTION public.expirar_monetizacao()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.featured_purchases SET status = 'expirado'
   WHERE status = 'ativo' AND fim IS NOT NULL AND fim < now();

  UPDATE public.suppliers s SET featured = false, featured_until = NULL
   WHERE s.featured_until IS NOT NULL AND s.featured_until < now()
     AND NOT EXISTS (
       SELECT 1 FROM public.featured_purchases fp
        WHERE fp.supplier_id = s.id AND fp.status = 'ativo' AND fp.fim > now())
     AND NOT EXISTS (
       SELECT 1 FROM public.supplier_subscriptions ss
         JOIN public.subscription_plans sp ON sp.id = ss.plan_id
        WHERE ss.supplier_id = s.id AND ss.status = 'ativa' AND sp.destaque_busca
          AND (ss.current_period_end IS NULL OR ss.current_period_end > now()));

  UPDATE public.supplier_subscriptions SET status = 'expirada'
   WHERE status = 'ativa' AND current_period_end IS NOT NULL AND current_period_end < now() - interval '3 days';
END;
$$;

CREATE TABLE IF NOT EXISTS public.avisos_categoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  user_id uuid,
  email text CHECK (email IS NULL OR (length(email) <= 200 AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  cidade text CHECK (cidade IS NULL OR length(cidade) <= 120),
  avisado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (email IS NOT NULL OR user_id IS NOT NULL)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_avisos_categoria_user ON public.avisos_categoria(category_id, user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_avisos_categoria_email ON public.avisos_categoria(category_id, lower(email)) WHERE user_id IS NULL;
GRANT INSERT ON public.avisos_categoria TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.avisos_categoria TO authenticated;
GRANT ALL ON public.avisos_categoria TO service_role;
ALTER TABLE public.avisos_categoria ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Qualquer um pede aviso" ON public.avisos_categoria
  FOR INSERT TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());
CREATE POLICY "Admin vê e gerencia avisos" ON public.avisos_categoria
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS preco_por_pessoa boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.recalcular_preco_fornecedor(_supplier_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _faixa jsonb; _chave text; _minimo numeric; _gmin integer; _gmax integer;
BEGIN
  SELECT fc.valor, cc.chave INTO _faixa, _chave
    FROM public.fornecedor_campos fc JOIN public.campos_categoria cc ON cc.id = fc.campo_id
   WHERE fc.supplier_id = _supplier_id AND cc.tipo = 'faixa' AND cc.chave LIKE 'preco%'
     AND jsonb_typeof(fc.valor) = 'object' AND (fc.valor ? 'min' OR fc.valor ? 'max')
   ORDER BY cc.ordem LIMIT 1;

  SELECT NULLIF(fc.valor #>> '{}', '')::numeric INTO _minimo
    FROM public.fornecedor_campos fc JOIN public.campos_categoria cc ON cc.id = fc.campo_id
   WHERE fc.supplier_id = _supplier_id AND cc.chave = 'preco_minimo'
     AND (fc.valor #>> '{}') ~ '^[0-9]+(\.[0-9]+)?$'
   LIMIT 1;

  IF _faixa IS NOT NULL THEN
    UPDATE public.suppliers SET
      price_min = NULLIF(_faixa->>'min', '')::numeric,
      price_max = NULLIF(_faixa->>'max', '')::numeric,
      preco_por_pessoa = (_chave = 'preco_por_pessoa')
     WHERE id = _supplier_id;
  ELSIF _minimo IS NOT NULL THEN
    UPDATE public.suppliers SET price_min = _minimo, preco_por_pessoa = false WHERE id = _supplier_id;
  END IF;

  SELECT max(CASE WHEN cc.chave IN ('capacidade_min', 'convidados_min') AND (fc.valor #>> '{}') ~ '^[0-9]+$' THEN (fc.valor #>> '{}')::integer END),
         max(CASE WHEN cc.chave IN ('capacidade_max', 'convidados_max') AND (fc.valor #>> '{}') ~ '^[0-9]+$' THEN (fc.valor #>> '{}')::integer END)
    INTO _gmin, _gmax
    FROM public.fornecedor_campos fc JOIN public.campos_categoria cc ON cc.id = fc.campo_id
   WHERE fc.supplier_id = _supplier_id;
  IF _gmin IS NOT NULL OR _gmax IS NOT NULL THEN
    UPDATE public.suppliers SET guest_min = COALESCE(_gmin, guest_min), guest_max = COALESCE(_gmax, guest_max)
     WHERE id = _supplier_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_recalcular_preco_fornecedor()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.recalcular_preco_fornecedor(COALESCE(NEW.supplier_id, OLD.supplier_id));
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS trg_fornecedor_campos_preco ON public.fornecedor_campos;
CREATE TRIGGER trg_fornecedor_campos_preco
  AFTER INSERT OR UPDATE OR DELETE ON public.fornecedor_campos
  FOR EACH ROW EXECUTE FUNCTION public.trg_recalcular_preco_fornecedor();