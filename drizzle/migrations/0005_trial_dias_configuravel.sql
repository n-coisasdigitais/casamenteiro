CREATE OR REPLACE FUNCTION public.set_trial_on_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_dias integer;
begin
  if NEW.status = 'approved'
     and (OLD.status is distinct from 'approved')
     and NEW.trial_ends_at is null then
    select coalesce(nullif(value->>'dias','')::integer, 60)
      into v_dias
      from public.system_settings
     where key = 'trial_dias';
    NEW.trial_ends_at := now() + make_interval(days => coalesce(v_dias, 60));
  end if;
  return NEW;
end;
$function$;