
-- 1) Estender suppliers
ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS whatsapp text,
  ADD COLUMN IF NOT EXISTS instagram text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS profile_photo_url text,
  ADD COLUMN IF NOT EXISTS accepts_idle_dates boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS idle_discount_pct integer;

-- 2) Helper para criar tabelas de detalhes por categoria com RLS padrão
DO $$
DECLARE
  cat text;
  tbl text;
BEGIN
  FOREACH cat IN ARRAY ARRAY[
    'buffet','fotografo','local','decoracao','musica',
    'cerimonialista','beleza','trajes','convites'
  ] LOOP
    tbl := 'supplier_details_' || cat;

    EXECUTE format($f$
      CREATE TABLE IF NOT EXISTS public.%I (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        supplier_id uuid NOT NULL UNIQUE REFERENCES public.suppliers(id) ON DELETE CASCADE,
        data jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    $f$, tbl);

    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (supplier_id);', tbl || '_supplier_idx', tbl);

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);

    EXECUTE format($f$
      DROP POLICY IF EXISTS "Public can view details of approved suppliers" ON public.%I;
      CREATE POLICY "Public can view details of approved suppliers"
      ON public.%I FOR SELECT
      USING (
        supplier_id IN (SELECT id FROM public.suppliers WHERE status = 'approved'::supplier_status)
        OR supplier_id IN (SELECT id FROM public.suppliers WHERE user_id = auth.uid())
        OR has_role(auth.uid(), 'admin'::app_role)
      );
    $f$, tbl, tbl);

    EXECUTE format($f$
      DROP POLICY IF EXISTS "Owner can manage details" ON public.%I;
      CREATE POLICY "Owner can manage details"
      ON public.%I FOR ALL
      USING (supplier_id IN (SELECT id FROM public.suppliers WHERE user_id = auth.uid()))
      WITH CHECK (supplier_id IN (SELECT id FROM public.suppliers WHERE user_id = auth.uid()));
    $f$, tbl, tbl);

    EXECUTE format($f$
      DROP TRIGGER IF EXISTS set_updated_at ON public.%I;
      CREATE TRIGGER set_updated_at
      BEFORE UPDATE ON public.%I
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    $f$, tbl, tbl);
  END LOOP;
END $$;

-- 3) supplier_leads
CREATE TABLE IF NOT EXISTS public.supplier_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  couple_id uuid,
  nome_casal text,
  whatsapp_casal text,
  email_casal text,
  orcamento_total numeric,
  num_convidados integer,
  cidade_evento text,
  data_evento date,
  data_contato timestamptz NOT NULL DEFAULT now(),
  status_lead text NOT NULL DEFAULT 'novo' CHECK (status_lead IN ('novo','em_conversa','fechado','perdido')),
  valor_fechado numeric,
  comissao_gerada numeric,
  origem text NOT NULL DEFAULT 'simulador',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS supplier_leads_supplier_idx ON public.supplier_leads(supplier_id);
CREATE INDEX IF NOT EXISTS supplier_leads_couple_idx ON public.supplier_leads(couple_id);

ALTER TABLE public.supplier_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can create lead" ON public.supplier_leads;
CREATE POLICY "Anyone can create lead"
ON public.supplier_leads FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Supplier or couple can view lead" ON public.supplier_leads;
CREATE POLICY "Supplier or couple can view lead"
ON public.supplier_leads FOR SELECT
USING (
  supplier_id IN (SELECT id FROM public.suppliers WHERE user_id = auth.uid())
  OR (couple_id IS NOT NULL AND couple_id = get_couple_id_for_user(auth.uid()))
  OR has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "Supplier can update lead" ON public.supplier_leads;
CREATE POLICY "Supplier can update lead"
ON public.supplier_leads FOR UPDATE
USING (
  supplier_id IN (SELECT id FROM public.suppliers WHERE user_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);

DROP TRIGGER IF EXISTS set_updated_at ON public.supplier_leads;
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.supplier_leads
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) simulated_budgets
CREATE TABLE IF NOT EXISTS public.simulated_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid,
  orcamento_total numeric NOT NULL,
  num_convidados integer NOT NULL,
  cidade text,
  estado text,
  estilo text,
  distribuicao jsonb NOT NULL DEFAULT '{}'::jsonb,
  categorias_selecionadas text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS simulated_budgets_couple_idx ON public.simulated_budgets(couple_id);

ALTER TABLE public.simulated_budgets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can create simulation" ON public.simulated_budgets;
CREATE POLICY "Anyone can create simulation"
ON public.simulated_budgets FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Owner or admin can view simulation" ON public.simulated_budgets;
CREATE POLICY "Owner or admin can view simulation"
ON public.simulated_budgets FOR SELECT
USING (
  (couple_id IS NOT NULL AND couple_id = get_couple_id_for_user(auth.uid()))
  OR has_role(auth.uid(), 'admin'::app_role)
);
