-- 1) View respects caller permissions
ALTER VIEW public.suppliers_public SET (security_invoker = on);

-- 2) Fixed search_path on remaining functions
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq, pg_temp;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq, pg_temp;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq, pg_temp;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq, pg_temp;
ALTER FUNCTION public.generate_referral_code() SET search_path = public, pg_temp;
ALTER FUNCTION public.touch_fornecedor_landing_config() SET search_path = public, pg_temp;

-- 3) Lock down SECURITY DEFINER function execution
DO $$
DECLARE
  r record;
  keep_anon text[] := ARRAY[
    'buscar_cidades_brasil','cidades_disponiveis','get_invite_by_token','respond_invite',
    'registrar_clique_indicacao_fornecedor','calc_platform_fee','calc_oferta_corretagem',
    'has_role','get_couple_id_for_user','can_access_staff_application','is_demo_user',
    'is_job_applicant','is_supplier_of_my_job','pode_avaliar_review','supplier_tem_acesso'
  ];
  internal_only text[] := ARRAY[
    'delete_email','enqueue_email','read_email_batch','move_to_dlq',
    'expirar_monetizacao','expire_idle_reservations','consumir_creditos_ciclo',
    'marcar_indicacao_assinatura','registrar_etapa_indicacao_fornecedor',
    'admin_broadcast_segmented','admin_broadcast_notification'
  ];
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig, p.proname,
           pg_get_function_result(p.oid) = 'trigger' AS is_trigger
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    IF r.is_trigger OR r.proname = ANY(internal_only) THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
    ELSIF NOT (r.proname = ANY(keep_anon)) THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', r.sig);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', r.sig);
    END IF;
  END LOOP;
END $$;

-- keep admin broadcast callable from the admin UI (function checks admin role itself)
GRANT EXECUTE ON FUNCTION public.admin_broadcast_notification(text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_broadcast_segmented(text, text, text, text, text, uuid, integer) TO authenticated;

-- 4) Notifications: only trusted server-side contexts may insert
DROP POLICY IF EXISTS "Authenticated can insert notifications" ON public.notifications;
CREATE POLICY "Admins can insert notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 5) Quote attachments: only parties of the quote
DROP POLICY IF EXISTS "Authenticated users can view quote attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload quote attachments" ON storage.objects;

CREATE POLICY "Quote parties can view quote attachments"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'quote-attachments'
    AND EXISTS (
      SELECT 1 FROM public.quotes q
      WHERE q.id::text = (storage.foldername(name))[1]
        AND (
          q.couple_id = public.get_couple_id_for_user(auth.uid())
          OR q.user_id = auth.uid()
          OR q.supplier_id IN (SELECT s.id FROM public.suppliers s WHERE s.user_id = auth.uid())
          OR public.has_role(auth.uid(), 'admin'::app_role)
        )
    )
  );

CREATE POLICY "Quote parties can upload quote attachments"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'quote-attachments'
    AND EXISTS (
      SELECT 1 FROM public.quotes q
      WHERE q.id::text = (storage.foldername(name))[1]
        AND (
          q.couple_id = public.get_couple_id_for_user(auth.uid())
          OR q.user_id = auth.uid()
          OR q.supplier_id IN (SELECT s.id FROM public.suppliers s WHERE s.user_id = auth.uid())
        )
    )
  );