
-- ============================================
-- MÓDULO DE VAGAS (STAFFING)
-- ============================================

-- 1) Feature flag
INSERT INTO public.feature_flags (key, enabled, essencial, grupo, label, description)
VALUES ('vagas', false, false, 'fornecedor', 'Vagas e equipe', 'Módulo de vagas e equipe própria do fornecedor com marketplace de profissionais.')
ON CONFLICT (key) DO NOTHING;

-- 2) STAFF PROFILES
CREATE TABLE public.staff_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  nome text NOT NULL,
  slug text UNIQUE,
  telefone text,
  email text,
  foto_url text,
  funcoes text[] NOT NULL DEFAULT '{}',
  cidade text,
  estado text,
  raio_km integer NOT NULL DEFAULT 30,
  valor_min_turno numeric(10,2),
  bio text,
  consentimento_lgpd boolean NOT NULL DEFAULT false,
  is_public boolean NOT NULL DEFAULT false,
  rating numeric(3,2),
  review_count integer NOT NULL DEFAULT 0,
  eventos_concluidos integer NOT NULL DEFAULT 0,
  eventos_aceitos integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.staff_profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_profiles TO authenticated;
GRANT ALL ON public.staff_profiles TO service_role;

ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_profiles_public_select"
  ON public.staff_profiles FOR SELECT
  USING (is_public = true);

CREATE POLICY "staff_profiles_owner_all"
  ON public.staff_profiles FOR ALL
  USING (auth.uid() = user_id OR auth.uid() = criado_por)
  WITH CHECK (auth.uid() = user_id OR auth.uid() = criado_por);

CREATE POLICY "staff_profiles_admin_all"
  ON public.staff_profiles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_staff_profiles_updated
  BEFORE UPDATE ON public.staff_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_staff_profiles_user ON public.staff_profiles(user_id);
CREATE INDEX idx_staff_profiles_cidade ON public.staff_profiles(cidade);
CREATE INDEX idx_staff_profiles_funcoes ON public.staff_profiles USING gin(funcoes);

-- 3) STAFF UNAVAILABILITY
CREATE TABLE public.staff_unavailability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
  data date NOT NULL,
  motivo text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (staff_id, data)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_unavailability TO authenticated;
GRANT ALL ON public.staff_unavailability TO service_role;

ALTER TABLE public.staff_unavailability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_unav_owner_all"
  ON public.staff_unavailability FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.staff_profiles sp
    WHERE sp.id = staff_id AND (sp.user_id = auth.uid() OR sp.criado_por = auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.staff_profiles sp
    WHERE sp.id = staff_id AND (sp.user_id = auth.uid() OR sp.criado_por = auth.uid())
  ));

CREATE POLICY "staff_unav_admin_all"
  ON public.staff_unavailability FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_staff_unav_staff_data ON public.staff_unavailability(staff_id, data);

-- 4) STAFF JOBS
CREATE TABLE public.staff_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  funcao text NOT NULL,
  data date NOT NULL,
  hora_inicio time,
  hora_fim time,
  local text,
  cidade text,
  estado text,
  vagas integer NOT NULL DEFAULT 1,
  valor_turno numeric(10,2),
  observacoes text,
  status text NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta','preenchida','concluida','cancelada')),
  is_public boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.staff_jobs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_jobs TO authenticated;
GRANT ALL ON public.staff_jobs TO service_role;

ALTER TABLE public.staff_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_jobs_public_select"
  ON public.staff_jobs FOR SELECT
  USING (is_public = true AND status = 'aberta');

CREATE POLICY "staff_jobs_supplier_owner_all"
  ON public.staff_jobs FOR ALL
  USING (EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = supplier_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = supplier_id AND s.user_id = auth.uid()));

CREATE POLICY "staff_jobs_admin_all"
  ON public.staff_jobs FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_staff_jobs_updated
  BEFORE UPDATE ON public.staff_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_staff_jobs_supplier ON public.staff_jobs(supplier_id);
CREATE INDEX idx_staff_jobs_data_status ON public.staff_jobs(data, status);
CREATE INDEX idx_staff_jobs_cidade ON public.staff_jobs(cidade);

