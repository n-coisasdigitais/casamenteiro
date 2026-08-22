DO $$
DECLARE
  k text;
BEGIN
  SELECT decrypted_secret INTO k FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key';
  IF k IS NULL THEN
    RAISE EXCEPTION 'service role key não encontrada no vault';
  END IF;

  PERFORM cron.schedule('convite-cron-diario', '0 11 * * *', format($f$
    SELECT net.http_post(
      url:='https://fglpzxtrvipizoymwteg.supabase.co/functions/v1/convite-cron',
      headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer %s'),
      body:=jsonb_build_object('triggered_at', now())
    );
  $f$, k));

  PERFORM cron.schedule('broadcast-cron-diario', '30 11 * * *', format($f$
    SELECT net.http_post(
      url:='https://fglpzxtrvipizoymwteg.supabase.co/functions/v1/broadcast-cron',
      headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer %s'),
      body:=jsonb_build_object('triggered_at', now())
    );
  $f$, k));

  PERFORM cron.schedule('calendar-sync-every-6h', '0 */6 * * *', format($f$
    SELECT net.http_post(
      url:='https://fglpzxtrvipizoymwteg.supabase.co/functions/v1/calendar-sync-cron',
      headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer %s'),
      body:='{}'::jsonb
    );
  $f$, k));
END $$;