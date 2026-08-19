-- =========================================================
-- 1. CONTATO DO FORNECEDOR: restringir por coluna
-- =========================================================
REVOKE SELECT ON public.suppliers FROM anon, authenticated;
GRANT SELECT (
  id, user_id, company_name, description, category_id, city, state, status,
  created_at, updated_at, rating, review_count, price_min, price_max,
  guest_min, guest_max, featured, promo_percentage, instagram, website,
  profile_photo_url, accepts_idle_dates, idle_discount_pct, is_demo,
  onboarding_completed, onboarding_step, aparece_na_home, cover_photo_url,
  cidades_atendidas, raio_atendimento_km, lat, lng, pricing_model,
  mp_account_id, featured_until, reserva_antecedencia_min_dias, trial_ends_at
) ON public.suppliers TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;
GRANT ALL ON public.suppliers TO service_role;

-- função segura ampliada
DROP FUNCTION IF EXISTS public.get_supplier_contact(uuid);
CREATE OR REPLACE FUNCTION public.get_supplier_contact(_supplier_id uuid)
RETURNS TABLE(phone text, whatsapp text, email text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.phone, s.whatsapp, s.email
  FROM public.suppliers s
  WHERE s.id = _supplier_id
    AND (
      s.user_id = auth.uid()
      OR has_role(auth.uid(),'admin')
      OR EXISTS (
        SELECT 1 FROM public.quotes q
        WHERE q.supplier_id = s.id AND q.couple_id = get_couple_id_for_user(auth.uid())
      )
      OR EXISTS (
        SELECT 1 FROM public.couple_suppliers cs
        WHERE cs.supplier_id = s.id AND cs.couple_id = get_couple_id_for_user(auth.uid())
      )
      OR EXISTS (
        SELECT 1 FROM public.idle_date_reservations r
        WHERE r.supplier_id = s.id AND r.couple_id = get_couple_id_for_user(auth.uid())
      )
      OR EXISTS (
        SELECT 1 FROM public.staff_jobs j
        WHERE j.supplier_id = s.id AND is_job_applicant(j.id)
      )
    );
$$;

-- respostas de campos de contato deixam de ser públicas
DROP POLICY IF EXISTS "Público vê respostas de fornecedores aprovados" ON public.fornecedor_campos;
CREATE POLICY "Público vê respostas não sensíveis de aprovados"
ON public.fornecedor_campos FOR SELECT
USING (
  (
    supplier_id IN (SELECT s.id FROM public.suppliers s WHERE s.status = 'approved')
    AND NOT EXISTS (
      SELECT 1 FROM public.campos_categoria c
      WHERE c.id = fornecedor_campos.campo_id
        AND c.chave IN ('telefone','whatsapp','email','celular','contato')
    )
  )
  OR supplier_id IN (SELECT s.id FROM public.suppliers s WHERE s.user_id = auth.uid())
  OR has_role(auth.uid(),'admin')
);

-- =========================================================
-- 2. REGISTRO CENTRAL DE EVENTOS
-- =========================================================
CREATE TABLE IF NOT EXISTS public.platform_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  actor_id uuid,
  actor_role text,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id uuid,
  severity text NOT NULL DEFAULT 'info',
  source text NOT NULL DEFAULT 'db',
  before jsonb,
  after jsonb,
  details jsonb
);

GRANT SELECT ON public.platform_events TO authenticated;
GRANT ALL ON public.platform_events TO service_role;

ALTER TABLE public.platform_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin lê eventos da plataforma"
ON public.platform_events FOR SELECT TO authenticated
USING (has_role(auth.uid(),'admin'));