-- 5) STAFF APPLICATIONS
CREATE TABLE public.staff_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.staff_jobs(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
  origem text NOT NULL DEFAULT 'convite' CHECK (origem IN ('convite','candidatura')),
  status text NOT NULL DEFAULT 'convidado' CHECK (status IN ('convidado','candidato','aceito','recusado','expirado','concluido','no_show')),
  convidado_em timestamptz NOT NULL DEFAULT now(),
  respondido_em timestamptz,
  expira_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_id, staff_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_applications TO authenticated;
GRANT ALL ON public.staff_applications TO service_role;

ALTER TABLE public.staff_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_apps_supplier_owner_all"
  ON public.staff_applications FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.staff_jobs j
    JOIN public.suppliers s ON s.id = j.supplier_id
    WHERE j.id = job_id AND s.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.staff_jobs j
    JOIN public.suppliers s ON s.id = j.supplier_id
    WHERE j.id = job_id AND s.user_id = auth.uid()
  ));

CREATE POLICY "staff_apps_professional_select"
  ON public.staff_applications FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.staff_profiles sp
    WHERE sp.id = staff_id AND (sp.user_id = auth.uid() OR sp.criado_por = auth.uid())
  ));

CREATE POLICY "staff_apps_professional_update"
  ON public.staff_applications FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.staff_profiles sp
    WHERE sp.id = staff_id AND sp.user_id = auth.uid()
  ));

CREATE POLICY "staff_apps_professional_insert_candidatura"
  ON public.staff_applications FOR INSERT
  WITH CHECK (
    origem = 'candidatura'
    AND EXISTS (
      SELECT 1 FROM public.staff_profiles sp
      WHERE sp.id = staff_id AND sp.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.staff_jobs j
      WHERE j.id = job_id AND j.is_public = true AND j.status = 'aberta'
    )
  );

CREATE POLICY "staff_apps_admin_all"
  ON public.staff_applications FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_staff_apps_updated
  BEFORE UPDATE ON public.staff_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_staff_apps_job ON public.staff_applications(job_id);
CREATE INDEX idx_staff_apps_staff ON public.staff_applications(staff_id);

-- 6) STAFF REVIEWS
CREATE TABLE public.staff_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.staff_jobs(id) ON DELETE CASCADE,
  autor_tipo text NOT NULL CHECK (autor_tipo IN ('fornecedor','profissional')),
  autor_id uuid NOT NULL,
  avaliado_id uuid NOT NULL,
  estrelas integer NOT NULL CHECK (estrelas BETWEEN 1 AND 5),
  comentario text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_id, autor_tipo)
);

GRANT SELECT ON public.staff_reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_reviews TO authenticated;
GRANT ALL ON public.staff_reviews TO service_role;

ALTER TABLE public.staff_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_reviews_public_select"
  ON public.staff_reviews FOR SELECT USING (true);

CREATE POLICY "staff_reviews_author_insert"
  ON public.staff_reviews FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_applications a
      JOIN public.staff_jobs j ON j.id = a.job_id
      JOIN public.suppliers s ON s.id = j.supplier_id
      JOIN public.staff_profiles sp ON sp.id = a.staff_id
      WHERE a.job_id = staff_reviews.job_id
        AND a.status = 'concluido'
        AND (
          (autor_tipo = 'fornecedor' AND s.user_id = auth.uid())
          OR (autor_tipo = 'profissional' AND sp.user_id = auth.uid())
        )
    )
  );

CREATE POLICY "staff_reviews_admin_all"
  ON public.staff_reviews FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 7) TRIGGER: ao aceitar, bloqueia data e recusa concorrentes
CREATE OR REPLACE FUNCTION public.staff_apps_on_accept()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _job_data date;
  _job_vagas int;
  _aceitos int;
