CREATE OR REPLACE FUNCTION public.indicacao_publica(_codigo text)
RETURNS TABLE(id uuid, nome_casal text, e_propria boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT r.id,
         (SELECT p.nome_casal FROM public.couple_public_profiles p
          WHERE p.couple_id = r.couple_id AND p.publico = true LIMIT 1),
         (auth.uid() IS NOT NULL AND r.couple_id = public.get_couple_id_for_user(auth.uid()))
  FROM public.referrals r
  WHERE r.codigo = upper(left(coalesce(_codigo, ''), 32)) AND r.ativo = true
  LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.indicacao_publica(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.indicacao_publica(text) TO anon, authenticated;