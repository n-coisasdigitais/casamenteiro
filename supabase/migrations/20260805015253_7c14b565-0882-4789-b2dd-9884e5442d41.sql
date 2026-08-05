CREATE OR REPLACE FUNCTION public.staff_applications_notify()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      INSERT INTO public.notifications (user_id, type, title, body, link)
      VALUES (v_staff_user_id, 'staff_convite',
        'Novo convite de vaga',
        format('Você recebeu um convite para %s em %s.', COALESCE(v_funcao,'vaga'), to_char(v_data,'DD/MM/YYYY')),
        '/profissional/painel');
    ELSIF NEW.origem = 'candidatura' AND v_supplier_user_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, body, link)
      VALUES (v_supplier_user_id, 'staff_candidatura',
        'Nova candidatura',
        format('Um profissional se candidatou à sua vaga de %s.', COALESCE(v_funcao,'vaga')),
        '/fornecedor/painel?tab=vagas');
    END IF;
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status IN ('aceito','recusado') AND v_supplier_user_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, body, link)
      VALUES (v_supplier_user_id, 'staff_resposta',
        CASE WHEN NEW.status = 'aceito' THEN 'Vaga aceita' ELSE 'Convite recusado' END,
        format('Atualização na vaga de %s.', COALESCE(v_funcao,'vaga')),
        '/fornecedor/painel?tab=vagas');
    END IF;
    IF NEW.status IN ('convidado','aceito','recusado','cancelado') AND v_staff_user_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, body, link)
      VALUES (v_staff_user_id, 'staff_status',
        'Atualização de candidatura',
        format('Sua candidatura para %s agora está: %s.', COALESCE(v_funcao,'vaga'), NEW.status),
        '/profissional/painel');
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;