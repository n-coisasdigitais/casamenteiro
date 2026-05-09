
-- 1) Alterações em suppliers
ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS onboarding_step integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS aparece_na_home boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cover_photo_url text;

-- 2) campos_categoria — definição de campos dinâmicos
CREATE TABLE IF NOT EXISTS public.campos_categoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  chave text NOT NULL,
  label text NOT NULL,
  ajuda text,
  tipo text NOT NULL CHECK (tipo IN ('texto','numero','booleano','select','lista','faixa','textarea')),
  opcoes jsonb,
  obrigatorio boolean NOT NULL DEFAULT false,
  grupo text,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  mostrar_no_perfil boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category_id, chave)
);

CREATE INDEX IF NOT EXISTS idx_campos_categoria_cat ON public.campos_categoria(category_id, ordem);

ALTER TABLE public.campos_categoria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Campos ativos são públicos"
  ON public.campos_categoria FOR SELECT
  USING (ativo = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin gerencia campos"
  ON public.campos_categoria FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_campos_categoria_updated
  BEFORE UPDATE ON public.campos_categoria
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) fornecedor_campos — respostas
CREATE TABLE IF NOT EXISTS public.fornecedor_campos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  campo_id uuid NOT NULL REFERENCES public.campos_categoria(id) ON DELETE CASCADE,
  valor jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (supplier_id, campo_id)
);

CREATE INDEX IF NOT EXISTS idx_fornecedor_campos_supplier ON public.fornecedor_campos(supplier_id);

