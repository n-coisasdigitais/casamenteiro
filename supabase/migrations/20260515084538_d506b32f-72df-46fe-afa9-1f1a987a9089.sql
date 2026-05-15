
-- Categories: novas colunas
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Trigger updated_at
DROP TRIGGER IF EXISTS trg_categories_updated ON public.categories;
CREATE TRIGGER trg_categories_updated
BEFORE UPDATE ON public.categories
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS admin
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='categories' AND policyname='Admin gerencia categorias') THEN
    CREATE POLICY "Admin gerencia categorias" ON public.categories
      FOR ALL TO authenticated
      USING (has_role(auth.uid(),'admin'))
      WITH CHECK (has_role(auth.uid(),'admin'));
  END IF;
END $$;

-- campos_categoria: novas colunas
ALTER TABLE public.campos_categoria
  ADD COLUMN IF NOT EXISTS is_base boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS placeholder text;

-- Atualizar CHECK para incluir 'checkbox'
ALTER TABLE public.campos_categoria DROP CONSTRAINT IF EXISTS campos_categoria_tipo_check;
ALTER TABLE public.campos_categoria ADD CONSTRAINT campos_categoria_tipo_check
  CHECK (tipo = ANY (ARRAY['texto','numero','booleano','select','lista','faixa','textarea','checkbox']));

-- Função para semear campos base
CREATE OR REPLACE FUNCTION public.seed_base_category_fields(_category_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.campos_categoria (category_id, chave, label, tipo, obrigatorio, ordem, ativo, is_base, mostrar_no_perfil)
  VALUES
    (_category_id, 'descricao', 'Descrição do serviço', 'textarea', true, 0, true, true, true),
    (_category_id, 'telefone', 'Telefone', 'texto', true, 1, true, true, true),
    (_category_id, 'whatsapp', 'WhatsApp', 'texto', false, 2, true, true, true),
    (_category_id, 'site', 'Site', 'texto', false, 3, true, true, true),
    (_category_id, 'instagram', 'Instagram', 'texto', false, 4, true, true, true),
    (_category_id, 'cidade', 'Cidade de atuação', 'texto', true, 5, true, true, true),
    (_category_id, 'estado', 'Estado', 'select', true, 6, true, true, true),
    (_category_id, 'preco_medio', 'Preço médio (R$)', 'numero', false, 7, true, true, true),
    (_category_id, 'atende_fora', 'Atende fora da cidade?', 'booleano', false, 8, true, true, true),
    (_category_id, 'anos_experiencia', 'Anos de experiência', 'numero', false, 9, true, true, true)
  ON CONFLICT (category_id, chave) DO NOTHING;
END;
$$;

-- Trigger after insert categories
CREATE OR REPLACE FUNCTION public.trg_seed_base_fields_on_category()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.seed_base_category_fields(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_categories_seed_base ON public.categories;
CREATE TRIGGER trg_categories_seed_base
AFTER INSERT ON public.categories
FOR EACH ROW EXECUTE FUNCTION public.trg_seed_base_fields_on_category();

-- Backfill: marcar campos base existentes (se já houver alguma chave conhecida) e semear faltantes
DO $$
DECLARE _cat record;
BEGIN
  FOR _cat IN SELECT id FROM public.categories LOOP
    PERFORM public.seed_base_category_fields(_cat.id);
  END LOOP;
END $$;

-- Garantir is_base=true em registros base já existentes
UPDATE public.campos_categoria SET is_base = true
WHERE chave IN ('descricao','telefone','whatsapp','site','instagram','cidade','estado','preco_medio','atende_fora','anos_experiencia');
