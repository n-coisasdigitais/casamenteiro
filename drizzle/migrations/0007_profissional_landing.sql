CREATE TABLE IF NOT EXISTS public.profissional_landing_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
GRANT SELECT ON public.profissional_landing_config TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.profissional_landing_config TO authenticated;
GRANT ALL ON public.profissional_landing_config TO service_role;
ALTER TABLE public.profissional_landing_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Config da página de profissional é pública" ON public.profissional_landing_config;
CREATE POLICY "Config da página de profissional é pública" ON public.profissional_landing_config
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin edita config da página de profissional" ON public.profissional_landing_config;
CREATE POLICY "Admin edita config da página de profissional" ON public.profissional_landing_config
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.fornecedor_tem_recurso(p_supplier uuid, p_recurso text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    EXISTS (SELECT 1 FROM suppliers s WHERE s.id = p_supplier AND s.trial_ends_at > now())
    OR EXISTS (
      SELECT 1 FROM supplier_subscriptions ss
      JOIN subscription_plans sp ON sp.id = ss.plan_id
      WHERE ss.supplier_id = p_supplier
        AND (ss.status = 'ativa' OR (ss.status = 'cancelada' AND ss.current_period_end > now()))
        AND COALESCE((sp.recursos ->> p_recurso)::boolean, false)
    );
$$;
GRANT EXECUTE ON FUNCTION public.fornecedor_tem_recurso(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.staff_jobs_exige_plano()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF has_role(auth.uid(), 'admin'::app_role) THEN RETURN NEW; END IF;
  IF NOT fornecedor_tem_recurso(NEW.supplier_id, 'vagas_equipe') THEN
    RAISE EXCEPTION 'Publicar vagas é um recurso do plano pago. Assine um plano para continuar.' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_staff_jobs_exige_plano ON public.staff_jobs;
CREATE TRIGGER trg_staff_jobs_exige_plano BEFORE INSERT ON public.staff_jobs
FOR EACH ROW EXECUTE FUNCTION public.staff_jobs_exige_plano();

CREATE OR REPLACE FUNCTION public.staff_convite_exige_plano()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_supplier uuid;
BEGIN
  IF NEW.origem IS DISTINCT FROM 'convite' OR has_role(auth.uid(), 'admin'::app_role) THEN RETURN NEW; END IF;
  SELECT supplier_id INTO v_supplier FROM staff_jobs WHERE id = NEW.job_id;
  IF v_supplier IS NOT NULL AND NOT fornecedor_tem_recurso(v_supplier, 'vagas_equipe') THEN
    RAISE EXCEPTION 'Convidar profissionais é um recurso do plano pago. Assine um plano para continuar.' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_staff_convite_exige_plano ON public.staff_applications;
CREATE TRIGGER trg_staff_convite_exige_plano BEFORE INSERT ON public.staff_applications
FOR EACH ROW EXECUTE FUNCTION public.staff_convite_exige_plano();