ALTER TABLE public.fornecedor_campos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Público vê respostas de fornecedores aprovados"
  ON public.fornecedor_campos FOR SELECT
  USING (
    supplier_id IN (SELECT id FROM public.suppliers WHERE status = 'approved'::supplier_status)
    OR supplier_id IN (SELECT id FROM public.suppliers WHERE user_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Dono gerencia respostas"
  ON public.fornecedor_campos FOR ALL
  USING (supplier_id IN (SELECT id FROM public.suppliers WHERE user_id = auth.uid()))
  WITH CHECK (supplier_id IN (SELECT id FROM public.suppliers WHERE user_id = auth.uid()));

CREATE POLICY "Admin gerencia respostas"
  ON public.fornecedor_campos FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_fornecedor_campos_updated
  BEFORE UPDATE ON public.fornecedor_campos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) fornecedor_aprovacoes — histórico
CREATE TABLE IF NOT EXISTS public.fornecedor_aprovacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  admin_id uuid,
  acao text NOT NULL CHECK (acao IN ('submitted','approved','rejected','resubmitted')),
  motivo text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fornecedor_aprovacoes_supplier ON public.fornecedor_aprovacoes(supplier_id, created_at DESC);

ALTER TABLE public.fornecedor_aprovacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dono vê próprio histórico"
  ON public.fornecedor_aprovacoes FOR SELECT
  USING (
    supplier_id IN (SELECT id FROM public.suppliers WHERE user_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Dono pode submeter"
  ON public.fornecedor_aprovacoes FOR INSERT
  WITH CHECK (
    acao IN ('submitted','resubmitted')
    AND supplier_id IN (SELECT id FROM public.suppliers WHERE user_id = auth.uid())
  );

CREATE POLICY "Admin gerencia aprovações"
  ON public.fornecedor_aprovacoes FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 5) Seed dos campos por categoria
DO $$
DECLARE
  v_cat_id uuid;
BEGIN
  -- Espaços e Buffet
  SELECT id INTO v_cat_id FROM public.categories WHERE slug = 'espacos-buffet';
  IF v_cat_id IS NOT NULL THEN
    INSERT INTO public.campos_categoria (category_id, chave, label, tipo, opcoes, obrigatorio, grupo, ordem) VALUES
      (v_cat_id, 'tipo_local', 'Tipo de local', 'select', '["Salão de festas","Sítio/Chácara","Praia","Igreja","Restaurante","Hotel","Casa de eventos"]'::jsonb, true, 'Sobre o espaço', 1),
      (v_cat_id, 'capacidade_min', 'Capacidade mínima (convidados)', 'numero', NULL, true, 'Sobre o espaço', 2),
      (v_cat_id, 'capacidade_max', 'Capacidade máxima (convidados)', 'numero', NULL, true, 'Sobre o espaço', 3),
      (v_cat_id, 'inclui_buffet', 'Inclui buffet?', 'booleano', NULL, true, 'O que está incluso', 4),
      (v_cat_id, 'tem_estacionamento', 'Tem estacionamento?', 'booleano', NULL, false, 'O que está incluso', 5),
      (v_cat_id, 'servicos_inclusos', 'Serviços inclusos', 'lista', NULL, false, 'O que está incluso', 6),
      (v_cat_id, 'preco_por_pessoa', 'Preço por pessoa (R$)', 'faixa', NULL, true, 'Preço', 7)
    ON CONFLICT (category_id, chave) DO NOTHING;
  END IF;

  -- Fotografia
  SELECT id INTO v_cat_id FROM public.categories WHERE slug = 'fotografia';
  IF v_cat_id IS NOT NULL THEN
    INSERT INTO public.campos_categoria (category_id, chave, label, tipo, opcoes, obrigatorio, grupo, ordem) VALUES
      (v_cat_id, 'estilo', 'Estilo predominante', 'select', '["Clássico","Fotojornalístico","Contemporâneo","Artístico"]'::jsonb, true, 'Estilo', 1),
      (v_cat_id, 'pacote_horas', 'Horas inclusas no pacote', 'numero', NULL, true, 'Pacote', 2),
      (v_cat_id, 'entrega_dias', 'Prazo de entrega (dias)', 'numero', NULL, true, 'Pacote', 3),
      (v_cat_id, 'inclui_video', 'Inclui vídeo?', 'booleano', NULL, false, 'Pacote', 4),
      (v_cat_id, 'inclui_album', 'Inclui álbum impresso?', 'booleano', NULL, false, 'Pacote', 5),
      (v_cat_id, 'preco_pacote', 'Faixa de preço (R$)', 'faixa', NULL, true, 'Preço', 6)
    ON CONFLICT (category_id, chave) DO NOTHING;
  END IF;

  -- Cerimonialista
  SELECT id INTO v_cat_id FROM public.categories WHERE slug = 'cerimonialista';
  IF v_cat_id IS NOT NULL THEN
    INSERT INTO public.campos_categoria (category_id, chave, label, tipo, opcoes, obrigatorio, grupo, ordem) VALUES
      (v_cat_id, 'tipos_cerimonia', 'Tipos de cerimônia que atende', 'lista', NULL, true, 'Atuação', 1),
      (v_cat_id, 'atende_destination', 'Atende destination wedding?', 'booleano', NULL, false, 'Atuação', 2),
      (v_cat_id, 'equipe_tamanho', 'Tamanho da equipe no dia do evento', 'numero', NULL, true, 'Equipe', 3),
      (v_cat_id, 'pacotes', 'Pacotes oferecidos', 'select', '["Day-use","Mês do casamento","Assessoria completa"]'::jsonb, true, 'Pacotes', 4),
      (v_cat_id, 'preco_pacote', 'Faixa de preço (R$)', 'faixa', NULL, true, 'Preço', 5)
    ON CONFLICT (category_id, chave) DO NOTHING;
  END IF;

  -- Música e DJ
  SELECT id INTO v_cat_id FROM public.categories WHERE slug = 'musica-dj';
  IF v_cat_id IS NOT NULL THEN
    INSERT INTO public.campos_categoria (category_id, chave, label, tipo, opcoes, obrigatorio, grupo, ordem) VALUES
      (v_cat_id, 'tipo', 'Tipo de atração', 'select', '["DJ","Banda","Música clássica","Cantor solo","Trio"]'::jsonb, true, 'Sobre', 1),
      (v_cat_id, 'repertorio', 'Repertórios atendidos', 'lista', NULL, true, 'Sobre', 2),
      (v_cat_id, 'equipamento_proprio', 'Possui equipamento próprio (som/luz)?', 'booleano', NULL, true, 'Estrutura', 3),
      (v_cat_id, 'horas_inclusas', 'Horas inclusas no pacote', 'numero', NULL, true, 'Pacote', 4),
      (v_cat_id, 'preco_evento', 'Faixa de preço por evento (R$)', 'faixa', NULL, true, 'Preço', 5)
    ON CONFLICT (category_id, chave) DO NOTHING;
  END IF;

  -- Decoração
  SELECT id INTO v_cat_id FROM public.categories WHERE slug = 'decoracao';
  IF v_cat_id IS NOT NULL THEN
    INSERT INTO public.campos_categoria (category_id, chave, label, tipo, opcoes, obrigatorio, grupo, ordem) VALUES
      (v_cat_id, 'estilos', 'Estilos de decoração', 'lista', NULL, true, 'Estilo', 1),
      (v_cat_id, 'inclui_flores', 'Inclui arranjos de flores?', 'booleano', NULL, true, 'Inclui', 2),
      (v_cat_id, 'inclui_montagem', 'Inclui montagem e desmontagem?', 'booleano', NULL, true, 'Inclui', 3),
      (v_cat_id, 'aluga_mobiliario', 'Aluga mobiliário?', 'booleano', NULL, false, 'Inclui', 4),
      (v_cat_id, 'preco_pacote', 'Faixa de preço (R$)', 'faixa', NULL, true, 'Preço', 5)
    ON CONFLICT (category_id, chave) DO NOTHING;
  END IF;

  -- Traje do Noivo
  SELECT id INTO v_cat_id FROM public.categories WHERE slug = 'traje-noivo';
  IF v_cat_id IS NOT NULL THEN
    INSERT INTO public.campos_categoria (category_id, chave, label, tipo, opcoes, obrigatorio, grupo, ordem) VALUES
      (v_cat_id, 'tipo_servico', 'Tipo de serviço', 'select', '["Aluguel","Sob medida","Pronta entrega"]'::jsonb, true, 'Serviço', 1),
      (v_cat_id, 'tempo_producao_dias', 'Tempo de produção (dias)', 'numero', NULL, false, 'Serviço', 2),
      (v_cat_id, 'inclui_acessorios', 'Inclui acessórios (sapato, gravata)?', 'booleano', NULL, false, 'Serviço', 3),
      (v_cat_id, 'preco_minimo', 'Preço a partir de (R$)', 'numero', NULL, true, 'Preço', 4)
    ON CONFLICT (category_id, chave) DO NOTHING;
  END IF;

  -- Vestido de Noiva
  SELECT id INTO v_cat_id FROM public.categories WHERE slug = 'vestido-noiva';
  IF v_cat_id IS NOT NULL THEN
    INSERT INTO public.campos_categoria (category_id, chave, label, tipo, opcoes, obrigatorio, grupo, ordem) VALUES
      (v_cat_id, 'tipo_servico', 'Tipo de serviço', 'select', '["Aluguel","Sob medida","Pronta entrega"]'::jsonb, true, 'Serviço', 1),
      (v_cat_id, 'provas_inclusas', 'Provas inclusas', 'numero', NULL, false, 'Serviço', 2),
      (v_cat_id, 'tempo_producao_dias', 'Tempo de produção (dias)', 'numero', NULL, false, 'Serviço', 3),
      (v_cat_id, 'inclui_veu', 'Inclui véu/acessórios?', 'booleano', NULL, false, 'Serviço', 4),
      (v_cat_id, 'preco_minimo', 'Preço a partir de (R$)', 'numero', NULL, true, 'Preço', 5)
    ON CONFLICT (category_id, chave) DO NOTHING;
  END IF;

  -- Maquiagem
  SELECT id INTO v_cat_id FROM public.categories WHERE slug = 'beleza-maquiagem';
  IF v_cat_id IS NOT NULL THEN
    INSERT INTO public.campos_categoria (category_id, chave, label, tipo, opcoes, obrigatorio, grupo, ordem) VALUES
      (v_cat_id, 'servicos', 'Serviços oferecidos', 'lista', NULL, true, 'Serviços', 1),
      (v_cat_id, 'atende_domicilio', 'Atende a domicílio?', 'booleano', NULL, true, 'Atendimento', 2),
      (v_cat_id, 'atende_madrinhas', 'Atende madrinhas e convidadas?', 'booleano', NULL, false, 'Atendimento', 3),
      (v_cat_id, 'preco_noiva', 'Preço para a noiva (R$)', 'numero', NULL, true, 'Preço', 4)
    ON CONFLICT (category_id, chave) DO NOTHING;
  END IF;

  -- Convites
  SELECT id INTO v_cat_id FROM public.categories WHERE slug = 'convites';
  IF v_cat_id IS NOT NULL THEN
    INSERT INTO public.campos_categoria (category_id, chave, label, tipo, opcoes, obrigatorio, grupo, ordem) VALUES
      (v_cat_id, 'tipos', 'Tipos de convite', 'lista', NULL, true, 'Produtos', 1),
      (v_cat_id, 'prazo_producao_dias', 'Prazo de produção (dias)', 'numero', NULL, true, 'Produção', 2),
      (v_cat_id, 'pedido_minimo', 'Pedido mínimo (unidades)', 'numero', NULL, false, 'Produção', 3),
      (v_cat_id, 'preco_unitario', 'Preço unitário a partir de (R$)', 'numero', NULL, true, 'Preço', 4)
    ON CONFLICT (category_id, chave) DO NOTHING;
  END IF;

  -- Bolos e Doces
  SELECT id INTO v_cat_id FROM public.categories WHERE slug = 'bolos-doces';
  IF v_cat_id IS NOT NULL THEN
    INSERT INTO public.campos_categoria (category_id, chave, label, tipo, opcoes, obrigatorio, grupo, ordem) VALUES
      (v_cat_id, 'tipo', 'O que produz', 'select', '["Bolo","Doces finos","Ambos"]'::jsonb, true, 'Produtos', 1),
      (v_cat_id, 'opcoes_dieta', 'Opções para restrições alimentares', 'lista', NULL, false, 'Produtos', 2),
      (v_cat_id, 'preco_kg', 'Preço por kg de bolo (R$)', 'numero', NULL, false, 'Preço', 3),
      (v_cat_id, 'preco_cento_doces', 'Preço por cento de doces (R$)', 'numero', NULL, false, 'Preço', 4)
    ON CONFLICT (category_id, chave) DO NOTHING;
  END IF;

  -- Transporte
  SELECT id INTO v_cat_id FROM public.categories WHERE slug = 'transporte';
  IF v_cat_id IS NOT NULL THEN
    INSERT INTO public.campos_categoria (category_id, chave, label, tipo, opcoes, obrigatorio, grupo, ordem) VALUES
      (v_cat_id, 'tipo_veiculo', 'Tipo de veículo', 'select', '["Limusine","Carro clássico","Carro moderno","Van","Ônibus"]'::jsonb, true, 'Frota', 1),
      (v_cat_id, 'capacidade', 'Capacidade (passageiros)', 'numero', NULL, true, 'Frota', 2),
      (v_cat_id, 'horas_inclusas', 'Horas inclusas', 'numero', NULL, false, 'Pacote', 3),
      (v_cat_id, 'preco_evento', 'Preço por evento (R$)', 'numero', NULL, true, 'Preço', 4)
    ON CONFLICT (category_id, chave) DO NOTHING;
  END IF;

  -- Vídeo
  SELECT id INTO v_cat_id FROM public.categories WHERE slug = 'video';
  IF v_cat_id IS NOT NULL THEN
    INSERT INTO public.campos_categoria (category_id, chave, label, tipo, opcoes, obrigatorio, grupo, ordem) VALUES
      (v_cat_id, 'estilo', 'Estilo de vídeo', 'select', '["Documental","Cinematográfico","Clássico"]'::jsonb, true, 'Estilo', 1),
      (v_cat_id, 'entrega_dias', 'Prazo de entrega (dias)', 'numero', NULL, true, 'Pacote', 2),
      (v_cat_id, 'inclui_drone', 'Inclui drone?', 'booleano', NULL, false, 'Pacote', 3),
      (v_cat_id, 'duracao_filme_min', 'Duração do filme final (min)', 'numero', NULL, false, 'Pacote', 4),
      (v_cat_id, 'preco_pacote', 'Faixa de preço (R$)', 'faixa', NULL, true, 'Preço', 5)
    ON CONFLICT (category_id, chave) DO NOTHING;
  END IF;
END $$;
