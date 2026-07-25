
-- 1) Novas categorias
INSERT INTO public.categories (name, slug, icon, active)
VALUES
  ('Espaço / Local', 'espaco', 'building', true),
  ('Buffet / Gastronomia', 'buffet', 'utensils', true)
ON CONFLICT (slug) DO NOTHING;

-- 2) Reclassifica fornecedores: buffet por heurística; resto = espaço
UPDATE public.suppliers s
   SET category_id = (SELECT id FROM public.categories WHERE slug = 'buffet')
 WHERE s.category_id = (SELECT id FROM public.categories WHERE slug = 'espacos-buffet')
   AND ( COALESCE(s.pricing_model,'') = 'por_pessoa'
      OR lower(s.company_name) LIKE '%buffet%'
      OR lower(s.company_name) LIKE '%gastronom%'
      OR lower(s.company_name) LIKE '%catering%' );

UPDATE public.suppliers s
   SET category_id = (SELECT id FROM public.categories WHERE slug = 'espaco')
 WHERE s.category_id = (SELECT id FROM public.categories WHERE slug = 'espacos-buffet');

-- 3) Reclassifica couple_suppliers usando o fornecedor
UPDATE public.couple_suppliers cs
   SET category_id = s.category_id
  FROM public.suppliers s
 WHERE cs.supplier_id = s.id
   AND cs.category_id = (SELECT id FROM public.categories WHERE slug = 'espacos-buffet');

-- 4) Reclassifica budget_items (por descrição de fornecedor + heurística)
UPDATE public.budget_items bi
   SET category = 'buffet'
 WHERE bi.category = 'espacos-buffet'
   AND ( lower(COALESCE(bi.description,'')) LIKE '%buffet%'
      OR lower(COALESCE(bi.description,'')) LIKE '%gastronom%'
      OR lower(COALESCE(bi.description,'')) LIKE '%catering%'
      OR lower(COALESCE(bi.description,'')) LIKE '%sabor%' );

UPDATE public.budget_items
   SET category = 'espaco'
 WHERE category = 'espacos-buffet';

-- 5) Desativa slug antigo (mantém row para histórico)
UPDATE public.categories SET active = false WHERE slug = 'espacos-buffet';

-- 6) Índice único: impede duas linhas de "verba" para a mesma categoria de um casal
--    (só aplica quando supplier_id é NULL, ou seja, linhas de verba planejada)
CREATE UNIQUE INDEX IF NOT EXISTS budget_items_couple_category_verba
  ON public.budget_items(couple_id, category)
  WHERE supplier_id IS NULL;
