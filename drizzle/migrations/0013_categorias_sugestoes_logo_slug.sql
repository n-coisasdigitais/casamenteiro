CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;

ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS categoria_outros_descricao text;

CREATE OR REPLACE FUNCTION public.slugify_texto(_t text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public, extensions AS $$
  SELECT trim(both '-' from regexp_replace(lower(extensions.unaccent(coalesce(_t,''))), '[^a-z0-9]+', '-', 'g'))
$$;

CREATE OR REPLACE FUNCTION public.supplier_set_slug()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE base text; cand text; n int := 1;
BEGIN
  IF NEW.slug IS NOT NULL AND TG_OP = 'UPDATE' AND NEW.company_name IS NOT DISTINCT FROM OLD.company_name THEN
    RETURN NEW;
  END IF;
  base := public.slugify_texto(NEW.company_name);
  IF base = '' OR base = 'minha-empresa' THEN base := 'fornecedor-' || left(NEW.id::text, 8); END IF;
  IF base IN ('painel','cadastro','login','planos','faturas','indicacoes','mp-callback') THEN base := base || '-1'; END IF;
  cand := base;
  WHILE EXISTS (SELECT 1 FROM public.suppliers WHERE slug = cand AND id <> NEW.id) LOOP
    n := n + 1; cand := base || '-' || n;
  END LOOP;
  NEW.slug := cand;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_supplier_set_slug ON public.suppliers;
CREATE TRIGGER trg_supplier_set_slug BEFORE INSERT OR UPDATE OF company_name, slug ON public.suppliers
FOR EACH ROW EXECUTE FUNCTION public.supplier_set_slug();

UPDATE public.suppliers SET slug = NULL WHERE slug IS NULL;
-- backfill: trigger only fires on company_name/slug update; force via company_name
UPDATE public.suppliers SET company_name = company_name WHERE slug IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS suppliers_slug_key ON public.suppliers(slug);
GRANT SELECT (slug, logo_url, categoria_outros_descricao) ON public.suppliers TO anon, authenticated;

CREATE TABLE public.categoria_sugestoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  nome text NOT NULL,
  nome_normalizado text NOT NULL,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','aprovada','recusada')),
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  decidido_em timestamptz,
  decidido_por uuid
);
GRANT SELECT, INSERT, UPDATE ON public.categoria_sugestoes TO authenticated;
GRANT ALL ON public.categoria_sugestoes TO service_role;
ALTER TABLE public.categoria_sugestoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Fornecedor vê suas sugestões" ON public.categoria_sugestoes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = supplier_id AND s.user_id = auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin atualiza sugestões" ON public.categoria_sugestoes FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.registrar_sugestao_categoria()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE norm text;
BEGIN
  IF NEW.categoria_outros_descricao IS NULL OR btrim(NEW.categoria_outros_descricao) = '' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND NEW.categoria_outros_descricao IS NOT DISTINCT FROM OLD.categoria_outros_descricao THEN RETURN NEW; END IF;
  norm := public.slugify_texto(NEW.categoria_outros_descricao);
  IF NOT EXISTS (SELECT 1 FROM public.categoria_sugestoes WHERE supplier_id = NEW.id AND nome_normalizado = norm) THEN
    INSERT INTO public.categoria_sugestoes (supplier_id, nome, nome_normalizado)
    VALUES (NEW.id, btrim(NEW.categoria_outros_descricao), norm);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_registrar_sugestao_categoria AFTER INSERT OR UPDATE OF categoria_outros_descricao ON public.suppliers
FOR EACH ROW EXECUTE FUNCTION public.registrar_sugestao_categoria();

CREATE OR REPLACE FUNCTION public.couples_somente_conta_casal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE tipo text;
BEGIN
  SELECT account_type INTO tipo FROM public.profiles WHERE user_id = NEW.user_id;
  IF tipo IS NOT NULL AND tipo <> 'couple' AND NOT public.has_role(NEW.user_id,'admin') THEN
    RAISE EXCEPTION 'Esta conta não é de casal e não pode ter área de planejamento.';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_couples_somente_conta_casal ON public.couples;
CREATE TRIGGER trg_couples_somente_conta_casal BEFORE INSERT ON public.couples
FOR EACH ROW EXECUTE FUNCTION public.couples_somente_conta_casal();

CREATE POLICY "Fornecedor envia logo" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'supplier-photos' AND (storage.foldername(name))[1] = 'logos' AND (storage.foldername(name))[2] = auth.uid()::text);
CREATE POLICY "Fornecedor troca logo" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'supplier-photos' AND (storage.foldername(name))[1] = 'logos' AND (storage.foldername(name))[2] = auth.uid()::text);
CREATE POLICY "Fornecedor apaga logo" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'supplier-photos' AND (storage.foldername(name))[1] = 'logos' AND (storage.foldername(name))[2] = auth.uid()::text);