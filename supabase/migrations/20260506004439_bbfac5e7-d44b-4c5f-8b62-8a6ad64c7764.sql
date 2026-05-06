
DROP FUNCTION IF EXISTS public.get_invite_by_token(text);

CREATE OR REPLACE FUNCTION public.get_invite_by_token(_token text)
RETURNS TABLE(invite_id uuid, guest_name text, rsvp_response text, rsvp_companions integer, max_companions integer, rsvp_note text, responded_at timestamp with time zone, partner_name text, user_full_name text, wedding_date date, ceremony_time text, ceremony_address text, reception_address text, invite_message text, invite_photo_url text, contact_phone text, dress_code text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.guest_invites SET opened_at = COALESCE(opened_at, now())
  WHERE token = _token;

  RETURN QUERY
  SELECT
    gi.id, wg.name, gi.rsvp_response, gi.rsvp_companions, COALESCE(wg.max_companions,0), gi.rsvp_note, gi.responded_at,
    c.partner_name, p.full_name,
    c.wedding_date, c.ceremony_time, c.ceremony_address, c.reception_address,
    c.invite_message, c.invite_photo_url, c.contact_phone, c.dress_code
  FROM public.guest_invites gi
  JOIN public.wedding_guests wg ON wg.id = gi.guest_id
  JOIN public.couples c ON c.id = gi.couple_id
  LEFT JOIN public.profiles p ON p.user_id = c.user_id
  WHERE gi.token = _token;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_invite_by_token(text) TO anon, authenticated;
