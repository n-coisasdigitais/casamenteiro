
-- 1. Estender home_simulacoes com data e prazo
ALTER TABLE public.home_simulacoes
  ADD COLUMN IF NOT EXISTS data_evento date,
  ADD COLUMN IF NOT EXISTS prazo_meses integer,
  ADD COLUMN IF NOT EXISTS resultado jsonb;

-- 2. Tabela de datas em promoção do fornecedor (dia ocioso com desconto específico)
CREATE TABLE IF NOT EXISTS public.supplier_promo_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL,
  promo_date date NOT NULL,
  discount_pct integer NOT NULL CHECK (discount_pct > 0 AND discount_pct <= 90),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (supplier_id, promo_date)
);

ALTER TABLE public.supplier_promo_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Promo dates of approved suppliers are public"
  ON public.supplier_promo_dates FOR SELECT
  USING (
    supplier_id IN (SELECT id FROM public.suppliers WHERE status = 'approved')
    OR supplier_id IN (SELECT id FROM public.suppliers WHERE user_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Supplier can insert promo dates"
  ON public.supplier_promo_dates FOR INSERT
  WITH CHECK (supplier_id IN (SELECT id FROM public.suppliers WHERE user_id = auth.uid()));

CREATE POLICY "Supplier can delete promo dates"
  ON public.supplier_promo_dates FOR DELETE
  USING (supplier_id IN (SELECT id FROM public.suppliers WHERE user_id = auth.uid()));

CREATE POLICY "Supplier can update promo dates"
  ON public.supplier_promo_dates FOR UPDATE
  USING (supplier_id IN (SELECT id FROM public.suppliers WHERE user_id = auth.uid()));

-- 3. Admin pode ver todas as simulações (já tem policy via has_role; garantir UPDATE para anotações futuras)
-- noop por enquanto; a policy SELECT existente já cobre admin.

-- 4. Tabela auxiliar com distribuição percentual padrão por categoria (para o cálculo do simulador)
CREATE TABLE IF NOT EXISTS public.budget_distribution_defaults (
  category_slug text PRIMARY KEY,
  pct_simples integer NOT NULL,
  pct_medio integer NOT NULL,
  pct_grande integer NOT NULL,
  essential boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0
);

ALTER TABLE public.budget_distribution_defaults ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Distribution defaults public" ON public.budget_distribution_defaults FOR SELECT USING (true);
CREATE POLICY "Admin manages distribution" ON public.budget_distribution_defaults FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.budget_distribution_defaults (category_slug, pct_simples, pct_medio, pct_grande, essential, display_order) VALUES
  ('espacos-buffet', 35, 32, 30, true, 1),
  ('decoracao', 12, 14, 16, true, 2),
  ('fotografia', 10, 10, 9, true, 3),
  ('video', 6, 7, 7, false, 4),
  ('musica-dj', 8, 8, 9, true, 5),
  ('vestido-noiva', 6, 6, 6, true, 6),
  ('traje-noivo', 3, 3, 3, true, 7),
  ('beleza-maquiagem', 3, 3, 3, true, 8),
  ('cerimonialista', 5, 6, 7, false, 9),
  ('convites', 3, 3, 3, false, 10),
  ('bolos-doces', 5, 4, 4, true, 11),
  ('transporte', 4, 4, 3, false, 12)
ON CONFLICT (category_slug) DO NOTHING;
