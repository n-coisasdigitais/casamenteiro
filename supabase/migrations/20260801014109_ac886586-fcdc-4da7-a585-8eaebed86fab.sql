CREATE OR REPLACE FUNCTION public.notify_on_couple_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _nome TEXT;
  _u UUID;
BEGIN
  SELECT COALESCE(p.nome_casal, 'Outro casal') INTO _nome
  FROM public.couple_public_profiles p
  WHERE p.couple_id = NEW.remetente_couple_id;

  FOR _u IN
    SELECT c.user_id FROM public.couples c WHERE c.id = NEW.destinatario_couple_id
    UNION
    SELECT cl.linked_user_id FROM public.couple_links cl WHERE cl.couple_id = NEW.destinatario_couple_id
  LOOP
    IF _u IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, body, link)
      VALUES (
        _u,
        'couple_message',
        'Nova mensagem de ' || COALESCE(_nome, 'outro casal'),
        LEFT(NEW.texto, 120),
        '/mensagens'
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_couple_message ON public.couple_messages;
CREATE TRIGGER trg_notify_on_couple_message
AFTER INSERT ON public.couple_messages
FOR EACH ROW EXECUTE FUNCTION public.notify_on_couple_message();