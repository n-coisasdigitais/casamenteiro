
-- Tabela única com a configuração da landing de fornecedores (single-row pattern)
CREATE TABLE IF NOT EXISTS public.fornecedor_landing_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.fornecedor_landing_config ENABLE ROW LEVEL SECURITY;

-- Leitura pública (landing é pública)
DROP POLICY IF EXISTS "Landing config public read" ON public.fornecedor_landing_config;
CREATE POLICY "Landing config public read"
  ON public.fornecedor_landing_config FOR SELECT
  USING (true);

-- Somente admins editam
DROP POLICY IF EXISTS "Landing config admin write" ON public.fornecedor_landing_config;
CREATE POLICY "Landing config admin write"
  ON public.fornecedor_landing_config FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.touch_fornecedor_landing_config()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_fornecedor_landing_config ON public.fornecedor_landing_config;
CREATE TRIGGER trg_touch_fornecedor_landing_config
  BEFORE UPDATE ON public.fornecedor_landing_config
  FOR EACH ROW EXECUTE FUNCTION public.touch_fornecedor_landing_config();

-- Seed da linha única com o conteúdo padrão atual
INSERT INTO public.fornecedor_landing_config (config)
SELECT '{
  "navbar": { "cta_label": "Anuncie grátis →", "cta_href": "/fornecedor/cadastro" },
  "hero": {
    "video_src": "",
    "fallback_image": "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1920&q=80",
    "eyebrow": "Para fornecedores",
    "title_pre": "Leve seu negócio para quem quer",
    "title_em": "casar.",
    "subtitle": "Conecte seu serviço a casais que já simularam o orçamento e estão prontos para contratar.",
    "cta_primary_label": "Quero me cadastrar →",
    "cta_primary_href": "/fornecedor/cadastro",
    "cta_secondary_label": "Como funciona"
  },
  "how": {
    "eyebrow": "Como funciona",
    "title": "Comece a receber contatos em 3 passos simples",
    "subtitle": "Nosso processo é rápido, sem burocracia e 100% gratuito para começar.",
    "steps": [
      { "label": "Passo 01", "title": "Você se cadastra", "description": "Preencha as informações do seu serviço em poucos minutos. Sem cartão de crédito.", "emoji": "✏️", "preview": "Complete seu perfil" },
      { "label": "Passo 02", "title": "A gente aprova", "description": "Nossa equipe revisa e publica seu perfil na plataforma em até 24h.", "emoji": "✅", "preview": "Aprovação em 24h" },
      { "label": "Passo 03", "title": "Os casais te encontram", "description": "Receba contatos de casais com orçamento definido e data já marcada.", "emoji": "💌", "preview": "Casais te encontram" }
    ]
  },
  "why": {
    "eyebrow": "Por que anunciar",
    "title_line1": "Resultados reais,",
    "title_line2": "sem jogo de azar",
    "subtitle": "Cada funcionalidade foi pensada para você fechar mais contratos com menos esforço.",
    "items": [
      { "label": "01", "title": "Leads qualificados", "description": "Casais que já simularam o orçamento e estão prontos para contratar.", "imageSrc": "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=900&q=80", "imageAlt": "Tela de leads qualificados" },
      { "label": "02", "title": "Datas ociosas = mais receita", "description": "Preencha sua agenda em dias úteis com descontos que você define.", "imageSrc": "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=900&q=80", "imageAlt": "Agenda de datas" },
      { "label": "03", "title": "Zero risco para começar", "description": "Seu cadastro é gratuito. Você só investe quando ver resultado.", "imageSrc": "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=900&q=80", "imageAlt": "Planos e investimento" },
      { "label": "04", "title": "Visibilidade real", "description": "Apareça para casais da sua cidade, na sua categoria, no seu preço.", "imageSrc": "https://images.unsplash.com/photo-1521295121783-8a321d551ad2?w=900&q=80", "imageAlt": "Busca por cidade" }
    ]
  },
  "testimonials": {
    "eyebrow": "Depoimentos",
    "title_pre": "Wall of",
    "title_em": "love",
    "subtitle": "Fornecedores reais, resultados reais.",
    "rating_text": "4.9 de avaliação média na plataforma",
    "items": [
      { "id": "1", "name": "Camila Rocha", "role": "Cerimonialista", "city": "Belo Horizonte", "rating": 5, "emoji": "👰", "text": "Em 2 semanas já tinha fechado 3 contratos para datas que estavam paradas há meses. O perfil é simples de preencher e os leads chegam qualificados mesmo." },
      { "id": "2", "name": "Rafael Mendes", "role": "Fotógrafo", "city": "São Paulo", "rating": 5, "emoji": "📸", "text": "Já testei outras plataformas e sempre perdia tempo com casais sem orçamento definido. Aqui os pedidos chegam com data, local e valor em mente. Outra realidade." },
      { "id": "3", "name": "Juliana Lima", "role": "Buffet & Gastronomia", "city": "Curitiba", "rating": 5, "emoji": "🍽️", "text": "Cadastrei meu buffet numa segunda, na quarta já tinha uma visita agendada. O casal já sabia meu preço e minha proposta. Fechamos na hora." },
      { "id": "4", "name": "André Costa", "role": "DJ", "city": "Rio de Janeiro", "rating": 5, "emoji": "🎧", "text": "Sou DJ há 12 anos e nunca tinha tido um canal assim. Casal com data marcada, sabe o que quer. Minha agenda de fim de semana lotou em 30 dias." }
    ]
  },
  "cta": {
    "eyebrow": "Comece agora",
    "title": "Anuncie por 3 meses grátis. Sem cartão, sem risco.",
    "subtitle": "Preencha seu e-mail para garantir seu acesso e receber o link do cadastro completo.",
    "button_label": "Garantir meu acesso →",
    "redirect_path": "/fornecedor/cadastro",
    "footnote": "✓ Gratuito para começar  ·  ✓ Aprovação em 24h  ·  ✓ Sem surpresas"
  }
}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.fornecedor_landing_config);

-- Bucket público para mídia da landing de fornecedores
INSERT INTO storage.buckets (id, name, public)
VALUES ('supplier-landing', 'supplier-landing', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: leitura pública, escrita admin
DROP POLICY IF EXISTS "Supplier landing public read" ON storage.objects;
CREATE POLICY "Supplier landing public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'supplier-landing');

DROP POLICY IF EXISTS "Supplier landing admin write" ON storage.objects;
CREATE POLICY "Supplier landing admin write"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'supplier-landing' AND public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (bucket_id = 'supplier-landing' AND public.has_role(auth.uid(), 'admin'::app_role));
