-- =====================================================================
-- 1) Status "recusado definitivamente" + itens pedidos no histórico
-- =====================================================================
ALTER TYPE public.supplier_status ADD VALUE IF NOT EXISTS 'blocked';

ALTER TABLE public.fornecedor_aprovacoes DROP CONSTRAINT IF EXISTS fornecedor_aprovacoes_acao_check;
ALTER TABLE public.fornecedor_aprovacoes ADD CONSTRAINT fornecedor_aprovacoes_acao_check
  CHECK (acao IN ('submitted','approved','rejected','resubmitted','blocked'));
-- lista do que o admin pediu para corrigir (códigos do checklist + textos livres)
ALTER TABLE public.fornecedor_aprovacoes ADD COLUMN IF NOT EXISTS itens text[];

-- =====================================================================
-- 2) Mínimo para enviar + só admin aprova/recusa
-- =====================================================================
-- Devolve o que falta para o cadastro poder ir para aprovação (lista vazia = pronto).
CREATE OR REPLACE FUNCTION public.fornecedor_pendencias(_supplier_id uuid)
RETURNS text[]
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  s public.suppliers%ROWTYPE;
  falta text[] := '{}';
  n_fotos int;
  desc_txt text;
  tem_contato boolean;
BEGIN
  SELECT * INTO s FROM public.suppliers WHERE id = _supplier_id;
  IF NOT FOUND THEN RETURN ARRAY['nao_encontrado']; END IF;
  IF auth.uid() IS NOT NULL AND s.user_id <> auth.uid() AND NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'sem permissão';
  END IF;

  IF coalesce(s.profile_photo_url, '') = '' THEN falta := array_append(falta, 'foto_perfil'); END IF;

  SELECT count(*) INTO n_fotos FROM public.supplier_photos WHERE supplier_id = s.id;
  IF n_fotos < 4 THEN falta := array_append(falta, 'fotos_trabalho'); END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.fornecedor_campos fc JOIN public.campos_categoria cc ON cc.id = fc.campo_id
    WHERE fc.supplier_id = s.id AND cc.chave IN ('telefone','whatsapp')
      AND length(regexp_replace(fc.valor #>> '{}', '\D', '', 'g')) >= 10
  ) OR length(regexp_replace(coalesce(nullif(s.phone, ''), s.whatsapp, ''), '\D', '', 'g')) >= 10
  INTO tem_contato;
  IF NOT tem_contato THEN falta := array_append(falta, 'contato'); END IF;

  SELECT coalesce(nullif(s.description, ''), (
    SELECT fc.valor #>> '{}' FROM public.fornecedor_campos fc JOIN public.campos_categoria cc ON cc.id = fc.campo_id
    WHERE fc.supplier_id = s.id AND cc.chave = 'descricao' LIMIT 1), '') INTO desc_txt;
  IF length(trim(desc_txt)) < 80 THEN falta := array_append(falta, 'descricao'); END IF;

  IF coalesce(s.city, '') = '' OR coalesce(s.state, '') = '' THEN falta := array_append(falta, 'cidade'); END IF;

  IF s.category_id IS NULL THEN
    falta := array_append(falta, 'categoria');
  ELSIF EXISTS (
    SELECT 1 FROM public.campos_categoria cc
    LEFT JOIN public.fornecedor_campos fc ON fc.campo_id = cc.id AND fc.supplier_id = s.id
    WHERE cc.category_id = s.category_id AND cc.ativo AND cc.obrigatorio AND NOT cc.is_base
      AND (fc.valor IS NULL OR fc.valor IN ('null'::jsonb, '""'::jsonb, '[]'::jsonb, '{}'::jsonb)
           OR (cc.tipo = 'faixa' AND (fc.valor ->> 'min') IS NULL))
  ) THEN
    falta := array_append(falta, 'obrigatorios');
  END IF;

  RETURN falta;
END $$;
GRANT EXECUTE ON FUNCTION public.fornecedor_pendencias(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.guard_supplier_status()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE falta text[];
BEGIN
  -- equipe e rotinas internas (sem usuário logado) passam direto
  IF auth.uid() IS NULL OR has_role(auth.uid(), 'admin') THEN RETURN NEW; END IF;

  -- cadastro novo criado pelo próprio fornecedor sempre começa aguardando
  IF TG_OP = 'INSERT' THEN NEW.status := 'pending'; RETURN NEW; END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT (OLD.status = 'rejected' AND NEW.status = 'pending') THEN
      RAISE EXCEPTION 'Só a equipe do Casamenteiro pode aprovar ou recusar cadastros.';
    END IF;
  END IF;

  -- envio (fim do cadastro) ou reenvio depois de ajustes: exige o mínimo
  IF (NEW.status = 'pending' AND OLD.status = 'rejected')
     OR (coalesce(OLD.onboarding_completed, false) = false AND NEW.onboarding_completed = true AND NEW.status = 'pending') THEN
    falta := public.fornecedor_pendencias(NEW.id);
    -- foto de perfil e cidade podem chegar no mesmo update; confere com os valores novos
    IF coalesce(NEW.profile_photo_url, '') <> '' THEN falta := array_remove(falta, 'foto_perfil'); END IF;
    IF coalesce(NEW.city, '') <> '' AND coalesce(NEW.state, '') <> '' THEN falta := array_remove(falta, 'cidade'); END IF;
    IF coalesce(array_length(falta, 1), 0) > 0 THEN
      RAISE EXCEPTION 'Cadastro incompleto: %', array_to_string(falta, ', ');
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_guard_supplier_status ON public.suppliers;
CREATE TRIGGER trg_guard_supplier_status BEFORE INSERT OR UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.guard_supplier_status();

-- =====================================================================
-- 3) Redes sociais (só quem está logado lê) + cliques
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.supplier_redes_sociais (
  supplier_id uuid PRIMARY KEY REFERENCES public.suppliers(id) ON DELETE CASCADE,
  instagram text, tiktok text, youtube text, facebook text, pinterest text, site text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.supplier_redes_sociais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Logados veem redes de aprovados" ON public.supplier_redes_sociais
  FOR SELECT TO authenticated USING (
    supplier_id IN (SELECT id FROM public.suppliers WHERE status = 'approved')
    OR supplier_id IN (SELECT id FROM public.suppliers WHERE user_id = auth.uid())
    OR has_role(auth.uid(), 'admin')
  );
CREATE POLICY "Dono e admin editam redes" ON public.supplier_redes_sociais
  FOR ALL TO authenticated
  USING (supplier_id IN (SELECT id FROM public.suppliers WHERE user_id = auth.uid()) OR has_role(auth.uid(), 'admin'))
  WITH CHECK (supplier_id IN (SELECT id FROM public.suppliers WHERE user_id = auth.uid()) OR has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.supplier_redes_cliques (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  rede text NOT NULL CHECK (rede IN ('instagram','tiktok','youtube','facebook','pinterest','site')),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_redes_cliques_supplier ON public.supplier_redes_cliques(supplier_id, created_at DESC);
ALTER TABLE public.supplier_redes_cliques ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Logado registra clique" ON public.supplier_redes_cliques
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Dono e admin veem cliques" ON public.supplier_redes_cliques
  FOR SELECT TO authenticated USING (
    supplier_id IN (SELECT id FROM public.suppliers WHERE user_id = auth.uid()) OR has_role(auth.uid(), 'admin')
  );

-- copia o que já existe (coluna do fornecedor ou resposta da categoria); guarda só o @ do Instagram
INSERT INTO public.supplier_redes_sociais (supplier_id, instagram, site)
SELECT s.id,
  nullif(regexp_replace(regexp_replace(lower(trim(coalesce(nullif(s.instagram, ''), ig.valor #>> '{}', ''))),
         '^(https?://)?(www\.)?instagram\.com/|^@', ''), '[/?].*$', ''), ''),
  nullif(trim(coalesce(nullif(s.website, ''), st.valor #>> '{}', '')), '')
FROM public.suppliers s
LEFT JOIN LATERAL (SELECT fc.valor FROM public.fornecedor_campos fc JOIN public.campos_categoria cc ON cc.id = fc.campo_id
                   WHERE fc.supplier_id = s.id AND cc.chave = 'instagram' LIMIT 1) ig ON true
LEFT JOIN LATERAL (SELECT fc.valor FROM public.fornecedor_campos fc JOIN public.campos_categoria cc ON cc.id = fc.campo_id
                   WHERE fc.supplier_id = s.id AND cc.chave = 'site' LIMIT 1) st ON true
WHERE coalesce(nullif(s.instagram, ''), nullif(s.website, ''), ig.valor #>> '{}', st.valor #>> '{}') IS NOT NULL
ON CONFLICT (supplier_id) DO NOTHING;

-- =====================================================================
-- 4) Instagram e Site saem das perguntas da categoria e ficam fechados
-- =====================================================================
UPDATE public.campos_categoria SET ativo = false, mostrar_no_perfil = false WHERE chave IN ('instagram', 'site');

DROP POLICY IF EXISTS "Público vê respostas não sensíveis de aprovados" ON public.fornecedor_campos;
CREATE POLICY "Público vê respostas não sensíveis de aprovados" ON public.fornecedor_campos
  FOR SELECT USING (
    ((supplier_id IN (SELECT s.id FROM public.suppliers s WHERE s.status = 'approved'))
      AND NOT EXISTS (SELECT 1 FROM public.campos_categoria c WHERE c.id = fornecedor_campos.campo_id
        AND c.chave = ANY (ARRAY['telefone','whatsapp','email','celular','contato','instagram','site'])))
    OR supplier_id IN (SELECT s.id FROM public.suppliers s WHERE s.user_id = auth.uid())
    OR has_role(auth.uid(), 'admin')
  );

-- as colunas antigas ficavam legíveis sem login; o conteúdo já foi copiado acima
UPDATE public.suppliers SET instagram = NULL, website = NULL WHERE instagram IS NOT NULL OR website IS NOT NULL;

-- =====================================================================
-- 5) Cerimonialista: traduções e listas com opções
-- =====================================================================
UPDATE public.campos_categoria SET label = 'Faz casamento em outra cidade ou destino?'
WHERE id = '522a07f8-d1ad-4a70-bf09-5074e5801906';

-- Pacotes: vira múltipla escolha
UPDATE public.campos_categoria SET tipo = 'lista',
  opcoes = '["Assessoria completa","Assessoria parcial (últimos meses)","Cerimonial do dia","Consultoria"]'::jsonb
WHERE id = '9a6a12c3-7be1-4975-9545-7f3d40e92299';
UPDATE public.fornecedor_campos SET valor = jsonb_build_array(
  CASE valor #>> '{}' WHEN 'Day-use' THEN 'Cerimonial do dia'
                      WHEN 'Mês do casamento' THEN 'Assessoria parcial (últimos meses)'
                      ELSE valor #>> '{}' END)
WHERE campo_id = '9a6a12c3-7be1-4975-9545-7f3d40e92299' AND jsonb_typeof(valor) = 'string';

-- Tipos de cerimônia → Tipos de evento, com opções
UPDATE public.campos_categoria SET label = 'Tipos de evento que atende',
  opcoes = '["Casamento","Mini wedding","Casamento só do casal","Casamento em outra cidade ou destino","Renovação de votos","Bodas","Debutante","Corporativo"]'::jsonb
WHERE id = '1d903693-60ae-4176-aa06-6709d0b4a03d';
-- Leide Silva
UPDATE public.fornecedor_campos SET valor = '["Casamento","Casamento em outra cidade ou destino","Casamento só do casal"]'::jsonb
WHERE campo_id = '1d903693-60ae-4176-aa06-6709d0b4a03d' AND supplier_id = '1c0886a8-03ae-418e-aea5-a1b6895f911c';
-- Maria Assessoria & Cerimonial
UPDATE public.fornecedor_campos SET valor = '["Casamento","Debutante"]'::jsonb
WHERE campo_id = '1d903693-60ae-4176-aa06-6709d0b4a03d' AND supplier_id = '2e1d42e9-a412-4577-a7f3-89c9b491296e';

-- =====================================================================
-- 6) Categoria Celebrante
-- =====================================================================
INSERT INTO public.categories (name, slug, icon, active)
VALUES ('Celebrante', 'celebrante', 'heart', true)
ON CONFLICT (slug) DO NOTHING;

DO $$
DECLARE v_cel uuid; v_cer uuid := 'b8045808-327c-4f6d-ac4c-f031fbd79c34';
BEGIN
  SELECT id INTO v_cel FROM public.categories WHERE slug = 'celebrante';

  -- perguntas básicas: as mesmas de toda categoria
  INSERT INTO public.campos_categoria (category_id, chave, label, ajuda, tipo, opcoes, obrigatorio, grupo, ordem, ativo, mostrar_no_perfil, is_base, placeholder)
  SELECT v_cel, chave, label, ajuda, tipo, opcoes, obrigatorio, grupo, ordem, ativo, mostrar_no_perfil, true, placeholder
  FROM public.campos_categoria WHERE category_id = v_cer AND is_base
  ON CONFLICT (category_id, chave) DO NOTHING;

  INSERT INTO public.campos_categoria (category_id, chave, label, ajuda, tipo, opcoes, obrigatorio, grupo, ordem) VALUES
  (v_cel, 'tipos_celebracao', 'Tipos de celebração que você faz', NULL, 'lista',
     '["Ecumênica","Simbólica (sem religião)","Católica","Evangélica","Inter-religiosa","Espírita","Judaica","Matriz africana"]', true, 'Celebração', 1),
  (v_cel, 'o_que_celebra', 'O que você celebra', NULL, 'lista',
     '["Casamento","Renovação de votos","Bodas","Casamento só do casal","Cerimônia temática"]', true, 'Celebração', 2),
  (v_cel, 'efeito_civil', 'Faz casamento religioso com efeito civil?', 'É quando o casamento religioso também vale no cartório.', 'booleano', NULL, false, 'Celebração', 3),
  (v_cel, 'idiomas', 'Idiomas da cerimônia', NULL, 'lista', '["Português","Inglês","Espanhol","Italiano","Libras"]', false, 'Celebração', 4),
  (v_cel, 'texto_personalizado', 'Escreve a cerimônia com a história do casal?', NULL, 'booleano', NULL, true, 'Como trabalha', 5),
  (v_cel, 'reunioes', 'Reuniões com o casal antes do evento', NULL, 'numero', NULL, false, 'Como trabalha', 6),
  (v_cel, 'ensaio', 'Participa do ensaio?', NULL, 'booleano', NULL, false, 'Como trabalha', 7),
  (v_cel, 'som_proprio', 'Leva microfone e som próprios?', NULL, 'booleano', NULL, false, 'Como trabalha', 8),
  (v_cel, 'duracao_min', 'Duração média da cerimônia (min)', NULL, 'numero', NULL, false, 'Como trabalha', 9),
  (v_cel, 'preco_cerimonia', 'Faixa de preço por cerimônia (R$)', NULL, 'faixa', NULL, true, 'Preço', 10),
  (v_cel, 'taxa_deslocamento', 'Cobra deslocamento fora da cidade?', NULL, 'booleano', NULL, false, 'Preço', 11)
  ON CONFLICT (category_id, chave) DO NOTHING;
END $$;

-- =====================================================================
-- 7) Mover os 2 celebrantes
--    Thiago Queiroz 7222414a-0fda-462d-bc58-f90cdf415aab
--    Dom Macieira   711b66c7-a2f6-431a-9975-f6a3a905a258
-- =====================================================================
DO $$
DECLARE
  v_cel uuid; v_cer uuid := 'b8045808-327c-4f6d-ac4c-f031fbd79c34';
  ids uuid[] := ARRAY['7222414a-0fda-462d-bc58-f90cdf415aab','711b66c7-a2f6-431a-9975-f6a3a905a258']::uuid[];
  c_tipos uuid; c_oque uuid; c_civil uuid; c_preco uuid;
BEGIN
  SELECT id INTO v_cel FROM public.categories WHERE slug = 'celebrante';
  SELECT id INTO c_tipos FROM public.campos_categoria WHERE category_id = v_cel AND chave = 'tipos_celebracao';
  SELECT id INTO c_oque  FROM public.campos_categoria WHERE category_id = v_cel AND chave = 'o_que_celebra';
  SELECT id INTO c_civil FROM public.campos_categoria WHERE category_id = v_cel AND chave = 'efeito_civil';
  SELECT id INTO c_preco FROM public.campos_categoria WHERE category_id = v_cel AND chave = 'preco_cerimonia';

  -- respostas básicas (descrição, contato, cidade, preço médio...) passam para as perguntas iguais da nova categoria
  UPDATE public.fornecedor_campos fc SET campo_id = novo.id
  FROM public.campos_categoria antigo
  JOIN public.campos_categoria novo ON novo.category_id = v_cel AND novo.chave = antigo.chave
  WHERE fc.campo_id = antigo.id AND antigo.category_id = v_cer AND antigo.is_base AND fc.supplier_id = ANY (ids);

  -- faixa de preço do pacote vira faixa por cerimônia
  INSERT INTO public.fornecedor_campos (supplier_id, campo_id, valor)
  SELECT fc.supplier_id, c_preco, fc.valor FROM public.fornecedor_campos fc
  JOIN public.campos_categoria cc ON cc.id = fc.campo_id AND cc.category_id = v_cer AND cc.chave = 'preco_pacote'
  WHERE fc.supplier_id = ANY (ids)
  ON CONFLICT (supplier_id, campo_id) DO NOTHING;

  -- Thiago
  INSERT INTO public.fornecedor_campos (supplier_id, campo_id, valor) VALUES
    ('7222414a-0fda-462d-bc58-f90cdf415aab', c_tipos, '["Simbólica (sem religião)"]'),
    ('7222414a-0fda-462d-bc58-f90cdf415aab', c_oque,  '["Casamento","Renovação de votos","Bodas","Cerimônia temática"]')
  ON CONFLICT (supplier_id, campo_id) DO NOTHING;
  -- Dom Macieira
  INSERT INTO public.fornecedor_campos (supplier_id, campo_id, valor) VALUES
    ('711b66c7-a2f6-431a-9975-f6a3a905a258', c_tipos, '["Ecumênica","Católica","Anglicana"]'),
    ('711b66c7-a2f6-431a-9975-f6a3a905a258', c_oque,  '["Casamento","Renovação de votos","Bodas"]'),
    ('711b66c7-a2f6-431a-9975-f6a3a905a258', c_civil, 'true')
  ON CONFLICT (supplier_id, campo_id) DO NOTHING;

  UPDATE public.suppliers SET category_id = v_cel WHERE id = ANY (ids);

  -- aviso no painel dos dois
  INSERT INTO public.notifications (user_id, type, title, body, link)
  SELECT user_id, 'admin_message', 'Seu perfil agora está em Celebrante',
         'Criamos a categoria Celebrante e movemos seu perfil para ela. Confira as novas perguntas sobre suas cerimônias.',
         '/fornecedor/painel'
  FROM public.suppliers WHERE id = ANY (ids);
END $$;