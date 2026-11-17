CREATE OR REPLACE FUNCTION public.previa_meu_convite()
RETURNS TABLE(invite_id uuid, guest_name text, rsvp_response text, rsvp_companions integer, max_companions integer, rsvp_note text, responded_at timestamptz, partner_name text, user_full_name text, wedding_date date, ceremony_time text, ceremony_address text, reception_address text, invite_message text, invite_photo_url text, contact_phone text, dress_code text, ceremony_lat numeric, ceremony_lng numeric, ceremony_local_nome text, reception_lat numeric, reception_lng numeric, reception_local_nome text, invite_video_url text, invite_album jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT NULL::uuid, 'Convidado(a)'::text, NULL::text, 0, 2, NULL::text, NULL::timestamptz,
    c.partner_name, p.full_name, c.wedding_date, c.ceremony_time, c.ceremony_address, c.reception_address,
    c.invite_message, c.invite_photo_url, c.contact_phone, c.dress_code,
    c.ceremony_lat, c.ceremony_lng, c.ceremony_local_nome,
    c.reception_lat, c.reception_lng, c.reception_local_nome,
    c.invite_video_url, c.invite_album
  FROM public.couples c
  LEFT JOIN public.profiles p ON p.user_id = c.user_id
  WHERE c.id = public.get_couple_id_for_user(auth.uid())
  LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.previa_meu_convite() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.previa_meu_convite() TO authenticated;