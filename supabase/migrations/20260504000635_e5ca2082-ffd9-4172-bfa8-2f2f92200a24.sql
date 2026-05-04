
CREATE TABLE public.frases_home (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo text NOT NULL,
  texto text NOT NULL,
  ordem int NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.frases_home ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Frases ativas são públicas" ON public.frases_home FOR SELECT USING (ativo = true OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin gerencia frases" ON public.frases_home FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.secoes_home (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid,
  foto_url text NOT NULL,
  frase text NOT NULL,
  subtexto text,
  ordem int NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.secoes_home ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Blocos ativos são públicos" ON public.secoes_home FOR SELECT USING (ativo = true OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin gerencia blocos" ON public.secoes_home FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.home_simulacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  couple_id uuid,
  orcamento_total numeric NOT NULL,
  num_convidados int NOT NULL,
  cidade text,
  estilo text,
  criado_em timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.home_simulacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Qualquer um cria simulação" ON public.home_simulacoes FOR INSERT WITH CHECK (true);
CREATE POLICY "Dono ou admin vê simulação" ON public.home_simulacoes FOR SELECT USING (
  (user_id IS NOT NULL AND user_id = auth.uid())
  OR (couple_id IS NOT NULL AND couple_id = get_couple_id_for_user(auth.uid()))
  OR has_role(auth.uid(), 'admin'::app_role)
);

INSERT INTO public.frases_home (grupo, texto, ordem) VALUES
  ('intro', 'Ninguém nunca te contou que seria difícil organizar um casamento, né?', 1),
  ('intro', 'Centenas de decisões. Dezenas de fornecedores. Um orçamento pra dar conta de tudo.', 2),
  ('intro', 'A gente sabe que parece impossível. Mas a gente existe pra provar que não é.', 3),
  ('intro', 'Aqui é fácil. Aqui é leve. Aqui é o seu dia.', 4);

INSERT INTO public.secoes_home (foto_url, frase, subtexto, ordem) VALUES
  ('https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&q=80', 'Cada detalhe importa. Cada escolha conta.', 'Da decoração ao buffet, a gente te ajuda a montar tudo.', 1),
  ('https://images.unsplash.com/photo-1529636798458-92182e662485?w=1200&q=80', 'Seu orçamento, seu jeito, seu dia.', 'Comece pelo quanto você tem. A gente faz o resto encaixar.', 2),
  ('https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=1200&q=80', 'Datas que ninguém disputou. Preços que fazem sentido.', 'Casamentos em dias úteis com até 35% de economia real.', 3),
  ('https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=1200&q=80', 'Você não precisa resolver tudo sozinho.', 'Fotógrafo, buffet, espaço, banda. Tudo num lugar só.', 4);
