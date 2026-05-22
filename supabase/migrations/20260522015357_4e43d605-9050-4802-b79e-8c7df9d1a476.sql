
-- =========================================================
-- Couple public profiles
-- =========================================================
CREATE TABLE public.couple_public_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL UNIQUE REFERENCES public.couples(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  nome_casal TEXT NOT NULL,
  bio TEXT CHECK (bio IS NULL OR char_length(bio) <= 500),
  estilo TEXT,
  foto_capa_url TEXT,
  foto_perfil_url TEXT,
  publico BOOLEAN NOT NULL DEFAULT true,
  exibir_data BOOLEAN NOT NULL DEFAULT true,
  exibir_fornecedores BOOLEAN NOT NULL DEFAULT true,
  exibir_orcamento BOOLEAN NOT NULL DEFAULT false,
  exibir_fotos BOOLEAN NOT NULL DEFAULT true,
  exibir_videos BOOLEAN NOT NULL DEFAULT true,
  exibir_avaliacoes BOOLEAN NOT NULL DEFAULT true,
  exibir_casamento_mesmo_dia BOOLEAN NOT NULL DEFAULT true,
  mensagens_casais BOOLEAN NOT NULL DEFAULT true,
  mensagens_fornecedores BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_couple_public_profiles_publico ON public.couple_public_profiles(publico) WHERE publico = true;
CREATE INDEX idx_couple_public_profiles_couple_id ON public.couple_public_profiles(couple_id);

ALTER TABLE public.couple_public_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Perfis públicos são visíveis a todos"
  ON public.couple_public_profiles FOR SELECT
  USING (publico = true OR couple_id = public.get_couple_id_for_user(auth.uid()));

CREATE POLICY "Dono pode inserir seu perfil"
  ON public.couple_public_profiles FOR INSERT
  WITH CHECK (couple_id = public.get_couple_id_for_user(auth.uid()));

CREATE POLICY "Dono pode atualizar seu perfil"
  ON public.couple_public_profiles FOR UPDATE
  USING (couple_id = public.get_couple_id_for_user(auth.uid()));

CREATE POLICY "Dono pode deletar seu perfil"
  ON public.couple_public_profiles FOR DELETE
  USING (couple_id = public.get_couple_id_for_user(auth.uid()));

CREATE POLICY "Admins gerenciam perfis"
  ON public.couple_public_profiles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_couple_public_profiles_updated_at
  BEFORE UPDATE ON public.couple_public_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- Slug generator
-- =========================================================
CREATE OR REPLACE FUNCTION public.generate_couple_profile_slug(_nome TEXT, _wedding_date DATE)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _base TEXT;
  _candidate TEXT;
  _i INT := 0;
BEGIN
  _base := lower(translate(coalesce(_nome,''),
    'áàâãäåéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÅÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
    'aaaaaaeeeeiiiiooooouuuucnaaaaaaeeeeiiiiooooouuuucn'));
  _base := regexp_replace(_base, '[^a-z0-9]+', '-', 'g');
  _base := regexp_replace(_base, '^-+|-+$', '', 'g');
  IF _base IS NULL OR _base = '' THEN
    _base := 'casal';
  END IF;
  IF _wedding_date IS NOT NULL THEN
    _base := _base || '-' || extract(year from _wedding_date)::int;
  END IF;
  _candidate := _base;
  WHILE EXISTS (SELECT 1 FROM public.couple_public_profiles WHERE slug = _candidate) LOOP
    _i := _i + 1;
    _candidate := _base || '-' || substr(md5(random()::text), 1, 4);
    IF _i > 10 THEN EXIT; END IF;
  END LOOP;
  RETURN _candidate;
END;
$$;

-- =========================================================
-- Couple photos
-- =========================================================
CREATE TABLE public.couple_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  legenda TEXT,
  ordem INT NOT NULL DEFAULT 0,
  destaque BOOLEAN NOT NULL DEFAULT false,
  origem TEXT NOT NULL DEFAULT 'upload',
  app_referencia TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_couple_photos_couple_id ON public.couple_photos(couple_id);
ALTER TABLE public.couple_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fotos visíveis se perfil público"
  ON public.couple_photos FOR SELECT
  USING (
    couple_id = public.get_couple_id_for_user(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.couple_public_profiles p
      WHERE p.couple_id = couple_photos.couple_id
        AND p.publico = true AND p.exibir_fotos = true
    )
  );

CREATE POLICY "Dono gerencia suas fotos"
  ON public.couple_photos FOR ALL
  USING (couple_id = public.get_couple_id_for_user(auth.uid()))
  WITH CHECK (couple_id = public.get_couple_id_for_user(auth.uid()));

CREATE POLICY "Admins gerenciam fotos"
  ON public.couple_photos FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- Couple videos
-- =========================================================
CREATE TABLE public.couple_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'youtube' CHECK (tipo IN ('youtube','upload')),
  url TEXT NOT NULL,
  titulo TEXT,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_couple_videos_couple_id ON public.couple_videos(couple_id);
ALTER TABLE public.couple_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vídeos visíveis se perfil público"
  ON public.couple_videos FOR SELECT
  USING (
    couple_id = public.get_couple_id_for_user(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.couple_public_profiles p
      WHERE p.couple_id = couple_videos.couple_id
        AND p.publico = true AND p.exibir_videos = true
    )
  );

CREATE POLICY "Dono gerencia seus vídeos"
  ON public.couple_videos FOR ALL
  USING (couple_id = public.get_couple_id_for_user(auth.uid()))
  WITH CHECK (couple_id = public.get_couple_id_for_user(auth.uid()));

CREATE POLICY "Admins gerenciam vídeos"
  ON public.couple_videos FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- Couple profile comments
-- =========================================================
CREATE TABLE public.couple_profile_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_id UUID NOT NULL REFERENCES public.couple_public_profiles(id) ON DELETE CASCADE,
  autor_id UUID NOT NULL,
  texto TEXT NOT NULL CHECK (char_length(texto) <= 500),
  aprovado BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_couple_profile_comments_perfil ON public.couple_profile_comments(perfil_id);
ALTER TABLE public.couple_profile_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comentários aprovados visíveis a todos"
  ON public.couple_profile_comments FOR SELECT
  USING (
    aprovado = true
    OR autor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.couple_public_profiles p
      WHERE p.id = perfil_id AND p.couple_id = public.get_couple_id_for_user(auth.uid())
    )
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Logados criam comentários"
  ON public.couple_profile_comments FOR INSERT
  WITH CHECK (auth.uid() = autor_id);

CREATE POLICY "Autor pode deletar"
  ON public.couple_profile_comments FOR DELETE
  USING (autor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins gerenciam comentários"
  ON public.couple_profile_comments FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- Extend reviews to support bidirectional reviews
-- =========================================================
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS autor_tipo TEXT NOT NULL DEFAULT 'couple' CHECK (autor_tipo IN ('couple','supplier')),
  ADD COLUMN IF NOT EXISTS alvo_tipo TEXT NOT NULL DEFAULT 'supplier' CHECK (alvo_tipo IN ('couple','supplier')),
  ADD COLUMN IF NOT EXISTS alvo_couple_id UUID REFERENCES public.couples(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS aprovado BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS publico BOOLEAN NOT NULL DEFAULT true;

-- Allow supplier_id to be null when reviewing a couple
ALTER TABLE public.reviews ALTER COLUMN supplier_id DROP NOT NULL;
ALTER TABLE public.reviews ALTER COLUMN couple_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_reviews_alvo_couple ON public.reviews(alvo_couple_id) WHERE alvo_couple_id IS NOT NULL;

-- =========================================================
-- Storage bucket for couple profile media
-- =========================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('couple-profile', 'couple-profile', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Fotos do casal são públicas"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'couple-profile');

CREATE POLICY "Casal envia suas fotos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'couple-profile' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Casal atualiza suas fotos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'couple-profile' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Casal deleta suas fotos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'couple-profile' AND auth.uid()::text = (storage.foldername(name))[1]);