BEGIN
  IF NEW.status = 'aceito' AND COALESCE(OLD.status,'') <> 'aceito' THEN
    NEW.respondido_em := now();

    SELECT data, vagas INTO _job_data, _job_vagas FROM public.staff_jobs WHERE id = NEW.job_id;

    INSERT INTO public.staff_unavailability (staff_id, data, motivo)
    VALUES (NEW.staff_id, _job_data, 'Vaga aceita')
    ON CONFLICT (staff_id, data) DO NOTHING;

    UPDATE public.staff_applications a
      SET status = 'recusado', respondido_em = now()
      WHERE a.staff_id = NEW.staff_id
        AND a.id <> NEW.id
        AND a.status IN ('convidado','candidato')
        AND EXISTS (SELECT 1 FROM public.staff_jobs j WHERE j.id = a.job_id AND j.data = _job_data);

    UPDATE public.staff_profiles SET eventos_aceitos = eventos_aceitos + 1 WHERE id = NEW.staff_id;

    SELECT COUNT(*) INTO _aceitos FROM public.staff_applications WHERE job_id = NEW.job_id AND status IN ('aceito','concluido');
    IF _aceitos >= _job_vagas THEN
      UPDATE public.staff_jobs SET status = 'preenchida' WHERE id = NEW.job_id AND status = 'aberta';
      UPDATE public.staff_applications SET status = 'expirado'
        WHERE job_id = NEW.job_id AND status IN ('convidado','candidato');
    END IF;
  END IF;

  IF NEW.status = 'concluido' AND COALESCE(OLD.status,'') <> 'concluido' THEN
    UPDATE public.staff_profiles SET eventos_concluidos = eventos_concluidos + 1 WHERE id = NEW.staff_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_staff_apps_on_accept
  BEFORE UPDATE ON public.staff_applications
  FOR EACH ROW EXECUTE FUNCTION public.staff_apps_on_accept();

-- 8) TRIGGER: recalcula rating do staff
CREATE OR REPLACE FUNCTION public.staff_reviews_recalc()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _staff uuid;
BEGIN
  _staff := COALESCE(NEW.avaliado_id, OLD.avaliado_id);
  IF (TG_OP = 'INSERT' AND NEW.autor_tipo = 'fornecedor')
     OR (TG_OP = 'DELETE' AND OLD.autor_tipo = 'fornecedor') THEN
    UPDATE public.staff_profiles
      SET rating = (SELECT ROUND(AVG(estrelas)::numeric, 2) FROM public.staff_reviews WHERE avaliado_id = _staff AND autor_tipo = 'fornecedor'),
          review_count = (SELECT COUNT(*) FROM public.staff_reviews WHERE avaliado_id = _staff AND autor_tipo = 'fornecedor')
      WHERE id = _staff;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_staff_reviews_recalc
  AFTER INSERT OR DELETE ON public.staff_reviews
  FOR EACH ROW EXECUTE FUNCTION public.staff_reviews_recalc();

-- 9) RPC: contato liberado após aceite
CREATE OR REPLACE FUNCTION public.get_staff_contact(_job_id uuid, _staff_id uuid)
RETURNS TABLE(telefone text, email text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.staff_applications a
    JOIN public.staff_jobs j ON j.id = a.job_id
    JOIN public.suppliers s ON s.id = j.supplier_id
    WHERE a.job_id = _job_id AND a.staff_id = _staff_id
      AND a.status IN ('aceito','concluido')
      AND (s.user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  ) THEN
    RAISE EXCEPTION 'Contato liberado apenas após o aceite da vaga.';
  END IF;
  RETURN QUERY SELECT sp.telefone, sp.email FROM public.staff_profiles sp WHERE sp.id = _staff_id;
END;
$$;

-- 10) handle_new_user estendido para 'profissional'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _acct text;
BEGIN
  _acct := COALESCE(NEW.raw_user_meta_data->>'account_type', 'couple');

  INSERT INTO public.profiles (user_id, full_name, account_type)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), _acct);

  IF _acct = 'couple' THEN
    INSERT INTO public.couples (user_id) VALUES (NEW.id);
  ELSIF _acct = 'supplier' THEN
    INSERT INTO public.suppliers (user_id, company_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'company_name', 'Minha Empresa'));
  ELSIF _acct = 'profissional' THEN
    INSERT INTO public.staff_profiles (user_id, criado_por, nome)
    VALUES (NEW.id, NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'Profissional'));
  END IF;

  RETURN NEW;
END;
$$;