CREATE INDEX IF NOT EXISTS idx_platform_events_created_at ON public.platform_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_events_action ON public.platform_events (action);
CREATE INDEX IF NOT EXISTS idx_platform_events_entity ON public.platform_events (entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_platform_events_severity ON public.platform_events (severity);

CREATE OR REPLACE FUNCTION public.log_platform_event(
  _action text, _entity text, _entity_id uuid DEFAULT NULL,
  _severity text DEFAULT 'info', _source text DEFAULT 'db',
  _before jsonb DEFAULT NULL, _after jsonb DEFAULT NULL, _details jsonb DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _id uuid; _role text;
BEGIN
  SELECT r.role::text INTO _role FROM public.user_roles r WHERE r.user_id = auth.uid() LIMIT 1;
  IF _role IS NULL THEN
    SELECT p.account_type INTO _role FROM public.profiles p WHERE p.user_id = auth.uid() LIMIT 1;
  END IF;
  INSERT INTO public.platform_events(actor_id, actor_role, action, entity, entity_id, severity, source, before, after, details)
  VALUES (auth.uid(), _role, _action, _entity, _entity_id, _severity, _source, _before, _after, _details)
  RETURNING id INTO _id;
  RETURN _id;
END; $$;

-- trigger genérico de exclusão
CREATE OR REPLACE FUNCTION public.trg_log_delete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.log_platform_event(
    TG_TABLE_NAME || '.deleted', TG_TABLE_NAME, OLD.id, 'warning', 'db', to_jsonb(OLD), NULL, NULL
  );
  RETURN OLD;
END; $$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'wedding_guests','wedding_tasks','couple_suppliers','budget_items','budget_payments',
    'couple_photos','couple_videos','staff_jobs','suppliers','guest_invites','quotes'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS log_delete_%1$s ON public.%1$s', t);
    EXECUTE format(
      'CREATE TRIGGER log_delete_%1$s AFTER DELETE ON public.%1$s FOR EACH ROW EXECUTE FUNCTION public.trg_log_delete()', t);
  END LOOP;
END $$;

-- convites: criação e resposta de RSVP
CREATE OR REPLACE FUNCTION public.trg_log_guest_invite()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_platform_event('convite.enviado','guest_invites',NEW.id,'info','db',NULL,to_jsonb(NEW),NULL);
  ELSIF NEW.rsvp_response IS DISTINCT FROM OLD.rsvp_response THEN
    PERFORM public.log_platform_event('convite.respondido','guest_invites',NEW.id,'info','db',
      jsonb_build_object('rsvp_response', OLD.rsvp_response),
      jsonb_build_object('rsvp_response', NEW.rsvp_response, 'rsvp_companions', NEW.rsvp_companions), NULL);
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS log_guest_invite ON public.guest_invites;
CREATE TRIGGER log_guest_invite AFTER INSERT OR UPDATE ON public.guest_invites
FOR EACH ROW EXECUTE FUNCTION public.trg_log_guest_invite();

-- reservas de data ociosa
CREATE OR REPLACE FUNCTION public.trg_log_reservation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_platform_event('reserva.solicitada','idle_date_reservations',NEW.id,'info','db',NULL,to_jsonb(NEW),NULL);
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.log_platform_event('reserva.'||NEW.status,'idle_date_reservations',NEW.id,
      CASE WHEN NEW.status IN ('cancelada','expirada','recusada') THEN 'warning' ELSE 'info' END,'db',
      jsonb_build_object('status', OLD.status), jsonb_build_object('status', NEW.status), NULL);
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS log_reservation_platform ON public.idle_date_reservations;
CREATE TRIGGER log_reservation_platform AFTER INSERT OR UPDATE ON public.idle_date_reservations
FOR EACH ROW EXECUTE FUNCTION public.trg_log_reservation();

-- aceites de proposta
CREATE OR REPLACE FUNCTION public.trg_log_proposal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.log_platform_event('proposta.'||NEW.status,'quote_proposals',NEW.id,'info','db',
      jsonb_build_object('status', OLD.status), jsonb_build_object('status', NEW.status, 'valor', NEW.valor), NULL);
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS log_proposal_platform ON public.quote_proposals;
CREATE TRIGGER log_proposal_platform AFTER UPDATE ON public.quote_proposals
FOR EACH ROW EXECUTE FUNCTION public.trg_log_proposal();

-- aceites de candidatura de profissional
CREATE OR REPLACE FUNCTION public.trg_log_staff_application()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    PERFORM public.log_platform_event('candidatura.enviada','staff_applications',NEW.id,'info','db',NULL,to_jsonb(NEW),NULL);
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.log_platform_event('candidatura.'||NEW.status,'staff_applications',NEW.id,'info','db',
      jsonb_build_object('status', OLD.status), jsonb_build_object('status', NEW.status), NULL);
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS log_staff_application_platform ON public.staff_applications;
CREATE TRIGGER log_staff_application_platform AFTER INSERT OR UPDATE ON public.staff_applications
FOR EACH ROW EXECUTE FUNCTION public.trg_log_staff_application();

-- pagamentos
CREATE OR REPLACE FUNCTION public.trg_log_payment_intent()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    PERFORM public.log_platform_event('pagamento.criado','payment_intents',NEW.id,'info','db',NULL,to_jsonb(NEW),NULL);
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.log_platform_event('pagamento.'||NEW.status,'payment_intents',NEW.id,
      CASE WHEN NEW.status IN ('rejected','cancelled','failed') THEN 'error' ELSE 'info' END,'db',
      jsonb_build_object('status', OLD.status), jsonb_build_object('status', NEW.status), NULL);
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS log_payment_intent_platform ON public.payment_intents;
CREATE TRIGGER log_payment_intent_platform AFTER INSERT OR UPDATE ON public.payment_intents
FOR EACH ROW EXECUTE FUNCTION public.trg_log_payment_intent();

-- webhooks (falhas)
CREATE OR REPLACE FUNCTION public.trg_log_webhook_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF COALESCE(NEW.status,'') IN ('error','failed') THEN
    PERFORM public.log_platform_event('webhook.falha','webhook_events',NEW.id,'error','webhook',NULL,to_jsonb(NEW),NULL);
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS log_webhook_platform ON public.webhook_events;
CREATE TRIGGER log_webhook_platform AFTER INSERT OR UPDATE ON public.webhook_events
FOR EACH ROW EXECUTE FUNCTION public.trg_log_webhook_event();

-- papéis de usuário
CREATE OR REPLACE FUNCTION public.trg_log_user_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    PERFORM public.log_platform_event('papel.concedido','user_roles',NEW.user_id,'warning','db',NULL,to_jsonb(NEW),NULL);
    RETURN NEW;
  ELSE
    PERFORM public.log_platform_event('papel.removido','user_roles',OLD.user_id,'warning','db',to_jsonb(OLD),NULL,NULL);
    RETURN OLD;
  END IF;
END; $$;
DROP TRIGGER IF EXISTS log_user_role_platform ON public.user_roles;
CREATE TRIGGER log_user_role_platform AFTER INSERT OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.trg_log_user_role();