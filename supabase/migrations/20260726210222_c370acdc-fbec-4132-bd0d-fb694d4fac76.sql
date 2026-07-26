
-- Auditoria de vagas
ALTER TABLE public.staff_jobs
  ADD COLUMN IF NOT EXISTS criado_por_user_id uuid,
  ADD COLUMN IF NOT EXISTS published_at timestamptz;

CREATE OR REPLACE FUNCTION public.staff_jobs_set_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.criado_por_user_id IS NULL THEN
    NEW.criado_por_user_id := auth.uid();
  END IF;
  IF NEW.published_at IS NULL AND NEW.is_public = true AND NEW.status = 'aberta' THEN
    NEW.published_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_staff_jobs_set_audit ON public.staff_jobs;
CREATE TRIGGER trg_staff_jobs_set_audit
BEFORE INSERT ON public.staff_jobs
FOR EACH ROW EXECUTE FUNCTION public.staff_jobs_set_audit();

-- Notificações in-app no ciclo de convite/candidatura
CREATE OR REPLACE FUNCTION public.staff_applications_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff_user_id uuid;
  v_supplier_user_id uuid;
  v_funcao text;
  v_data date;
BEGIN
  SELECT sp.user_id INTO v_staff_user_id FROM public.staff_profiles sp WHERE sp.id = NEW.staff_id;
  SELECT s.user_id, j.funcao, j.data INTO v_supplier_user_id, v_funcao, v_data
    FROM public.staff_jobs j
    JOIN public.suppliers s ON s.id = j.supplier_id
    WHERE j.id = NEW.job_id;

  IF TG_OP = 'INSERT' THEN
    IF NEW.origem = 'convite' AND v_staff_user_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, tipo, titulo, mensagem, link)
      VALUES (v_staff_user_id, 'staff_convite',
        'Novo convite de vaga',
        format('Você recebeu um convite para %s em %s.', COALESCE(v_funcao,'vaga'), to_char(v_data,'DD/MM/YYYY')),
        '/profissional/painel');
    ELSIF NEW.origem = 'candidatura' AND v_supplier_user_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, tipo, titulo, mensagem, link)
      VALUES (v_supplier_user_id, 'staff_candidatura',
        'Nova candidatura',
        format('Um profissional se candidatou à sua vaga de %s.', COALESCE(v_funcao,'vaga')),
        '/fornecedor/painel?tab=vagas');
    END IF;
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status IN ('aceito','recusado') AND v_supplier_user_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, tipo, titulo, mensagem, link)
      VALUES (v_supplier_user_id, 'staff_resposta',
        CASE WHEN NEW.status='aceito' THEN 'Convite aceito' ELSE 'Convite recusado' END,
        format('Resposta ao convite de %s em %s.', COALESCE(v_funcao,'vaga'), to_char(v_data,'DD/MM/YYYY')),
        '/fornecedor/painel?tab=vagas');
    ELSIF NEW.status = 'concluido' THEN
      IF v_staff_user_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, tipo, titulo, mensagem, link)
        VALUES (v_staff_user_id, 'staff_concluido', 'Trabalho concluído',
          'Avalie o fornecedor pelo trabalho realizado.', '/profissional/painel');
      END IF;
      IF v_supplier_user_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, tipo, titulo, mensagem, link)
        VALUES (v_supplier_user_id, 'staff_concluido', 'Trabalho concluído',
          'Avalie o profissional pelo trabalho realizado.', '/fornecedor/painel?tab=vagas');
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_staff_apps_notify ON public.staff_applications;
CREATE TRIGGER trg_staff_apps_notify
AFTER INSERT OR UPDATE ON public.staff_applications
FOR EACH ROW EXECUTE FUNCTION public.staff_applications_notify();
