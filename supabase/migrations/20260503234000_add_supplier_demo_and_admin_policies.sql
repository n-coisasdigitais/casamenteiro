-- Marcador de fornecedor de demonstração
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS suppliers_is_demo_idx ON public.suppliers(is_demo) WHERE is_demo = true;

-- Permitir ao admin gerenciar fornecedores (criar e excluir)
DROP POLICY IF EXISTS "Admin can delete suppliers" ON public.suppliers;
CREATE POLICY "Admin can delete suppliers" ON public.suppliers
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admin can insert suppliers" ON public.suppliers;
CREATE POLICY "Admin can insert suppliers" ON public.suppliers
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Permitir ao admin gerenciar detalhes por categoria também
DO $$
DECLARE tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'supplier_details_buffet','supplier_details_fotografo','supplier_details_local',
    'supplier_details_decoracao','supplier_details_musica','supplier_details_cerimonialista',
    'supplier_details_beleza','supplier_details_trajes','supplier_details_convites'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Admin can manage details" ON public.%I;', tbl);
    EXECUTE format($f$
      CREATE POLICY "Admin can manage details" ON public.%I
      FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
      WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
    $f$, tbl);
  END LOOP;
END $$;
