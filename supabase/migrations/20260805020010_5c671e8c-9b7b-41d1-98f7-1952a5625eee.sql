CREATE TABLE public.staff_messages (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.staff_applications(id) on delete cascade,
  sender_user_id uuid not null,
  sender_tipo text not null check (sender_tipo in ('fornecedor','profissional','sistema')),
  body text not null,
  created_at timestamptz not null default now()
);
CREATE INDEX idx_staff_messages_app ON public.staff_messages(application_id, created_at);

GRANT SELECT, INSERT ON public.staff_messages TO authenticated;
GRANT ALL ON public.staff_messages TO service_role;

ALTER TABLE public.staff_messages ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_access_staff_application(_app_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff_applications a
    JOIN public.staff_jobs j ON j.id = a.job_id
    JOIN public.suppliers s ON s.id = j.supplier_id
    WHERE a.id = _app_id AND s.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.staff_applications a
    JOIN public.staff_profiles sp ON sp.id = a.staff_id
    WHERE a.id = _app_id AND (sp.user_id = auth.uid() OR sp.criado_por = auth.uid())
  );
$$;

CREATE POLICY staff_messages_select ON public.staff_messages FOR SELECT TO authenticated
  USING (public.can_access_staff_application(application_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY staff_messages_insert ON public.staff_messages FOR INSERT TO authenticated
  WITH CHECK (sender_user_id = auth.uid() AND public.can_access_staff_application(application_id));

CREATE OR REPLACE FUNCTION public.staff_messages_notify()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _supplier_user uuid;
  _staff_user uuid;
  _dest uuid;
  _funcao text;
BEGIN
  SELECT s.user_id, sp.user_id, j.funcao
    INTO _supplier_user, _staff_user, _funcao
  FROM public.staff_applications a
  JOIN public.staff_jobs j ON j.id = a.job_id
  JOIN public.suppliers s ON s.id = j.supplier_id
  JOIN public.staff_profiles sp ON sp.id = a.staff_id
  WHERE a.id = NEW.application_id;

  _dest := CASE WHEN NEW.sender_user_id = _supplier_user THEN _staff_user ELSE _supplier_user END;
  IF _dest IS NOT NULL AND _dest <> NEW.sender_user_id THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (_dest, 'staff_mensagem', 'Nova mensagem sobre a vaga',
            coalesce(_funcao,'Vaga') || ': ' || left(NEW.body, 120),
            CASE WHEN _dest = _staff_user THEN '/profissional/painel' ELSE '/fornecedor/painel' END);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_staff_messages_notify AFTER INSERT ON public.staff_messages
FOR EACH ROW EXECUTE FUNCTION public.staff_messages_notify();

ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_messages;