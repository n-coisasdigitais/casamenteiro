
-- reservation_events
CREATE TABLE IF NOT EXISTS public.reservation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES public.idle_date_reservations(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  from_status text,
  to_status text,
  ator_user_id uuid,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reservation_events_res ON public.reservation_events(reservation_id, created_at DESC);
GRANT SELECT, INSERT ON public.reservation_events TO authenticated;
GRANT ALL ON public.reservation_events TO service_role;
ALTER TABLE public.reservation_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "res_events_admin_all" ON public.reservation_events FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "res_events_related_read" ON public.reservation_events FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.idle_date_reservations r
    LEFT JOIN public.suppliers s ON s.id = r.supplier_id
    LEFT JOIN public.couples c ON c.id = r.couple_id
    WHERE r.id = reservation_events.reservation_id
      AND (s.user_id = auth.uid() OR c.user_id = auth.uid())
  )
);

CREATE OR REPLACE FUNCTION public.log_reservation_event() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    INSERT INTO public.reservation_events(reservation_id, tipo, to_status, ator_user_id)
      VALUES (NEW.id, 'created', NEW.status, auth.uid());
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.reservation_events(reservation_id, tipo, from_status, to_status, ator_user_id)
      VALUES (NEW.id, 'status_change', OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_log_reservation_event ON public.idle_date_reservations;
CREATE TRIGGER trg_log_reservation_event AFTER INSERT OR UPDATE ON public.idle_date_reservations
  FOR EACH ROW EXECUTE FUNCTION public.log_reservation_event();

-- lead_events
CREATE TABLE IF NOT EXISTS public.lead_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  payload jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lead_events_quote ON public.lead_events(quote_id, created_at DESC);
GRANT SELECT, INSERT ON public.lead_events TO authenticated;
GRANT ALL ON public.lead_events TO service_role;
ALTER TABLE public.lead_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lead_events_supplier" ON public.lead_events FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = lead_events.supplier_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = lead_events.supplier_id AND s.user_id = auth.uid()));
CREATE POLICY "lead_events_admin" ON public.lead_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- guest_list_pdf_log
CREATE TABLE IF NOT EXISTS public.guest_list_pdf_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  tipo text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gl_pdf_log_couple ON public.guest_list_pdf_log(couple_id, created_at DESC);
GRANT SELECT, INSERT ON public.guest_list_pdf_log TO authenticated;
GRANT ALL ON public.guest_list_pdf_log TO service_role;
ALTER TABLE public.guest_list_pdf_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gl_pdf_couple" ON public.guest_list_pdf_log FOR ALL TO authenticated
  USING (couple_id = public.get_couple_id_for_user(auth.uid()))
  WITH CHECK (couple_id = public.get_couple_id_for_user(auth.uid()));
CREATE POLICY "gl_pdf_admin" ON public.guest_list_pdf_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- wedding_guests extras
ALTER TABLE public.wedding_guests
  ADD COLUMN IF NOT EXISTS tipo_convite text NOT NULL DEFAULT 'individual',
  ADD COLUMN IF NOT EXISTS pessoas jsonb,
  ADD COLUMN IF NOT EXISTS total_pessoas int NOT NULL DEFAULT 1;

CREATE OR REPLACE FUNCTION public.sync_guest_total_pessoas() RETURNS trigger
LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF NEW.tipo_convite = 'individual' THEN
    NEW.total_pessoas := 1;
  ELSIF NEW.pessoas IS NOT NULL AND jsonb_typeof(NEW.pessoas) = 'array' THEN
    NEW.total_pessoas := GREATEST(1, jsonb_array_length(NEW.pessoas));
  ELSE
    NEW.total_pessoas := GREATEST(1, COALESCE(NEW.total_pessoas, 1));
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_sync_guest_total_pessoas ON public.wedding_guests;
CREATE TRIGGER trg_sync_guest_total_pessoas BEFORE INSERT OR UPDATE ON public.wedding_guests
  FOR EACH ROW EXECUTE FUNCTION public.sync_guest_total_pessoas();

-- feature flag admin_impersonation
INSERT INTO public.feature_flags (key, label, description, grupo, essencial, enabled)
VALUES ('admin_impersonation','Impersonar usuário','Permite que admins vejam o sistema como outro usuário','admin', false, false)
ON CONFLICT (key) DO NOTHING;

-- cron: expiração de reservas
CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.expire_idle_reservations() RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _c int := 0;
BEGIN
  WITH expired AS (
    UPDATE public.idle_date_reservations
       SET status = 'expirada', updated_at = now()
     WHERE status IN ('solicitada','pre_reservada')
       AND expira_em IS NOT NULL
       AND expira_em < now()
    RETURNING id, supplier_id, promo_date
  ), liberar AS (
    UPDATE public.supplier_promo_dates spd
       SET disponivel = true
      FROM expired e
     WHERE spd.supplier_id = e.supplier_id
       AND spd.data = e.promo_date
    RETURNING spd.id
  )
  SELECT (SELECT count(*) FROM expired) INTO _c;
  RETURN _c;
END; $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire-idle-reservations-hourly') THEN
    PERFORM cron.schedule('expire-idle-reservations-hourly', '0 * * * *', $cron$ SELECT public.expire_idle_reservations(); $cron$);
  END IF;
END $$;
