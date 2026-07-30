ALTER TABLE public.staff_profiles
  ADD COLUMN IF NOT EXISTS verificacao_status text NOT NULL DEFAULT 'nao_enviado',
  ADD COLUMN IF NOT EXISTS verificado_em timestamptz,
  ADD COLUMN IF NOT EXISTS verificacao_obs text,
  ADD COLUMN IF NOT EXISTS disponivel boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS public.staff_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  file_path text NOT NULL,
  file_name text,
  status text NOT NULL DEFAULT 'pendente',
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_documents TO authenticated;
GRANT ALL ON public.staff_documents TO service_role;

ALTER TABLE public.staff_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_documents_owner_all" ON public.staff_documents
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.staff_profiles sp WHERE sp.id = staff_id AND sp.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.staff_profiles sp WHERE sp.id = staff_id AND sp.user_id = auth.uid()));

CREATE POLICY "staff_documents_admin_all" ON public.staff_documents
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_staff_documents_updated_at
  BEFORE UPDATE ON public.staff_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.notify_staff_on_new_job()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status <> 'aberta' OR NEW.is_public IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, type, title, body, link)
  SELECT sp.user_id,
         'vaga_nova',
         'Nova vaga para ' || NEW.funcao,
         COALESCE(NEW.cidade, NEW.local, '') ||
           CASE WHEN NEW.valor_turno IS NOT NULL
                THEN ' • R$ ' || to_char(NEW.valor_turno, 'FM999G999D00')
                ELSE '' END,
         '/profissional/painel'
  FROM public.staff_profiles sp
  WHERE sp.user_id IS NOT NULL
    AND sp.is_public IS TRUE
    AND COALESCE(sp.disponivel, true) IS TRUE
    AND NEW.funcao = ANY (sp.funcoes)
    AND (NEW.cidade IS NULL OR sp.cidade IS NULL OR lower(sp.cidade) = lower(NEW.cidade))
    AND COALESCE(sp.valor_min_turno, 0) <= COALESCE(NEW.valor_turno, 0);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_staff_on_new_job ON public.staff_jobs;
CREATE TRIGGER trg_notify_staff_on_new_job
  AFTER INSERT ON public.staff_jobs
  FOR EACH ROW EXECUTE FUNCTION public.notify_staff_on_new_job();